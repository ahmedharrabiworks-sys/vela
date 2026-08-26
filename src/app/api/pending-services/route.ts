import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { checkAvailability, DEFAULT_SLOT_MINUTES } from "@/lib/availability";
import { sendCustomerMessage } from "@/lib/send-customer-message";
import type { KnowledgeBase } from "@/app/api/ai-training/route";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

const DEFAULT_KB: KnowledgeBase = {
  services: [],
  faqs: [],
  business: { hours: "", address: "", bookingPolicy: "", tone: "professional" },
  extra: "",
};

// Round M8 FIX 3(a): the owner's own typed input for a confirmed untrained
// service (e.g. "100 dollar monthly for 3 years or 300 dollar once", or a
// casually-cased service name) was stored verbatim into the knowledge base,
// reading like a copy-pasted note rather than a real trained service entry
// -- inconsistent with every other service, which is written in a clean,
// professional format. A ONE-TIME admin action (not a per-message
// conversation cost), so a real AI rewrite is acceptable here -- explicitly
// a light cleanup/normalization pass, never inventing a price/duration/name
// that wasn't in the owner's own input. Fails open: any error, empty
// response, or missing API key just falls back to the owner's raw text
// unchanged -- cleanup is a real improvement when it works, never a reason
// to block the save.
async function cleanServiceEntry(rawName: string, rawPrice: string, rawDuration: string): Promise<{ name: string; price: string; duration: string }> {
  const fallback = { name: rawName.trim(), price: rawPrice.trim(), duration: rawDuration.trim() };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;
  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Clean up these three fields for a business's service list so they read professionally, exactly like a real price list -- but NEVER invent, add, or guess any price/duration/detail that isn't already present in the input. Only rephrase/reformat/re-case what's actually there.
- name: proper title case, concise, no filler words.
- price: if it describes multiple real options (e.g. "100 dollar monthly for 3 years or 300 dollar once"), format as a short structured summary using only those real numbers (e.g. "$100/month (3-year term) or $300 one-time"). If it's a single simple price, just format it cleanly (e.g. "$100" not "100 dollar").
- duration: clean formatting only (e.g. "30 minutes" not "30 min" or "half hour" -> "30 minutes" only if that's literally what was said -- otherwise keep the stated unit).
Reply ONLY valid JSON: {"name": "...", "price": "...", "duration": "..."}.`,
        },
        { role: "user", content: JSON.stringify({ name: rawName, price: rawPrice, duration: rawDuration }) },
      ],
      max_tokens: 150,
      temperature: 0,
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as { name?: string; price?: string; duration?: string };
    return {
      name: parsed.name?.trim() || fallback.name,
      price: parsed.price?.trim() || fallback.price,
      duration: parsed.duration?.trim() || fallback.duration,
    };
  } catch (err) {
    console.error("[pending-services] cleanServiceEntry failed, using raw input:", err instanceof Error ? err.message : err);
    return fallback;
  }
}

// Round M6 FIX 6(b): real, owner-scoped queue of customer-requested services
// that aren't trained yet. GET lists pending rows (Train Your AI surfaces
// these with Dismiss / Add-as-service actions). POST performs one of those
// two actions on a single row.

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  const admin = createSupabaseAdmin() as AdminClient;

  const { data, error } = await admin
    .from("pending_service_requests")
    .select("id, service_name, created_at, leads(name, phone)")
    .eq("tenant_id", tenant.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    // Table not migrated yet -- honest empty state, never a fake list.
    if (error.code === "PGRST205" || error.code === "42P01") {
      return NextResponse.json({ requests: [] });
    }
    console.error("[pending-services] list error:", error.code, error.message);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }

  type Row = { id: string; service_name: string; created_at: string; leads?: { name: string | null; phone: string | null } | null };
  const requests = ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    serviceName: r.service_name,
    createdAt: r.created_at,
    leadName: r.leads?.name ?? null,
    leadPhone: r.leads?.phone ?? null,
  }));

  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { id?: string; action?: "dismiss" | "add"; price?: string; duration?: string };
  if (!body.id || (body.action !== "dismiss" && body.action !== "add")) {
    return NextResponse.json({ error: "id and a valid action are required" }, { status: 400 });
  }

  const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  const admin = createSupabaseAdmin() as AdminClient;

  const { data: row } = await admin
    .from("pending_service_requests")
    .select("id, service_name, lead_id")
    .eq("id", body.id)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  if (body.action === "dismiss") {
    await admin.from("pending_service_requests").update({ status: "dismissed" }).eq("id", body.id).eq("tenant_id", tenant.id);
    return NextResponse.json({ ok: true });
  }

  // action === "add": price AND duration are the two real required fields
  // the AI doesn't already have -- every other trained service already
  // stores duration (the booking/availability logic reads it, see
  // checkAvailability's serviceDuration lookup), so a service added here
  // without one behaves inconsistently with every other trained service.
  // Round M7 FIX 3(a): duration was previously not even asked for.
  const price = (body.price ?? "").trim();
  const duration = (body.duration ?? "").trim();
  if (!price) return NextResponse.json({ error: "Price is required to add this as a service." }, { status: 400 });
  if (!duration) return NextResponse.json({ error: "Duration is required to add this as a service." }, { status: 400 });

  const { data: cfg } = await admin
    .from("tenant_config")
    .select("knowledge_base")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  let kb: KnowledgeBase = DEFAULT_KB;
  if (cfg?.knowledge_base) {
    try { kb = { ...DEFAULT_KB, ...JSON.parse(cfg.knowledge_base as string) }; } catch { /* malformed, fall back to default */ }
  }

  const rawName = (row as { service_name: string }).service_name;
  const cleaned = await cleanServiceEntry(rawName, price, duration);
  const newService = { name: cleaned.name, price: cleaned.price, duration: cleaned.duration, description: "" };
  const saveKb: KnowledgeBase = { ...kb, services: [...kb.services, newService] };

  const { error: saveErr } = await admin.from("tenant_config").upsert(
    {
      tenant_id: tenant.id,
      knowledge_base: JSON.stringify(saveKb),
      knowledge_base_updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" }
  );
  if (saveErr) {
    console.error("[pending-services] add-as-service save error:", saveErr.message);
    return NextResponse.json({ error: "Failed to save the new service" }, { status: 500 });
  }

  await admin.from("pending_service_requests").update({ status: "added" }).eq("id", body.id).eq("tenant_id", tenant.id);

  // Round M8 FIX 3(b): the waiting customer should hear back automatically,
  // and their original request should become a real confirmed appointment
  // directly when a real date/time was actually captured -- using the
  // phone/conversation already on file, never asking them to start over.
  let bookedAppointment: { datetime: string } | null = null;
  let customerNotified = false;
  const leadId = (row as { lead_id: string | null }).lead_id;
  if (leadId) {
    const { data: lead } = await admin.from("leads").select("form_data").eq("id", leadId).maybeSingle();
    const preferredDatetime = ((lead as { form_data?: Record<string, unknown> } | null)?.form_data?.preferred_datetime as string | null | undefined) ?? null;

    const { data: conv } = await admin
      .from("conversations")
      .select("id, tenant_id")
      .eq("lead_id", leadId)
      .eq("tenant_id", tenant.id)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const conversationId = (conv as { id: string } | null)?.id ?? null;

    // Only auto-book when there's a real, still-future, non-conflicting
    // slot on file -- never fabricate a time the customer never gave.
    if (preferredDatetime) {
      const availability = await checkAvailability(admin, tenant.id, preferredDatetime, DEFAULT_SLOT_MINUTES, newService.name, [newService]);
      if (availability && !availability.conflict) {
        const { error: apptErr } = await admin.from("appointments").insert({
          tenant_id: tenant.id,
          lead_id: leadId,
          conversation_id: conversationId,
          service_name: newService.name,
          datetime: preferredDatetime,
          status: "confirmed",
        });
        if (!apptErr) {
          bookedAppointment = { datetime: preferredDatetime };
          await admin.from("leads").update({ status: "booked" }).eq("id", leadId);
        } else {
          console.error("[pending-services] auto-book appointment insert failed:", apptErr.message);
        }
      }
    }

    if (conversationId) {
      const whenLabel = bookedAppointment
        ? new Date(bookedAppointment.datetime).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
        : null;
      const confirmText = bookedAppointment
        ? `Good news, ${newService.name} is now available! Your appointment is confirmed for ${whenLabel}. See you then!`
        : `Good news, ${newService.name} is now available! Let us know your preferred day and time and we'll get you booked in.`;
      const sendResult = await sendCustomerMessage(admin, { conversationId, tenantId: tenant.id, text: confirmText, asOwnerReply: false });
      customerNotified = sendResult.ok;
    }
  }

  return NextResponse.json({ ok: true, service: newService, customerNotified, bookedAppointment: !!bookedAppointment });
}
