import PublicPageHeader from "@/components/landing/PublicPageHeader";
import Footer from "@/components/landing/Footer";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Data Deletion Status | Vela",
  description: "Check the status of an Instagram data deletion request.",
};

/**
 * The status URL Meta's Data Deletion Request callback promises the user
 * (see api/instagram/data-deletion/route.ts) -- looks up the real
 * confirmation code logged at deletion time in webhook_logs and reports a
 * genuine result, not a static "always says completed" placeholder.
 */
export default async function DeletionStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  let found = false;
  let deletedAt: string | null = null;

  if (id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;
    const { data } = await admin
      .from("webhook_logs")
      .select("payload, created_at")
      .eq("channel", "instagram")
      .eq("event_type", "data_deletion_request")
      .eq("payload->>confirmation_code", id)
      .maybeSingle();
    if (data) {
      found = true;
      deletedAt = (data.payload?.deleted_at as string | undefined) ?? data.created_at;
    }
  }

  return (
    <>
      <PublicPageHeader />
      <main className="min-h-screen pt-16 pb-20 px-5">
        <div className="max-w-md mx-auto bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center">
          {found ? (
            <>
              <div className="w-12 h-12 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M5 11l4 4 8-8" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-[#111111] mb-2">Data deletion completed</h1>
              <p className="text-sm text-[#6B7280] mb-4">
                Your Instagram connection data was removed from Vela
                {deletedAt ? ` on ${new Date(deletedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : ""}.
              </p>
              <p className="text-xs text-[#9CA3AF] font-mono break-all">Confirmation code: {id}</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 7v5M11 15h.01" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="11" cy="11" r="9" stroke="#DC2626" strokeWidth="2" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-[#111111] mb-2">Confirmation code not found</h1>
              <p className="text-sm text-[#6B7280]">
                We couldn&apos;t find a deletion request matching this code. If you believe this is an error, contact support.
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
