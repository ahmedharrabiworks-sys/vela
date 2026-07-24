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
  cart:      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
  zap:       `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  puzzle:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
};

function icon(name: string, size = 20): string {
  const svg = ICONS[name] ?? ICONS.star ?? "";
  return svg
    .replace(/width="\d+"/, `width="${size}"`)
    .replace(/height="\d+"/, `height="${size}"`);
}

function photo(src: string | undefined, alt: string, cls: string, style = ""): string {
  if (src) return `<img src="${esc(src)}" alt="${esc(alt)}" class="${cls}" style="${style}" loading="lazy" onerror="this.style.display='none';this.parentElement&&(this.parentElement.style.background='linear-gradient(135deg,var(--surface) 0%,var(--accent-alpha) 50%,var(--surface) 100%)')">`;
  return `<div class="${cls}" style="background:linear-gradient(135deg,var(--surface) 0%,var(--accent-alpha) 50%,var(--bg-alt) 100%);${style}" aria-label="${esc(alt)}"></div>`;
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Nav ───────────────────────────────────────────────────────────────────────
export function renderNav(
  businessName: string,
  ctaText: string,
  navLinks?: Array<{ label: string; href: string }>
): string {
  const links = navLinks ?? [
    { label: "Services", href: "#services" },
    { label: "About",    href: "#about"    },
    { label: "Contact",  href: "#booking"  },
  ];
  return `<nav class="ws-nav">
  <div class="ws-nav-inner">
    <a href="#" class="ws-nav-logo">${esc(businessName)}</a>
    <div class="ws-nav-links">
      ${links.map((l) => `<a href="${esc(l.href)}" class="ws-nav-link">${esc(l.label)}</a>`).join("")}
    </div>
    <a href="#booking" class="ws-btn ws-btn-accent" style="padding:10px 22px;font-size:0.82rem;">${esc(ctaText || "Book Now")}</a>
  </div>
</nav>`;
}

// ── Hero — legacy layout variants (v1 backward compat) ────────────────────────

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

function renderHeroCenteredGlow(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; ctaPrimary?: string; ctaSecondary?: string },
  imageUrl?: string
): string {
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

// editorial-offset: oversized headline top-left, floating image bottom-right
function renderHeroEditorialOffset(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; ctaPrimary?: string; ctaSecondary?: string },
  imageUrl?: string
): string {
  return `<section class="ws-hero ws-hero--editorial" id="hero" style="background:${t.heroBg};">
  <div class="ws-container" style="position:relative;z-index:1;padding-top:clamp(80px,14vw,160px);padding-bottom:clamp(80px,14vw,160px);">
    <div class="ws-hero-editorial-inner">
      <div class="ws-hero-editorial-text">
        ${c.eyebrow ? `<p class="ws-hero-eyebrow" style="color:${t.accent};margin-bottom:24px;">${esc(c.eyebrow)}</p>` : ""}
        <h1 class="ws-hero-headline ws-hero-headline--editorial" style="color:${t.heading};">${esc(c.headline || "Welcome")}</h1>
        <div class="ws-hero-editorial-foot">
          ${c.subheadline ? `<p class="ws-hero-sub" style="color:${t.muted};max-width:38ch;margin-bottom:40px;">${esc(c.subheadline)}</p>` : ""}
          <div class="ws-hero-ctas">
            ${c.ctaPrimary  ? `<a href="#booking" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
            ${c.ctaSecondary ? `<a href="#about"   class="ws-btn ws-btn-ghost">${esc(c.ctaSecondary)}</a>` : ""}
          </div>
        </div>
      </div>
      <div class="ws-hero-editorial-img">
        ${photo(imageUrl, c.headline || "Hero", "ws-hero-editorial-photo")}
      </div>
    </div>
  </div>
</section>`;
}

// split-right: image left, text right (mirror of split-left)
function renderHeroSplitRight(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; ctaPrimary?: string; ctaSecondary?: string },
  imageUrl?: string
): string {
  return `<section class="ws-hero ws-hero--split ws-hero--split-right" id="hero">
  <div class="ws-hero-split-media">
    ${imageUrl
      ? `<img src="${esc(imageUrl)}" alt="${esc(c.headline || "Hero")}" fetchpriority="high" style="width:100%;height:100%;object-fit:cover;display:block;">`
      : `<div style="width:100%;height:100%;background:linear-gradient(135deg,${t.accent},${t.heroBg});"></div>`}
  </div>
  <div class="ws-hero-split-text">
    ${c.eyebrow ? `<p class="ws-hero-eyebrow" style="color:var(--accent);">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-headline ws-hero-headline--split">${esc(c.headline || "Welcome")}</h1>
    ${c.subheadline ? `<p class="ws-hero-sub ws-hero-sub--split">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-hero-ctas">
      ${c.ctaPrimary  ? `<a href="#booking" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
      ${c.ctaSecondary ? `<a href="#about"   class="ws-btn ws-btn-outline">${esc(c.ctaSecondary)}</a>` : ""}
    </div>
  </div>
</section>`;
}

export function renderHero(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; ctaPrimary?: string; ctaSecondary?: string },
  imageUrl?: string
): string {
  if (t.heroLayout === "split-right")       return renderHeroSplit(t, c, imageUrl);
  if (t.heroLayout === "centered-glow")     return renderHeroCenteredGlow(t, c, imageUrl);
  if (t.heroLayout === "full-bleed-center") return renderHeroBleedCenter(t, c, imageUrl);
  return renderHeroBleedBottom(t, c, imageUrl);
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
  const items = (images.filter(Boolean) as string[]).slice(0, 6);
  if (!items.length) return "";
  const cols = items.length >= 4 ? 3 : items.length >= 2 ? 2 : 1;
  return `<section class="ws-section" id="gallery">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-gallery-grid" style="margin-top:48px;grid-template-columns:repeat(${cols},1fr);">
      ${items.map((src, i) => `
      <div class="ws-gallery-item" style="background:linear-gradient(135deg,var(--surface) 0%,var(--accent-alpha) 50%,var(--bg-alt) 100%);">
        <img src="${esc(src)}" alt="${esc(c.headline ? `${c.headline} ${i + 1}` : `Gallery ${i + 1}`)}" class="ws-gallery-img" loading="lazy" style="width:100%;height:100%;" onerror="this.style.display='none'">
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

// ── Contact form helper ───────────────────────────────────────────────────────
function contactForm(ctaText: string, services: string[]): string {
  return `<form id="booking-form" class="ws-booking-form" onsubmit="return wsSubmitForm(event)">
    <div class="ws-form-group">
      <label class="ws-form-label">Full Name</label>
      <input class="ws-form-input" type="text" name="firstName" placeholder="Your name" required>
    </div>
    <div class="ws-form-group">
      <label class="ws-form-label">Email</label>
      <input class="ws-form-input" type="email" name="email" placeholder="Email address" required>
    </div>
    <div class="ws-form-group">
      <label class="ws-form-label">Phone</label>
      <input class="ws-form-input" type="tel" name="phone" placeholder="Phone number">
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
      <label class="ws-form-label">Message</label>
      <textarea class="ws-form-input" name="message" rows="4" placeholder="How can we help?"></textarea>
    </div>
    <div id="booking-error" style="display:none;color:#DC2626;font-size:13px;margin-bottom:12px;padding:10px 14px;background:#FEF2F2;border-radius:8px;"></div>
    <button type="submit" class="ws-btn ws-btn-accent" style="width:100%;justify-content:center;" data-label="${esc(ctaText || "Send Message")}">${esc(ctaText || "Send Message")}</button>
  </form>
  <div id="booking-success" class="ws-form-success">
    <div class="ws-form-success-icon">${icon("check", 28)}</div>
    <h3 class="ws-form-success-title">Message Sent!</h3>
    <p class="ws-form-success-text">We'll get back to you as soon as possible.</p>
  </div>`;
}

function contactItems(c: { phone?: string; email?: string; address?: string; hours?: string }): Array<{ icon: string; label: string; value: string; href?: string; field: string }> {
  return [
    c.phone   && { icon: "phone", label: "Phone",   value: c.phone,   href: `tel:${c.phone.replace(/\s/g, "")}`,  field: "phone" },
    c.email   && { icon: "mail",  label: "Email",   value: c.email,   href: `mailto:${c.email}`,                  field: "email" },
    c.address && { icon: "map",   label: "Address", value: c.address, href: undefined,                            field: "address" },
    c.hours   && { icon: "time",  label: "Hours",   value: c.hours,   href: undefined,                            field: "hours" },
  ].filter(Boolean) as Array<{ icon: string; label: string; value: string; href?: string; field: string }>;
}

function renderContactRow(ci: { icon: string; label: string; value: string; href?: string; field: string }): string {
  return `<div class="ws-contact-item">
    <div class="ws-contact-icon">${icon(ci.icon, 20)}</div>
    <div>
      <p class="ws-contact-label">${esc(ci.label)}</p>
      ${ci.href
        ? `<a href="${esc(ci.href)}" class="ws-contact-value" data-field="${esc(ci.field)}" style="text-decoration:underline;text-underline-offset:3px;">${esc(ci.value)}</a>`
        : `<p class="ws-contact-value" data-field="${esc(ci.field)}">${esc(ci.value)}</p>`}
    </div>
  </div>`;
}

// ── Booking (legacy v1) ───────────────────────────────────────────────────────
export function renderBooking(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; phone?: string; email?: string; address?: string; hours?: string; ctaText?: string; services?: string[]; variant?: string }
): string {
  const services = (c.services ?? []).slice(0, 8);
  const items    = contactItems(c);
  const hasContact = items.length > 0;

  // With no contact data or centered-form variant → centered layout
  if (!hasContact || c.variant === "centered-form") {
    return `<section class="ws-section" id="booking">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow" style="text-align:center;">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading" style="text-align:center;">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading" style="text-align:center;">${esc(c.subheadline)}</p>` : ""}
    ${hasContact ? `<div class="ws-contact-inline-row">
      ${items.map(renderContactRow).join("")}
    </div>` : ""}
    <div style="max-width:640px;margin:0 auto;">
      ${contactForm(c.ctaText ?? "", services)}
    </div>
  </div>
</section>`;
  }

  // split-form (default when has contact) — left: heading + details, right: form
  return `<section class="ws-section" id="booking">
  <div class="ws-container">
    <div class="ws-booking-inner">
      <div class="ws-booking-left">
        ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
        ${c.headline    ? `<h2 class="ws-heading" style="margin-bottom:16px;">${esc(c.headline)}</h2>` : ""}
        ${c.subheadline ? `<p style="color:var(--color-muted);line-height:1.7;margin-bottom:32px;">${esc(c.subheadline)}</p>` : ""}
        <div class="ws-contact-details">
          ${items.map(renderContactRow).join("")}
        </div>
      </div>
      <div class="ws-booking-right">
        ${contactForm(c.ctaText ?? "", services)}
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
  if (["services", "service", "treatments", "treatment", "offers", "features", "feature"].includes(t)) return "#services";
  if (["about", "story", "ourstory", "whoweare", "us"].includes(t)) return "#about";
  if (["faq", "faqs", "questions"].includes(t)) return "#faq";
  if (["contact", "contactus", "booking", "book", "appointment", "consultation", "enquiry"].includes(t)) return "#booking";
  if (["gallery", "work", "portfolio", "ourwork"].includes(t)) return "#gallery";
  if (["team", "staff", "ourteam"].includes(t)) return "#team";
  if (["pricing", "plans", "packages"].includes(t)) return "#pricing";
  if (["products", "shop", "store"].includes(t)) return "#products";
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

// ── V2 section library ────────────────────────────────────────────────────────

type HeroContent = {
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
  // v3 pool variants — extended fields (all optional; renderers check presence before use)
  stats?:    { value: string; label: string }[];
  badges?:   { value: string; label: string }[];
  tiers?:    { name: string; price: string; period?: string }[];
  property?: { title?: string; price?: string; beds?: string; baths?: string; sqft?: string };
  services?: string[];
};

// 1. hero-fullbleed — centered text over full-bleed image (centered-overlay)
export function renderHeroFullbleed(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  return renderHeroBleedCenter(t, c, imageUrl);
}

// 2. hero-split — text left, image right
export function renderHeroSplitSection(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  return renderHeroSplit(t, c, imageUrl);
}

// 3. hero-minimal — no image; gradient radial glow; SaaS / tech / agency
export function renderHeroMinimal(t: DesignTokens, c: HeroContent): string {
  return `<section class="ws-hero ws-hero--minimal" id="hero" style="background:${t.heroBg};">
  <div class="ws-hero-glow-min" style="background:radial-gradient(ellipse 80% 60% at 50% 50%,${t.accentAlpha.replace("0.10","0.28")} 0%,transparent 70%);"></div>
  <div class="ws-hero-content ws-hero-content--min">
    ${c.eyebrow ? `<p class="ws-hero-chip">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-headline ws-hero-headline--min" style="font-family:var(--font-heading);font-size:${t.heroHeadlineSize};font-weight:${t.headingWeight};line-height:1.08;letter-spacing:${t.headingTracking};text-transform:${t.headingTransform};color:${t.heading};margin-bottom:22px;max-width:52ch;">${esc(c.headline || "Welcome")}</h1>
    ${c.subheadline ? `<p style="font-size:1.1rem;line-height:1.75;color:${t.muted};max-width:48ch;margin-bottom:48px;">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-hero-ctas" style="justify-content:center;">
      ${c.ctaPrimary   ? `<a href="#booking" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
      ${c.ctaSecondary ? `<a href="#about"   class="ws-btn ws-btn-ghost">${esc(c.ctaSecondary)}</a>` : ""}
    </div>
  </div>
</section>`;
}

// Unified hero dispatcher for v2 variant field
export function renderHeroVariant(
  t: DesignTokens,
  c: HeroContent,
  variant: string | undefined,
  imageUrl?: string,
  multiImageUrls?: (string | undefined)[],
): string {
  switch (variant) {
    // ── existing v2 variants ─────────────────────────────────────────────────
    case "split-left":        return renderHeroSplitSection(t, c, imageUrl);
    case "split-right":       return renderHeroSplitRight(t, c, imageUrl);
    case "editorial-offset":  return renderHeroEditorialOffset(t, c, imageUrl);
    case "minimal-stacked":   return renderHeroMinimal(t, c);
    // ── v3 pool variants ─────────────────────────────────────────────────────
    case "full-image":        return renderHeroFullImage(t, c, imageUrl);
    case "re-split":          return renderHeroReSplit(t, c, imageUrl);
    case "search-first":      return renderHeroSearchFirst(t, c, imageUrl);
    case "editorial":         return renderHeroEditorialOffset(t, c, imageUrl); // shared RE-4 / ID-12
    case "property-first":    return renderHeroPropertyFirst(t, c, imageUrl);
    case "trust-focused":     return renderHeroTrustFocused(t, c, imageUrl);
    case "booking-focused":   return renderHeroBookingFocused(t, c, imageUrl);
    case "clinical-premium":  return renderHeroClinicalPremium(t, c, imageUrl);
    case "cinematic-dark":    return renderHeroCinematicDark(t, c, imageUrl);
    case "membership-focused": return renderHeroMembershipFocused(t, c, imageUrl);
    case "energy-driven":     return renderHeroEnergyDriven(t, c, imageUrl);
    case "portfolio-first":   return renderHeroPortfolioFirst(t, c, multiImageUrls);
    case "luxury-showcase":   return renderHeroLuxuryShowcase(t, c, imageUrl);
    default:                  return renderHeroFullbleed(t, c, imageUrl); // centered-overlay
  }
}

// ── Hero v3 pool render functions ─────────────────────────────────────────────

// RE-1: full-image — dramatic full-bleed, bottom-anchored text, single CTA
function renderHeroFullImage(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  const bg = imageUrl
    ? `<img src="${esc(imageUrl)}" class="ws-hero-fi-bg-img" alt="${esc(c.headline || "Hero")}" loading="eager" onerror="this.style.display='none'">`
    : `<div class="ws-hero-fi-bg-img" style="background:${t.heroBg};"></div>`;
  return `<section class="ws-hero--fi" id="hero">
  ${bg}
  <div class="ws-hero-fi-overlay"></div>
  <div class="ws-hero-fi-inner">
    ${c.eyebrow     ? `<p class="ws-hero-fi-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-fi-h">${esc(c.headline || "")}</h1>
    ${c.subheadline ? `<p class="ws-hero-fi-sub">${esc(c.subheadline)}</p>` : ""}
    ${c.ctaPrimary  ? `<a href="#booking" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
  </div>
</section>`;
}

// RE-2: re-split — 50/50 grid, optional stats row beneath CTAs
function renderHeroReSplit(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  const stats = Array.isArray(c.stats) ? (c.stats as { value: string; label: string }[]).slice(0, 3) : [];
  const statsHtml = stats.length ? `
    <div class="ws-hero-res-stats">
      ${stats.map((s) => `<div class="ws-hero-res-stat">
        <p class="ws-hero-res-stat-val">${esc(s.value)}</p>
        <p class="ws-hero-res-stat-lbl">${esc(s.label)}</p>
      </div>`).join("")}
    </div>` : "";
  return `<section class="ws-hero--res" id="hero" style="background:${t.bg};">
  <div class="ws-hero-res-text">
    ${c.eyebrow     ? `<p class="ws-hero-res-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-res-h">${esc(c.headline || "")}</h1>
    ${c.subheadline ? `<p class="ws-hero-res-sub">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-hero-ctas">
      ${c.ctaPrimary   ? `<a href="#booking" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
      ${c.ctaSecondary ? `<a href="#about"   class="ws-btn ws-btn-ghost">${esc(c.ctaSecondary)}</a>` : ""}
    </div>
    ${statsHtml}
  </div>
  <div class="ws-hero-res-img">
    ${photo(imageUrl, c.headline || "Hero", "", "width:100%;height:100%;object-fit:cover;display:block;")}
  </div>
</section>`;
}

// RE-3: search-first — full-bleed + property-type pills + search bar
function renderHeroSearchFirst(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  const bg = imageUrl
    ? `<img src="${esc(imageUrl)}" class="ws-hero-sf-bg" alt="${esc(c.headline || "Properties")}" loading="eager" onerror="this.style.display='none'">`
    : `<div class="ws-hero-sf-bg" style="background:${t.heroBg};"></div>`;
  return `<section class="ws-hero--sf" id="hero">
  ${bg}
  <div class="ws-hero-sf-overlay"></div>
  <div class="ws-hero-sf-inner">
    ${c.eyebrow     ? `<p class="ws-hero-sf-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-sf-h">${esc(c.headline || "")}</h1>
    ${c.subheadline ? `<p class="ws-hero-sf-sub">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-hero-sf-bar">
      <input class="ws-hero-sf-input" type="text" placeholder="City, neighbourhood, or address…" aria-label="Search location">
      <div class="ws-hero-sf-pills">
        <button class="ws-hero-sf-pill ws-hero-sf-pill--on" onclick="wsHeroSFPill(this)" type="button">All</button>
        <button class="ws-hero-sf-pill" onclick="wsHeroSFPill(this)" type="button">Apartment</button>
        <button class="ws-hero-sf-pill" onclick="wsHeroSFPill(this)" type="button">Villa</button>
        <button class="ws-hero-sf-pill" onclick="wsHeroSFPill(this)" type="button">Commercial</button>
      </div>
      <a href="#listings" class="ws-btn ws-btn-accent ws-hero-sf-go">Search</a>
    </div>
  </div>
</section>`;
}

// RE-5: property-first — minimal header text, dominant featured listing card
function renderHeroPropertyFirst(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  const prop = c.property as { title?: string; price?: string; beds?: string; baths?: string; sqft?: string } | undefined;
  const hasSpec = prop && (prop.beds || prop.baths || prop.sqft);
  const specParts: string[] = [];
  if (prop?.beds)  specParts.push(`${esc(prop.beds)} Beds`);
  if (prop?.baths) specParts.push(`${esc(prop.baths)} Baths`);
  if (prop?.sqft)  specParts.push(`${esc(prop.sqft)} sqft`);
  const cardHtml = `<div class="ws-hero-pf-card">
    <div class="ws-hero-pf-card-img">
      ${photo(imageUrl, prop?.title || "Featured Property", "", "width:100%;height:100%;object-fit:cover;display:block;")}
      ${prop?.price ? `<div class="ws-hero-pf-price-tag">${esc(prop.price)}</div>` : ""}
    </div>
    ${(prop?.title || hasSpec) ? `<div class="ws-hero-pf-card-body">
      ${prop?.title ? `<p class="ws-hero-pf-card-title">${esc(prop.title)}</p>` : ""}
      ${hasSpec ? `<div class="ws-hero-pf-specs">${specParts.join("<span class=\"ws-hero-pf-dot\"> · </span>")}</div>` : ""}
    </div>` : ""}
  </div>`;
  return `<section class="ws-hero--pf" id="hero" style="background:${t.bg};">
  <div class="ws-container ws-hero-pf-inner">
    <div class="ws-hero-pf-meta">
      ${c.eyebrow     ? `<p class="ws-hero-pf-eyebrow">${esc(c.eyebrow)}</p>` : ""}
      <h1 class="ws-hero-pf-h">${esc(c.headline || "")}</h1>
      ${c.subheadline ? `<p class="ws-hero-pf-sub">${esc(c.subheadline)}</p>` : ""}
      <div class="ws-hero-ctas">
        ${c.ctaPrimary   ? `<a href="#booking" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
        ${c.ctaSecondary ? `<a href="#listings" class="ws-btn ws-btn-ghost">${esc(c.ctaSecondary)}</a>` : ""}
      </div>
    </div>
    ${cardHtml}
  </div>
</section>`;
}

// Dental-6: trust-focused — photo + headline + optional trust-badge row + CTA
function renderHeroTrustFocused(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  const badges = Array.isArray(c.badges) ? (c.badges as { value: string; label: string }[]).slice(0, 4) : [];
  const badgesHtml = badges.length ? `
    <div class="ws-hero-tf-badges">
      ${badges.map((b) => `<div class="ws-hero-tf-badge">
        <p class="ws-hero-tf-badge-val">${esc(b.value)}</p>
        <p class="ws-hero-tf-badge-lbl">${esc(b.label)}</p>
      </div>`).join("")}
    </div>` : "";
  return `<section class="ws-hero--tf" id="hero" style="background:${t.bg};">
  <div class="ws-hero-tf-img">
    ${photo(imageUrl, c.headline || "Dental practice", "", "width:100%;height:100%;object-fit:cover;display:block;")}
  </div>
  <div class="ws-hero-tf-content">
    ${c.eyebrow     ? `<p class="ws-hero-tf-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-tf-h">${esc(c.headline || "")}</h1>
    ${c.subheadline ? `<p class="ws-hero-tf-sub">${esc(c.subheadline)}</p>` : ""}
    ${badgesHtml}
    <div class="ws-hero-ctas" style="margin-top:${badges.length ? "32px" : "32px"};">
      ${c.ctaPrimary   ? `<a href="#booking" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
      ${c.ctaSecondary ? `<a href="#about"   class="ws-btn ws-btn-ghost">${esc(c.ctaSecondary)}</a>` : ""}
    </div>
  </div>
</section>`;
}

// Dental-7: booking-focused — photo panel + mini form that scrolls to main booking
function renderHeroBookingFocused(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  const services = Array.isArray(c.services) ? (c.services as string[]).slice(0, 8) : [];
  return `<section class="ws-hero--bof" id="hero" style="background:${t.bg};">
  <div class="ws-hero-bof-img">
    ${photo(imageUrl, c.headline || "Dental practice", "", "width:100%;height:100%;object-fit:cover;display:block;")}
  </div>
  <div class="ws-hero-bof-content">
    ${c.eyebrow     ? `<p class="ws-hero-bof-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-bof-h">${esc(c.headline || "")}</h1>
    ${c.subheadline ? `<p class="ws-hero-bof-sub">${esc(c.subheadline)}</p>` : ""}
    <form class="ws-hero-bof-form" onsubmit="event.preventDefault();var b=document.getElementById('booking');if(b)b.scrollIntoView({behavior:'smooth'});">
      <input name="name" class="ws-hero-bof-inp" type="text" placeholder="Your name" autocomplete="name">
      <input name="phone" class="ws-hero-bof-inp" type="tel" placeholder="Phone number" autocomplete="tel">
      ${services.length ? `<select name="service" class="ws-hero-bof-inp">
        <option value="">Select a service…</option>
        ${services.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}
      </select>` : ""}
      <button type="submit" class="ws-btn ws-btn-accent" style="width:100%;">${esc(c.ctaPrimary || "Book Appointment")}</button>
    </form>
  </div>
</section>`;
}

// Dental-8: clinical-premium — bright, framed photo, editorial header, clean layout
function renderHeroClinicalPremium(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  return `<section class="ws-hero--cprem" id="hero" style="background:${t.bg};">
  <div class="ws-container ws-hero-cprem-inner">
    <div class="ws-hero-cprem-text">
      ${c.eyebrow     ? `<p class="ws-hero-cprem-eyebrow">${esc(c.eyebrow)}</p>` : ""}
      <h1 class="ws-hero-cprem-h">${esc(c.headline || "")}</h1>
      ${c.subheadline ? `<p class="ws-hero-cprem-sub">${esc(c.subheadline)}</p>` : ""}
      <div class="ws-hero-ctas">
        ${c.ctaPrimary   ? `<a href="#booking" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
        ${c.ctaSecondary ? `<a href="#about"   class="ws-btn ws-btn-ghost">${esc(c.ctaSecondary)}</a>` : ""}
      </div>
    </div>
    <div class="ws-hero-cprem-photo">
      ${photo(imageUrl, c.headline || "Clinic", "ws-hero-cprem-img", "")}
    </div>
  </div>
</section>`;
}

// Gym-9: cinematic-dark — full-bleed moody photo, massive all-caps headline
function renderHeroCinematicDark(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  const bg = imageUrl
    ? `<img src="${esc(imageUrl)}" class="ws-hero-cind-bg" alt="${esc(c.headline || "Gym")}" loading="eager" onerror="this.style.display='none'">`
    : `<div class="ws-hero-cind-bg" style="background:${t.heroBg};"></div>`;
  return `<section class="ws-hero--cind" id="hero">
  ${bg}
  <div class="ws-hero-cind-overlay"></div>
  <div class="ws-hero-cind-inner">
    ${c.eyebrow     ? `<p class="ws-hero-cind-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-cind-h">${esc(c.headline || "")}</h1>
    ${c.subheadline ? `<p class="ws-hero-cind-sub">${esc(c.subheadline)}</p>` : ""}
    ${c.ctaPrimary  ? `<a href="#booking" class="ws-btn ws-btn-accent ws-hero-cind-cta">${esc(c.ctaPrimary)}</a>` : ""}
  </div>
</section>`;
}

// Gym-10: membership-focused — dark bg, tier preview strip (only with real pricing data)
function renderHeroMembershipFocused(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  const tiers = Array.isArray(c.tiers) ? (c.tiers as { name: string; price: string; period?: string }[]).slice(0, 3) : [];
  const imgBg = imageUrl ? `<img src="${esc(imageUrl)}" class="ws-hero-mf-bg-img" alt="" loading="eager" onerror="this.style.display='none'">` : "";
  const tiersHtml = tiers.length ? `
    <div class="ws-hero-mf-tiers">
      ${tiers.map((tier) => `<a href="#pricing" class="ws-hero-mf-tier">
        <p class="ws-hero-mf-tier-name">${esc(tier.name)}</p>
        <p class="ws-hero-mf-tier-price">${esc(tier.price)}${tier.period ? `<span class="ws-hero-mf-tier-period">/${esc(tier.period)}</span>` : ""}</p>
      </a>`).join("")}
    </div>` : "";
  return `<section class="ws-hero--mf" id="hero" style="background:${t.heroBg};">
  ${imgBg}
  <div class="ws-hero-mf-glow" style="background:radial-gradient(ellipse 70% 50% at 50% 50%,${t.accentAlpha.replace("0.10", "0.25")} 0%,transparent 70%);"></div>
  <div class="ws-hero-mf-inner">
    ${c.eyebrow     ? `<p class="ws-hero-chip">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-mf-h">${esc(c.headline || "")}</h1>
    ${c.subheadline ? `<p class="ws-hero-mf-sub">${esc(c.subheadline)}</p>` : ""}
    ${tiersHtml}
    <div class="ws-hero-ctas" style="justify-content:center;">
      ${c.ctaPrimary   ? `<a href="#booking" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
      ${c.ctaSecondary ? `<a href="#about"   class="ws-btn ws-btn-ghost">${esc(c.ctaSecondary)}</a>` : ""}
    </div>
  </div>
</section>`;
}

// Gym-11: energy-driven — bold text left, angled-clip image right, dark bg
function renderHeroEnergyDriven(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  return `<section class="ws-hero--ed" id="hero" style="background:${t.heroBg};">
  <div class="ws-hero-ed-text">
    ${c.eyebrow     ? `<p class="ws-hero-ed-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-ed-h">${esc(c.headline || "")}</h1>
    ${c.subheadline ? `<p class="ws-hero-ed-sub">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-hero-ctas">
      ${c.ctaPrimary   ? `<a href="#booking" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
      ${c.ctaSecondary ? `<a href="#about"   class="ws-btn ws-btn-ghost">${esc(c.ctaSecondary)}</a>` : ""}
    </div>
  </div>
  <div class="ws-hero-ed-media">
    ${photo(imageUrl, c.headline || "Training", "ws-hero-ed-img", "")}
  </div>
</section>`;
}

// ID-13: portfolio-first — 3-image asymmetric grid dominates, text secondary below
function renderHeroPortfolioFirst(t: DesignTokens, c: HeroContent, multiImageUrls?: (string | undefined)[]): string {
  const imgs = multiImageUrls ?? [];
  const img0 = imgs[0];
  const img1 = imgs[1] ?? img0;
  const img2 = imgs[2];
  return `<section class="ws-hero--port" id="hero" style="background:${t.bg};">
  <div class="ws-container ws-hero-port-inner">
    <div class="ws-hero-port-grid">
      <div class="ws-hero-port-main">
        ${photo(img0, c.headline || "Portfolio", "", "width:100%;height:100%;object-fit:cover;display:block;")}
      </div>
      <div class="ws-hero-port-stack">
        <div class="ws-hero-port-stack-item">
          ${photo(img1, c.headline ? `${c.headline} 2` : "Portfolio 2", "", "width:100%;height:100%;object-fit:cover;display:block;")}
        </div>
        ${img2 ? `<div class="ws-hero-port-stack-item">
          ${photo(img2, c.headline ? `${c.headline} 3` : "Portfolio 3", "", "width:100%;height:100%;object-fit:cover;display:block;")}
        </div>` : ""}
      </div>
    </div>
    <div class="ws-hero-port-meta">
      ${c.eyebrow     ? `<p class="ws-hero-port-eyebrow">${esc(c.eyebrow)}</p>` : ""}
      <h1 class="ws-hero-port-h">${esc(c.headline || "")}</h1>
      ${c.subheadline ? `<p class="ws-hero-port-sub">${esc(c.subheadline)}</p>` : ""}
      <div class="ws-hero-ctas">
        ${c.ctaPrimary   ? `<a href="#booking" class="ws-btn ws-btn-accent">${esc(c.ctaPrimary)}</a>` : ""}
        ${c.ctaSecondary ? `<a href="#listings" class="ws-btn ws-btn-ghost">${esc(c.ctaSecondary)}</a>` : ""}
      </div>
    </div>
  </div>
</section>`;
}

// ID-14: luxury-showcase — full-bleed, minimal serif wordmark headline, centered, extreme whitespace
function renderHeroLuxuryShowcase(t: DesignTokens, c: HeroContent, imageUrl?: string): string {
  const bg = imageUrl
    ? `<img src="${esc(imageUrl)}" class="ws-hero-lux-bg" alt="${esc(c.headline || "Interior Design")}" loading="eager" onerror="this.style.display='none'">`
    : `<div class="ws-hero-lux-bg" style="background:${t.heroBg};"></div>`;
  return `<section class="ws-hero--lux" id="hero">
  ${bg}
  <div class="ws-hero-lux-overlay"></div>
  <div class="ws-hero-lux-inner">
    ${c.eyebrow     ? `<p class="ws-hero-lux-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    <h1 class="ws-hero-lux-h">${esc(c.headline || "")}</h1>
    <div class="ws-hero-lux-rule"></div>
    ${c.subheadline ? `<p class="ws-hero-lux-sub">${esc(c.subheadline)}</p>` : ""}
    ${c.ctaPrimary  ? `<a href="#booking" class="ws-btn ws-btn-ghost ws-hero-lux-cta">${esc(c.ctaPrimary)}</a>` : ""}
  </div>
</section>`;
}

// ── Feature-grid variants ─────────────────────────────────────────────────────

function renderFeatureGridAlternating(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; items?: { icon?: string; title?: string; description?: string }[] }
): string {
  const items = (c.items ?? []).slice(0, 6);
  if (!items.length) return "";
  return `<section class="ws-section ws-section-alt" id="services">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-feat-rows">
      ${items.map((item, i) => `
      <div class="ws-feat-row${i % 2 === 1 ? " ws-feat-row--rev" : ""}">
        <div class="ws-feat-row-icon">
          ${item.icon ? `<div class="ws-feat-icon" style="width:72px;height:72px;border-radius:50%;">${icon(item.icon, 32)}</div>` : `<div class="ws-feat-icon" style="width:72px;height:72px;border-radius:50%;"><span style="font-size:2rem;font-weight:800;color:var(--accent);">0${i + 1}</span></div>`}
        </div>
        <div class="ws-feat-row-body">
          <h3 class="ws-feat-title" style="font-size:1.3rem;margin-bottom:12px;">${esc(item.title || "")}</h3>
          <p class="ws-feat-desc" style="font-size:0.975rem;line-height:1.75;">${esc(item.description || "")}</p>
        </div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

function renderFeatureGridNumbered(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; items?: { icon?: string; title?: string; description?: string }[] }
): string {
  const items = (c.items ?? []).slice(0, 6);
  if (!items.length) return "";
  return `<section class="ws-section ws-section-alt" id="services">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-feat-numbered">
      ${items.map((item, i) => `
      <div class="ws-feat-num-item">
        <p class="ws-feat-num-label">0${i + 1}</p>
        <div class="ws-feat-num-body">
          <h3 class="ws-feat-title">${esc(item.title || "")}</h3>
          <p class="ws-feat-desc">${esc(item.description || "")}</p>
        </div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

function renderFeatureGridBento(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; items?: { icon?: string; title?: string; description?: string }[] }
): string {
  const items = (c.items ?? []).slice(0, 5);
  if (!items.length) return "";
  return `<section class="ws-section ws-section-alt" id="services">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-feat-bento">
      ${items.map((item, i) => `
      <div class="ws-feat-bento-cell ws-feat-card${i === 0 ? " ws-feat-bento-hero" : ""}">
        ${item.icon ? `<div class="ws-feat-icon">${icon(item.icon, i === 0 ? 32 : 22)}</div>` : ""}
        <h3 class="ws-feat-title" style="${i === 0 ? "font-size:1.4rem;" : ""}">${esc(item.title || "")}</h3>
        <p class="ws-feat-desc">${esc(item.description || "")}</p>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// 4. feature-grid — dispatch on variant
export function renderFeatureGrid(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; items?: { icon?: string; title?: string; description?: string }[]; variant?: string },
  variant?: string
): string {
  const v = variant ?? (c as Record<string, unknown>).variant as string | undefined;
  if (v === "alternating-rows") return renderFeatureGridAlternating(t, c);
  if (v === "numbered-list")    return renderFeatureGridNumbered(t, c);
  if (v === "asymmetric-bento") return renderFeatureGridBento(t, c);
  // three-cards (default)
  const items = (c.items ?? []).slice(0, 6);
  if (!items.length) return "";
  return `<section class="ws-section ws-section-alt" id="services">
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

// ── Pricing variants ──────────────────────────────────────────────────────────

type TierItem = { name?: string; price?: string; period?: string; features?: string[]; ctaText?: string; highlighted?: boolean };

function renderPricingComparisonTable(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; tiers?: TierItem[] }
): string {
  const tiers = (c.tiers ?? []).slice(0, 4);
  if (!tiers.length) return "";
  const allFeatures = Array.from(new Set(tiers.flatMap((tier) => tier.features ?? []))).slice(0, 10);
  return `<section class="ws-section" id="pricing">
  <div class="ws-container" style="text-align:center;">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading" style="margin:0 auto 56px;">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-price-table-wrap">
      <table class="ws-price-table">
        <thead>
          <tr>
            <th class="ws-price-table-feature-col"></th>
            ${tiers.map((tier) => `<th class="ws-price-table-th${tier.highlighted ? " ws-price-table-th--hi" : ""}" style="${tier.highlighted ? `background:${t.accent};color:${t.accentFg};` : ""}">
              <p class="ws-price-name" style="${tier.highlighted ? "color:inherit;opacity:.8;" : ""}">${esc(tier.name || "")}</p>
              <p class="ws-price-amount" style="font-size:2rem;margin-bottom:4px;${tier.highlighted ? "color:inherit;" : ""}">${esc(tier.price || "")}</p>
              <a href="#booking" class="ws-btn ${tier.highlighted ? "ws-btn-white" : "ws-btn-outline"}" style="font-size:0.8rem;padding:8px 16px;">${esc(tier.ctaText || "Get Started")}</a>
            </th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${allFeatures.map((feat) => `
          <tr class="ws-price-table-row">
            <td class="ws-price-table-feat">${esc(feat)}</td>
            ${tiers.map((tier) => {
              const has = (tier.features ?? []).includes(feat);
              return `<td class="ws-price-table-cell${tier.highlighted ? " ws-price-table-cell--hi" : ""}">${has ? `<span style="color:${t.accent};">${icon("check", 16)}</span>` : `<span style="color:#D1D5DB;">—</span>`}</td>`;
            }).join("")}
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  </div>
</section>`;
}

function renderPricingSingleHighlight(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; tiers?: TierItem[] }
): string {
  const tiers = (c.tiers ?? []).slice(0, 4);
  if (!tiers.length) return "";
  const featured = tiers.find((t) => t.highlighted) ?? tiers[0];
  const rest = tiers.filter((t) => t !== featured).slice(0, 3);
  return `<section class="ws-section" id="pricing">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow" style="text-align:center;">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading" style="text-align:center;">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading" style="text-align:center;margin:0 auto 56px;">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-price-single">
      <div class="ws-price-card ws-price-card--hi" style="border-color:${t.accent};background:${t.accentAlpha};display:flex;flex-direction:column;justify-content:space-between;padding:56px 48px;">
        <div>
          <p class="ws-price-badge" style="background:${t.accent};color:${t.accentFg};">Best Value</p>
          <p class="ws-price-name">${esc(featured?.name || "")}</p>
          <p class="ws-price-amount" style="font-size:3.5rem;">${esc(featured?.price || "")}<span class="ws-price-period">${esc(featured?.period ? `/${featured.period}` : "")}</span></p>
        </div>
        <ul class="ws-price-features" style="margin:32px 0;">
          ${(featured?.features ?? []).slice(0, 8).map((f) => `<li class="ws-price-feat"><span>${icon("check", 13)}</span>${esc(f)}</li>`).join("")}
        </ul>
        <a href="#booking" class="ws-btn ws-btn-accent" style="width:100%;justify-content:center;">${esc(featured?.ctaText || "Get Started")}</a>
      </div>
      ${rest.length ? `<div class="ws-price-secondary">
        ${rest.map((tier) => `
        <div class="ws-price-card" style="padding:32px 36px;">
          <p class="ws-price-name">${esc(tier.name || "")}</p>
          <p class="ws-price-amount" style="font-size:2rem;">${esc(tier.price || "")}<span class="ws-price-period">${esc(tier.period ? `/${tier.period}` : "")}</span></p>
          <ul class="ws-price-features">
            ${(tier.features ?? []).slice(0, 5).map((f) => `<li class="ws-price-feat"><span>${icon("check", 13)}</span>${esc(f)}</li>`).join("")}
          </ul>
          <a href="#booking" class="ws-btn ws-btn-outline" style="width:100%;justify-content:center;">${esc(tier.ctaText || "Get Started")}</a>
        </div>`).join("")}
      </div>` : ""}
    </div>
  </div>
</section>`;
}

// 5. pricing-tiers — dispatch on variant
export function renderPricingTiers(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; tiers?: TierItem[]; variant?: string },
  variant?: string
): string {
  const v = variant ?? (c as Record<string, unknown>).variant as string | undefined;
  if (v === "comparison-table")  return renderPricingComparisonTable(t, c);
  if (v === "single-highlight")  return renderPricingSingleHighlight(t, c);
  // cards-row (default)
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
        <a href="#booking" class="ws-btn ${hi ? "ws-btn-accent" : "ws-btn-outline"}" style="width:100%;justify-content:center;">${esc(tier.ctaText || "Get Started")}</a>
      </div>`;
      }).join("")}
    </div>
  </div>
</section>`;
}

// ── Service-list variants ─────────────────────────────────────────────────────

type SvcItem = { title?: string; description?: string; price?: string };

function renderServiceListTwoColumn(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; items?: SvcItem[] }
): string {
  const items = (c.items ?? []).slice(0, 12);
  if (!items.length) return "";
  return `<section class="ws-section ws-section-alt" id="services">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-svc-two-col">
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

function renderServiceListBorderedCards(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; items?: SvcItem[] }
): string {
  const items = (c.items ?? []).slice(0, 9);
  if (!items.length) return "";
  return `<section class="ws-section ws-section-alt" id="services">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-svc-cards">
      ${items.map((item) => `
      <div class="ws-svc-bcard">
        <h3 class="ws-svc-title">${esc(item.title || "")}</h3>
        ${item.description ? `<p class="ws-svc-desc" style="margin-top:8px;">${esc(item.description)}</p>` : ""}
        ${item.price ? `<p class="ws-svc-price" style="margin-top:16px;">${esc(item.price)}</p>` : ""}
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// 6. service-list — dispatch on variant
export function renderServiceList(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; items?: SvcItem[]; variant?: string },
  variant?: string
): string {
  const v = variant ?? (c as Record<string, unknown>).variant as string | undefined;
  if (v === "two-column")     return renderServiceListTwoColumn(t, c);
  if (v === "bordered-cards") return renderServiceListBorderedCards(t, c);
  // editorial-rows (default)
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

// ── Gallery-grid variants ─────────────────────────────────────────────────────

function renderGalleryMasonry(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string },
  images: (string | undefined)[]
): string {
  const items = (images.filter(Boolean) as string[]).slice(0, 6);
  if (!items.length) return "";
  return `<section class="ws-section" id="gallery">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-gallery-masonry" style="margin-top:48px;">
      ${items.map((src, i) => `
      <div class="ws-gallery-masonry-item">
        <img src="${esc(src)}" alt="${esc(c.headline ? `${c.headline} ${i + 1}` : `Gallery ${i + 1}`)}" loading="lazy" style="width:100%;display:block;border-radius:var(--radius-lg);" onerror="this.style.display='none'">
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

function renderGalleryFullBleedStrip(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string },
  images: (string | undefined)[]
): string {
  const items = (images.filter(Boolean) as string[]).slice(0, 6);
  if (!items.length) return "";
  return `<section class="ws-section" id="gallery" style="padding-bottom:0;">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
  </div>
  <div class="ws-gallery-strip" style="margin-top:48px;padding-bottom:var(--section-pad);">
    ${items.map((src, i) => `
    <div class="ws-gallery-strip-item">
      <img src="${esc(src)}" alt="${esc(c.headline ? `${c.headline} ${i + 1}` : `Gallery ${i + 1}`)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
    </div>`).join("")}
  </div>
</section>`;
}

// 7. gallery-grid — dispatch on variant
export function renderGalleryGrid(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; variant?: string },
  images: (string | undefined)[],
  variant?: string
): string {
  const v = variant ?? (c as Record<string, unknown>).variant as string | undefined;
  if (v === "masonry")           return renderGalleryMasonry(t, c, images);
  if (v === "full-bleed-strip")  return renderGalleryFullBleedStrip(t, c, images);
  return renderGallery(t, c, images); // uniform (default)
}

// ── Listings-grid variants ─────────────────────────────────────────────────────

type ListingItem = { title?: string; subtitle?: string; description?: string; price?: string };

function renderListingsMasonry(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; items?: ListingItem[] },
  images: (string | undefined)[]
): string {
  const items = (c.items ?? []).slice(0, 6);
  if (!items.length) return "";
  return `<section class="ws-section" id="listings">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-listing-masonry" style="margin-top:56px;">
      ${items.map((item, i) => `
      <div class="ws-listing-card">
        <div class="ws-listing-img" style="aspect-ratio:unset;min-height:${180 + (i % 3) * 60}px;">
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

function renderListingsWideRows(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; items?: ListingItem[] },
  images: (string | undefined)[]
): string {
  const items = (c.items ?? []).slice(0, 6);
  if (!items.length) return "";
  return `<section class="ws-section" id="listings">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-listing-wide" style="margin-top:56px;">
      ${items.map((item, i) => `
      <div class="ws-listing-wide-row${i % 2 === 1 ? " ws-listing-wide-row--rev" : ""}">
        <div class="ws-listing-wide-img">
          ${photo(images[i], item.title || `Item ${i + 1}`, "ws-gallery-img", "width:100%;height:100%;object-fit:cover;")}
        </div>
        <div class="ws-listing-wide-body">
          ${item.subtitle ? `<p class="ws-listing-sub">${esc(item.subtitle)}</p>` : ""}
          <h3 class="ws-listing-title" style="font-size:1.5rem;">${esc(item.title || "")}</h3>
          ${item.description ? `<p class="ws-listing-desc" style="margin-top:12px;font-size:0.95rem;line-height:1.75;">${esc(item.description)}</p>` : ""}
          ${item.price ? `<p class="ws-listing-price" style="margin-top:20px;font-size:1.2rem;">${esc(item.price)}</p>` : ""}
        </div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// 8. listings-grid — dispatch on variant
export function renderListingsGrid(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; items?: ListingItem[]; variant?: string },
  images: (string | undefined)[],
  variant?: string
): string {
  const v = variant ?? (c as Record<string, unknown>).variant as string | undefined;
  if (v === "masonry")    return renderListingsMasonry(t, c, images);
  if (v === "wide-rows")  return renderListingsWideRows(t, c, images);
  // uniform-grid (default)
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

// 9. about-story — text + optional image
export function renderAboutStory(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; body?: string; bullets?: { title: string; text: string }[]; ctaText?: string },
  imageUrl?: string
): string {
  return renderAbout(t, c, imageUrl);
}

// 10. team-grid
export function renderTeamGrid(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; members?: { name?: string; role?: string; bio?: string }[] }
): string {
  return renderTeam(t, c);
}

// 11. testimonials section
export function renderTestimonialsSection(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; items?: { quote?: string; name?: string; role?: string }[] }
): string {
  return renderTestimonials(t, c);
}

// 12. stats-band — dark band with large numbers
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

// 13. process-steps
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

// 14. faq-accordion — dispatch on variant
function renderFaqTwoColumn(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; items?: { q?: string; a?: string }[] }
): string {
  const items = (c.items ?? []).filter((item) => item.q).slice(0, 10);
  if (!items.length) return "";
  return `<section class="ws-section" id="faq">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-faq-two-col">
      ${items.map((item, i) => `
      <div class="ws-faq-item" id="faq-wrap-${i}">
        <div class="ws-faq-q" role="button" tabindex="0" onclick="wsFaqToggle(${i})" aria-expanded="false" aria-controls="faq-ans-${i}">
          ${esc(item.q ?? "")}
          <span class="ws-faq-icon" aria-hidden="true"></span>
        </div>
        <div class="ws-faq-a" id="faq-ans-${i}">${esc(item.a ?? "")}</div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

export function renderFaqAccordion(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; items?: { q?: string; a?: string }[] },
  variant?: string
): string {
  if (variant === "two-column") return renderFaqTwoColumn(t, c);
  return renderFaq(t, c);
}

// ── Phase 2d — Content Component Pool ─────────────────────────────────────────

// CD-1: testimonial-single-quote — centered large quote for one real customer statement
export function renderTestimonialSingleQuote(
  _t: DesignTokens,
  c: { quote?: string; name?: string; role?: string; sourceEvidence?: string }
): string {
  if (!c.quote) return "";
  return `<section class="ws-section" id="testimonial">
  <div class="ws-container">
    <div class="ws-tsq">
      <p class="ws-tsq-mark" aria-hidden="true">“</p>
      <blockquote class="ws-tsq-quote">${esc(c.quote)}</blockquote>
      <footer class="ws-tsq-foot">
        ${c.name ? `<p class="ws-tsq-name">${esc(c.name)}</p>` : ""}
        ${c.role ? `<p class="ws-tsq-role">${esc(c.role)}</p>` : ""}
      </footer>
    </div>
  </div>
</section>`;
}

// CD-2: testimonial-grid — 2–3 side-by-side customer quote cards
type TestimonialItem = { quote?: string; name?: string; role?: string; sourceEvidence?: string };

export function renderTestimonialGrid(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; items?: TestimonialItem[] }
): string {
  const items = (c.items ?? []).filter((item) => item.quote).slice(0, 3);
  if (!items.length) return "";
  return `<section class="ws-section ws-section-alt" id="testimonials">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-tgrid">
      ${items.map((item) => `
      <div class="ws-tgrid-card">
        <p class="ws-tgrid-quote">${esc(item.quote ?? "")}</p>
        <div class="ws-tgrid-foot">
          ${item.name ? `<p class="ws-tgrid-name">${esc(item.name)}</p>` : ""}
          ${item.role ? `<p class="ws-tgrid-role">${esc(item.role)}</p>` : ""}
        </div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// 15. cta-band
export function renderCtaBand(
  t: DesignTokens,
  c: { headline?: string; sub?: string; ctaText?: string }
): string {
  return renderCtaBanner(t, c);
}

// 16. contact-block — contact form + optional contact details; variant dispatch
export function renderContactBlock(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; phone?: string; email?: string; address?: string; hours?: string; ctaText?: string; services?: string[]; variant?: string },
  variant?: string
): string {
  const v = variant ?? c.variant;
  const html = renderBooking(t, { ...c, variant: v });
  return html.replace(
    `class="ws-section" id="booking"`,
    `class="ws-section ws-section--contact" id="booking"`
  );
}

// ── NEW section types ─────────────────────────────────────────────────────────

// 17. logo-strip — "trusted by" brands row (only if owner supplied names)
export function renderLogoStrip(
  _t: DesignTokens,
  c: { headline?: string; names?: string[] }
): string {
  const names = (c.names ?? []).filter(Boolean).slice(0, 10);
  if (!names.length) return "";
  return `<section class="ws-logo-strip" id="logos">
  <div class="ws-container">
    ${c.headline ? `<p class="ws-logo-strip-label">${esc(c.headline)}</p>` : ""}
    <div class="ws-logo-strip-inner">
      ${names.map((n) => `<span class="ws-logo-name">${esc(n)}</span>`).join("")}
    </div>
  </div>
</section>`;
}

// 18. product-grid — e-commerce product cards
export function renderProductGrid(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; items?: { title?: string; description?: string; price?: string; badge?: string }[] },
  images: (string | undefined)[] = []
): string {
  const items = (c.items ?? []).slice(0, 8);
  if (!items.length) return "";
  return `<section class="ws-section" id="products">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-product-grid">
      ${items.map((item, i) => `
      <div class="ws-product-card">
        <div class="ws-product-img">
          ${photo(images[i], item.title || `Product ${i + 1}`, "ws-gallery-img", "width:100%;height:100%;object-fit:cover;")}
          ${item.badge ? `<span class="ws-product-badge">${esc(item.badge)}</span>` : ""}
        </div>
        <div class="ws-product-body">
          <h3 class="ws-product-name">${esc(item.title || "")}</h3>
          ${item.description ? `<p class="ws-product-desc">${esc(item.description)}</p>` : ""}
          <div class="ws-product-foot">
            ${item.price ? `<p class="ws-product-price">${esc(item.price)}</p>` : ""}
            <a href="#booking" class="ws-btn ws-btn-accent" style="font-size:0.8rem;padding:8px 18px;">Enquire</a>
          </div>
        </div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// 19. feature-showcase — alternating big image + text rows
export function renderFeatureShowcase(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; items?: { title?: string; description?: string; cta?: string }[] },
  images: (string | undefined)[] = []
): string {
  const items = (c.items ?? []).slice(0, 4);
  if (!items.length) return "";
  return `<section class="ws-section" id="features">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-showcase" style="margin-top:72px;">
      ${items.map((item, i) => `
      <div class="ws-showcase-row${i % 2 === 1 ? " ws-showcase-row--rev" : ""}">
        <div class="ws-showcase-img">
          ${photo(images[i], item.title || `Feature ${i + 1}`, "ws-gallery-img", "width:100%;height:100%;object-fit:cover;border-radius:var(--radius-lg);")}
        </div>
        <div class="ws-showcase-body">
          <p class="ws-showcase-num">0${i + 1}</p>
          <h3 class="ws-showcase-title">${esc(item.title || "")}</h3>
          ${item.description ? `<p class="ws-showcase-desc">${esc(item.description)}</p>` : ""}
          ${item.cta ? `<a href="#booking" class="ws-btn ws-btn-outline" style="margin-top:24px;">${esc(item.cta)}</a>` : ""}
        </div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// 20. integration-grid — labelled icon tiles (SaaS)
export function renderIntegrationGrid(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; items?: { name?: string; icon?: string }[] }
): string {
  const items = (c.items ?? []).slice(0, 12);
  if (!items.length) return "";
  return `<section class="ws-section ws-section-alt" id="integrations">
  <div class="ws-container" style="text-align:center;">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-integration-grid">
      ${items.map((item) => `
      <div class="ws-integration-tile">
        ${item.icon ? `<div class="ws-feat-icon" style="margin:0 auto 12px;">${icon(item.icon, 24)}</div>` : ""}
        <p class="ws-integration-name">${esc(item.name || "")}</p>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// ── Phase 2b — Trust & Conversion Pool ───────────────────────────────────────

// TC-1: comparison-table — "us vs traditional" feature table
// Only renders rows where both feature + ours are present. Never invents competitor data.
export function renderComparisonTable(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; rows?: { feature?: string; ours?: string; theirs?: string }[] }
): string {
  const rows = (c.rows ?? []).filter((r) => r.feature && r.ours).slice(0, 8);
  if (!rows.length) return "";
  return `<section class="ws-section ws-section-alt" id="comparison">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-cmp-wrap">
      <table class="ws-cmp-table">
        <thead>
          <tr>
            <th class="ws-cmp-th ws-cmp-th-feat"></th>
            <th class="ws-cmp-th ws-cmp-th-us">Us</th>
            <th class="ws-cmp-th ws-cmp-th-them">Traditional</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
          <tr class="ws-cmp-row">
            <td class="ws-cmp-feat">${esc(r.feature ?? "")}</td>
            <td class="ws-cmp-us">${esc(r.ours ?? "")}</td>
            <td class="ws-cmp-them">${r.theirs ? esc(r.theirs) : "—"}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  </div>
</section>`;
}

// TC-2: agent-card — real estate agent photo + bio + contact (only real provided data)
export function renderAgentCard(
  _t: DesignTokens,
  c: { name?: string; title?: string; phone?: string; email?: string; bio?: string },
  imageUrl?: string
): string {
  if (!c.name) return "";
  return `<section class="ws-section" id="agent">
  <div class="ws-container">
    <div class="ws-agent-card">
      <div class="ws-agent-photo">
        ${imageUrl
          ? `<img src="${esc(imageUrl)}" alt="${esc(c.name)}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy" onerror="this.style.display='none'">`
          : `<div style="width:100%;height:100%;background:linear-gradient(135deg,var(--surface) 0%,var(--accent-alpha) 50%,var(--bg-alt) 100%);display:block;" aria-label="${esc(c.name)}"></div>`}
      </div>
      <div class="ws-agent-info">
        <h2 class="ws-agent-name">${esc(c.name)}</h2>
        ${c.title ? `<p class="ws-agent-title">${esc(c.title)}</p>` : ""}
        ${c.bio   ? `<p class="ws-agent-bio">${esc(c.bio)}</p>` : ""}
        <div class="ws-agent-contacts">
          ${c.phone ? `<a href="tel:${esc(c.phone.replace(/\s/g,""))}" class="ws-agent-contact">${icon("phone",16)} ${esc(c.phone)}</a>` : ""}
          ${c.email ? `<a href="mailto:${esc(c.email)}" class="ws-agent-contact">${icon("mail",16)} ${esc(c.email)}</a>` : ""}
        </div>
        <a href="#booking" class="ws-btn ws-btn-accent" style="margin-top:24px;display:inline-flex;">Get in Touch</a>
      </div>
    </div>
  </div>
</section>`;
}

// TC-3: press-quote-band — pull-quote on dark band; only renders if real quote provided
export function renderPressQuoteBand(
  t: DesignTokens,
  c: { quote?: string; source?: string; publication?: string }
): string {
  if (!c.quote) return "";
  return `<section class="ws-pqb" id="press" style="background:${t.heroBg};">
  <div class="ws-container">
    <div class="ws-pqb-inner">
      <p class="ws-pqb-mark" aria-hidden="true">"</p>
      <blockquote class="ws-pqb-quote">${esc(c.quote)}</blockquote>
      ${(c.source || c.publication) ? `<footer class="ws-pqb-foot">
        ${c.source      ? `<span class="ws-pqb-source">${esc(c.source)}</span>` : ""}
        ${c.publication ? `<span class="ws-pqb-pub">${esc(c.publication)}</span>` : ""}
      </footer>` : ""}
    </div>
  </div>
</section>`;
}

// TC-4: trainer-showcase — gym staff grid (initials avatars, no images)
export function renderTrainerShowcase(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; trainers?: { name?: string; specialty?: string; bio?: string }[] }
): string {
  const trainers = (c.trainers ?? []).filter((tr) => tr.name).slice(0, 6);
  if (!trainers.length) return "";
  return `<section class="ws-section ws-section-alt" id="trainers">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-trainer-grid">
      ${trainers.map((tr) => {
        const initials = (tr.name ?? "?").split(" ").map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
        return `
      <div class="ws-trainer-card">
        <div class="ws-trainer-avatar">${esc(initials)}</div>
        <p class="ws-trainer-name">${esc(tr.name ?? "")}</p>
        ${tr.specialty ? `<p class="ws-trainer-spec">${esc(tr.specialty)}</p>` : ""}
        ${tr.bio ? `<p class="ws-trainer-bio">${esc(tr.bio)}</p>` : ""}
      </div>`;
      }).join("")}
    </div>
  </div>
</section>`;
}

// TC-5: trust-badges-band — standalone badge strip (reuses hasTrustBadges gate)
export function renderTrustBadgesBand(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; badges?: { value?: string; label?: string }[] }
): string {
  const badges = (c.badges ?? []).filter((b) => b.value && b.label).slice(0, 5);
  if (!badges.length) return "";
  return `<section class="ws-section" id="trust">
  <div class="ws-container" style="text-align:center;">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-tbadges">
      ${badges.map((b) => `
      <div class="ws-tbadge">
        <p class="ws-tbadge-val">${esc(b.value ?? "")}</p>
        <p class="ws-tbadge-lbl">${esc(b.label ?? "")}</p>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// Shared success + error blocks used by TC-6 through TC-9
function formBlockOk(title: string, text: string): string {
  return `<div class="ws-fb-ok" style="display:none;">
    <div class="ws-fb-ok-icon">${icon("check", 28)}</div>
    <h3 class="ws-fb-ok-title">${esc(title)}</h3>
    <p class="ws-fb-ok-text">${esc(text)}</p>
  </div>`;
}

// TC-6: multi-step-inquiry-form — 2-step form with progress indicator
export function renderMultiStepForm(
  _t: DesignTokens,
  c: { headline?: string; step1Headline?: string; step2Headline?: string; services?: string[]; submitLabel?: string }
): string {
  const services = (c.services ?? []).slice(0, 12);
  const submit = c.submitLabel || "Submit Request";
  return `<section class="ws-section" id="inquiry">
  <div class="ws-container">
    ${c.headline ? `<h2 class="ws-heading" style="text-align:center;">${esc(c.headline)}</h2>` : ""}
    <div class="ws-fb ws-msf-wrap">
      <div class="ws-msf-progress" aria-label="Form progress">
        <div class="ws-msf-step ws-msf-step--on" id="msf-dot-0">
          <div class="ws-msf-dot" aria-hidden="true">1</div>
          <span>${esc(c.step1Headline || "Your Details")}</span>
        </div>
        <div class="ws-msf-bar"></div>
        <div class="ws-msf-step" id="msf-dot-1">
          <div class="ws-msf-dot" aria-hidden="true">2</div>
          <span>${esc(c.step2Headline || "Your Request")}</span>
        </div>
      </div>
      <form id="msf-form" onsubmit="return wsFormBlock(event)">
        <div id="msf-page-0" class="ws-msf-page" style="display:flex;flex-direction:column;gap:16px;">
          <div class="ws-form-group">
            <label class="ws-form-label">Full Name</label>
            <input class="ws-form-input" type="text" name="firstName" placeholder="Your name" required>
          </div>
          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Email</label>
              <input class="ws-form-input" type="email" name="email" placeholder="Email address" required>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Phone</label>
              <input class="ws-form-input" type="tel" name="phone" placeholder="Phone number">
            </div>
          </div>
          <button type="button" class="ws-btn ws-btn-accent" style="width:100%;justify-content:center;margin-top:4px;" onclick="wsMsfNext()">Continue →</button>
        </div>
        <div id="msf-page-1" class="ws-msf-page" style="display:none;flex-direction:column;gap:16px;">
          ${services.length ? `
          <div class="ws-form-group">
            <label class="ws-form-label">What are you interested in?</label>
            <select class="ws-form-input" name="service">
              <option value="">Select…</option>
              ${services.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}
            </select>
          </div>` : ""}
          <div class="ws-form-group">
            <label class="ws-form-label">Tell us more</label>
            <textarea class="ws-form-input" name="message" rows="4" placeholder="Any details that help us prepare…"></textarea>
          </div>
          <div class="ws-fb-err" style="display:none;"></div>
          <div style="display:flex;gap:12px;">
            <button type="button" class="ws-btn ws-btn-outline" style="flex:1;justify-content:center;" onclick="wsMsfBack()">← Back</button>
            <button type="submit" class="ws-btn ws-btn-accent" style="flex:2;justify-content:center;" data-label="${esc(submit)}">${esc(submit)}</button>
          </div>
        </div>
      </form>
      ${formBlockOk("Request Received", "We'll be in touch shortly.")}
    </div>
  </div>
</section>`;
}

// TC-7: appointment-booking-block — service + date + contact; requires real service list
export function renderAppointmentForm(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; services?: string[]; submitLabel?: string }
): string {
  const services = (c.services ?? []).filter(Boolean).slice(0, 12);
  if (!services.length) return "";
  const submit = c.submitLabel || "Book Appointment";
  return `<section class="ws-section ws-section-alt" id="appointment">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow" style="text-align:center;">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading" style="text-align:center;">${esc(c.headline)}</h2>` : ""}
    <div class="ws-appt-wrap">
      <div class="ws-fb">
        <form onsubmit="return wsFormBlock(event)" style="display:flex;flex-direction:column;gap:16px;">
          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Full Name</label>
              <input class="ws-form-input" type="text" name="firstName" placeholder="Your name" required>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Phone</label>
              <input class="ws-form-input" type="tel" name="phone" placeholder="Phone number" required>
            </div>
          </div>
          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Email</label>
              <input class="ws-form-input" type="email" name="email" placeholder="Email address">
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Preferred Date</label>
              <input class="ws-form-input" type="date" name="preferredDate">
            </div>
          </div>
          <div class="ws-form-group">
            <label class="ws-form-label">Service</label>
            <select class="ws-form-input" name="service" required>
              <option value="">Select a service…</option>
              ${services.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}
            </select>
          </div>
          <div class="ws-form-group">
            <label class="ws-form-label">Additional Notes</label>
            <textarea class="ws-form-input" name="message" rows="3" placeholder="Any specific requests?"></textarea>
          </div>
          <div class="ws-fb-err" style="display:none;"></div>
          <button type="submit" class="ws-btn ws-btn-accent" style="width:100%;justify-content:center;" data-label="${esc(submit)}">${esc(submit)}</button>
        </form>
        ${formBlockOk("Appointment Requested", "We'll confirm your time shortly.")}
      </div>
    </div>
  </div>
</section>`;
}

// TC-8: valuation-request-form — real estate property details + contact form
export function renderValuationForm(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; submitLabel?: string }
): string {
  const submit = c.submitLabel || "Request Valuation";
  return `<section class="ws-section" id="valuation">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow" style="text-align:center;">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading" style="text-align:center;">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading" style="text-align:center;margin:0 auto 48px;">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-val-wrap">
      <div class="ws-fb">
        <form onsubmit="return wsFormBlock(event)" style="display:flex;flex-direction:column;gap:16px;">
          <div class="ws-form-group">
            <label class="ws-form-label">Property Address</label>
            <input class="ws-form-input" type="text" name="address" placeholder="Street address, city" required>
          </div>
          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Property Type</label>
              <select class="ws-form-input" name="propertyType">
                <option value="">Select…</option>
                <option>Apartment</option><option>Villa</option><option>House</option>
                <option>Townhouse</option><option>Penthouse</option><option>Commercial</option>
              </select>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Bedrooms</label>
              <select class="ws-form-input" name="bedrooms">
                <option value="">Select…</option>
                <option>Studio</option><option>1</option><option>2</option>
                <option>3</option><option>4</option><option>5+</option>
              </select>
            </div>
          </div>
          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Your Name</label>
              <input class="ws-form-input" type="text" name="firstName" placeholder="Full name" required>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Phone</label>
              <input class="ws-form-input" type="tel" name="phone" placeholder="Phone number" required>
            </div>
          </div>
          <div class="ws-form-group">
            <label class="ws-form-label">Email</label>
            <input class="ws-form-input" type="email" name="email" placeholder="Email address">
          </div>
          <div class="ws-fb-err" style="display:none;"></div>
          <button type="submit" class="ws-btn ws-btn-accent" style="width:100%;justify-content:center;" data-label="${esc(submit)}">${esc(submit)}</button>
        </form>
        ${formBlockOk("Request Received", "We'll prepare your valuation and be in touch shortly.")}
      </div>
    </div>
  </div>
</section>`;
}

// ── Phase 2c — Category-Specific Showcase Pool ───────────────────────────────

// SC-1: property-listings-grid — real estate cards with specs (grid-3col and featured-plus-grid)
type PropertyListing = { title?: string; location?: string; bedrooms?: string; bathrooms?: string; area?: string; price?: string; badge?: string };

function renderPropGrid3Col(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string },
  listings: PropertyListing[],
  images: (string | undefined)[]
): string {
  return `<section class="ws-section ws-section-alt" id="listings-showcase">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-prop-grid">
      ${listings.map((l, i) => `
      <div class="ws-prop-card">
        <div class="ws-prop-img">
          ${photo(images[i], l.title || `Property ${i + 1}`, "ws-gallery-img", "width:100%;height:100%;object-fit:cover;")}
          ${l.badge ? `<span class="ws-prop-badge">${esc(l.badge)}</span>` : ""}
        </div>
        <div class="ws-prop-info">
          ${l.location ? `<p class="ws-prop-location">${esc(l.location)}</p>` : ""}
          <h3 class="ws-prop-title">${esc(l.title || "")}</h3>
          ${(l.bedrooms || l.bathrooms || l.area) ? `
          <div class="ws-prop-specs">
            ${l.bedrooms  ? `<span class="ws-prop-spec">${esc(l.bedrooms)} bed</span>` : ""}
            ${l.bathrooms ? `<span class="ws-prop-spec">${esc(l.bathrooms)} bath</span>` : ""}
            ${l.area      ? `<span class="ws-prop-spec">${esc(l.area)}</span>` : ""}
          </div>` : ""}
          ${l.price ? `<p class="ws-prop-price">${esc(l.price)}</p>` : ""}
        </div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

function renderPropFeaturedPlusGrid(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string },
  listings: PropertyListing[],
  images: (string | undefined)[]
): string {
  const featured = listings[0]!;
  const rest = listings.slice(1, 5);
  return `<section class="ws-section ws-section-alt" id="listings-showcase">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-prop-featured-grid">
      <div class="ws-prop-featured-card">
        ${photo(images[0], featured.title || "Featured Property", "ws-gallery-img", "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;")}
        <div class="ws-prop-featured-overlay">
          ${featured.badge ? `<span class="ws-prop-badge">${esc(featured.badge)}</span>` : ""}
          <h3 class="ws-prop-featured-title">${esc(featured.title || "")}</h3>
          ${featured.location ? `<p class="ws-prop-featured-loc">${esc(featured.location)}</p>` : ""}
          ${(featured.bedrooms || featured.bathrooms || featured.area) ? `
          <div class="ws-prop-specs ws-prop-specs--light">
            ${featured.bedrooms  ? `<span class="ws-prop-spec ws-prop-spec--light">${esc(featured.bedrooms)} bed</span>` : ""}
            ${featured.bathrooms ? `<span class="ws-prop-spec ws-prop-spec--light">${esc(featured.bathrooms)} bath</span>` : ""}
            ${featured.area      ? `<span class="ws-prop-spec ws-prop-spec--light">${esc(featured.area)}</span>` : ""}
          </div>` : ""}
          ${featured.price ? `<p class="ws-prop-price ws-prop-price--light">${esc(featured.price)}</p>` : ""}
        </div>
      </div>
      <div class="ws-prop-mini-grid">
        ${rest.map((l, i) => `
        <div class="ws-prop-card ws-prop-card--mini">
          <div class="ws-prop-img ws-prop-img--mini">
            ${photo(images[i + 1], l.title || `Property ${i + 2}`, "ws-gallery-img", "width:100%;height:100%;object-fit:cover;")}
            ${l.badge ? `<span class="ws-prop-badge">${esc(l.badge)}</span>` : ""}
          </div>
          <div class="ws-prop-info">
            ${l.location ? `<p class="ws-prop-location">${esc(l.location)}</p>` : ""}
            <h3 class="ws-prop-title ws-prop-title--sm">${esc(l.title || "")}</h3>
            ${(l.bedrooms || l.bathrooms) ? `
            <div class="ws-prop-specs">
              ${l.bedrooms  ? `<span class="ws-prop-spec">${esc(l.bedrooms)} bed</span>` : ""}
              ${l.bathrooms ? `<span class="ws-prop-spec">${esc(l.bathrooms)} bath</span>` : ""}
            </div>` : ""}
            ${l.price ? `<p class="ws-prop-price">${esc(l.price)}</p>` : ""}
          </div>
        </div>`).join("")}
      </div>
    </div>
  </div>
</section>`;
}

export function renderPropertyListingsGrid(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; listings?: PropertyListing[]; variant?: string },
  images: (string | undefined)[] = [],
  variant?: string
): string {
  const v = variant ?? (c as Record<string, unknown>).variant as string | undefined;
  const listings = (c.listings ?? []).filter((l) => l.title).slice(0, 6);
  if (!listings.length) return "";
  if (v === "featured-plus-grid" && listings.length >= 2) return renderPropFeaturedPlusGrid(t, c, listings, images);
  return renderPropGrid3Col(t, c, listings, images);
}

// SC-2: treatment-gallery — dental treatment cards (with or without images)
type TreatmentItem = { title?: string; description?: string; duration?: string; price?: string };

export function renderTreatmentGallery(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; services?: TreatmentItem[]; variant?: string },
  images: (string | undefined)[] = []
): string {
  const services = (c.services ?? []).filter((s) => s.title).slice(0, 8);
  if (!services.length) return "";
  const hasImages = images.some(Boolean);
  return `<section class="ws-section ws-section-alt" id="treatments">
  <div class="ws-container">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-treat-grid">
      ${services.map((s, i) => `
      <div class="ws-treat-card">
        ${hasImages && images[i] ? `
        <div class="ws-treat-img">
          ${photo(images[i], s.title || `Treatment ${i + 1}`, "ws-gallery-img", "width:100%;height:100%;object-fit:cover;")}
        </div>` : `
        <div class="ws-treat-icon-header" style="background:${t.accentAlpha};">
          ${icon("tooth", 28)}
        </div>`}
        <div class="ws-treat-body">
          <h3 class="ws-treat-title">${esc(s.title || "")}</h3>
          ${s.description ? `<p class="ws-treat-desc">${esc(s.description)}</p>` : ""}
          ${(s.duration || s.price) ? `
          <div class="ws-treat-foot">
            ${s.duration ? `<span class="ws-treat-duration">${icon("clock", 13)} ${esc(s.duration)}</span>` : ""}
            ${s.price    ? `<span class="ws-treat-price">${esc(s.price)}</span>` : ""}
          </div>` : ""}
        </div>
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

// SC-3: portfolio-grid — interior design projects (equal-grid and masonry)
type PortfolioProject = { title?: string; category?: string; description?: string; location?: string; year?: string };

function renderPortfolioEqualGrid(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string },
  projects: PortfolioProject[],
  images: (string | undefined)[]
): string {
  return `<section class="ws-section" id="portfolio">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-port-grid">
      ${projects.map((p, i) => `
      <div class="ws-port-card">
        <div class="ws-port-img-wrap">
          ${photo(images[i], p.title || `Project ${i + 1}`, "ws-gallery-img", "width:100%;height:100%;object-fit:cover;")}
          <div class="ws-port-overlay">
            ${p.category ? `<p class="ws-port-meta">${esc(p.category)}</p>` : ""}
            <h3 class="ws-port-title">${esc(p.title || "")}</h3>
            ${(p.location || p.year) ? `<p class="ws-port-info">${[p.location, p.year].filter(Boolean).map(esc).join(" · ")}</p>` : ""}
          </div>
        </div>
        ${p.description ? `<p class="ws-port-desc">${esc(p.description)}</p>` : ""}
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

function renderPortfolioMasonry(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string },
  projects: PortfolioProject[],
  images: (string | undefined)[]
): string {
  return `<section class="ws-section" id="portfolio">
  <div class="ws-container">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-port-masonry">
      ${projects.map((p, i) => `
      <div class="ws-port-card">
        <div class="ws-port-img-wrap">
          ${photo(images[i], p.title || `Project ${i + 1}`, "ws-gallery-img", "width:100%;height:100%;object-fit:cover;")}
          <div class="ws-port-overlay">
            ${p.category ? `<p class="ws-port-meta">${esc(p.category)}</p>` : ""}
            <h3 class="ws-port-title">${esc(p.title || "")}</h3>
            ${(p.location || p.year) ? `<p class="ws-port-info">${[p.location, p.year].filter(Boolean).map(esc).join(" · ")}</p>` : ""}
          </div>
        </div>
        ${p.description ? `<p class="ws-port-desc">${esc(p.description)}</p>` : ""}
      </div>`).join("")}
    </div>
  </div>
</section>`;
}

export function renderPortfolioGrid(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; projects?: PortfolioProject[]; variant?: string },
  images: (string | undefined)[] = [],
  variant?: string
): string {
  const v = variant ?? (c as Record<string, unknown>).variant as string | undefined;
  const projects = (c.projects ?? []).filter((p) => p.title).slice(0, 6);
  if (projects.length < 2) return "";
  if (v === "masonry") return renderPortfolioMasonry(t, c, projects, images);
  return renderPortfolioEqualGrid(t, c, projects, images);
}

// SC-4: membership-plans-display — full-featured tier comparison (gym, NOT just price strip)
type MembershipDisplayTier = { name?: string; price?: string; period?: string; features?: string[]; highlighted?: boolean; badge?: string };

export function renderMembershipPlansDisplay(
  t: DesignTokens,
  c: { eyebrow?: string; headline?: string; subheadline?: string; tiers?: MembershipDisplayTier[] }
): string {
  const tiers = (c.tiers ?? [])
    .filter((tier) => tier.name && Array.isArray(tier.features) && (tier.features as string[]).length > 0)
    .slice(0, 4);
  if (!tiers.length) return "";
  return `<section class="ws-section ws-section-alt" id="plans">
  <div class="ws-container" style="text-align:center;">
    ${c.eyebrow     ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline    ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    ${c.subheadline ? `<p class="ws-subheading" style="margin:0 auto 48px;">${esc(c.subheadline)}</p>` : ""}
    <div class="ws-mpdisplay-grid">
      ${tiers.map((tier) => {
        const hi = !!tier.highlighted;
        const features = (tier.features ?? []).slice(0, 8);
        return `
      <div class="ws-mpdisplay-card${hi ? " ws-mpdisplay-card--hi" : ""}" style="${hi ? `border-color:${t.accent};` : ""}">
        ${hi ? `<p class="ws-mpdisplay-badge" style="background:${t.accent};color:${t.accentFg};">${esc(tier.badge || "Most Popular")}</p>` : ""}
        <p class="ws-mpdisplay-name">${esc(tier.name || "")}</p>
        <div class="ws-mpdisplay-price-wrap">
          <p class="ws-mpdisplay-price" style="color:${t.accent};">${esc(tier.price || "")}</p>
          ${tier.period ? `<p class="ws-mpdisplay-period">/${esc(tier.period)}</p>` : ""}
        </div>
        <hr class="ws-mpdisplay-divider">
        <ul class="ws-mpdisplay-feats">
          ${features.map((f) => `<li class="ws-mpdisplay-feat">${icon("check", 14)} ${esc(f)}</li>`).join("")}
        </ul>
        <a href="#booking" class="ws-btn ${hi ? "ws-btn-accent" : "ws-btn-outline"}" style="width:100%;justify-content:center;margin-top:auto;">Join Now</a>
      </div>`;
      }).join("")}
    </div>
  </div>
</section>`;
}

// TC-9: membership-signup-block — tier selector + signup fields (only real pricing tiers)
export function renderMembershipForm(
  _t: DesignTokens,
  c: { eyebrow?: string; headline?: string; tiers?: { name?: string; price?: string; period?: string }[]; submitLabel?: string }
): string {
  const tiers = (c.tiers ?? []).filter((t) => t.name && t.price).slice(0, 4);
  if (!tiers.length) return "";
  const submit = c.submitLabel || "Join Now";
  return `<section class="ws-section ws-section-alt" id="join">
  <div class="ws-container" style="text-align:center;">
    ${c.eyebrow  ? `<p class="ws-eyebrow">${esc(c.eyebrow)}</p>` : ""}
    ${c.headline ? `<h2 class="ws-heading">${esc(c.headline)}</h2>` : ""}
    <div class="ws-mem-tiers" role="radiogroup" aria-label="Membership tiers">
      ${tiers.map((tier, i) => `
      <div class="ws-mem-tier${i === 0 ? " ws-mem-tier--on" : ""}" onclick="wsMfTier(this)" role="radio" aria-checked="${i === 0 ? "true" : "false"}" tabindex="0">
        <input type="radio" name="membershipTier" value="${esc(tier.name ?? "")}" ${i === 0 ? "checked" : ""} style="position:absolute;opacity:0;pointer-events:none;">
        <p class="ws-mem-tier-name">${esc(tier.name ?? "")}</p>
        <p class="ws-mem-tier-price">${esc(tier.price ?? "")}${tier.period ? `<span class="ws-mem-tier-period">/${esc(tier.period)}</span>` : ""}</p>
      </div>`).join("")}
    </div>
    <div class="ws-mem-form-wrap">
      <div class="ws-fb">
        <form onsubmit="return wsFormBlock(event)" style="display:flex;flex-direction:column;gap:16px;">
          <div class="ws-form-row">
            <div class="ws-form-group">
              <label class="ws-form-label">Full Name</label>
              <input class="ws-form-input" type="text" name="firstName" placeholder="Your name" required>
            </div>
            <div class="ws-form-group">
              <label class="ws-form-label">Email</label>
              <input class="ws-form-input" type="email" name="email" placeholder="Email address" required>
            </div>
          </div>
          <div class="ws-form-group">
            <label class="ws-form-label">Phone</label>
            <input class="ws-form-input" type="tel" name="phone" placeholder="Phone number">
          </div>
          <div class="ws-fb-err" style="display:none;"></div>
          <button type="submit" class="ws-btn ws-btn-accent" style="width:100%;justify-content:center;" data-label="${esc(submit)}">${esc(submit)}</button>
        </form>
        ${formBlockOk("You're In!", "Welcome to the community. We'll send your membership details shortly.")}
      </div>
    </div>
  </div>
</section>`;
}
