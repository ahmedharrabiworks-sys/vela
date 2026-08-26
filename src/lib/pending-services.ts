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
      .select("id, lead_id")
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
    if (existing) {
      // Round M9 FIX 3(a): this used to just `return` here, permanently
      // freezing lead_id to whichever customer happened to ask FIRST -- live
      // repro confirmed a second, real customer's date/time (correctly
      // stored on their own lead row's form_data) was silently unreachable
      // forever, because pending-services/route.ts's confirm-service flow
      // only ever reads the ONE lead_id on this row. The row is single-lead
      // by schema (one confirm action, one sendCustomerMessage call), so the
      // honest fix is to keep it pointed at the MOST RECENT requester --
      // whoever asked most recently is who the owner is confirming for.
      if (existing.lead_id !== (leadId ?? null)) {
        const { error: updateErr } = await admin
          .from("pending_service_requests")
          .update({ lead_id: leadId ?? null })
          .eq("id", existing.id);
        if (updateErr) console.error("[pending-services] lead_id refresh failed:", updateErr.code, updateErr.message);
      }
      return;
    }

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
