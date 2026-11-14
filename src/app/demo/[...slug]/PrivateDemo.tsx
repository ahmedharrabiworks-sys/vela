import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-server";

/* eslint-disable @typescript-eslint/no-explicit-any */

const TOKEN = /^[A-Za-z0-9_-]{32,128}$/;
export const isDemoToken = (s: string) => TOKEN.test(s);

type Lang = "en" | "ar";
type Service = { name: string; name_ar?: string; price?: string; duration?: string };

const T = {
  en: {
    prepared: "Prepared by Vela for", privateNote: "A private page prepared for the owner. It is never shown to your customers.",
    sampleTitle: "Listen: a sample call", sampleHint: "A patient calls about one of your services. Vela answers as your receptionist and books the visit.",
    servicesTitle: "Your services, as Vela understood them", servicesHint: "From your public pages. Your team confirms everything before Vela goes live.",
    book: "Book a 10-minute demo", waText: (b: string) => `Hello, I'd like the 10-minute Vela demo for ${b}.`,
    noAudio: "The sample call is not available right now.", endedTitle: "This demo has ended",
    endedBody: "This private demo was available for 30 days. Get in touch with the Vela team for a new one.", visit: "Visit velaos.co", other: "العربية",
  },
  ar: {
    prepared: "أعدّه Vela خصيصًا لـ", privateNote: "صفحة خاصة لصاحب الشركة، ولا تظهر أبدًا لعملائكم.",
    sampleTitle: "استمع: مكالمة تجريبية", sampleHint: "مريض يتصل يسأل عن إحدى خدماتكم، و Vela يرد كموظف الاستقبال ويحجز الموعد.",
    servicesTitle: "خدماتكم كما فهمها Vela", servicesHint: "من صفحاتكم العامة. فريقكم يراجع كل شيء قبل تشغيل Vela.",
    book: "احجز عرضًا مدته 10 دقائق", waText: (b: string) => `مرحبًا، أبي العرض التجريبي من Vela لمدة 10 دقائق لـ ${b}.`,
    noAudio: "المكالمة التجريبية غير متاحة حاليًا.", endedTitle: "انتهى هذا العرض",
    endedBody: "كان هذا العرض الخاص متاحًا لمدة 30 يومًا. تواصل مع فريق Vela للحصول على عرض جديد.", visit: "زيارة velaos.co", other: "English",
  },
} as const;

async function load(token: string) {
  try {
    const admin = createSupabaseAdmin() as any;
    const { data, error } = await admin.from("demo_pages").select("token, business_name, business_name_ar, data, expires_at").eq("token", token).maybeSingle();
    if (error || !data) return null;
    return data as { token: string; business_name: string; business_name_ar: string | null; data: Record<string, any>; expires_at: string };
  } catch {
    return null;
  }
}

export default async function PrivateDemo({ token, lang: asked }: { token: string; lang?: Lang }) {
  const row = await load(token);
  if (!row) notFound();
  const d = row.data ?? {};
  const lang: Lang = asked ?? (d.default_lang === "en" ? "en" : "ar");
  const t = T[lang];
  const other: Lang = lang === "ar" ? "en" : "ar";
  const business = lang === "ar" && row.business_name_ar ? row.business_name_ar : row.business_name;
  const expired = Date.parse(row.expires_at) <= Date.now();

  const shell = (children: React.ReactNode) => (
    <main dir={lang === "ar" ? "rtl" : "ltr"} lang={lang} className="min-h-screen bg-[#FFF8F3] text-[#111111]">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between gap-3 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo-full.png" alt="Vela" width={96} height={44} className="h-9 w-auto" />
          <Link href={`?lang=${other}`} className="inline-flex items-center min-h-[44px] px-3 text-sm font-semibold text-[#C2410C] hover:underline">{t.other}</Link>
        </div>
        {children}
      </div>
    </main>
  );

  if (expired) {
    return shell(
      <section className="bg-white rounded-2xl border border-[#F1E4DC] p-6 text-center">
        <h1 className="text-xl font-bold">{t.endedTitle}</h1>
        <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">{t.endedBody}</p>
        <a href="https://velaos.co" className="btn-primary inline-flex h-11 px-6 text-sm mt-5">{t.visit}</a>
      </section>,
    );
  }

  // Short-lived signed link to the private audio; nothing public, nothing listed.
  let audio: string | null = null;
  if (typeof d.call_path === "string" && /^[A-Za-z0-9_-]{32,128}\/[a-z0-9-]+\.mp3$/.test(d.call_path)) {
    try {
      const { data } = await (createSupabaseAdmin() as any).storage.from("demo-audio").createSignedUrl(d.call_path, 60 * 60);
      audio = data?.signedUrl ?? null;
    } catch { /* shown as unavailable */ }
  }
  const services: Service[] = Array.isArray(d.services) ? d.services.slice(0, 5) : [];
  const number = String(d.demo_number ?? "").replace(/\D/g, "");

  return shell(
    <>
      <p className="text-sm font-semibold text-[#C2410C]">{t.prepared}</p>
      <h1 dir="auto" className="text-[28px] sm:text-[34px] font-bold leading-tight mt-1">{business}</h1>
      <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">{t.privateNote}</p>

      <section className="bg-white rounded-2xl border border-[#F1E4DC] p-5 mt-6 shadow-[0_10px_30px_rgba(80,30,10,0.06)]">
        <h2 className="text-base font-bold">{t.sampleTitle}</h2>
        <p className="text-sm text-[#6B7280] mt-1 leading-relaxed">{t.sampleHint}</p>
        {audio ? (
          <audio controls preload="none" src={audio} className="w-full mt-4" controlsList="nodownload noplaybackrate" />
        ) : (
          <p className="text-sm text-[#9CA3AF] mt-4">{t.noAudio}</p>
        )}
      </section>

      {services.length > 0 && (
        <section className="bg-white rounded-2xl border border-[#F1E4DC] p-5 mt-4">
          <h2 className="text-base font-bold">{t.servicesTitle}</h2>
          <ul className="mt-3 divide-y divide-[#F3F4F6]">
            {services.map((s, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 py-2.5">
                <span dir="auto" className="text-sm font-medium min-w-0">{lang === "ar" && s.name_ar ? s.name_ar : s.name}</span>
                {(s.price || s.duration) && <span dir="auto" className="text-xs text-[#6B7280] shrink-0">{[s.price, s.duration].filter(Boolean).join(" · ")}</span>}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-[#9CA3AF] mt-3 leading-relaxed">{t.servicesHint}</p>
        </section>
      )}

      {number.length >= 8 && (
        <a href={`https://wa.me/${number}?text=${encodeURIComponent(t.waText(row.business_name))}`} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center justify-center h-12 w-full text-base mt-6">
          {t.book}
        </a>
      )}
      <p className="text-center text-xs text-[#9CA3AF] mt-8">velaos.co</p>
    </>,
  );
}
