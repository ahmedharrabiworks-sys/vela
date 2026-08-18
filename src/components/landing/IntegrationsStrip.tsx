"use client";

// FIX: these were simplified/invented shapes (a plain ring for Instagram,
// a custom phone glyph for WhatsApp) rather than the real brand marks --
// swapped for the exact same glyph paths already used and approved in
// /demo/channels (src/app/demo/channels/page.tsx), same 0-24 viewBox so the
// paths drop in directly. Icons elsewhere in the app (dashboard Channels
// page) are untouched -- this file only affects the public landing page.
function InstagramLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-label="Instagram">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="25%" stopColor="#FCAF45" />
          <stop offset="50%" stopColor="#F77737" />
          <stop offset="75%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <path fill="white" transform="translate(3.2 3.2) scale(0.735)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

function WhatsAppLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-label="WhatsApp">
      <rect width="24" height="24" rx="6" fill="#25D366"/>
      <path fill="white" transform="translate(3.2 3.2) scale(0.735)" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path fill="white" transform="translate(3.2 3.2) scale(0.735)" d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.532 5.847L0 24l6.337-1.506A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.001-1.368l-.36-.213-3.713.883.934-3.618-.234-.373A9.818 9.818 0 012.182 12C2.182 6.574 6.574 2.182 12 2.182S21.818 6.574 21.818 12 17.426 21.818 12 21.818z"/>
    </svg>
  );
}

function WebsiteLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-label="Website chat">
      <rect width="24" height="24" rx="6" style={{ fill: "var(--vp-color)" }} />
      <path d="M21 10.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const INTEGRATIONS = [
  { id: "instagram", label: "Instagram DM", Icon: InstagramLogo },
  { id: "whatsapp",  label: "WhatsApp",     Icon: WhatsAppLogo },
  { id: "website",   label: "Website Chat", Icon: WebsiteLogo },
];

export default function IntegrationsStrip() {
  return (
    <section className="py-14 md:py-16 border-t border-[#F1F5F9]">
      <div className="max-w-3xl mx-auto px-5 md:px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF] mb-8">
          Connects where your customers already are
        </p>
        <div className="flex items-center justify-center gap-6 md:gap-10">
          {INTEGRATIONS.map(({ id, label, Icon }) => (
            <div key={id} className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-[#F1F5F9] bg-white">
                <Icon />
              </div>
              <span className="text-xs font-medium text-[#6B7280]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
