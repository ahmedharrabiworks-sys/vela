"use client";

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
      <path d="M12 7.2A4.8 4.8 0 1012 16.8 4.8 4.8 0 0012 7.2zm0 7.9a3.1 3.1 0 110-6.2 3.1 3.1 0 010 6.2z" fill="white"/>
      <circle cx="17.1" cy="6.9" r="1.1" fill="white"/>
    </svg>
  );
}

function WhatsAppLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-label="WhatsApp">
      <rect width="24" height="24" rx="6" fill="#25D366"/>
      <path d="M12 4C7.6 4 4 7.6 4 12c0 1.4.4 2.8 1 4L4 20l4.1-1.1c1.2.6 2.5 1 3.9 1 4.4 0 8-3.6 8-8s-3.6-8-8-8zm4.2 11.1c-.2.5-.9.9-1.5 1-.4.1-.9.1-1.3 0-1-.3-2.1-.8-2.9-1.6-.9-.8-1.5-1.8-1.7-2.6-.1-.5-.1-1 .1-1.4.2-.5.6-.9 1-.9h.4c.2 0 .4.1.5.4l.7 1.5c.1.2.1.4 0 .6l-.4.5c-.1.1-.1.3 0 .4.3.5.7 1 1.2 1.4.5.4 1 .7 1.5.9.1.1.3 0 .4-.1l.5-.5c.1-.2.3-.2.5-.1l1.5.7c.3.1.4.3.4.5v.3z" fill="white"/>
    </svg>
  );
}

function WebsiteLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-label="Website chat">
      <rect width="24" height="24" rx="6" style={{ fill: "var(--vp-color)" }} />
      <path d="M5 7h14M5 12h10M5 17h7" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="19" cy="17" r="3.5" style={{ fill: "var(--vt-color)" }} />
      <path d="M17.5 17.5l1 1 2.5-2" stroke="var(--vp-color)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
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
