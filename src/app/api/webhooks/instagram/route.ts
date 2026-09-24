import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { sendInstagramMessage } from "@/lib/instagram-send";
import { isDuplicateWebhookMessage } from "@/lib/webhook-idempotency";

// GET: Meta webhook verification challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Fail closed, hardcoded fallback removed; META_WEBHOOK_VERIFY_TOKEN must be set in env.
  // Without it this endpoint cannot safely validate Meta's challenge request.
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error("[webhook/instagram GET] META_WEBHOOK_VERIFY_TOKEN not configured");
    return NextResponse.json({ error: "Service misconfigured" }, { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// ── Rejected-request log rate limiter ───────────────────────────────────────
// Diagnostic round: signature verification now accepts either of two real
// Meta app secrets (see POST below), and every attempt, including rejected
// ones, is logged so a real Meta delivery vs. a misconfigured/forged one
// can be told apart from real evidence instead of guessing. Rejected
// requests are cheap to spam (no secret required to hit the endpoint), so
// only REJECTED-outcome inserts are capped by IP, real, signature-verified
// events always log. Same in-memory per-IP pattern already used throughout
// this codebase (site/track/route.ts, ai/reply/route.ts), no shared
// rate-limit module exists to import.
const REJECT_LOG_RATE_MAP = new Map<string, { count: number; windowStart: number }>();
const REJECT_LOG_RATE_LIMIT = 20;
const REJECT_LOG_WINDOW_MS  = 60_000;

function isRejectLogRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = REJECT_LOG_RATE_MAP.get(ip);
  if (!entry || now - entry.windowStart >= REJECT_LOG_WINDOW_MS) {
    REJECT_LOG_RATE_MAP.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= REJECT_LOG_RATE_LIMIT) return true;
  entry.count++;
  return false;
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

type WebhookOutcome =
  | "accepted"
  | "rejected_no_header"
  | "rejected_bad_signature"
  | "rejected_no_secrets"
  | "handled_no_tenant"
  | "handled_ok";

// webhook_logs' real columns (migration_v5.sql): id, tenant_id, channel,
// event_type, payload (JSONB), processed, created_at, no dedicated
// "outcome" column exists, so outcome metadata is stored inside payload
// (per this round's instruction: never invent schema, ask instead, a
// jsonb column already covers this, so no migration is needed).
//
// Best-effort, wrapped so a logging failure can never change the HTTP
// response Meta receives or block it. Rejected outcomes store metadata
// ONLY, never the raw request body/payload (nothing to leak: an unverified
// request's "payload" isn't trustworthy anyway). Accepted/handled outcomes
// store no more message content than the code already stored before this
// fix, the full verified Meta payload, same as today, with the outcome
// metadata merged alongside it.
async function logWebhookAttempt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  opts: {
    outcome: WebhookOutcome;
    matchedSecret: "main" | "instagram" | null;
    object: string | null;
    entryIds: (string | null)[];
    changeFieldsOrMessagingSeen: string[];
    bodyLength: number;
    tenantId: string | null;
    verifiedPayload?: Record<string, unknown>; // only ever passed for accepted/handled outcomes
    ip: string;
  }
) {
  const isRejected = opts.outcome.startsWith("rejected_");

  console.log(
    `[ig-webhook] outcome=${opts.outcome} object=${opts.object ?? "?"} entries=${opts.entryIds.length} matched=${opts.matchedSecret ?? "none"}`
  );

  if (isRejected && isRejectLogRateLimited(opts.ip)) {
    console.log(`[ig-webhook] rejected-log suppressed, IP rate limit reached`);
    return;
  }

  const metaFields: Record<string, unknown> = {
    outcome: opts.outcome,
    matchedSecret: opts.matchedSecret,
    object: opts.object,
    entryIds: opts.entryIds,
    changeFieldsOrMessagingSeen: opts.changeFieldsOrMessagingSeen,
    bodyLength: opts.bodyLength,
  };

  const payloadToStore = isRejected
    ? metaFields
    : { ...(opts.verifiedPayload ?? {}), ...metaFields };

  try {
    const { error: logErr } = await admin.from("webhook_logs").insert({
      tenant_id: opts.tenantId,
      channel: "instagram",
      event_type: isRejected ? opts.outcome : (opts.object || "unknown"),
      payload: payloadToStore,
      processed: opts.tenantId !== null,
    });
    if (logErr) console.error("[webhook/instagram] log insert failed (non-fatal):", logErr.message);
  } catch (logEx) {
    console.error("[webhook/instagram] log save threw (non-fatal):", logEx instanceof Error ? logEx.message : logEx);
  }
}

// POST: Handle incoming Instagram events
export async function POST(req: NextRequest) {
  const body = await req.text();
  const ip   = getClientIp(req);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  // ── Signature verification, accepts EITHER of our two real Meta app
  // secrets, fail closed ────────────────────────────────────────────────────
  // Diagnostic finding this round: Instagram Business Login lives under a
  // dedicated Meta App (META_INSTAGRAM_APP_ID/SECRET), separate from the
  // general app used for WhatsApp (META_APP_ID/SECRET, confirmed via a live
  // Graph API /{app-id}/subscriptions call to have ONLY a
  // whatsapp_business_account subscription, no "instagram" object at all).
  // Whichever app actually owns the "instagram" object's webhook config in
  // Meta's dashboard is the one whose secret signs real incoming events, 
  // this route no longer assumes it's META_APP_SECRET. Never logs which
  // secret value matched, only a label ("main" | "instagram").
  const candidates: { label: "main" | "instagram"; secret: string }[] = [];
  if (process.env.META_APP_SECRET) candidates.push({ label: "main", secret: process.env.META_APP_SECRET });
  if (process.env.META_INSTAGRAM_APP_SECRET) candidates.push({ label: "instagram", secret: process.env.META_INSTAGRAM_APP_SECRET });

  if (candidates.length === 0) {
    console.error("[webhook/instagram POST] No signing secrets configured (META_APP_SECRET / META_INSTAGRAM_APP_SECRET), rejecting request");
    await logWebhookAttempt(admin, {
      outcome: "rejected_no_secrets", matchedSecret: null, object: null,
      entryIds: [], changeFieldsOrMessagingSeen: [], bodyLength: body.length, tenantId: null, ip,
    });
    return NextResponse.json({ error: "Service misconfigured" }, { status: 500 });
  }

  const signature = req.headers.get("x-hub-signature-256") ?? "";
  if (!signature) {
    await logWebhookAttempt(admin, {
      outcome: "rejected_no_header", matchedSecret: null, object: null,
      entryIds: [], changeFieldsOrMessagingSeen: [], bodyLength: body.length, tenantId: null, ip,
    });
    return NextResponse.json({ error: "Missing signature" }, { status: 403 });
  }

  const sigBuf = Buffer.from(signature);
  let matchedSecret: "main" | "instagram" | null = null;
  for (const candidate of candidates) {
    const expected = "sha256=" + crypto.createHmac("sha256", candidate.secret).update(body).digest("hex");
    const expBuf = Buffer.from(expected);
    // Length-checked first so timingSafeEqual can never throw on a mismatched-length header.
    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      matchedSecret = candidate.label;
      break;
    }
  }

  if (!matchedSecret) {
    await logWebhookAttempt(admin, {
      outcome: "rejected_bad_signature", matchedSecret: null, object: null,
      entryIds: [], changeFieldsOrMessagingSeen: [], bodyLength: body.length, tenantId: null, ip,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    // Unreachable without already knowing a real secret (signature above is
    // already verified at this point), not part of the rejected_* taxonomy
    // since it isn't an auth failure. Response unchanged from before this fix.
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const object = typeof payload.object === "string" ? payload.object : null;

  // ── Resolve tenant + credentials from the Instagram-scoped account id ─────────
  // entry[].id is the Instagram professional account's own id -- the exact
  // value stored in instagram_business_id by the Instagram Business Login
  // callback (auth/instagram/callback/route.ts). REBUILT: previously also
  // read instagram_page_id (a Facebook Page id) here to send replies via
  // graph.facebook.com/{page-id}/messages -- that Page concept doesn't exist
  // in Instagram Business Login. entry.id IS the id to send FROM under the
  // new model (see instagram-send.ts), so no separate id needs to be read
  // back out of tenant_config at all -- only the access token does.
  const entries = (payload.entry as { id?: string; messaging?: unknown[]; changes?: { field?: string }[] }[]) ?? [];
  const entryIds = entries.map((e) => e.id ?? null);
  const changeFieldsOrMessagingSeen = entries.map((e) => {
    const messagingCount = Array.isArray(e.messaging) ? e.messaging.length : 0;
    if (messagingCount > 0) return `messaging:${messagingCount}`;
    if (Array.isArray(e.changes) && e.changes.length) return `changes:${e.changes.map((c) => c.field ?? "?").join(",")}`;
    return "none";
  });
  const anyMessagingSeen = entries.some((e) => Array.isArray(e.messaging) && e.messaging.length > 0);

  let tenantId:      string | null = null;
  let igUserId:      string | null = null;
  let igAccessToken: string | null = null;

  for (const entry of entries) {
    if (!entry.id) continue;
    const { data: cfg } = await admin
      .from("tenant_config")
      .select("tenant_id, instagram_access_token")
      .eq("instagram_business_id", entry.id)
      .maybeSingle();
    if (cfg?.tenant_id) {
      tenantId      = cfg.tenant_id              as string;
      igUserId      = entry.id;
      igAccessToken = cfg.instagram_access_token as string | null;
      break;
    }
  }

  // ── DM reply loop ─────────────────────────────────────────────────────────────
  // Errors at each step are isolated, they must never prevent the 200 ACK to Meta.
  if (tenantId) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

    for (const entry of entries) {
      for (const msg of ((entry.messaging ?? []) as { sender?: { id?: string }; message?: { mid?: string; text?: string } }[])) {
        const senderId = msg?.sender?.id;
        const msgText  = msg?.message?.text ?? "";
        const msgId    = msg?.message?.mid;

        if (!senderId || !msgText) continue;
        if (msgText.length > 2000) continue; // input cap, Hard Rule 2

        // CRITICAL FIX (duplicate messages): same root cause and fix as
        // webhooks/whatsapp, see webhook-idempotency.ts. mid is Meta's
        // own unique message id for this DM.
        if (msgId && isDuplicateWebhookMessage(`ig:${msgId}`)) {
          console.warn("[webhook/instagram] Skipping duplicate delivery of message:", msgId);
          continue;
        }

        let aiReply = "";
        try {
          const aiRes  = await fetch(`${appUrl}/api/ai/reply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tenantId,
              message: msgText,
              channel: "instagram",
              customerName: senderId,
            }),
          });
          const aiData = await aiRes.json() as { reply?: string };
          aiReply = aiData.reply ?? "";
        } catch (err) {
          console.error("[webhook/instagram] AI reply error for tenant", tenantId, ":", err);
          continue;
        }

        if (!aiReply) continue;

        if (!igUserId || !igAccessToken) {
          // Credentials missing, tenant connected under the old Facebook-
          // Page-based method (or before this rebuild), so there's no
          // Instagram Business Login token stored. They must reconnect
          // Instagram to get a real Instagram User access token.
          console.warn("[webhook/instagram] Missing Instagram Business Login credentials for tenant", tenantId,
            ", user must reconnect Instagram");
          continue;
        }

        try {
          await sendInstagramMessage(igUserId, igAccessToken, senderId, aiReply);
        } catch (err) {
          console.error("[webhook/instagram] Send reply error for tenant", tenantId, ":", err);
        }
      }
    }
  }

  // ── Log this verified attempt, FIX 2 ───────────────────────────────────────
  const outcome: WebhookOutcome = tenantId ? "handled_ok" : anyMessagingSeen ? "handled_no_tenant" : "accepted";
  await logWebhookAttempt(admin, {
    outcome, matchedSecret, object, entryIds, changeFieldsOrMessagingSeen,
    bodyLength: body.length, tenantId, verifiedPayload: payload, ip,
  });

  // Acknowledge immediately (Meta requires 200 within 20s)
  return NextResponse.json({ ok: true });
}
