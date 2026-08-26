"use client";

import { useState, useEffect, useRef } from "react";
import { PhoneInput, DEFAULT_PHONE_COUNTRY, type PhoneCountry } from "@/components/ui/PhoneInput";

type Msg = { role: "user" | "assistant"; content: string; id: string };
// Round M4 FIX 7: structured intake box, an alternative to typing everything
// conversationally. "custom" means the customer needs something not in the
// tenant's trained service list -- switches the Service field to free text
// and the submission always becomes a pending lead, never a direct booking
// (see structured-booking/route.ts for why).
const CUSTOM_SERVICE = "__custom__";

// FIX 1 (round Q): hard ceiling on how long a single send() waits for
// /api/ai/reply before giving up -- see the comment in send() for why this
// exists.
// Round M5 FIX 6: confirmed live -- a real booking-confirmation turn
// ("yes please" after the AI proposes a slot) can chain up to 3 SEQUENTIAL
// OpenAI calls server-side (the availability pre-check extraction, the main
// reply, and the intent_summary synthesis once a lead exists -- see
// ai/reply/route.ts sections 7b, the main completion, and the intent-
// summary block after it), on a route explicitly provisioned for up to 300s
// (maxDuration=300). The old 25s client ceiling was far below what the
// server itself is built to tolerate -- a legitimate but slow completion
// (cold start + real OpenAI latency on 3 calls) got reported to the
// customer as "Something went wrong. Please try again." even when the
// server went on to complete successfully (including actually booking the
// appointment) a few seconds later, since Vercel serverless execution isn't
// killed just because the client gave up on the HTTP response. The customer
// then asking "why" got a disconnected answer because nothing about that
// canned client-side message was ever real conversation history -- the
// server has no error to explain, because from ITS side nothing failed.
// Raised to a more realistic ceiling, and paired with a post-timeout
// reconciliation check (see the catch block in send()) that looks for the
// real reply shortly after, instead of leaving a false error on screen when
// the server actually did finish.
const REQUEST_TIMEOUT_MS = 45_000;

export default function WidgetChat({
  tenantId,
  websiteId,
  businessName,
  greeting,
  channel,
  accentColor,
  hidePoweredBy,
  initialConversationId,
  trainedServices = [],
}: {
  tenantId: string;
  websiteId?: string;
  businessName: string;
  greeting: string;
  channel: string;
  accentColor?: string | null;
  hidePoweredBy?: boolean;
  // FIX 3 (round Q): a stable id the PARENT page's own first-party
  // localStorage already had for this visitor, passed down from page.tsx.
  // Preferred over this component's own (iframe-internal, possibly
  // third-party-storage-restricted) localStorage read on mount.
  initialConversationId?: string;
  // Round M4 FIX 7: real trained service names for the structured intake
  // box's dropdown, fetched server-side in page.tsx. Empty -> the form still
  // works, offering only the free-text "something else" path.
  trainedServices?: string[];
}) {
  // Round 5 FIX 7: was a fixed Vela-brand gradient regardless of the site
  // it's embedded on. Falls back to the Vela brand gradient only when no
  // site accent color was found (e.g. an externally pasted embed).
  const gradient = accentColor
    ? `linear-gradient(135deg,${accentColor},${accentColor})`
    : "linear-gradient(135deg,#FF6B35,#FF3366)";
  const [messages, setMessages] = useState<Msg[]>([
    { id: "welcome", role: "assistant", content: greeting },
  ]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // ── Round M4 FIX 7: structured intake box state ──────────────────────────
  const [mode, setMode]                 = useState<"chat" | "form">("chat");
  const [formName, setFormName]         = useState("");
  const [formPhoneCountry, setFormPhoneCountry] = useState<PhoneCountry>(DEFAULT_PHONE_COUNTRY);
  const [formPhone, setFormPhone]       = useState("");
  const [formService, setFormService]   = useState(trainedServices[0] ?? CUSTOM_SERVICE);
  const [formCustomService, setFormCustomService] = useState("");
  const [formDate, setFormDate]         = useState("");
  const [formTime, setFormTime]         = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError]       = useState("");
  // Round M5 FIX 5: isConflict distinguishes "the chosen slot was actually
  // unavailable" (structured-booking/route.ts's Case C conflict branch,
  // which is the only branch that returns `alternatives`) from every other
  // non-booked outcome (untrained service, no date/time given) -- only the
  // conflict case is allowed to resubmit; see the result UI below.
  const [formResult, setFormResult]     = useState<{ message: string; booked: boolean; isConflict: boolean } | null>(null);

  // FIX 4: was sessionStorage, which is cleared the moment the tab/window
  // closes -- every single reopen of the widget (or the site) started a
  // brand new conversation, fragmenting one real visitor into many
  // disconnected threads. localStorage persists across browser restarts;
  // a stored {id, expiresAt} pair with a 48h SLIDING window (refreshed on
  // every message, not just at creation) gives "resume within a
  // reasonable session" without persisting forever.
  //
  // FIX 3 (round P): keyed only by tenantId -- the widget iframe for EVERY
  // one of a tenant's sites is served from this same shared app origin
  // (/widget/[tenantId]), so a visitor who browsed two different published
  // sites belonging to the same tenant (now genuinely possible since Round
  // O's real multi-site connect/disconnect) hit the identical localStorage
  // key on both, restoring and continuing the SAME conversation -- one
  // site's chat history bleeding into the other. websiteId (already passed
  // into this component, already sent on every /api/ai/reply call) now
  // scopes the key so each site gets its own persisted conversation.
  const STORAGE_KEY = `vela_conv_${tenantId}_${websiteId || "default"}`;
  const SESSION_MS = 48 * 60 * 60 * 1000;

  function readStoredConversation(): string | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { id?: string; expiresAt?: number };
      if (!parsed.id || !parsed.expiresAt || Date.now() > parsed.expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed.id;
    } catch {
      return null;
    }
  }

  function persistConversation(id: string) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, expiresAt: Date.now() + SESSION_MS }));
    } catch { /* localStorage unavailable (private mode, quota) -- see the
      postMessage below, which is the fix for exactly this case: the
      PARENT page's own first-party storage (never third-party-restricted)
      still gets a copy even when this iframe's own storage doesn't work. */ }
    // FIX 3 (round Q): tells the parent embed script (api/embed/[tenantId]/
    // route.ts) to persist this id in ITS OWN first-party localStorage too
    // -- a no-op when this page is loaded directly with no embedding parent
    // (postMessage to "*" with no listener just goes nowhere).
    try {
      window.parent.postMessage({ type: "vela-widget-conv", conversationId: id }, "*");
    } catch { /* not embedded, or parent unreachable -- iframe-local storage above still applies */ }
  }

  /* Restore conversationId + real message history on mount */
  useEffect(() => {
    // FIX 3 (round Q): prefer the parent-supplied id (first-party storage,
    // survives even when this iframe's own localStorage is restricted)
    // over this component's own iframe-internal read -- see the prop
    // comment above for the full root cause.
    const stored = initialConversationId || readStoredConversation();
    if (stored) {
      setConversationId(stored);
      persistConversation(stored); // touch expiry -- reopening counts as activity
      (async () => {
        try {
          const res = await fetch(`/api/widget/history?tenantId=${encodeURIComponent(tenantId)}&conversationId=${encodeURIComponent(stored)}${websiteId ? `&websiteId=${encodeURIComponent(websiteId)}` : ""}`);
          const data = await res.json() as { messages?: { role: string; content: string }[] };
          if (data.messages && data.messages.length > 0) {
            setMessages([
              { id: "welcome", role: "assistant", content: greeting },
              ...data.messages.map((m, i) => ({ id: `h-${i}`, role: m.role as "user" | "assistant", content: m.content })),
            ]);
          }
        } catch { /* history fetch failed -- conversation still continues, just without visible prior messages */ }
      })();
    }
    inputRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // FIX 3: the widget is otherwise stateless (no websocket/push channel),
  // so a real Takeover reply from the owner (api/conversations/[id]/reply)
  // never reached an already-open widget -- the customer would only see it
  // on their NEXT reopen (full history restore, FIX 4), not while actively
  // chatting. Polling gives real, if not instant, delivery: once a
  // conversation exists, check for new messages every few seconds and
  // append any not already shown. Matches on (role, content) since the
  // history endpoint returns no message id -- a reasonable tradeoff for a
  // lightweight polling mechanism, not a strict dedupe guarantee.
  //
  // CRITICAL FIX (duplicate messages): the dedupe set used to be computed
  // from a ref snapshotted when the poll's fetch STARTED, then applied in a
  // separate setMessages call after the fetch resolved. If send()'s own
  // POST to /api/ai/reply was still in flight when a poll tick started, the
  // snapshot didn't include the reply yet -- and if the poll's lightweight
  // GET happened to resolve before send()'s heavier POST made it back to
  // the browser (a real, reproducible race, not hypothetical: confirmed
  // live -- a booking confirmation appeared twice, identical text, back to
  // back), BOTH paths independently appended the same message. Fixed by
  // computing the dedupe set from `prev` INSIDE the functional setMessages
  // updater on both paths (here and in send() below) -- `prev` is always
  // the true latest state at the moment each update actually commits, so
  // whichever path loses the race sees the other's result already applied
  // and skips the append. No ref/snapshot needed anymore.
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/widget/history?tenantId=${encodeURIComponent(tenantId)}&conversationId=${encodeURIComponent(conversationId)}${websiteId ? `&websiteId=${encodeURIComponent(websiteId)}` : ""}`);
        const data = await res.json() as { messages?: { role: string; content: string }[] };
        if (!data.messages) return;
        const fetched = data.messages;
        // Round S fix: was a Set of `${role}:${content}` matched across the
        // ENTIRE history, which wrongly treated a genuinely NEW turn's reply
        // as "already shown" whenever its text happened to match an EARLIER
        // turn's -- e.g. the duplicate-booking refusal (section 7c in
        // ai/reply/route.ts) is deterministic and repeats verbatim, so a
        // customer's second "book another one" got silently dropped here,
        // never rendered, even though the server had genuinely replied.
        // Position-based instead: /api/widget/history is authoritative and
        // strictly ordered, so anything beyond what's already rendered
        // (excluding the client-only "welcome" placeholder) is real and new,
        // regardless of whether its text matches something shown earlier.
        setMessages((prev) => {
          const shown = prev.filter((m) => m.id !== "welcome").length;
          if (fetched.length <= shown) return prev;
          const tail = fetched.slice(shown);
          return [...prev, ...tail.map((m, i) => ({ id: `poll-${Date.now()}-${i}`, role: m.role as "user" | "assistant", content: m.content }))];
        });
      } catch { /* next poll will retry */ }
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, tenantId]);

  /* Scroll to bottom on new message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // FIX 1 (round Q): diagnosed live with full network capture (33 real
    // messages through this exact widget, past both the burst and per-
    // conversation caps) -- every capped response DID come back as a
    // correct 200 with a real `reply` string, and this code DID render it
    // and clear loading every time, so a stuck-forever state could not be
    // reproduced under a normal capped request. The one gap this can't
    // protect against on its own is the underlying fetch() promise never
    // settling at all -- a dropped connection or an infrastructure-level
    // hang on a slow request (e.g. the daily-cap check's real DB query
    // taking unusually long) means fetch() never resolves OR rejects, so
    // neither the try body nor the catch block ever runs, and `finally`
    // (which clears loading) never fires either -- indistinguishable from
    // "stuck on typing forever" to the visitor. AbortController forces a
    // hard ceiling: no matter what happens server-side or on the network,
    // this request settles (as an abort, which the catch below treats like
    // any other network error) within REQUEST_TIMEOUT_MS, guaranteeing
    // `finally` always runs and the input always re-enables.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          tenantId,
          websiteId,
          conversationId,
          message: text,
          channel,
          customerName: "Website Visitor",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Logged for the site owner/developer console -- never shown to the
        // visitor, who still gets a friendly reply below. Common causes: an
        // invalid tenantId in the embed script, or a plan message limit hit.
        console.error("[vela-widget] ai/reply failed:", res.status, data?.error);
      }

      if (data.conversationId) {
        setConversationId(data.conversationId);
        persistConversation(data.conversationId); // every real message refreshes the 48h expiry
      }

      const aiContent = data.reply ?? "I'll get back to you shortly!";
      // Round S fix: only compare against the single MOST RECENT message,
      // not the entire history (see the matching comment in the polling
      // effect above for the false-negative bug that caused). Checking just
      // the last entry still closes the original same-turn race this dedupe
      // exists for -- see the CRITICAL FIX comment above -- because that
      // race always leaves poll()'s duplicate-append as the newest entry at
      // the exact moment this fetch resolves.
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        const alreadyShown = last?.role === "assistant" && last.content === aiContent;
        return alreadyShown ? prev : [...prev, { id: `a-${Date.now()}`, role: "assistant", content: aiContent }];
      });
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === "AbortError";
      console.error(timedOut ? "[vela-widget] request timed out:" : "[vela-widget] network error:", err);
      const errMsgId = `err-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: errMsgId, role: "assistant", content: "Something went wrong. Please try again." },
      ]);
      // Round M5 FIX 6: a client-side TIMEOUT (not a genuine network/offline
      // failure -- the request really did reach the server) doesn't mean the
      // server failed. Vercel serverless execution isn't cancelled just
      // because the client gave up on the HTTP response, and this exact
      // route is provisioned for up to 300s. Check shortly after whether the
      // server actually finished (and possibly booked the appointment) --
      // if a real reply landed, replace the false error with it instead of
      // leaving the customer looking at an error that was never real, and
      // instead of an unrelated "why" follow-up having no real answer to
      // give (nothing genuinely failed server-side in that case).
      if (timedOut && conversationId) {
        setTimeout(async () => {
          try {
            const histRes = await fetch(`/api/widget/history?tenantId=${encodeURIComponent(tenantId)}&conversationId=${encodeURIComponent(conversationId)}${websiteId ? `&websiteId=${encodeURIComponent(websiteId)}` : ""}`);
            const histData = await histRes.json() as { messages?: { role: string; content: string }[] };
            const lastReal = (histData.messages ?? []).filter((m) => m.role === "assistant").slice(-1)[0];
            if (lastReal?.content) {
              setMessages((prev) => {
                const stillShowingError = prev.some((m) => m.id === errMsgId);
                if (!stillShowingError) return prev; // customer already moved on / it self-resolved via polling
                return prev.map((m) => m.id === errMsgId ? { ...m, content: lastReal.content } : m);
              });
            }
          } catch { /* best-effort reconciliation -- the error message stands if this fails too */ }
        }, 4000);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // ── Round M4 FIX 7: structured intake box submit ─────────────────────────
  // A dedicated, deterministic endpoint (not /api/ai/reply) -- this
  // submission IS the explicit confirmation (Fix 6), so the server checks
  // real availability and either books directly or explains unavailability,
  // with no extra "should I confirm?" round trip.
  const submitStructuredBooking = async () => {
    setFormError("");
    const name = formName.trim();
    if (!name) { setFormError("Please enter your name."); return; }
    if (!formPhone.trim()) { setFormError("Please enter your phone number."); return; }
    const isCustom = formService === CUSTOM_SERVICE;
    const service = isCustom ? formCustomService.trim() : formService;
    if (!service) { setFormError("Please choose or describe what you need."); return; }

    setFormSubmitting(true);
    try {
      const res = await fetch("/api/widget/structured-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          websiteId,
          conversationId,
          name,
          phone: `${formPhoneCountry.dial} ${formPhone.trim()}`,
          service,
          date: formDate || undefined,
          time: formTime || undefined,
        }),
      });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; booked?: boolean; message?: string; error?: string; alternatives?: string[]; conversationId?: string };
      if (!res.ok || !data.ok) {
        setFormError(data.error || "Something went wrong. Please try again.");
        return;
      }
      // Round M6 FIX 6(c): structured-booking now creates a real conversation
      // record server-side and returns its id -- adopt it the same way a
      // regular chat reply does, so switching back to chat continues the
      // SAME real thread (history, follow-up, Recent Messages) instead of
      // this submission living only in local, ephemeral component state.
      if (data.conversationId) {
        setConversationId(data.conversationId);
        persistConversation(data.conversationId);
      }
      setFormResult({
        message: data.message || "Thanks, we've got your request!",
        booked: !!data.booked,
        isConflict: Array.isArray(data.alternatives),
      });
      // Also drop the result into the chat thread so switching back to chat
      // shows a coherent history rather than the form result vanishing.
      setMessages((prev) => [...prev, { id: `form-${Date.now()}`, role: "assistant", content: data.message || "Thanks, we've got your request!" }]);
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Round M5 FIX 5: confirmed live -- this used to be a general-purpose
  // "start over" available after ANY result, including a real confirmed
  // booking, letting a customer submit unlimited additional bookings through
  // this form with nothing enforcing the one-active-appointment rule the
  // conversational flow already respects (see existingApptDirective in
  // ai/reply/route.ts). Now only reachable from the conflict result (see the
  // result UI below) -- a real confirmed booking shows no resubmit action at
  // all, only "Back to chat". Keeps name/phone/service (still correct) and
  // only clears date/time, since the customer is choosing a new TIME for the
  // same request, not starting an unrelated one.
  const pickDifferentTime = () => {
    setFormDate(""); setFormTime(""); setFormError(""); setFormResult(null);
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Header */}
      <div className="px-4 py-3.5 flex items-center gap-3 border-b border-[#F3F4F6] shrink-0"
        style={{ background: gradient }}>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {businessName[0]?.toUpperCase() ?? "V"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">{businessName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
            <span className="text-white/75 text-[10px] font-medium">AI Online · Replies instantly</span>
          </div>
        </div>
        {/* FIX: the panel previously had no close control of its own -- the
            only way to close was clicking the floating bubble again, outside
            this iframe. Posts to the parent page (embed/[tenantId]/route.ts
            listens for this), which owns the actual open/closed toggle. */}
        <button
          onClick={() => window.parent.postMessage({ type: "vela-widget-close" }, "*")}
          aria-label="Close chat"
          className="w-7 h-7 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Round M4 FIX 7: structured intake box -- an alternative to typing
          everything conversationally, not a replacement (the chat below
          stays fully functional; this just toggles which is visible). */}
      {mode === "form" ? (
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#F9FAFB]">
          {formResult ? (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm space-y-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${formResult.booked ? "bg-green-50" : "bg-[#FFF5F0]"}`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d={formResult.booked ? "M3 8.5l3 3 7-7" : "M8 5v4M8 11h.01"} stroke={formResult.booked ? "#16A34A" : "#FF6B35"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm text-[#111111] leading-relaxed">{formResult.message}</p>
              <div className="flex gap-2 pt-1">
                {/* Round M5 FIX 5: resubmission is ONLY offered when the
                    original slot was genuinely unavailable -- never after a
                    real confirmed booking, and never as a general "start
                    over" for any other outcome. */}
                {!formResult.booked && formResult.isConflict && (
                  <button onClick={pickDifferentTime}
                    className="flex-1 text-xs font-semibold px-3 py-2 rounded-xl border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] transition-colors">
                    Choose a different time
                  </button>
                )}
                <button onClick={() => setMode("chat")}
                  className="flex-1 text-xs font-semibold px-3 py-2 rounded-xl text-white hover:opacity-90 transition-opacity"
                  style={{ background: gradient }}>
                  Back to chat
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm space-y-3">
              <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide">Quick booking</p>
              <div>
                <label className="text-[11px] font-semibold text-[#374151] block mb-1">Name</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  placeholder="Your name"
                  className="w-full text-sm border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#374151] block mb-1">Phone</label>
                <PhoneInput
                  country={formPhoneCountry}
                  onCountryChange={setFormPhoneCountry}
                  value={formPhone}
                  onChange={setFormPhone}
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#374151] block mb-1">Service</label>
                {trainedServices.length > 0 ? (
                  <select value={formService} onChange={(e) => setFormService(e.target.value)}
                    className="w-full text-sm border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[#111111] bg-white focus:outline-none focus:border-[#FF6B35]/50 transition-colors">
                    {trainedServices.map((s) => <option key={s} value={s}>{s}</option>)}
                    <option value={CUSTOM_SERVICE}>Something else…</option>
                  </select>
                ) : null}
                {(trainedServices.length === 0 || formService === CUSTOM_SERVICE) && (
                  <input type="text" value={formCustomService} onChange={(e) => setFormCustomService(e.target.value)}
                    placeholder="What do you need?"
                    className="w-full text-sm border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors mt-2" />
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-[#374151] block mb-1">Date</label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full text-sm border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111111] focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-[#374151] block mb-1">Time</label>
                  <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)}
                    className="w-full text-sm border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111111] focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
                </div>
              </div>
              {formError && (
                <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setMode("chat")}
                  className="flex-1 text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] transition-colors">
                  Back to chat
                </button>
                <button onClick={submitStructuredBooking} disabled={formSubmitting}
                  className="flex-[2] text-sm font-semibold px-3 py-2.5 rounded-xl text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                  style={{ background: gradient }}>
                  {formSubmitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#F9FAFB]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mr-2 mt-0.5"
                style={{ background: gradient }}>
                AI
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "text-white rounded-br-sm"
                  : "text-[#111111] bg-white border border-[#E5E7EB] rounded-bl-sm shadow-sm"
              }`}
              style={msg.role === "user" ? { background: gradient } : {}}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mr-2 mt-0.5"
              style={{ background: gradient }}>
              AI
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-bl-sm px-3.5 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce"
                    style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-[#F3F4F6] bg-white shrink-0">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type a message…"
            disabled={loading}
            className="flex-1 text-sm border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors disabled:opacity-60"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 hover:opacity-90 disabled:opacity-40 transition-opacity"
            style={{ background: gradient }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8L2 2l3 6-3 6 12-6z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        {/* Round M4 FIX 7: toggle to the structured intake box -- an easier
            alternative for a visitor who'd rather fill a short form than type
            everything out. */}
        <button onClick={() => setMode("form")}
          className="w-full mt-2 text-[11px] font-semibold text-center hover:underline transition-colors"
          style={{ color: accentColor || "#FF6B35" }}>
          Prefer a quick form instead? →
        </button>
      </div>
      </>
      )}

      {/* Powered by Vela -- FIX 6: now reads the real per-tenant setting
          (tenant_config.hide_powered_by), fetched server-side in page.tsx.
          Was previously always shown regardless of Settings, since that
          toggle only ever wrote to the owner's own browser localStorage. */}
      {!hidePoweredBy && (
        <div className="py-2 flex items-center justify-center gap-1.5 bg-white border-t border-[#F9FAFB]">
          <span className="w-3 h-3 rounded-sm flex items-center justify-center text-white text-[8px] font-black"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>V</span>
          <span className="text-[10px] text-[#9CA3AF]">Powered by <span className="font-semibold text-[#6B7280]">Vela AI</span></span>
        </div>
      )}
    </div>
  );
}
