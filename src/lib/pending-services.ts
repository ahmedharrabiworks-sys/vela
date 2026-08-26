// Round M6 FIX 6(b): queue of untrained-service requests awaiting owner
// action (dismiss, or confirm+add as a real trained service). Same
// never-throws defensive pattern as notifications.ts and webhook_logs --
// this must never break the real conversation/booking flow it's attached
// to, and must degrade honestly (no-op) if migration_v35.sql hasn't run yet.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recordPendingServiceRequest(
  admin: any,
  tenantId: string,
  rawServiceName: string,
  leadId?: string | null
): Promise<void> {
  const serviceName = rawServiceName.trim().slice(0, 200);
  if (!serviceName) return;
  try {
    const { data: existing, error: readErr } = await admin
      .from("pending_service_requests")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .ilike("service_name", serviceName)
      .maybeSingle();
    if (readErr) {
      // Table not migrated yet (PGRST205/42P01) or any other read failure --
      // never block the real conversation/booking event over this.
      console.error("[pending-services] read failed:", readErr.code, readErr.message);
      return;
    }
    if (existing) return; // already queued for this exact service name, don't spam duplicates

    const { error: insertErr } = await admin.from("pending_service_requests").insert({
      tenant_id: tenantId,
      service_name: serviceName,
      lead_id: leadId ?? null,
    });
    if (insertErr) {
      console.error("[pending-services] insert failed:", insertErr.code, insertErr.message);
    }
  } catch (err) {
    console.error("[pending-services] threw:", err instanceof Error ? err.message : err);
  }
}
