import { createSupabaseAdmin } from "@/lib/supabase-server";
import WidgetChat from "./chat-client";

export const dynamic = "force-dynamic";

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: { tenantId: string };
  searchParams: { source?: string; websiteId?: string };
}) {
  const { tenantId } = params;
  // source=site means this widget is the one auto-injected on a published
  // Vela-built site (see site/[tenantId]/route.ts); anything else is an
  // externally pasted embed. Tagged on the conversation as the channel so
  // the two are distinguishable in Conversations/Analytics.
  const channel = searchParams?.source === "site" ? "website" : "website_embed";
  // CRITICAL FIX: identifies exactly which of this tenant's (possibly
  // several) websites this widget instance is embedded on. See the comment
  // in site/[tenantId]/route.ts's buildWidgetScript for the full root-cause
  // explanation -- a tenant's own business_name is account-level, so every
  // site the tenant owns previously showed the assistant identifying as the
  // TENANT's business_name, not the specific site it was actually on.
  const websiteId = searchParams?.websiteId || "";

  let businessName = "Business";
  let industry = "business";
  // Round 5 FIX 7 / this round FIX 1: accent color and (new) the site's own
  // name now come from an EXACT website lookup when websiteId is known,
  // rather than a tenant-wide "most recently updated" approximation. The
  // approximation remains only as a fallback for externally-pasted embeds
  // with no websiteId context (or a widget URL predating this fix).
  let accentColor: string | null = null;
  let siteName: string | null = null;

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

    const query = admin.from("websites").select("name, published_spec").eq("is_published", true);
    const { data: site } = websiteId
      // Scoped to this tenant too -- a websiteId belonging to a different
      // tenant must never resolve here, even though it's just a name/accent
      // lookup (defense in depth, not just the AI-identity fix below).
      ? await query.eq("id", websiteId).eq("tenant_id", tenantId).maybeSingle()
      : await query.eq("tenant_id", tenantId).order("updated_at", { ascending: false }).limit(1).maybeSingle();

    if (site?.name) siteName = site.name as string;
    const spec = site?.published_spec as { designDNA?: { palette?: { accent?: string } } } | null;
    const hexOk = (h: unknown): h is string => typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h);
    if (hexOk(spec?.designDNA?.palette?.accent)) {
      accentColor = spec!.designDNA!.palette!.accent!;
    }
  } catch { /* tenant not found. Show generic widget */ }

  // The specific website's own name takes priority for what the visitor
  // sees and what the assistant identifies as -- falls back to the
  // tenant's business_name only when no website name was found.
  const displayName = siteName || businessName;
  const greeting = `Hi there! 👋 Welcome to ${displayName}. How can I help you today?`;

  return (
    <WidgetChat
      tenantId={tenantId}
      websiteId={websiteId || undefined}
      businessName={displayName}
      greeting={greeting}
      channel={channel}
      accentColor={accentColor}
    />
  );
}
