/**
 * Twilio voice helpers for the Vela front door (/api/voice/*).
 *
 * TWILIO_AUTH_TOKEN signs every webhook and authenticates REST calls. It is
 * never logged. Without it every webhook is refused (fail closed).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import crypto from "crypto";
import { NextRequest } from "next/server";
import { TENANT_PHONE_COLS, type TenantPhoneCfg } from "@/lib/phone-call-setup";

const TWILIO_API = "https://api.twilio.com/2010-04-01";

/** Twilio's documented algorithm: HMAC-SHA1 of URL + sorted key/value pairs. */
export function computeTwilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const joined = Object.keys(params).sort().reduce((acc, k) => acc + k + (params[k] ?? ""), "");
  return crypto.createHmac("sha1", authToken).update(url + joined, "utf8").digest("base64");
}

function signaturesMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Validates X-Twilio-Signature and returns the signed form params, or null. */
export async function readSignedTwilioRequest(req: NextRequest): Promise<Record<string, string> | null> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("[twilio-voice] TWILIO_AUTH_TOKEN not configured, refusing webhook");
    return null;
  }
  const signature = req.headers.get("x-twilio-signature") ?? "";
  if (!signature) return null;

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const url = `${proto}://${host}${req.nextUrl.pathname}${req.nextUrl.search}`;

  const params: Record<string, string> = {};
  new URLSearchParams(await req.text()).forEach((v, k) => { params[k] = v; });

  return signaturesMatch(computeTwilioSignature(authToken, url, params), signature) ? params : null;
}

export function forbidden(): Response {
  return new Response("Forbidden", { status: 403 });
}

export function twiml(xml: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>${xml}`, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// Gulf Arabic and English neural voices, played by Twilio itself, so this
// still works when Vapi is out of credit or down.
const SAY_AR = `<Say voice="Polly.Hala-Neural" language="ar-AE">`;
const SAY_EN = `<Say voice="Polly.Joanna-Neural" language="en-US">`;

function appBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://velaos.co").trim().replace(/\/+$/, "");
}

/**
 * The polite message every caller hears when the AI can't answer. Never
 * mentions credits, plans or errors. With no known business there is nowhere
 * to save a message, so it only apologizes.
 */
export function politeVoicemailTwiml(businessName: string | null): Response {
  if (!businessName) {
    return twiml(`<Response>${SAY_AR}شكرًا لاتصالك. ما نقدر نرد على مكالمتك الحين، حاول مرة ثانية بعد شوي.</Say>${SAY_EN}Thanks for calling. We can't take your call right now. Please try again a little later.</Say><Hangup/></Response>`);
  }
  const name = esc(businessName);
  const base = appBase();
  const action = esc(`${base}/api/voice/twilio-voicemail?step=done`);
  const callback = esc(`${base}/api/voice/twilio-voicemail?step=recording`);
  return twiml(
    `<Response>` +
    `${SAY_AR}شكرًا لاتصالك بـ ${name}. ما نقدر نرد على مكالمتك الحين. اترك اسمك ورقمك بعد الصافرة، وبنرجع نتصل فيك.</Say>` +
    `${SAY_EN}Thanks for calling ${name}. We can't take your call right now. Please leave your name and number after the tone and we'll call you back.</Say>` +
    `<Record maxLength="60" timeout="5" playBeep="true" trim="trim-silence" action="${action}" method="POST" recordingStatusCallback="${callback}" recordingStatusCallbackMethod="POST" recordingStatusCallbackEvent="completed"/>` +
    `<Hangup/>` +
    `</Response>`,
  );
}

export function goodbyeTwiml(): Response {
  return twiml(`<Response>${SAY_AR}شكرًا لك، مع السلامة.</Say>${SAY_EN}Thank you, goodbye.</Say><Hangup/></Response>`);
}

// Values carriers/Twilio use for a withheld caller ID. These look like real
// numbers, so they must not be treated as one.
const WITHHELD = new Set(["+266696687", "+86282452253", "+7378742833", "+2562533", "+8656696", "anonymous", "restricted", "unknown", "unavailable", "blocked", ""]);

/** E.164 caller number, or null when withheld or unusable. */
export function normalizeTwilioCaller(from: string | null | undefined): string | null {
  const v = (from ?? "").trim();
  if (WITHHELD.has(v.toLowerCase())) return null;
  return /^\+[1-9]\d{6,14}$/.test(v) ? v : null;
}

/** The one tenant linked to the called number, resolved server side only. */
export async function findTenantByCalledNumber(admin: any, to: string | undefined): Promise<TenantPhoneCfg | null> {
  if (!to) return null;
  const { data, error } = await admin.from("tenant_config").select(TENANT_PHONE_COLS).eq("vapi_phone_number", to).limit(2);
  if (error) throw new Error(`tenant lookup failed: ${error.message}`);
  if (!data || data.length !== 1) {
    if (data && data.length > 1) console.error("[twilio-voice] called number is linked to more than one tenant");
    return null;
  }
  return data[0] as TenantPhoneCfg;
}

function basicAuth(accountSid: string, authToken: string): string {
  return "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
}

/** From/To of a call (Twilio's recording callback doesn't include them). */
export async function fetchTwilioCall(accountSid: string, callSid: string): Promise<{ from: string; to: string } | null> {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !/^AC[0-9a-f]{32}$/i.test(accountSid) || !/^CA[0-9a-f]{32}$/i.test(callSid)) return null;
  const res = await fetch(`${TWILIO_API}/Accounts/${accountSid}/Calls/${callSid}.json`, {
    headers: { Authorization: basicAuth(accountSid, token) },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) { console.warn("[twilio-voice] call lookup failed:", res.status); return null; }
  const j = await res.json() as { from?: string; to?: string };
  return { from: j.from ?? "", to: j.to ?? "" };
}

/** Downloads a recording as MP3, using the account's credentials. */
export async function fetchTwilioRecording(accountSid: string, recordingSid: string): Promise<ArrayBuffer | null> {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !/^AC[0-9a-f]{32}$/i.test(accountSid) || !/^RE[0-9a-f]{32}$/i.test(recordingSid)) return null;
  const res = await fetch(`${TWILIO_API}/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`, {
    headers: { Authorization: basicAuth(accountSid, token) },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) { console.warn("[twilio-voice] recording download failed:", res.status); return null; }
  return res.arrayBuffer();
}

/**
 * Points the Twilio number at Vela. Importing a number into Vapi overwrites
 * Twilio's Voice URL, so Connect / Re-sync restores it. Needs
 * TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN; otherwise it reports "skipped".
 */
export async function pointTwilioNumberAtVela(phoneNumber: string): Promise<"updated" | "skipped" | "not_found" | "failed"> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return "skipped";
  const auth = basicAuth(sid, token);
  try {
    const list = await fetch(`${TWILIO_API}/Accounts/${sid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`, {
      headers: { Authorization: auth }, signal: AbortSignal.timeout(8000),
    });
    if (!list.ok) { console.warn("[twilio-voice] number lookup failed:", list.status); return "failed"; }
    const found = ((await list.json()) as { incoming_phone_numbers?: Array<{ sid: string }> }).incoming_phone_numbers?.[0];
    if (!found) return "not_found";
    const base = appBase();
    const res = await fetch(`${TWILIO_API}/Accounts/${sid}/IncomingPhoneNumbers/${found.sid}.json`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        VoiceUrl: `${base}/api/voice/twilio-inbound`,
        VoiceMethod: "POST",
        VoiceFallbackUrl: `${base}/api/voice/twilio-fallback`,
        VoiceFallbackMethod: "POST",
      }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { console.warn("[twilio-voice] number update failed:", res.status); return "failed"; }
    return "updated";
  } catch (err) {
    console.warn("[twilio-voice] number update error:", (err as Error)?.message);
    return "failed";
  }
}
