import { createSupabaseAdmin } from "@/lib/supabase-server";
import WidgetChat from "./chat-client";

export const dynamic = "force-dynamic";

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: { tenantId: string };
  searchParams: { source?: string };
}) {
  const { tenantId } = params;
  // source=site means this widget is the one auto-injected on a published
  // Vela-built site (see site/[tenantId]/route.ts); anything else is an
  // externally pasted embed. Tagged on the conversation as the channel so
  // the two are distinguishable in Conversations/Analytics.
  const channel = searchParams?.source === "site" ? "website" : "website_embed";

  let businessName = "Business";
  let industry = "business";
  // Round 5 FIX 7: was a fixed brand gradient (#FF6B35/#FF3366) regardless
  // of the site it's embedded on -- mismatched on any site whose own accent
  // differs (confirmed: cream/gold real estate and hotel sites). Falls back
  // to the Vela brand gradient only when no published site/accent is found
  // (e.g. an externally pasted embed on a non-Vela page).
  let accentColor: string | null = null;

  try {
    const adminClient = createSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = adminClient as any;
    const { data: tenant } = await admin
      .from("tenants")
      .select("business_name, industry")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenant) {
      const t = tenant as { business_name: string; industry: string | null };
      businessName = t.business_name || "Business";
      industry = t.industry || "business";
    }

    // Best-effort: use the tenant's most-recently-updated published site's
    // own accent color. A tenant with multiple published sites has no
    // per-site widget context here (this route only receives tenantId), so
    // this is a reasonable single-tenant approximation, not a per-site one.
    const { data: site } = await admin
      .from("websites")
      .select("published_spec")
      .eq("tenant_id", tenantId)
      .eq("is_published", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const spec = site?.published_spec as { designDNA?: { palette?: { accent?: string } } } | null;
    const hexOk = (h: unknown): h is string => typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h);
    if (hexOk(spec?.designDNA?.palette?.accent)) {
      accentColor = spec!.designDNA!.palette!.accent!;
    }
  } catch { /* tenant not found. Show generic widget */ }

  const greeting = `Hi there! 👋 Welcome to ${businessName}. How can I help you today?`;

  return (
    <WidgetChat
      tenantId={tenantId}
      businessName={businessName}
      greeting={greeting}
      channel={channel}
      accentColor={accentColor}
    />
  );
}
