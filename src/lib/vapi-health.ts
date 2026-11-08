/**
 * Vapi health for the Vela front door, and owner alerts.
 *
 * Vapi exposes no balance read for API keys (/org and billing routes need a
 * dashboard login). What it does do, verified live: POST /call answers with
 * "Your Wallet Balance is X. Please Purchase More Credits..." when the wallet
 * is out, before anything else, and creates no call. So:
 *  - a real hand-off that fails tells us immediately;
 *  - an empty POST /call is a free scheduled probe.
 * Consequence: Vela sees the balance only once Vapi refuses calls, not while
 * it is still positive. Early warning needs Vapi's own auto-reload.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createNotification } from "@/lib/notifications";

const VAPI_CALL = "https://api.vapi.ai/call";

export const LOW_BALANCE_USD = 3;

function messageOf(body: any): string {
  const m = body?.message;
  return Array.isArray(m) ? m.join("; ") : String(m ?? "");
}

function isWalletError(msg: string): boolean {
  return /wallet balance|purchase more credits|insufficient credits/i.test(msg);
}

function parseBalance(msg: string): number | null {
  const m = msg.match(/wallet balance is\s*(-?\d+(?:\.\d+)?)/i);
  return m ? parseFloat(m[1]) : null;
}

export type VapiWalletState =
  | { state: "ok" }
  | { state: "empty"; balance: number | null }
  | { state: "unreachable"; detail: string };

/** Free check: creates no call. Any non-wallet 4xx means Vapi would proceed. */
export async function probeVapiWallet(): Promise<VapiWalletState> {
  const key = process.env.VAPI_API_KEY;
  if (!key) return { state: "unreachable", detail: "VAPI_API_KEY not configured" };
  try {
    const res = await fetch(VAPI_CALL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(6000),
    });
    const body = await res.json().catch(() => ({}));
    const msg = messageOf(body);
    if (isWalletError(msg)) return { state: "empty", balance: parseBalance(msg) };
    if (res.status === 401 || res.status === 403) return { state: "unreachable", detail: `auth rejected (${res.status})` };
    if (res.status >= 500) return { state: "unreachable", detail: `HTTP ${res.status}` };
    return { state: "ok" };
  } catch (err) {
    return { state: "unreachable", detail: (err as Error)?.name ?? "network error" };
  }
}

export type HandOffResult =
  | { ok: true; twiml: string; callId: string | null }
  | { ok: false; reason: "wallet"; balance: number | null }
  | { ok: false; reason: "unreachable" | "rejected"; detail: string };

/**
 * Asks Vapi to take this Twilio call (Vapi's documented "call queue
 * management with Twilio" flow): phoneCallProviderBypassEnabled returns the
 * TwiML that connects the live call, instead of Vapi dialing anyone.
 */
export async function handOffToVapi(p: {
  phoneNumberId: string;
  callerNumber: string | null;
  assistant: unknown;
}): Promise<HandOffResult> {
  const key = process.env.VAPI_API_KEY;
  if (!key) return { ok: false, reason: "unreachable", detail: "VAPI_API_KEY not configured" };
  try {
    const res = await fetch(VAPI_CALL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumberId: p.phoneNumberId,
        phoneCallProviderBypassEnabled: true,
        ...(p.callerNumber ? { customer: { number: p.callerNumber } } : {}),
        assistant: p.assistant,
      }),
      // Twilio waits 15s for a webhook; leave room to answer with voicemail.
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json().catch(() => ({})) as any;
    if (!res.ok) {
      const msg = messageOf(body);
      if (isWalletError(msg)) return { ok: false, reason: "wallet", balance: parseBalance(msg) };
      if (res.status >= 500) return { ok: false, reason: "unreachable", detail: `HTTP ${res.status}` };
      return { ok: false, reason: "rejected", detail: `${res.status} ${msg.slice(0, 200)}` };
    }
    const xml = body?.phoneCallProviderDetails?.twiml;
    if (typeof xml !== "string" || !xml.includes("<Response")) {
      return { ok: false, reason: "rejected", detail: "no TwiML in Vapi response" };
    }
    return { ok: true, twiml: xml, callId: (body?.id as string | undefined) ?? null };
  } catch (err) {
    return { ok: false, reason: "unreachable", detail: (err as Error)?.name ?? "network error" };
  }
}

/** Sends one email through Resend. Returns false (never throws) on failure. */
export async function sendAlertEmail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL ?? "Vela <no-reply@velaos.co>", to: [to], subject, text }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) console.warn("[vapi-health] email failed:", res.status);
    return res.ok;
  } catch (err) {
    console.warn("[vapi-health] email error:", (err as Error)?.name);
    return false;
  }
}

let lastEmailOnlyAlert = 0;

/**
 * Alerts the PLATFORM owner (PLATFORM_ALERT_EMAIL), in-app and by email, at
 * most once per dedupeHours for the same title. Tenants never see this.
 */
export async function alertPlatformOwner(admin: any, title: string, body: string, dedupeHours = 6): Promise<"sent" | "deduped" | "not_configured"> {
  const email = (process.env.PLATFORM_ALERT_EMAIL ?? "").trim().toLowerCase();
  if (!email) {
    console.error("[vapi-health] PLATFORM_ALERT_EMAIL not set, alert not delivered:", title);
    return "not_configured";
  }

  let tenantId: string | null = null;
  try {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const user = (data?.users ?? []).find((u: any) => (u.email ?? "").toLowerCase() === email);
    if (user) {
      const { data: t } = await admin.from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
      tenantId = t?.id ?? null;
    }
  } catch (err) {
    console.warn("[vapi-health] owner lookup failed:", (err as Error)?.message);
  }

  if (tenantId) {
    const since = new Date(Date.now() - dedupeHours * 3600_000).toISOString();
    const { data: recent } = await admin.from("notifications").select("id").eq("tenant_id", tenantId).eq("title", title).gte("created_at", since).limit(1);
    if (recent && recent.length > 0) return "deduped";
    await createNotification(admin, { tenantId, type: "missed_call", title, body, link: "/app/ai-agent/overview" });
  } else {
    // No Vela account for that address: email only, throttled per instance.
    if (Date.now() - lastEmailOnlyAlert < dedupeHours * 3600_000) return "deduped";
    lastEmailOnlyAlert = Date.now();
  }
  await sendAlertEmail(email, `Vela alert: ${title}`, body);
  return "sent";
}

/** Shared alert text for an empty or unreachable Vapi. */
export function vapiAlertFor(reason: "wallet" | "unreachable" | "rejected", detail: string | number | null): { title: string; body: string } {
  if (reason === "wallet") {
    return {
      title: "Phone agent offline: Vapi credit is out",
      body: `Vapi refused calls${typeof detail === "number" ? ` (balance $${detail.toFixed(2)})` : ""}. Callers are going to voicemail. Add credit in the Vapi dashboard and turn on auto-reload.`,
    };
  }
  return {
    title: "Phone agent offline: Vapi is not accepting calls",
    body: `Vapi ${reason === "rejected" ? "rejected" : "could not be reached for"} a call hand-off (${detail ?? "unknown"}). Callers are going to voicemail.`,
  };
}
