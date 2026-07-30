// Usage helper — server-only (admin client, never imported on the client side).
// Returns current-month consumption counts for a tenant.
// Used by enforcement checks in API routes (ai/reply) and the stats endpoint (Step 4).

type AdminClient = ReturnType<typeof import("./supabase-server").createSupabaseAdmin>;

export interface UsageSummary {
  messagesUsed: number;
  voiceMinutesUsed: number;
  periodStart: string;
}

export async function getUsageSummary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  tenantId: string,
): Promise<UsageSummary> {
  const now = new Date();
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();

  // AI reply count — assistant rows only (idx_messages_tenant_period covers this)
  const { count: msgCount } = await admin
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("role", "assistant")
    .gte("created_at", periodStart);

  // Voice minutes — sum duration_seconds, convert to minutes
  const { data: callData } = await admin
    .from("agent_calls")
    .select("duration_seconds")
    .eq("tenant_id", tenantId)
    .gte("created_at", periodStart);

  const totalSeconds = ((callData ?? []) as { duration_seconds: number | null }[])
    .reduce((sum, row) => sum + (row.duration_seconds ?? 0), 0);

  return {
    messagesUsed: msgCount ?? 0,
    voiceMinutesUsed: Math.round(totalSeconds / 60),
    periodStart,
  };
}
