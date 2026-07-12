import type { DesignTokens } from "./website-design-system";

// ── SVG icon helper ───────────────────────────────────────────────────────────
const ICONS: Record<string, string> = {
  tooth:     `<path d="M12 3c-2.5 0-4.5 1.5-4.5 4 0 1.5.5 2.5.5 4C8 13.5 7 18 9 20c.8 1 2 1 2.5-.5C12 18 12 16 12 16s0 2-.5 3.5c.5 1.5 1.7 1.5 2.5.5 2-2 1-7 1-9 0-1.5.5-2.5.5-4C15.5 4.5 14.5 3 12 3z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  dumbbell:  `<path d="M6.5 6.5v11M17.5 6.5v11M3 8h3.5M3 16h3.5M17.5 8H21M17.5 16H21M6.5 12h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  scissors:  `<circle cx="6" cy="6" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  leaf:      `<path d="M2 22 17 7M9 7c0-3.314 2.686-6 6-6 0 3.314-2.686 6-6 6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  heart:     `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
  star:      `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
  briefcase: `<rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M12 12v4M8 14h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  home:      `<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" stroke-width="1.5" fill="none"/><polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" stroke-width="1.5"/>`,
  chef:      `<path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6V13.87z" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="6" y1="17" x2="18" y2="17" stroke="currentColor" stroke-width="1.5"/>`,
  shield:    `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
  clock:     `<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  phone:     `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 15a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 4h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 11.5a16 16 0 0 0 6.29 6.29l1.06-.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
  mail:      `<rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="m22 7-10 7L2 7" stroke="currentColor" stroke-width="1.5"/>`,
  map:       `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
  check:     `<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  plus:      `<line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  arrow:     `<line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="12 5 19 12 12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
};

function icon(name: string, size = 22): string {
  const path = ICONS[name.toLowerCase()] ?? ICONS.star;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${path}</svg>`;
}

function photo(src: string | undefined, alt: string, cls: string, style = ""): string {
  if (src) return `<img src="${src}" alt="${alt}" class="${cls}" style="${style}" loading="lazy">`;
  return `<div class="${cls}" style="${style}background:linear-gradient(135deg,var(--accent-alpha),var(--bg-alt));display:flex;align-items:center;justify-content:center;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>`;
}

// ── Nav ───────────────────────────────────────────────────────────────────────
export function renderNav(businessName: string, ctaText: string): string {
  return `
<nav class="ws-nav">
  <div class="ws-nav-inner">
    <a href="#" class="ws-nav-logo">${businessName}</a>
    <div class="ws-nav-links">
      <a href="#services" class="ws-nav-link">Services</a>
      <a href="#about" class="ws-nav-link">About</a>
      <a href="#testimonials" class="ws-nav-link">Reviews</a>
      <a href="#booking" class="ws-nav-link">Contact</a>
    </div>
    <a href="#booking" class="ws-btn ws-btn-primary" style="font-size:0.85rem;padding:10px 22px;">${ctaText}</a>
  </div>
</nav>`.trim();
}

// ── Hero ──────────────────────────────────────────────────────────────────────
interface HeroContent {
  eyebrow?: string;
  headline: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary?: string;
}
export function renderHero(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  const gradFallback = `linear-gradient(135deg, ${t.heroBg} 0%, ${t.accent} 200%)`;
  return `
<section id="hero" class="ws-hero">
  <div class="ws-hero-text">
    ${c.eyebrow ? `<p class="ws-hero-eyebrow">${c.eyebrow}</p>` : ""}
    <h1 class="ws-hero-headline">${c.headline}</h1>
    <p class="ws-hero-sub">${c.subheadline}</p>
    <div class="ws-hero-ctas">
      <a href="#booking" class="ws-btn ws-btn-accent">${c.ctaPrimary}</a>
      ${c.ctaSecondary ? `<a href="#about" class="ws-btn ws-btn-light">${c.ctaSecondary}</a>` : ""}
    </div>
  </div>
  <div class="ws-hero-photo" style="background:${gradFallback};">
    ${imageUrl ? `<img src="${imageUrl}" alt="hero" class="ws-hero-img">` : ""}
    <div class="ws-hero-overlay"></div>
  </div>
</section>`.trim();
}

// ── About ─────────────────────────────────────────────────────────────────────
interface Bullet { title: string; text: string; }
interface AboutContent {
  eyebrow?: string;
  headline: string;
  body: string;
  bullets?: Bullet[];
  ctaText?: string;
}
export function renderAbout(t: DesignTokens, c: AboutContent, imageUrl?: string): string {
  const bullets = (c.bullets ?? []).map((b) => `
    <div class="ws-bullet">
      <div class="ws-bullet-icon">${icon("check", 14)}</div>
      <div>
        <p class="ws-bullet-title">${b.title}</p>
        <p class="ws-bullet-text">${b.text}</p>
      </div>
    </div>`).join("");

  return `
<section id="about" class="ws-section">
  <div class="ws-container">
    <div class="ws-about-inner">
      ${photo(imageUrl, "our team", "ws-about-img")}
      <div class="ws-about-content">
        ${c.eyebrow ? `<p class="ws-eyebrow">${c.eyebrow}</p>` : ""}
        <h2 class="ws-heading">${c.headline}</h2>
        <p style="font-size:0.95rem;line-height:1.75;color:var(--color-muted);margin-bottom:28px;">${c.body}</p>
        ${bullets}
        ${c.ctaText ? `<a href="#booking" class="ws-btn ws-btn-outline" style="margin-top:8px;">${c.ctaText}</a>` : ""}
      </div>
    </div>
  </div>
</section>`.trim();
}

// ── Services ──────────────────────────────────────────────────────────────────
interface ServiceItem { icon?: string; title: string; description: string; price?: string; }
interface ServicesContent {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  items: ServiceItem[];
}
export function renderServices(_t: DesignTokens, c: ServicesContent): string {
  const cards = c.items.map((s) => `
    <div class="ws-service-card">
      <div class="ws-service-icon">${icon(s.icon ?? "star", 20)}</div>
      <h3 class="ws-service-title">${s.title}</h3>
      <p class="ws-service-desc">${s.description}</p>
      ${s.price ? `<span class="ws-service-price">${s.price}</span>` : ""}
    </div>`).join("");

  return `
<section id="services" class="ws-section ws-section-alt">
  <div class="ws-container">
    <div style="text-align:center;max-width:600px;margin:0 auto 48px;">
      ${c.eyebrow ? `<p class="ws-eyebrow">${c.eyebrow}</p>` : ""}
      <h2 class="ws-heading">${c.headline}</h2>
      ${c.subheadline ? `<p class="ws-subheading">${c.subheadline}</p>` : ""}
    </div>
    <div class="ws-services-grid">${cards}</div>
  </div>
</section>`.trim();
}

// ── Gallery ───────────────────────────────────────────────────────────────────
interface GalleryContent { eyebrow?: string; headline: string; }
export function renderGallery(_t: DesignTokens, c: GalleryContent, images: (string | undefined)[]): string {
  const cells = images.map((url, i) => `
    <div class="ws-gallery-item">
      ${photo(url, `gallery photo ${i + 1}`, "ws-gallery-img")}
    </div>`).join("");

  return `
<section id="gallery" class="ws-section">
  <div class="ws-container">
    <div style="text-align:center;margin-bottom:48px;">
      ${c.eyebrow ? `<p class="ws-eyebrow">${c.eyebrow}</p>` : ""}
      <h2 class="ws-heading">${c.headline}</h2>
    </div>
    <div class="ws-gallery-grid">${cells}</div>
  </div>
</section>`.trim();
}

// ── Testimonials ──────────────────────────────────────────────────────────────
interface TestimonialItem { quote: string; name: string; role: string; }
interface TestimonialsContent {
  eyebrow?: string;
  headline: string;
  items: TestimonialItem[];
}
export function renderTestimonials(_t: DesignTokens, c: TestimonialsContent): string {
  const cards = c.items.map((item) => {
    const initials = item.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return `
    <div class="ws-test-card">
      <div class="ws-stars">★★★★★</div>
      <p class="ws-test-quote">"${item.quote}"</p>
      <div class="ws-test-footer">
        <div class="ws-test-avatar">${initials}</div>
        <div>
          <p class="ws-test-name">${item.name}</p>
          <p class="ws-test-role">${item.role}</p>
        </div>
      </div>
    </div>`;
  }).join("");

  return `
<section id="testimonials" class="ws-section ws-section-alt">
  <div class="ws-container">
    <div style="text-align:center;margin-bottom:48px;">
      ${c.eyebrow ? `<p class="ws-eyebrow">${c.eyebrow}</p>` : ""}
      <h2 class="ws-heading">${c.headline}</h2>
    </div>
    <div class="ws-test-grid">${cards}</div>
  </div>
</section>`.trim();
}

// ── Team ──────────────────────────────────────────────────────────────────────
interface TeamMember { name: string; role: string; bio: string; }
interface TeamContent { eyebrow?: string; headline: string; members: TeamMember[]; }
export function renderTeam(_t: DesignTokens, c: TeamContent): string {
  const cards = c.members.map((m) => {
    const initials = m.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return `
    <div class="ws-team-card">
      <div class="ws-team-avatar">${initials}</div>
      <h3 class="ws-team-name">${m.name}</h3>
      <p class="ws-team-role">${m.role}</p>
      <p class="ws-team-bio">${m.bio}</p>
    </div>`;
  }).join("");

  return `
<section id="team" class="ws-section">
  <div class="ws-container">
    <div style="text-align:center;margin-bottom:48px;">
      ${c.eyebrow ? `<p class="ws-eyebrow">${c.eyebrow}</p>` : ""}
      <h2 class="ws-heading">${c.headline}</h2>
    </div>
    <div class="ws-team-grid">${cards}</div>
  </div>
</section>`.trim();
}

// ── Booking ───────────────────────────────────────────────────────────────────
interface BookingContent {
  eyebrow?: string;
  headline: string;
  subheadline: string;
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
  ctaText: string;
  services?: string[];
}
export function renderBooking(_t: DesignTokens, c: BookingContent): string {
  const serviceOptions = (c.services ?? [])
    .map((s) => `<option value="${s}">${s}</option>`).join("");

  const contactRows = [
    c.phone   && `<div class="ws-contact-item"><div class="ws-contact-icon" style="color:var(--accent);">${icon("phone", 18)}</div><div><p class="ws-contact-label">Phone</p><a href="tel:${c.phone.replace(/\s/g, "")}" class="ws-contact-value" style="text-decoration:none;">${c.phone}</a></div></div>`,
    c.email   && `<div class="ws-contact-item"><div class="ws-contact-icon" style="color:var(--accent);">${icon("mail", 18)}</div><div><p class="ws-contact-label">Email</p><a href="mailto:${c.email}" class="ws-contact-value" style="text-decoration:none;">${c.email}</a></div></div>`,
    c.address && `<div class="ws-contact-item"><div class="ws-contact-icon" style="color:var(--accent);">${icon("map", 18)}</div><div><p class="ws-contact-label">Address</p><p class="ws-contact-value">${c.address}</p></div></div>`,
    c.hours   && `<div class="ws-contact-item"><div class="ws-contact-icon" style="color:var(--accent);">${icon("clock", 18)}</div><div><p class="ws-contact-label">Hours</p><p class="ws-contact-value">${c.hours}</p></div></div>`,
  ].filter(Boolean).join("");

  return `
<section id="booking" class="ws-section">
  <div class="ws-container">
    <div style="text-align:center;margin-bottom:56px;">
      ${c.eyebrow ? `<p class="ws-eyebrow">${c.eyebrow}</p>` : ""}
      <h2 class="ws-heading">${c.headline}</h2>
      <p class="ws-subheading" style="max-width:520px;margin-left:auto;margin-right:auto;">${c.subheadline}</p>
    </div>
    <div class="ws-booking-inner">
      <div>${contactRows}</div>
      <div>
        <form id="booking-form" class="ws-booking-form" onsubmit="wsSubmitForm(event)">
          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Your Name</label>
              <input type="text" class="ws-form-input" placeholder="Full name" required>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Phone Number</label>
              <input type="tel" class="ws-form-input" placeholder="+1 (555) 000-0000" required>
            </div>
          </div>
          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Preferred Date</label>
              <input type="date" class="ws-form-input" required>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Preferred Time</label>
              <select class="ws-form-input">
                <option value="">Select time</option>
                <option>Morning (9am–12pm)</option>
                <option>Afternoon (12pm–5pm)</option>
                <option>Evening (5pm–8pm)</option>
              </select>
            </div>
          </div>
          ${serviceOptions ? `<div class="ws-form-group"><label class="ws-form-label">Service</label><select class="ws-form-input"><option value="">Select a service</option>${serviceOptions}</select></div>` : ""}
          <div class="ws-form-group">
            <label class="ws-form-label">Message (optional)</label>
            <textarea class="ws-form-input" rows="3" placeholder="Any notes or questions…" style="resize:vertical;"></textarea>
          </div>
          <button type="submit" class="ws-btn ws-btn-primary" style="width:100%;justify-content:center;padding:14px;">${c.ctaText}</button>
        </form>
        <div id="booking-success" class="ws-form-success">
          <div class="ws-form-success-icon">${icon("check", 24)}</div>
          <h3 class="ws-form-success-title">Request Received!</h3>
          <p class="ws-form-success-text">Thank you — we'll be in touch within 24 hours to confirm your appointment.</p>
        </div>
      </div>
    </div>
  </div>
</section>`.trim();
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
interface FaqItem { q: string; a: string; }
interface FaqContent { eyebrow?: string; headline: string; items: FaqItem[]; }
export function renderFaq(_t: DesignTokens, c: FaqContent): string {
  const items = c.items.map((item, i) => `
    <div class="ws-faq-item" id="faq-${i}">
      <div class="ws-faq-q" onclick="wsFaqToggle(${i})">
        <span>${item.q}</span>
        <span class="ws-faq-icon">+</span>
      </div>
      <div class="ws-faq-a">${item.a}</div>
    </div>`).join("");

  return `
<section id="faq" class="ws-section ws-section-alt">
  <div class="ws-container" style="max-width:780px;">
    <div style="text-align:center;margin-bottom:8px;">
      ${c.eyebrow ? `<p class="ws-eyebrow">${c.eyebrow}</p>` : ""}
      <h2 class="ws-heading">${c.headline}</h2>
    </div>
    <div class="ws-faq-list">${items}</div>
  </div>
</section>`.trim();
}

// ── CTA Banner ────────────────────────────────────────────────────────────────
interface CtaBannerContent { headline: string; sub: string; ctaText: string; }
export function renderCtaBanner(_t: DesignTokens, c: CtaBannerContent): string {
  return `
<section class="ws-cta-banner">
  <div class="ws-container" style="text-align:center;">
    <h2 class="ws-cta-headline">${c.headline}</h2>
    <p class="ws-cta-sub">${c.sub}</p>
    <a href="#booking" class="ws-btn ws-btn-white">${c.ctaText}</a>
  </div>
</section>`.trim();
}

// ── Footer ────────────────────────────────────────────────────────────────────
interface FooterContent {
  tagline: string;
  links?: string[];
  phone?: string;
  email?: string;
  address?: string;
  copyright?: string;
}
export function renderFooter(businessName: string, c: FooterContent): string {
  const links = (c.links ?? ["Services", "About Us", "Contact", "Privacy Policy"])
    .map((l) => `<a href="#" class="ws-footer-link">${l}</a>`).join("");

  const contactLines = [
    c.phone   && `<p style="margin-bottom:8px;font-size:0.875rem;"><a href="tel:${c.phone.replace(/\s/g, "")}" style="color:#9CA3AF;text-decoration:none;">${c.phone}</a></p>`,
    c.email   && `<p style="margin-bottom:8px;font-size:0.875rem;"><a href="mailto:${c.email}" style="color:#9CA3AF;text-decoration:none;">${c.email}</a></p>`,
    c.address && `<p style="font-size:0.875rem;line-height:1.5;">${c.address}</p>`,
  ].filter(Boolean).join("");

  const year = new Date().getFullYear();
  return `
<footer class="ws-footer">
  <div class="ws-container">
    <div class="ws-footer-inner">
      <div>
        <p class="ws-footer-logo">${businessName}</p>
        <p class="ws-footer-tag">${c.tagline}</p>
        <div style="display:flex;gap:12px;margin-top:16px;">
          <a href="#" aria-label="Facebook" style="width:32px;height:32px;border-radius:50%;background:#1E293B;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:0.75rem;font-weight:700;">f</a>
          <a href="#" aria-label="Instagram" style="width:32px;height:32px;border-radius:50%;background:#1E293B;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:0.75rem;font-weight:700;">in</a>
          <a href="#" aria-label="Twitter/X" style="width:32px;height:32px;border-radius:50%;background:#1E293B;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:0.75rem;font-weight:700;">x</a>
        </div>
      </div>
      <div>
        <p class="ws-footer-heading">Quick Links</p>
        ${links}
      </div>
      <div>
        <p class="ws-footer-heading">Contact</p>
        ${contactLines}
      </div>
    </div>
    <div class="ws-footer-bottom">
      <p>${c.copyright ?? `© ${year} ${businessName}. All rights reserved.`}</p>
    </div>
  </div>
</footer>`.trim();
}
