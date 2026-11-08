/**
 * Shared Vapi webhook wiring for the real inbound phone agent.
 *
 * Every Vapi object that can call back into Vela (the tenant's assistant, the
 * tenant's phone number, the transient per-call assistant returned from
 * assistant-request, and the book_appointment tool) gets the SAME server
 * config: { url, headers: { "x-vapi-secret": VAPI_WEBHOOK_SECRET } }, which
 * call-webhook/route.ts verifies (timing-safe, fail-closed). Before this
 * module, nothing ever handed the secret to Vapi, so even with
 * VAPI_WEBHOOK_SECRET set in Vercel every webhook call would have been
 * rejected.
 *
 * Why a header and not server.secret: Vapi's current Server schema has no
 * `secret` field (url, headers, credentialId, timeoutSeconds, backoffPlan,
 * ...). Verified against api.vapi.ai/api-json and a real create+read: a
 * `server.secret` on an assistant is silently dropped. `server.headers` is
 * documented as "the headers to include in the request", so the header
 * name our webhook already checks is sent explicitly.
 */

export const BOOK_APPOINTMENT_TOOL = "book_appointment";
export const DEFAULT_TENANT_TIMEZONE = "Asia/Qatar";
export const VAPI_SECRET_HEADER = "x-vapi-secret";

export interface VapiServerConfig {
  url: string;
  headers: Record<string, string>;
}

/** The tenant-scoped webhook URL, always on the canonical app domain. */
export function buildCallWebhookUrl(tenantId: string): string | null {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "");
  if (!/^https:\/\//.test(appUrl)) return null;
  return `${appUrl}/api/ai-agent/call-webhook?tenantId=${encodeURIComponent(tenantId)}`;
}

/**
 * Returns the server config Vapi must use for this tenant, or a reason it
 * can't be built. Never returns a partial config: a webhook URL without the
 * secret would be rejected by our own fail-closed check on every call.
 */
export function getVapiServerConfig(
  tenantId: string,
): { ok: true; server: VapiServerConfig } | { ok: false; reason: string } {
  const url = buildCallWebhookUrl(tenantId);
  if (!url) return { ok: false, reason: "NEXT_PUBLIC_APP_URL is not a valid https URL" };
  const secret = process.env.VAPI_WEBHOOK_SECRET ?? "";
  if (!secret) return { ok: false, reason: "VAPI_WEBHOOK_SECRET is not configured" };
  return { ok: true, server: { url, headers: { [VAPI_SECRET_HEADER]: secret } } };
}

/** The book_appointment function tool, served by our webhook. */
export function buildBookAppointmentTool(server: VapiServerConfig) {
  return {
    type: "function" as const,
    async: false,
    server,
    messages: [{ type: "request-start" as const, content: "" }],
    function: {
      name: BOOK_APPOINTMENT_TOOL,
      description:
        "Books an appointment in the business's real calendar. Call this ONLY after the caller has confirmed ALL details out loud: their name, their phone number (read back digit by digit and confirmed), the service, the date and the time. The result tells you whether it was booked or the time is taken (with real free alternatives). Always tell the caller exactly what the result says.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "Caller's full name as they said it." },
          customer_phone: { type: "string", description: "Caller's phone number exactly as they confirmed it, with country code if they gave one (e.g. +974 5512 3456)." },
          service: { type: "string", description: "The service being booked, using the exact service name from the business knowledge when one matches." },
          date: { type: "string", description: "Appointment date as YYYY-MM-DD, resolved from what the caller said using today's date in the business's timezone." },
          time: { type: "string", description: "Appointment start time as 24-hour HH:MM in the business's local time (e.g. 15:30)." },
        },
        required: ["customer_name", "customer_phone", "service", "date", "time"],
      },
    },
  };
}

/** A valid IANA timezone from agent settings, else Asia/Qatar. */
export function resolveTenantTimezone(settings: Record<string, unknown> | null | undefined): string {
  const tz = typeof settings?.timezone === "string" ? settings.timezone.trim() : "";
  if (tz) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return tz;
    } catch { /* invalid, fall through */ }
  }
  return DEFAULT_TENANT_TIMEZONE;
}

/**
 * "Now" in the tenant's timezone, expressed in this app's appointment storage
 * convention: literal local wall-clock digits with a Z suffix (see
 * lib/availability.ts and appointments/page.tsx, which display with
 * timeZone "UTC"). A 15:00 Doha booking is stored as ...T15:00:00.000Z.
 */
export function wallClockNow(timezone: string): { date: string; time: string; weekday: string; asDate: Date } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    weekday: "long",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${get("hour")}:${get("minute")}`;
  return { date, time, weekday: get("weekday"), asDate: new Date(`${date}T${time}:00.000Z`) };
}

/** One line the phone prompt uses to resolve "today" / "tomorrow" correctly. */
export function wallClockNowText(timezone: string): string {
  const n = wallClockNow(timezone);
  return `Today is ${n.weekday}, ${n.date}, and the current local time is ${n.time} (${timezone}).`;
}

const ANONYMOUS_RE = /anonymous|unknown|private|restricted|unavailable|withheld/i;

function digitsOf(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

/** True when two numbers are the same line (exact digits, or same last 8 digits). */
export function samePhoneLine(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = digitsOf(a);
  const db = digitsOf(b);
  if (!da || !db) return false;
  if (da === db) return true;
  return da.length >= 8 && db.length >= 8 && da.slice(-8) === db.slice(-8);
}

/**
 * Whether the caller ID Vapi reports can be trusted as the caller's own
 * number. A forwarded call often arrives with the business's own number (the
 * forwarding line), the bridge number, or no/anonymous caller ID: merging on
 * those would collapse every caller into one lead.
 */
export function isReliableCallerId(
  callerNumber: string | null | undefined,
  businessNumbers: Array<string | null | undefined>,
): boolean {
  if (!callerNumber || ANONYMOUS_RE.test(callerNumber)) return false;
  if (digitsOf(callerNumber).length < 7) return false;
  return !businessNumbers.some((b) => samePhoneLine(callerNumber, b));
}

const SECRETISH_KEY = /secret|token|auth|password|credential|apikey|api_key|key$/i;
const CALLER_KEY = /forward|divert|diversion|sip|carrier|caller|^from$|^to$|ani$|dnis|header|cnam|customer|number$|transport|provider/i;
const SKIP_SUBTREES = new Set(["assistant", "assistantOverrides", "squad", "artifact", "messages", "transcript", "analysis", "server", "costs", "costBreakdown", "monitor", "tools"]);

/**
 * Collects every caller-identity-looking primitive field from a Vapi call
 * payload (customer.number, SIP/forwarding/carrier fields, provider ids) so
 * the first real forwarded Qatar call shows exactly what the carrier passes.
 * Never includes secret/token/auth-looking keys or the assistant/server
 * subtrees (where the x-vapi-secret header lives).
 */
export function collectCallerFields(root: unknown, maxEntries = 40): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (node: unknown, path: string, depth: number) => {
    if (Object.keys(out).length >= maxEntries || depth > 5 || node === null || node === undefined) return;
    if (typeof node !== "object") return;
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (v === undefined || SECRETISH_KEY.test(k) || SKIP_SUBTREES.has(k)) continue;
      const p = path ? `${path}.${k}` : k;
      if (v !== null && typeof v === "object") {
        walk(v, p, depth + 1);
      } else if (CALLER_KEY.test(k) || /customer|phoneNumber|sip|forward|header/i.test(path)) {
        out[p] = String(v).slice(0, 120);
      }
    }
  };
  walk(root, "", 0);
  return out;
}
