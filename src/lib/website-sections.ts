import type { DesignTokens } from "./website-design-system";

// ── Minimal SVG icons ─────────────────────────────────────────────────────────
const ICONS: Record<string, string> = {
  check:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  tooth:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2C9.5 2 7 3.5 6 6c-.7 1.7-.7 3.5 0 5 .5 1 .7 2.2.5 3.5L6 18c-.3 1.7.8 3 2.2 3 1 0 1.8-.6 2.5-1.8.3-.5.6-1 1.3-1s1 .5 1.3 1C14 20.4 14.8 21 15.8 21c1.4 0 2.5-1.3 2.2-3l-.5-3.5c-.2-1.3 0-2.5.5-3.5.7-1.5.7-3.3 0-5C17 3.5 14.5 2 12 2z"/></svg>`,
  dumbbell:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 8H2M22 8h-4M8 8H6m4 0H8m0 0v8m0-8h4m-4 8H6m2 0h4m4-8h-4m4 0h2m2 0h-2M16 8v8m0 0h-4m4 0h2"/></svg>`,
  scissors:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
  leaf:      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 8C8 10 5.9 16.17 3.82 19.31A1 1 0 0 0 4.69 21C12.24 15.44 16 7 16 7"/><path d="M21 3a25 25 0 0 1-12.97 12.97"/></svg>`,
  heart:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  star:      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  briefcase: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`,
  home:      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  chef:      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>`,
  shield:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  clock:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  plus:      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  phone:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>`,
  mail:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  map:       `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  time:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
};

function icon(name: string, size = 20): string {
  const svg = ICONS[name] ?? ICONS.star ?? "";
  return svg
    .replace(/width="\d+"/, `width="${size}"`)
    .replace(/height="\d+"/, `height="${size}"`);
}

function photo(src: string | undefined, alt: string, cls: string, style = ""): string {
  if (src) return `<img src="${esc(src)}" alt="${esc(alt)}" class="${cls}" style="${style}" loading="lazy">`;
  // Muted gradient fallback — never a solid dark color that reads as a broken element
  return `<div class="${cls}" style="background:linear-gradient(135deg,var(--surface),var(--bg-alt));${style}" aria-label="${esc(alt)}"></div>`;
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Nav ───────────────────────────────────────────────────────────────────────
export function renderNav(businessName: string, ctaText: string): string {
  return `<nav class="ws-nav">
  <div class="ws-nav-inner">
    <a href="#" class="ws-nav-logo">${esc(businessName)}</a>
    <div class="ws-nav-links">
      <a href="#services" class="ws-nav-link">Services</a>
      <a href="#about" class="ws-nav-link">About</a>
      <a href="#booking" class="ws-nav-link">Contact</a>
    </div>
    <a href="#booking" class="ws-btn ws-btn-accent" style="padding:10px 22px;font-size:0.82rem;">${esc(ctaText || "Book Now")}</a>
  </div>
</nav>`;
}

// ── Hero — 4 layout variants based on t.heroLayout ────────────────────────────

// 1. full-bleed-bottom: oversized type at bottom-left (editorial-luxury)
function renderHeroBleedBottom(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; ctaPrimary?: string; ctaSecondary?: string },
  imageUrl?: string
): string {
  return `<section class="ws-hero ws-hero--el" id="hero">
  ${imageUrl
    ? `<img src="${esc(imageUrl)}" alt="${esc(c.headline || "Hero")}" class="ws-hero-img" fetchpriority="high">`
    : `<div class="ws-hero-img" style="background:linear-gradient(160deg,${t.heroBg} 0%,${t.heroBg} 55%,${t.accent}20 100%);"></div>`}
  <div class="ws-hero-overlay" style="background:${t.heroOverlay};"></div>
  <div class="ws-hero-content ws-hero-content--el">
    ${c.eyebrow ? `<p class="ws-hero-eyebrow"><span class="ws-hero-eyebrow-rule"></span>${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-headline ws-hero-headline--el">${esc(c.headline || "Welcome")}</h1>
    ${c.subheadline ? `<p class="ws-hero-sub">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-hero-ctas">
      ${c.ctaPrimary  ? `<a href="#booking" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
      ${c.ctaSecondary ? `<a href="#about"   class="ws-btn ws-btn-ghost">${esc(c.ctaSecondary)}</a>` : ""}
    </div>
  </div>
</section>`;
}

// 2. full-bleed-center: centered text overlay (estate-elegant)
function renderHeroBleedCenter(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; ctaPrimary?: string; ctaSecondary?: string },
  imageUrl?: string
): string {
  return `<section class="ws-hero ws-hero--ee" id="hero">
  ${imageUrl
    ? `<img src="${esc(imageUrl)}" alt="${esc(c.headline || "Hero")}" class="ws-hero-img" fetchpriority="high">`
    : `<div class="ws-hero-img" style="background:linear-gradient(160deg,${t.heroBg} 0%,${t.heroBg} 55%,${t.accent}20 100%);"></div>`}
  <div class="ws-hero-overlay" style="background:${t.heroOverlay};"></div>
  <div class="ws-hero-content ws-hero-content--ee">
    ${c.eyebrow ? `<p class="ws-hero-eyebrow ws-hero-eyebrow--ee">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-headline ws-hero-headline--ee">${esc(c.headline || "Welcome")}</h1>
    ${c.subheadline ? `<p class="ws-hero-sub ws-hero-sub--ee">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-hero-ctas" style="justify-content:center;">
      ${c.ctaPrimary  ? `<a href="#booking" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
      ${c.ctaSecondary ? `<a href="#about"   class="ws-btn ws-btn-ghost">${esc(c.ctaSecondary)}</a>` : ""}
    </div>
  </div>
</section>`;
}

// 3. centered-glow: dark bg, centered headline, violet/accent radial glow (saas-sharp)
function renderHeroCenteredGlow(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; ctaPrimary?: string; ctaSecondary?: string },
  imageUrl?: string
): string {
  // Use photo as subtle background if provided, otherwise pure dark bg
  const imgHtml = imageUrl
    ? `<img src="${esc(imageUrl)}" alt="" class="ws-hero-img" fetchpriority="high" style="opacity:0.18;">`
    : "";
  return `<section class="ws-hero ws-hero--ss" id="hero">
  ${imgHtml}
  <div class="ws-hero-glow"></div>
  <div class="ws-hero-content ws-hero-content--ss">
    ${c.eyebrow ? `<p class="ws-hero-chip">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-headline ws-hero-headline--ss">${esc(c.headline || "Welcome")}</h1>
    ${c.subheadline ? `<p class="ws-hero-sub ws-hero-sub--ss">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-hero-ctas" style="justify-content:center;">
      ${c.ctaPrimary  ? `<a href="#booking" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
      ${c.ctaSecondary ? `<a href="#about"   class="ws-btn ws-btn-ghost">${esc(c.ctaSecondary)}</a>` : ""}
    </div>
  </div>
</section>`;
}

// 4. split-right: text left, photo right — no overlay (beauty, medical)
function renderHeroSplit(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; ctaPrimary?: string; ctaSecondary?: string },
  imageUrl?: string
): string {
  const isClinical = t.preset === "medical";
  return `<section class="ws-hero ws-hero--split" id="hero">
  <div class="ws-hero-split-text">
    ${c.eyebrow ? `<p class="ws-hero-eyebrow" style="color:var(--accent);">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-headline ws-hero-headline--split">${esc(c.headline || "Welcome")}</h1>
    ${c.subheadline ? `<p class="ws-hero-sub ws-hero-sub--split">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-hero-ctas">
      ${c.ctaPrimary  ? `<a href="#booking" class="ws-btn ws-btn-accent${isClinical ? " ws-btn--pill" : ""}">${esc(c.ctaPrimary)}</a>` : ""}
      ${c.ctaSecondary ? `<a href="#about"   class="ws-btn ws-btn-outline">${esc(c.ctaSecondary)}</a>` : ""}
    </div>
  </div>
  <div class="ws-hero-split-media${isClinical ? " ws-hero-split-media--cb" : ""}">
    ${imageUrl
      ? `<img src="${esc(imageUrl)}" alt="${esc(c.headline || "Hero")}" fetchpriority="high" style="width:100%;height:100%;object-fit:cover;display:block;">`
      : `<div style="width:100%;height:100%;background:linear-gradient(135deg,${t.heroBg},${t.accent});"></div>`}
  </div>
</section>`;
}

export function renderHero(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; ctaPrimary?: string; ctaSecondary?: string },
  imageUrl?: string
): string {
  if (t.heroLayout === "split-right")    return renderHeroSplit(t, c, imageUrl);
  if (t.heroLayout === "centered-glow")  return renderHeroCenteredGlow(t, c, imageUrl);
  if (t.heroLayout === "full-bleed-center") return renderHeroBleedCenter(t, c, imageUrl);
  return renderHeroBleedBottom(t, c, imageUrl); // "full-bleed-bottom" (editorial-luxury)
}

// ── About ─────────────────────────────────────────────────────────────────────
export function renderAbout(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; body?: string; bullets?: { title: string; text: string }[]; ctaText?: string },
  imageUrl?: string
): string {
  const bullets = (c.bullets ?? []).slice(0, 4);
  return `<section class="ws-section" id="about">
  <div class="ws-container">
    <div class="ws-about-inner">
      ${photo(imageUrl, c.headline || "About us", "ws-about-img")}
      <div class="ws-about-content">
        ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
        ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
        ${c.body     ? `<p style="color:var(--color-muted);line-height:1.8;margin-bottom:36px;">${esc(c.body)}</p>` : ""}
        ${bullets.map((b) => `
        <div class="ws-bullet">
          <div class="ws-bullet-icon">${icon("check", 12)}</div>
          <div>
            <p class="ws-bullet-title">${esc(b.title)}</p>
            <p class="ws-bullet-text">${esc(b.text)}</p>
          </div>
        </div>`).join("")}
        ${c.ctaText ? `<a href="#booking" class="ws-btn ws-btn-outline" style="margin-top:8px;">${esc(c.ctaText)}</a>` : ""}
      </div>
    </div>
  </div>
</section>`;
}

// ── Services — preset-aware cards ─────────────────────────────────────────────
export function renderServices(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; items?: { icon?: string; title?: string; description?: string; price?: string }[] }
): string {
  const items = (c.items ?? []).slice(0, 6);
  const p = t.preset;

  // medical: icon circles + rounded cards; fitness: gradient-border dark cards
  const renderCard = (item: typeof items[0], i: number): string => {
    const showIcon = (p === "medical") && item.icon;
    const isSaas   = p === "fitness";
    return `<div class="ws-service-card ws-service-card--${p.replace(/-/g, "")}">
        ${showIcon ? `<div class="ws-service-icon">${icon(item.icon || "star", 22)}</div>` : ""}
        ${!showIcon ? `<p class="ws-service-num">${isSaas ? `<span class="ws-service-num-line"></span>` : ""}0${i + 1}</p>` : ""}
        <h3 class="ws-service-title">${esc(item.title || "Service")}</h3>
        <p class="ws-service-desc">${esc(item.description || "")}</p>
        ${item.price ? `<span class="ws-service-price">${esc(item.price)}</span>` : ""}
      </div>`;
  };

  return `<section class="ws-section ws-section-alt" id="services">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-services-grid">
      ${items.map((item, i) => renderCard(item, i)).join("")}
    </div>
  </div>
</section>`;
}

// ── Gallery ───────────────────────────────────────────────────────────────────
export function renderGallery(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string },
  images: (string | undefined)[]
): string {
  // Only render slots that have actual image URLs — never blank/fallback slots
  const items = (images.filter(Boolean) as string[]).slice(0, 6);
  if (!items.length) return "";
  // Adjust column count to match available images (avoid orphaned grid cells)
  const cols = items.length >= 4 ? 3 : items.length >= 2 ? 2 : 1;
  return `<section class="ws-section" id="gallery">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-gallery-grid" style="margin-top:48px;grid-template-columns:repeat(${cols},1fr);">
      ${items.map((src, i) => `
      <div class="ws-gallery-item">
        <img src="${esc(src)}" alt="${esc(c.headline ? `${c.headline} ${i + 1}` : `Gallery ${i + 1}`)}" class="ws-gallery-img" loading="lazy" style="width:100%;height:100%;">
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// ── Testimonials ──────────────────────────────────────────────────────────────
export function renderTestimonials(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; items?: { quote?: string; name?: string; role?: string }[] }
): string {
  const items = (c.items ?? []).filter((i) => i.quote && i.name).slice(0, 3);
  if (!items.length) return "";
  return `<section class="ws-section ws-section-alt" id="testimonials">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-test-grid" style="margin-top:48px;">
      ${items.map((item) => {
        const initials = (item.name ?? "?").split(" ").map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
        return `
      <div class="ws-test-card">
        <p class="ws-stars">★★★★★</p>
        <p class="ws-test-quote">"${esc(item.quote)}"</p>
        <div class="ws-test-footer">
          <div class="ws-test-avatar">${esc(initials)}</div>
          <div>
            <p class="ws-test-name">${esc(item.name)}</p>
            ${item.role ? `<p class="ws-test-role">${esc(item.role)}</p>` : ""}
          </div>
        </div>
      </div>`;
      }).join("")}
    </div>
  </div>
</section>`;
}

// ── Team ──────────────────────────────────────────────────────────────────────
export function renderTeam(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; members?: { name?: string; role?: string; bio?: string }[] }
): string {
  const members = (c.members ?? []).slice(0, 4);
  return `<section class="ws-section" id="team">
  <div class="ws-container" style="text-align:center;">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-team-grid" style="margin-top:56px;">
      ${members.map((m) => {
        const initials = (m.name ?? "?").split(" ").map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
        return `
      <div class="ws-team-card">
        <div class="ws-team-avatar">${esc(initials)}</div>
        <p class="ws-team-name">${esc(m.name ?? "")}</p>
        <p class="ws-team-role">${esc(m.role ?? "")}</p>
        ${m.bio ? `<p class="ws-team-bio">${esc(m.bio)}</p>` : ""}
      </div>`;
      }).join("")}
    </div>
  </div>
</section>`;
}

// ── Booking ───────────────────────────────────────────────────────────────────
export function renderBooking(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; phone?: string; email?: string; address?: string; hours?: string; ctaText?: string; services?: string[] }
): string {
  const services = (c.services ?? []).slice(0, 8);
  const contactItems = [
    c.phone   && { icon: "phone", label: "Phone",   value: c.phone,   href: `tel:${c.phone.replace(/\s/g, "")}` },
    c.email   && { icon: "mail",  label: "Email",   value: c.email,   href: `mailto:${c.email}` },
    c.address && { icon: "map",   label: "Address", value: c.address, href: undefined },
    c.hours   && { icon: "time",  label: "Hours",   value: c.hours,   href: undefined },
  ].filter(Boolean) as { icon: string; label: string; value: string; href?: string }[];

  const hasContact = contactItems.length > 0;
  return `<section class="ws-section" id="booking">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-booking-inner"${!hasContact ? ' style="grid-template-columns:1fr;max-width:640px;"' : ""}>
      ${hasContact ? `<div>
        ${contactItems.map((ci) => `
        <div class="ws-contact-item">
          <div class="ws-contact-icon">${icon(ci.icon, 20)}</div>
          <div>
            <p class="ws-contact-label">${esc(ci.label)}</p>
            ${ci.href
              ? `<a href="${esc(ci.href)}" class="ws-contact-value" style="text-decoration:underline;text-underline-offset:3px;">${esc(ci.value)}</a>`
              : `<p class="ws-contact-value">${esc(ci.value)}</p>`}
          </div>
        </div>`).join("")}
      </div>` : ""}
      <div>
        <form id="booking-form" class="ws-booking-form" onsubmit="return wsSubmitForm(event)">
          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">First Name</label>
              <input class="ws-form-input" type="text" name="firstName" placeholder="Jane" required>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Last Name</label>
              <input class="ws-form-input" type="text" name="lastName" placeholder="Smith" required>
            </div>
          </div>
          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Phone</label>
              <input class="ws-form-input" type="tel" name="phone" placeholder="+1 555 000 0000" required>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Email</label>
              <input class="ws-form-input" type="email" name="email" placeholder="jane@example.com">
            </div>
          </div>
          ${services.length ? `
          <div class="ws-form-group">
            <label class="ws-form-label">Service</label>
            <select class="ws-form-input" name="service">
              <option value="">Select a service…</option>
              ${services.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}
            </select>
          </div>` : ""}
          <div class="ws-form-group">
            <label class="ws-form-label">Preferred Date &amp; Time</label>
            <input class="ws-form-input" type="text" name="datetime" placeholder="e.g. Mon 3 July, 10am">
          </div>
          <div class="ws-form-group">
            <label class="ws-form-label">Message</label>
            <textarea class="ws-form-input" name="message" rows="3" placeholder="Any questions or notes…"></textarea>
          </div>
          <div id="booking-error" style="display:none;color:#DC2626;font-size:13px;margin-bottom:12px;padding:10px 14px;background:#FEF2F2;border-radius:8px;"></div>
          <button type="submit" class="ws-btn ws-btn-primary" style="width:100%;justify-content:center;" data-label="${esc(c.ctaText || "Request Appointment")}">${esc(c.ctaText || "Request Appointment")}</button>
        </form>
        <div id="booking-success" class="ws-form-success">
          <div class="ws-form-success-icon">${icon("check", 28)}</div>
          <h3 class="ws-form-success-title">Request Sent!</h3>
          <p class="ws-form-success-text">We'll be in touch shortly to confirm your appointment.</p>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
export function renderFaq(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; items?: { q?: string; a?: string }[] }
): string {
  const items = (c.items ?? []).slice(0, 8);
  return `<section class="ws-section ws-section-alt" id="faq">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-faq-list" style="margin-top:48px;">
      ${items.map((item, i) => `
      <div class="ws-faq-item" id="faq-wrap-${i}">
        <div class="ws-faq-q" onclick="wsFaqToggle(${i})" role="button" aria-expanded="false">
          <span>${esc(item.q ?? "")}</span>
          <span class="ws-faq-icon" id="faq-icon-${i}">+</span>
        </div>
        <div class="ws-faq-a" id="faq-${i}">${esc(item.a ?? "")}</div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// ── CTA Banner ────────────────────────────────────────────────────────────────
export function renderCtaBanner(
  _t: DesignTokens,
  c: { headline?: string; sub?: string; ctaText?: string }
): string {
  return `<section class="ws-cta-banner">
  <div class="ws-container" style="text-align:center;">
    <h2 class="ws-cta-headline">${esc(c.headline || "Ready to get started?")}</h2>
    ${c.sub    ? `<p class="ws-cta-sub">${esc(c.sub)}</p>` : ""}
    ${c.ctaText ? `<a href="#booking" class="ws-btn ws-btn-white">${esc(c.ctaText)}</a>` : ""}
  </div>
</section>`;
}

// ── Footer ────────────────────────────────────────────────────────────────────
function linkHref(text: string): string {
  const t = text.toLowerCase().replace(/[^a-z]/g, "");
  if (["services", "service", "treatments", "treatment", "offers"].includes(t)) return "#services";
  if (["about", "story", "ourstory", "whoweare", "us"].includes(t)) return "#about";
  if (["faq", "faqs", "questions"].includes(t)) return "#faq";
  if (["contact", "contactus", "booking", "book", "appointment", "consultation", "enquiry"].includes(t)) return "#booking";
  if (["gallery", "work", "portfolio", "ourwork"].includes(t)) return "#gallery";
  if (["team", "staff", "ourteam"].includes(t)) return "#team";
  return "#booking";
}

export function renderFooter(
  businessName: string,
  c: { tagline?: string; links?: string[]; phone?: string; email?: string; address?: string; copyright?: string }
): string {
  const links = (c.links ?? ["Services", "About", "FAQ", "Contact"]).slice(0, 6);
  const year = new Date().getFullYear();
  return `<footer class="ws-footer" id="footer">
  <div class="ws-container">
    <div class="ws-footer-inner">
      <div>
        <p class="ws-footer-logo">${esc(businessName)}</p>
        <p class="ws-footer-tag">${esc(c.tagline ?? "")}</p>
      </div>
      <div>
        <p class="ws-footer-heading">Navigation</p>
        ${links.map((l) => `<a href="${linkHref(l)}" class="ws-footer-link">${esc(l)}</a>`).join("")}
      </div>
      <div>
        <p class="ws-footer-heading">Contact</p>
        ${c.phone   ? `<a href="tel:${esc(c.phone.replace(/\s/g, ""))}" class="ws-footer-link">${esc(c.phone)}</a>` : ""}
        ${c.email   ? `<a href="mailto:${esc(c.email)}" class="ws-footer-link">${esc(c.email)}</a>` : ""}
        ${c.address ? `<p class="ws-footer-link">${esc(c.address)}</p>` : ""}
      </div>
    </div>
    <div class="ws-footer-bottom">
      ${c.copyright ? esc(c.copyright) : `&copy; ${year} ${esc(businessName)}. All rights reserved.`}
    </div>
  </div>
</footer>`;
}

// ── V2 section library (16 composable sections) ───────────────────────────────

type HeroContent = { eyebrow?: string; headline?: string; subheadline?: string; ctaPrimary?: string; ctaSecondary?: string };

// 1. hero-fullbleed — centered text over full-bleed image
export function renderHeroFullbleed(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  return renderHeroBleedCenter(t, c, imageUrl);
}

// 2. hero-split — text left, image right
export function renderHeroSplitSection(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  return renderHeroSplit(t, c, imageUrl);
}

// 3. hero-minimal — no image; gradient radial glow; good for SaaS / tech / agency
export function renderHeroMinimal(t: DesignTokens, c: HeroContent): string {
  return `<section class="ws-hero ws-hero--minimal" id="hero" style="background:${t.heroBg};">
  <div class="ws-hero-glow-min" style="background:radial-gradient(ellipse 80% 60% at 50% 50%,${t.accentAlpha.replace("0.10","0.28")} 0%,transparent 70%);"></div>
  <div class="ws-hero-content ws-hero-content--min">
    ${c.eyebrow ? `<p class="ws-hero-chip">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-headline ws-hero-headline--min" style="font-family:var(--font-heading);font-size:${t.heroHeadlineSize};font-weight:${t.headingWeight};line-height:1.08;letter-spacing:${t.headingTracking};text-transform:${t.headingTransform};color:${t.heading};margin-bottom:22px;max-width:52ch;">${esc(c.headline || "Welcome")}</h1>
    ${c.subheadline ? `<p style="font-size:1.1rem;line-height:1.75;color:${t.muted};max-width:48ch;margin-bottom:48px;">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-hero-ctas" style="justify-content:center;">
      ${c.ctaPrimary   ? `<a href="#contact" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
      ${c.ctaSecondary ? `<a href="#about"   class="ws-btn ws-btn-ghost">${esc(c.ctaSecondary)}</a>` : ""}
    </div>
  </div>
</section>`;
}

// 4. feature-grid — clean cards, icon + title + description, no numbering
export function renderFeatureGrid(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; items?: { icon?: string; title?: string; description?: string }[] }
): string {
  const items = (c.items ?? []).slice(0, 6);
  if (!items.length) return "";
  return `<section class="ws-section ws-section-alt" id="features">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-feat-grid">
      ${items.map((item) => `
      <div class="ws-feat-card">
        ${item.icon ? `<div class="ws-feat-icon">${icon(item.icon, 22)}</div>` : ""}
        <h3 class="ws-feat-title">${esc(item.title || "")}</h3>
        <p class="ws-feat-desc">${esc(item.description || "")}</p>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// 5. pricing-tiers — pricing cards, highlighted tier
export function renderPricingTiers(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; tiers?: { name?: string; price?: string; period?: string; features?: string[]; ctaText?: string; highlighted?: boolean }[] }
): string {
  const tiers = (c.tiers ?? []).slice(0, 4);
  if (!tiers.length) return "";
  return `<section class="ws-section" id="pricing">
  <div class="ws-container" style="text-align:center;">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading" style="margin:0 auto 56px;">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-price-grid">
      ${tiers.map((tier) => {
        const hi = !!tier.highlighted;
        const features = (tier.features ?? []).slice(0, 8);
        return `
      <div class="ws-price-card${hi ? " ws-price-card--hi" : ""}" style="${hi ? `border-color:${t.accent};background:${t.accentAlpha};` : ""}">
        ${hi ? `<p class="ws-price-badge" style="background:${t.accent};color:${t.accentFg};">Most Popular</p>` : ""}
        <p class="ws-price-name">${esc(tier.name || "")}</p>
        <p class="ws-price-amount">${esc(tier.price || "")}<span class="ws-price-period">${esc(tier.period ? `/${tier.period}` : "")}</span></p>
        <ul class="ws-price-features">
          ${features.map((f) => `<li class="ws-price-feat"><span>${icon("check", 13)}</span>${esc(f)}</li>`).join("")}
        </ul>
        <a href="#contact" class="ws-btn ${hi ? "ws-btn-accent" : "ws-btn-outline"}" style="width:100%;justify-content:center;">${esc(tier.ctaText || "Get Started")}</a>
      </div>`;
      }).join("")}
    </div>
  </div>
</section>`;
}

// 6. service-list — editorial horizontal list, name left / price right
export function renderServiceList(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; items?: { title?: string; description?: string; price?: string }[] }
): string {
  const items = (c.items ?? []).slice(0, 12);
  if (!items.length) return "";
  return `<section class="ws-section ws-section-alt" id="services">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-svc-list">
      ${items.map((item) => `
      <div class="ws-svc-item">
        <div class="ws-svc-left">
          <p class="ws-svc-title">${esc(item.title || "")}</p>
          ${item.description ? `<p class="ws-svc-desc">${esc(item.description)}</p>` : ""}
        </div>
        ${item.price ? `<p class="ws-svc-price">${esc(item.price)}</p>` : ""}
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// 7. gallery-grid — photo grid (delegates to renderGallery)
export function renderGalleryGrid(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string },
  images: (string | undefined)[]
): string {
  return renderGallery(t, c, images);
}

// 8. listings-grid — cards with image, title, subtitle, price (rooms/menu/properties)
export function renderListingsGrid(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; items?: { title?: string; subtitle?: string; description?: string; price?: string }[] },
  images: (string | undefined)[]
): string {
  const items = (c.items ?? []).slice(0, 6);
  if (!items.length) return "";
  return `<section class="ws-section" id="listings">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-listing-grid">
      ${items.map((item, i) => `
      <div class="ws-listing-card">
        <div class="ws-listing-img">
          ${photo(images[i], item.title || `Item ${i + 1}`, "ws-gallery-img", "width:100%;height:100%;")}
        </div>
        <div class="ws-listing-body">
          <h3 class="ws-listing-title">${esc(item.title || "")}</h3>
          ${item.subtitle    ? `<p class="ws-listing-sub">${esc(item.subtitle)}</p>` : ""}
          ${item.description ? `<p class="ws-listing-desc">${esc(item.description)}</p>` : ""}
          ${item.price       ? `<p class="ws-listing-price">${esc(item.price)}</p>` : ""}
        </div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// 9. about-story — text + optional image (delegates to renderAbout)
export function renderAboutStory(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; body?: string; bullets?: { title: string; text: string }[]; ctaText?: string },
  imageUrl?: string
): string {
  return renderAbout(t, c, imageUrl);
}

// 10. team-grid — team members (delegates to renderTeam)
export function renderTeamGrid(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; members?: { name?: string; role?: string; bio?: string }[] }
): string {
  return renderTeam(t, c);
}

// 11. testimonials (new type alias for v2 — identical to renderTestimonials, real data only)
export function renderTestimonialsSection(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; items?: { quote?: string; name?: string; role?: string }[] }
): string {
  return renderTestimonials(t, c);
}

// 12. stats-band — dark band with large numbers (only render if items provided)
export function renderStatsBand(
  t: DesignTokens,
  c: { items?: { value?: string; label?: string }[] }
): string {
  const items = (c.items ?? []).filter((i) => i.value && i.label).slice(0, 5);
  if (!items.length) return "";
  return `<section class="ws-stats" style="background:${t.heroBg};">
  <div class="ws-container">
    <div class="ws-stats-inner">
      ${items.map((item) => `
      <div class="ws-stat">
        <p class="ws-stat-value" style="color:${t.accent};">${esc(item.value)}</p>
        <p class="ws-stat-label">${esc(item.label)}</p>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// 13. process-steps — horizontal numbered steps
export function renderProcessSteps(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; steps?: { title?: string; description?: string }[] }
): string {
  const steps = (c.steps ?? []).slice(0, 5);
  if (!steps.length) return "";
  return `<section class="ws-section ws-section-alt" id="process">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-steps">
      ${steps.map((step, i) => `
      <div class="ws-step">
        <div class="ws-step-num">${i + 1}</div>
        <div class="ws-step-line"></div>
        <h3 class="ws-step-title">${esc(step.title || "")}</h3>
        <p class="ws-step-desc">${esc(step.description || "")}</p>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// 14. faq-accordion (delegates to renderFaq)
export function renderFaqAccordion(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; items?: { q?: string; a?: string }[] }
): string {
  return renderFaq(t, c);
}

// 15. cta-band (delegates to renderCtaBanner)
export function renderCtaBand(
  t: DesignTokens,
  c: { headline?: string; sub?: string; ctaText?: string }
): string {
  return renderCtaBanner(t, c);
}

// 16. contact-block — contact form, no bottom padding (sits directly before footer)
export function renderContactBlock(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; phone?: string; email?: string; address?: string; hours?: string; ctaText?: string; services?: string[] }
): string {
  const html = renderBooking(t, c);
  // Replace id="booking" with id="contact" so contact-block has its own anchor,
  // and remove the section's bottom padding since footer follows immediately.
  return html.replace(`id="booking"`, `id="contact"`).replace(
    `class="ws-section" id="contact"`,
    `class="ws-section ws-section--contact" id="contact"`
  );
}
