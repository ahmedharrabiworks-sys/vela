import { createSupabaseAdmin } from "@/lib/supabase-server";
import WidgetChat from "./chat-client";

export const dynamic = "force-dynamic";

export default async function WidgetPage({
  params,
}: {
  params: { tenantId: string };
}) {
  const { tenantId } = params;

  let businessName = "Business";
  let industry = "business";

  try {
    const adminClient = createSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tenant } = await (adminClient as any)
      .from("tenants")
      .select("business_name, industry")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenant) {
      const t = tenant as { business_name: string; industry: string | null };
      businessName = t.business_name || "Business";
      industry = t.industry || "business";
    }
  } catch { /* tenant not found — show generic widget */ }

  const greeting = `Hi there! 👋 Welcome to ${businessName}. How can I help you today?`;

  return (
    <WidgetChat
      tenantId={tenantId}
      businessName={businessName}
      greeting={greeting}
    />
  );
}
