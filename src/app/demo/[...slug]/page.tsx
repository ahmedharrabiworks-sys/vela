import type { Metadata } from "next";
import NotYet from "./NotYet";
import PrivateDemo, { isDemoToken } from "./PrivateDemo";

export const dynamic = "force-dynamic";

// /demo/<token> is a private sales demo prepared for one business (a long
// random token, never the business name). Every other /demo path keeps the
// "Live in the full version" page.
export async function generateMetadata({ params }: { params: { slug: string[] } }): Promise<Metadata> {
  if (params.slug.length === 1 && isDemoToken(params.slug[0])) {
    return { title: "Vela demo", robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }, referrer: "no-referrer" };
  }
  return {};
}

export default function DemoCatchAll({ params, searchParams }: { params: { slug: string[] }; searchParams: { lang?: string } }) {
  if (params.slug.length === 1 && isDemoToken(params.slug[0])) {
    return <PrivateDemo token={params.slug[0]} lang={searchParams.lang === "en" ? "en" : searchParams.lang === "ar" ? "ar" : undefined} />;
  }
  return <NotYet />;
}
