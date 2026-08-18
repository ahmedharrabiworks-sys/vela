import { createSupabaseAdmin } from "@/lib/supabase-server";
import WidgetChat from "./chat-client";

export const dynamic = "force-dynamic";

// FIX: this greeting was hardcoded English always, regardless of the
// tenant's configured language (tenant_config.language, the same field
// ai/reply/route.ts already reads to decide the AI's reply language). A
// visitor on an Arabic-configured business's site saw an English opener
// before ever sending a message.
//
// Live-verified the real stored values before wiring this up (Settings →
// AI Configuration → Language only ever writes one of these three exact
// strings -- see src/app/app/settings/page.tsx's language button row):
// "English", "Arabic", "Auto-detect". An initial version of this fix keyed
// on ISO codes ("en"/"ar"/etc.), which would have silently never matched
// any real tenant's stored value and always fallen back to English.
// "Auto-detect" has no message to detect from yet at greeting time, so it
// defaults to English -- same convention already used by the phone agent's
// greeting-language fallback (tenants with no saved choice default to
// English, not a "guess from business language" heuristic).
const GREETING_BY_LANG: Record<string, string> = {
  english: "Hi there! 👋 Welcome to {name}. How can I help you today?",
  arabic: "مرحبًا! 👋 أهلاً بك في {name}. كيف يمكنني مساعدتك اليوم؟",
};

function buildGreeting(displayName: string, language?: string | null): string {
  const key = (language || "").trim().toLowerCase();
  const template = GREETING_BY_LANG[key] ?? GREETING_BY_LANG.english;
  return template.replace("{name}", displayName);
}

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
  let language: string | null = null;

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

    const { data: cfg } = await admin
      .from("tenant_config")
      .select("language")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    language = (cfg as { language?: string } | null)?.language ?? null;

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
  const greeting = buildGreeting(displayName, language);

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
