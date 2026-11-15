"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { STATUSES, type Lead } from "@/lib/types";

const ROUTE: Record<string, string> = { A: "Owner direct", B: "Business WhatsApp, for the owner", C: "Instagram DM to the business" };
const safe = (u: string | null | undefined) => { try { const x = new URL(String(u)); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };
const waDigits = (p: string | null | undefined) => { let d = String(p ?? "").replace(/\D/g, "").replace(/^00/, ""); if (d.length === 8) d = `974${d}`; return d.length >= 10 ? d : ""; };

/** Signed URLs are made on demand (1 hour), only when you press play. */
function Player({ path, label }: { path: string; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState("");
  if (src) return <audio controls autoPlay src={src} />;
  return (
    <button className="btn small" onClick={async () => {
      const { data, error } = await supabaseBrowser().storage.from("sales-audio").createSignedUrl(path, 3600);
      if (error || !data) setErr("Audio not available yet"); else setSrc(data.signedUrl);
    }}>{err || `Play ${label}`}</button>
  );
}

export default function LeadCard({ lead: l, queue, toast }: { lead: Lead; queue: (task: string, params: Record<string, unknown>, done?: string) => void; toast: (m: string) => void }) {
  const copy = async (t: string, what: string) => { try { await navigator.clipboard.writeText(t); toast(`${what} copied`); } catch { toast("Copy failed"); } };
  const due = l.followup_due ? l.message?.followups?.find((f) => f.day === l.followup_due) : null;
  const ar = due?.ar ?? l.message?.ar ?? "", en = due?.en ?? l.message?.en ?? "";
  const wa = l.route === "A" && l.direct_type === "whatsapp" ? waDigits(l.direct_contact) : waDigits(l.whatsapp_public);
  const text = l.message?.send_lang === "en" ? en : l.message?.send_lang === "ar" ? ar : [ar, en].filter(Boolean).join("\n\n");
  const ev = l.evidence ?? {};
  const facts = [l.google_rating && `${l.google_rating} on Google${l.google_reviews ? `, ${l.google_reviews} reviews` : ""}`, ev.branches && `${ev.branches} branch(es)`, ev.staff, l.closing_time && `closes ${l.closing_time}`, l.area].filter(Boolean).join(" · ");
  const locked = l.status === "do-not-contact";

  return (
    <article className="card lead">
      <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
        <span className={`score${(l.score ?? 0) >= 7 ? "" : " lo"}`}>{l.score ?? "?"}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong>{l.name}</strong>
          <div className="muted">{l.niche} {facts ? `· ${facts}` : ""}</div>
        </div>
        <span className={`status ${l.status}`}>{l.status}</span>
      </div>
      {due ? <span className="pill o">Follow-up day {due.day}{due.adds ? `: ${due.adds}` : ""}</span> : null}
      <div className="row">
        {l.route ? <span className="route" title={ROUTE[l.route]}>{l.route}</span> : null}
        <span>{l.owner_name ? <strong>{l.owner_name}</strong> : <span className="muted">Owner not found</span>}{l.owner_role ? <span className="muted">, {l.owner_role}</span> : null}</span>
        {l.owner_confidence ? <span className="muted">({l.owner_confidence})</span> : null}
        {safe(l.owner_source) ? <a href={safe(l.owner_source)!} target="_blank" rel="noopener noreferrer" className="muted">source</a> : null}
      </div>
      {l.route ? <div className="muted">{ROUTE[l.route]}</div> : null}
      {l.why_fits ? <><div className="k">Why it fits</div><div>{l.why_fits}</div></> : null}
      {l.after_hours ? <div className="muted">After hours: {l.after_hours}</div> : null}
      {(ev.unanswered_comments?.length || ev.slow_reply_reviews?.length || ev.other_evidence?.length) ? (
        <>
          <div className="k">Evidence</div>
          <ul className="ev">
            {[...(ev.unanswered_comments ?? []), ...(ev.slow_reply_reviews ?? [])].slice(0, 4).map((q, i) => <li key={`q${i}`}>&ldquo;{q.quote}&rdquo; {safe(q.link) ? <a href={safe(q.link)!} target="_blank" rel="noopener noreferrer">link</a> : null}</li>)}
            {(ev.other_evidence ?? []).slice(0, 4).map((f, i) => typeof f === "string" ? <li key={`f${i}`}>{f}</li> : <li key={`f${i}`}>{f.fact} {safe(f.link) ? <a href={safe(f.link)!} target="_blank" rel="noopener noreferrer">link</a> : null}</li>)}
          </ul>
        </>
      ) : null}
      {l.check_result?.summary ? <div className="muted">After-hours check: {l.check_result.summary}</div> : null}
      {ar ? <><div className="k">Message, Arabic</div><div className="msg" dir="rtl">{ar}</div><button className="btn small" onClick={() => copy(ar, "Arabic")}>Copy Arabic</button></> : null}
      {en ? <><div className="k">Message, English</div><div className="msg">{en}</div><button className="btn small" onClick={() => copy(en, "English")}>Copy English</button></> : null}
      {l.audio?.voice_note || l.audio?.call ? (
        <div className="stack">
          {l.audio.voice_note ? <Player path={l.audio.voice_note} label="voice note" /> : null}
          {l.audio.call ? <Player path={l.audio.call} label="sample call" /> : null}
        </div>
      ) : null}
      <div className="row">
        {wa && text ? <a className="btn small primary" href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">Open WhatsApp</a> : null}
        {safe(l.instagram) ? <a className="btn small" href={safe(l.instagram)!} target="_blank" rel="noopener noreferrer">Open Instagram</a> : null}
        {l.route === "A" && safe(l.direct_contact) ? <a className="btn small" href={safe(l.direct_contact)!} target="_blank" rel="noopener noreferrer">Open owner profile</a> : null}
        {safe(l.demo_url) ? <a className="btn small" href={safe(l.demo_url)!} target="_blank" rel="noopener noreferrer">Demo page</a> : null}
        {l.message ? <button className="btn small" onClick={() => queue("rewrite", { slug: l.slug }, `Rewrite queued for ${l.name}`)}>Rewrite</button> : null}
      </div>
      <div className="row">
        {STATUSES.map((s) => (
          <button key={s} className={`btn small${s === "do-not-contact" ? " danger" : ""}`} disabled={locked || l.status === s}
            onClick={() => {
              if (s === "do-not-contact" && !confirm(`Mark ${l.name} as do not contact? This is permanent.`)) return;
              queue("log", { slug: l.slug, status: s }, `${l.name}: ${s} (applies when the laptop syncs)`);
            }}>{s.replace(/-/g, " ")}</button>
        ))}
      </div>
    </article>
  );
}
