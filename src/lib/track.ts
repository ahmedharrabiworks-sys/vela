import { getSupabase } from "./supabase";

export type EventType =
  | "signup_completed"
  | "plan_selected"
  | "channel_connected"
  | "website_generated"
  | "appointment_created"
  | "appointment_cancelled"
  | "message_sent"
  | "ai_reply_sent"
  | "upgrade_clicked"
  | "demo_visited";

export async function track(
  eventType: EventType,
  metadata?: Record<string, unknown>
) {
  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tenant } = await (supabase as any)
      .from("tenants")
      .select("id")
      .eq("owner_id", user.id)
      .single();
    if (!tenant) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("usage_events").insert({
      tenant_id: (tenant as { id: string }).id,
      event_type: eventType,
      metadata: metadata ?? {},
    });
  } catch { /* silently fail — never block UI for tracking */ }
}
