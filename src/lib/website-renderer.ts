import { resolveTokens, resolveDesignDNA, type DesignTokens, type PresetName, type DesignDNA } from "./website-design-system";
import {
  renderNav, renderHero, renderAbout, renderServices,
  renderGallery, renderTestimonials, renderTeam, renderBooking,
  renderFaq, renderCtaBanner, renderFooter,
  // v2 section library
  renderHeroFullbleed, renderHeroSplitSection, renderHeroMinimal,
  renderFeatureGrid, renderPricingTiers, renderServiceList,
  renderGalleryGrid, renderListingsGrid, renderAboutStory,
  renderTeamGrid, renderTestimonialsSection, renderStatsBand,
  renderProcessSteps, renderFaqAccordion, renderCtaBand, renderContactBlock,
} from "./website-sections";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SectionSpec {
  type:
    | "hero" | "about" | "services" | "gallery" | "testimonials" | "team"
    | "booking" | "faq" | "cta_banner" | "footer"
    // v2 section types
    | "hero-fullbleed" | "hero-split" | "hero-minimal"
    | "feature-grid" | "pricing-tiers" | "service-list"
    | "gallery-grid" | "listings-grid" | "about-story"
    | "team-grid" | "stats-band" | "process-steps"
    | "faq-accordion" | "cta-band" | "contact-block";
  imageQuery?: string;
  imageQueries?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>;
}

export interface WebsiteSpec {
  stylePreset?: PresetName;
  accentColor?: string;
  businessName: string;
  category?: string;
  designDNA?: DesignDNA;
  sections: SectionSpec[];
}

export type ImageMap = Record<string, string>;

// ── CSS generator ─────────────────────────────────────────────────────────────
function buildCss(t: DesignTokens): string {
  const isDark = t.dark;

  // Preset-specific service card overrides
  const serviceCardOverrides = (() => {
    switch (t.preset) {
      case "hotel":
        return `
/* hotel: editorial warm hover, no border noise */
.ws-service-card--hotel{border:none;}
.ws-service-card--hotel .ws-service-title{font-size:1.5rem;line-height:1.2;}
.ws-service-card--hotel:hover{background:${t.bgAlt};}`;
      case "fitness":
        return `
/* fitness: dark surface cards with accent gradient border */
.ws-service-card--fitness{
  background:${t.surface};border:1px solid ${t.border};
  position:relative;overflow:hidden;
}
.ws-service-card--fitness::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,${t.accentAlpha} 0%,transparent 60%);
  pointer-events:none;
}
.ws-service-card--fitness .ws-service-num{
  display:flex;align-items:center;gap:12px;font-size:0.7rem;
}
.ws-service-num-line{display:block;width:24px;height:1px;background:var(--accent);}
.ws-service-card--fitness:hover{border-color:${t.accent};}`;
      case "beauty":
        return `
/* beauty: frameless, very generous whitespace */
.ws-service-card--beauty{background:transparent;border:none;}
.ws-service-card--beauty:hover{background:${t.bgAlt};}
.ws-service-card--beauty .ws-service-title{font-size:1.5rem;font-weight:${t.headingWeight};}`;
      case "realestate":
        return `
/* realestate: fine top-border rule, editorial classic */
.ws-service-card--realestate{background:${t.surface};border:none;}
.ws-service-card--realestate:hover{background:${t.bgAlt};}
.ws-service-card--realestate .ws-service-title{font-size:1.5rem;}`;
      case "medical":
        return `
/* medical: rounded friendly cards with icon circle */
.ws-service-card--medical{
  background:${t.surface};border:1.5px solid ${t.border};
  border-radius:${t.radiusLg};padding:36px 32px;
}
.ws-service-card--medical:hover{border-color:${t.accent};box-shadow:0 8px 32px ${t.accentAlpha};}
.ws-service-icon{
  width:52px;height:52px;background:${t.accentAlpha};
  border-radius:50%;display:flex;align-items:center;justify-content:center;
  color:${t.accent};margin-bottom:20px;
}
.ws-service-card--medical .ws-service-title{font-size:1.15rem;font-weight:700;}
.ws-btn--pill{border-radius:100px!important;}`;
      case "restaurant":
        return `
/* restaurant: frameless, editorial, image-led */
.ws-service-card--restaurant{background:transparent;border:none;}
.ws-service-card--restaurant:hover{background:${t.bgAlt};}
.ws-service-card--restaurant .ws-service-title{font-size:1.45rem;font-weight:${t.headingWeight};}`;
      default:
        return "";
    }
  })();

  // Hero layout-specific CSS
  const heroLayoutCss = (() => {
    switch (t.heroLayout) {
      case "full-bleed-bottom":
        return `
/* ── editorial-luxury hero ────────────────────────────────────────────── */
.ws-hero--el{min-height:95vh;align-items:flex-end;}
.ws-hero-content--el{padding:0 24px 100px;width:100%;max-width:1200px;margin:0 auto;}
.ws-hero-eyebrow{display:flex;align-items:center;gap:14px;}
.ws-hero-eyebrow-rule{display:block;width:32px;height:1px;background:rgba(255,255,255,.35);}
.ws-hero-headline--el{
  font-family:var(--font-heading);
  font-size:${t.heroHeadlineSize};
  font-weight:${t.headingWeight};
  line-height:1.07;letter-spacing:${t.headingTracking};
  color:white;max-width:800px;margin-bottom:28px;
}`;
      case "full-bleed-center":
        return `
/* ── estate-elegant hero ──────────────────────────────────────────────── */
.ws-hero--ee{min-height:88vh;align-items:center;justify-content:center;}
.ws-hero-content--ee{text-align:center;padding:0 24px;width:100%;max-width:860px;margin:0 auto;}
.ws-hero-eyebrow--ee{
  font-size:0.68rem;font-weight:500;letter-spacing:0.18em;
  text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:24px;display:block;
}
.ws-hero-headline--ee{
  font-family:var(--font-heading);
  font-size:${t.heroHeadlineSize};
  font-weight:${t.headingWeight};
  line-height:1.08;letter-spacing:${t.headingTracking};
  color:white;margin-bottom:24px;
}
.ws-hero-sub--ee{
  font-size:1.1rem;line-height:1.7;color:rgba(255,255,255,.72);
  max-width:520px;margin:0 auto 44px;
}`;
      case "centered-glow":
        return `
/* ── saas-sharp centered-glow hero ───────────────────────────────────── */
.ws-hero--ss{
  min-height:92vh;align-items:center;justify-content:center;
  background:${t.heroBg};
}
.ws-hero-glow{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:700px;height:700px;
  background:radial-gradient(ellipse at center,${t.accentAlpha.replace("0.12", "0.22")} 0%,transparent 70%);
  pointer-events:none;
}
.ws-hero-content--ss{
  position:relative;z-index:1;text-align:center;
  padding:0 24px;width:100%;max-width:860px;margin:0 auto;
}
.ws-hero-chip{
  display:inline-flex;align-items:center;gap:6px;
  padding:6px 14px;border-radius:100px;
  background:${t.accentAlpha};border:1px solid ${t.border};
  font-size:0.72rem;font-weight:600;letter-spacing:.1em;
  text-transform:uppercase;color:${t.accent};margin-bottom:28px;
}
.ws-hero-headline--ss{
  font-family:var(--font-heading);
  font-size:${t.heroHeadlineSize};
  font-weight:${t.headingWeight};
  line-height:1.1;letter-spacing:${t.headingTracking};
  color:${t.heading};margin-bottom:22px;
  background:linear-gradient(to bottom,${t.heading} 60%,${t.muted});
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.ws-hero-sub--ss{
  font-size:1.1rem;line-height:1.75;color:${t.muted};
  max-width:520px;margin:0 auto 48px;
}`;
      case "split-right":
        return `
/* ── split-right hero ─────────────────────────────────────────────────── */
.ws-hero--split{
  min-height:88vh;display:flex;flex-direction:row;
  align-items:stretch;padding:0;background:${t.bg};
}
.ws-hero-split-text{
  flex:1 1 50%;display:flex;flex-direction:column;justify-content:center;
  padding:80px 24px 80px 24px;min-width:0;
}
.ws-hero-split-media{
  flex:1 1 50%;position:relative;min-height:480px;overflow:hidden;
  background:${t.heroBg};
}
.ws-hero-split-media--cb{border-radius:0 0 0 ${t.radiusLg};}
.ws-hero-headline--split{
  font-family:var(--font-heading);
  font-size:${t.heroHeadlineSize};
  font-weight:${t.headingWeight};
  line-height:1.1;letter-spacing:${t.headingTracking};
  color:${t.heading};margin-bottom:20px;
}
.ws-hero-sub--split{
  font-size:1.05rem;line-height:1.75;color:${t.muted};
  max-width:480px;margin-bottom:44px;
}`;
      default:
        return "";
    }
  })();

  // Nav text/border adjustments for dark presets
  const navDarkOverride = isDark
    ? `.ws-nav{background:${t.bg};border-bottom:1px solid ${t.border};}
.ws-nav-logo,.ws-nav-link{color:${t.muted};}
.ws-nav-logo{color:${t.heading};}`
    : "";

  return `
@import url('${t.fontImport}');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
body{background:var(--bg);color:var(--color-text);font-family:var(--font-body);font-size:16px;line-height:1.65;overflow-x:hidden;}
a{color:inherit;text-decoration:none;}
img{display:block;max-width:100%;}
button,input,select,textarea{font-family:inherit;}
::selection{background:var(--accent);color:var(--accent-fg);}

:root{
  --bg:${t.bg};
  --bg-alt:${t.bgAlt};
  --surface:${t.surface};
  --border:${t.border};
  --hero-bg:${t.heroBg};
  --color-heading:${t.heading};
  --color-text:${t.text};
  --color-muted:${t.muted};
  --accent:${t.accent};
  --accent-fg:${t.accentFg};
  --accent-alpha:${t.accentAlpha};
  --font-heading:${t.fontHeading};
  --font-body:${t.fontBody};
  --heading-weight:${t.headingWeight};
  --heading-transform:${t.headingTransform};
  --heading-tracking:${t.headingTracking};
  --radius:${t.radius};
  --radius-lg:${t.radiusLg};
  --section-pad:${t.sectionPad};
}

/* ── Typography ──────────────────────────────────────────────────────────── */
.ws-eyebrow{
  font-size:0.75rem;font-weight:600;letter-spacing:0.12em;
  text-transform:uppercase;color:var(--accent);margin-bottom:14px;
}
.ws-heading{
  font-family:var(--font-heading);
  font-size:clamp(1.75rem,3vw,2.5rem);
  font-weight:var(--heading-weight);
  line-height:1.14;
  letter-spacing:var(--heading-tracking);
  text-transform:var(--heading-transform);
  color:var(--color-heading);
  margin-bottom:18px;
  text-wrap:balance;
}
.ws-subheading{
  font-size:1.0625rem;line-height:1.7;color:var(--color-muted);margin-bottom:40px;
  max-width:560px;
}

/* ── Layout ──────────────────────────────────────────────────────────────── */
.ws-container{max-width:1200px;margin:0 auto;padding:0 24px;}
.ws-section{padding:var(--section-pad) 0;}
.ws-section-alt{background:var(--bg-alt);}

/* ── Buttons ─────────────────────────────────────────────────────────────── */
.ws-btn{
  display:inline-flex;align-items:center;gap:8px;
  padding:14px 32px;border-radius:var(--radius);
  font-size:0.9rem;font-weight:600;cursor:pointer;
  transition:opacity .2s,transform .2s,background .2s,border-color .2s;
  border:2px solid transparent;line-height:1;white-space:nowrap;
}
.ws-btn-accent{background:var(--accent);color:var(--accent-fg);border-color:var(--accent);}
.ws-btn-accent:hover{opacity:.85;transform:translateY(-1px);}
.ws-btn-primary{background:var(--accent);color:var(--accent-fg);border-color:var(--accent);}
.ws-btn-primary:hover{opacity:.85;transform:translateY(-1px);}
.ws-btn-ghost{background:rgba(255,255,255,.1);color:white;border-color:rgba(255,255,255,.3);}
.ws-btn-ghost:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.55);}
.ws-btn-outline{background:transparent;color:var(--color-heading);border-color:var(--border);}
.ws-btn-outline:hover{border-color:var(--accent);color:var(--accent);}
.ws-btn-white{background:white;color:var(--accent);border-color:white;}
.ws-btn-white:hover{opacity:.9;}

/* ── Nav ─────────────────────────────────────────────────────────────────── */
.ws-nav{
  position:sticky;top:0;z-index:100;
  background:var(--bg);border-bottom:1px solid var(--border);
}
.ws-nav-inner{
  display:flex;align-items:center;justify-content:space-between;
  height:72px;max-width:1200px;margin:0 auto;padding:0 24px;
}
.ws-nav-logo{
  font-family:var(--font-heading);font-size:1.15rem;font-weight:700;
  color:var(--color-heading);letter-spacing:-0.02em;
  text-transform:var(--heading-transform);
}
.ws-nav-links{display:flex;gap:40px;}
.ws-nav-link{font-size:0.875rem;font-weight:500;color:var(--color-muted);transition:color .2s;}
.ws-nav-link:hover{color:var(--accent);}
${navDarkOverride}

/* ── Hero base ───────────────────────────────────────────────────────────── */
.ws-hero{
  position:relative;min-height:90vh;
  display:flex;align-items:flex-end;
  overflow:hidden;background:var(--hero-bg);
}
.ws-hero-img{
  position:absolute;inset:0;
  width:100%;height:100%;object-fit:cover;display:block;
}
.ws-hero-overlay{position:absolute;inset:0;}
.ws-hero-content{
  position:relative;z-index:1;
  padding:0 48px 100px;width:100%;
}
.ws-hero-eyebrow{
  font-size:0.7rem;font-weight:600;letter-spacing:0.15em;
  text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:22px;
}
.ws-hero-headline{
  font-family:var(--font-heading);
  font-size:clamp(2.5rem,5vw,4rem);
  font-weight:var(--heading-weight);
  line-height:1.07;
  letter-spacing:var(--heading-tracking);
  text-transform:var(--heading-transform);
  color:white;max-width:800px;margin-bottom:24px;
}
.ws-hero-sub{
  font-size:1.1rem;line-height:1.75;
  color:rgba(255,255,255,.7);max-width:520px;margin-bottom:48px;
}
.ws-hero-ctas{display:flex;gap:14px;flex-wrap:wrap;}
${heroLayoutCss}

/* ── Services grid ───────────────────────────────────────────────────────── */
.ws-services-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
  gap:1px;background:var(--border);
  margin-top:64px;
}
.ws-service-card{
  background:var(--surface);padding:44px 40px;
  transition:background .2s,border-color .2s,box-shadow .2s;
}
.ws-service-card:hover{background:var(--bg-alt);}
.ws-service-num{
  font-size:0.72rem;font-weight:600;letter-spacing:.1em;
  color:var(--accent);margin-bottom:16px;
}
.ws-service-title{
  font-family:var(--font-heading);
  font-size:1.45rem;font-weight:var(--heading-weight);
  letter-spacing:var(--heading-tracking);
  text-transform:var(--heading-transform);
  color:var(--color-heading);margin-bottom:12px;line-height:1.2;
}
.ws-service-desc{font-size:0.9rem;color:var(--color-muted);line-height:1.7;}
.ws-service-price{
  display:inline-block;margin-top:20px;
  font-size:0.85rem;font-weight:700;
  color:var(--accent);letter-spacing:.04em;
}
${serviceCardOverrides}

/* ── About ───────────────────────────────────────────────────────────────── */
.ws-about-inner{display:flex;gap:80px;align-items:center;}
.ws-about-img{
  width:100%;max-width:520px;height:560px;
  object-fit:cover;border-radius:var(--radius-lg);flex-shrink:0;
}
.ws-about-content{flex:1;min-width:0;}
.ws-bullet{display:flex;gap:16px;margin-bottom:24px;align-items:flex-start;}
.ws-bullet-icon{
  width:26px;height:26px;background:var(--accent);border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;margin-top:2px;color:var(--accent-fg);
}
.ws-bullet-title{font-weight:600;font-size:0.925rem;color:var(--color-heading);margin-bottom:4px;}
.ws-bullet-text{font-size:0.875rem;color:var(--color-muted);line-height:1.6;}

/* ── Testimonials ────────────────────────────────────────────────────────── */
.ws-test-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;}
.ws-test-card{
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius-lg);padding:36px 32px;
}
.ws-stars{color:#F59E0B;font-size:0.875rem;letter-spacing:3px;margin-bottom:16px;}
.ws-test-quote{
  font-size:0.95rem;line-height:1.75;color:var(--color-text);
  font-style:italic;margin-bottom:24px;
}
.ws-test-footer{display:flex;align-items:center;gap:14px;}
.ws-test-avatar{
  width:44px;height:44px;border-radius:50%;background:var(--accent);
  color:var(--accent-fg);display:flex;align-items:center;justify-content:center;
  font-size:0.8rem;font-weight:700;flex-shrink:0;
}
.ws-test-name{font-weight:600;font-size:0.9rem;color:var(--color-heading);}
.ws-test-role{font-size:0.775rem;color:var(--color-muted);}

/* ── Gallery ─────────────────────────────────────────────────────────────── */
.ws-gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.ws-gallery-item{aspect-ratio:4/3;overflow:hidden;border-radius:var(--radius-lg);}
.ws-gallery-img{width:100%;height:100%;object-fit:cover;transition:transform .45s;}
.ws-gallery-item:hover .ws-gallery-img{transform:scale(1.06);}

/* ── Team ────────────────────────────────────────────────────────────────── */
.ws-team-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:32px;}
.ws-team-card{text-align:center;padding:36px 24px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);}
.ws-team-avatar{
  width:88px;height:88px;border-radius:50%;background:var(--accent);
  color:var(--accent-fg);display:flex;align-items:center;justify-content:center;
  font-size:1.5rem;font-weight:700;margin:0 auto 20px;
}
.ws-team-name{font-family:var(--font-heading);font-weight:600;font-size:1.05rem;color:var(--color-heading);margin-bottom:4px;}
.ws-team-role{font-size:0.78rem;color:var(--accent);font-weight:600;margin-bottom:12px;text-transform:uppercase;letter-spacing:.07em;}
.ws-team-bio{font-size:0.875rem;color:var(--color-muted);line-height:1.65;}

/* ── Booking ─────────────────────────────────────────────────────────────── */
.ws-booking-inner{display:grid;grid-template-columns:1fr 1.4fr;gap:72px;align-items:start;}
.ws-booking-form{display:flex;flex-direction:column;gap:16px;}
.ws-form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.ws-form-group{display:flex;flex-direction:column;gap:6px;}
.ws-form-label{font-size:0.78rem;font-weight:600;color:var(--color-heading);letter-spacing:.04em;}
.ws-form-input{
  padding:12px 16px;border:1.5px solid var(--border);border-radius:var(--radius);
  font-size:0.9rem;color:var(--color-text);background:var(--bg);
  transition:border-color .2s;width:100%;outline:none;
}
.ws-form-input:focus{border-color:var(--accent);}
.ws-contact-item{display:flex;gap:16px;align-items:flex-start;margin-bottom:28px;}
.ws-contact-icon{
  width:48px;height:48px;min-width:48px;background:var(--accent-alpha);
  border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;
  color:var(--accent);
}
.ws-contact-label{font-size:0.7rem;font-weight:600;color:var(--color-muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;}
.ws-contact-value{font-size:1rem;color:var(--color-heading);font-weight:500;}
.ws-form-success{
  display:none;text-align:center;padding:56px 24px;
  border:1px solid var(--border);border-radius:var(--radius-lg);
}
.ws-form-success-icon{
  width:64px;height:64px;background:var(--accent);color:var(--accent-fg);
  border-radius:50%;display:flex;align-items:center;justify-content:center;
  margin:0 auto 20px;
}
.ws-form-success-title{font-family:var(--font-heading);font-size:1.4rem;font-weight:600;color:var(--color-heading);margin-bottom:10px;}
.ws-form-success-text{font-size:0.925rem;color:var(--color-muted);line-height:1.65;}

/* ── FAQ ─────────────────────────────────────────────────────────────────── */
.ws-faq-list{border-top:1px solid var(--border);}
.ws-faq-item{border-bottom:1px solid var(--border);}
.ws-faq-q{
  display:flex;justify-content:space-between;align-items:center;
  padding:24px 0;cursor:pointer;font-size:1rem;font-weight:600;
  color:var(--color-heading);gap:24px;transition:color .2s;user-select:none;
}
.ws-faq-q:hover{color:var(--accent);}
.ws-faq-icon{flex-shrink:0;font-size:1.4rem;line-height:1;color:var(--accent);transition:transform .25s;font-weight:300;}
.ws-faq-a{
  font-size:0.925rem;line-height:1.8;color:var(--color-muted);
  max-height:0;overflow:hidden;transition:max-height .35s ease,padding-bottom .35s;
}
.ws-faq-item.open .ws-faq-a{max-height:500px;padding-bottom:24px;}
.ws-faq-item.open .ws-faq-icon{transform:rotate(45deg);}

/* ── CTA Banner ──────────────────────────────────────────────────────────── */
.ws-cta-banner{background:var(--hero-bg);padding:var(--section-pad) 0;}
.ws-cta-headline{
  font-family:var(--font-heading);
  font-size:clamp(2rem,4vw,3.5rem);
  font-weight:var(--heading-weight);
  letter-spacing:var(--heading-tracking);
  text-transform:var(--heading-transform);
  color:white;margin-bottom:16px;
}
.ws-cta-sub{font-size:1.05rem;color:rgba(255,255,255,.65);margin-bottom:44px;max-width:480px;margin-left:auto;margin-right:auto;}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.ws-footer{background:#080E1A;color:#6B7280;padding:72px 0 32px;}
.ws-footer-inner{display:grid;grid-template-columns:2fr 1fr 1fr;gap:48px;margin-bottom:48px;}
.ws-footer-logo{font-family:var(--font-heading);font-size:1.15rem;font-weight:700;color:white;margin-bottom:12px;}
.ws-footer-tag{font-size:0.9rem;line-height:1.65;max-width:300px;}
.ws-footer-heading{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:white;margin-bottom:20px;}
.ws-footer-link{display:block;font-size:0.875rem;color:#6B7280;margin-bottom:12px;transition:color .2s;}
.ws-footer-link:hover{color:white;}
.ws-footer-bottom{border-top:1px solid #1A2235;padding-top:24px;font-size:0.8rem;text-align:center;}

/* ── Contact gap fix: booking/contact-block sits directly before footer ──── */
#booking { padding-bottom: 0; }

/* ── hero-minimal ────────────────────────────────────────────────────────── */
.ws-hero--minimal{
  min-height:88vh;display:flex;align-items:center;justify-content:center;
  position:relative;overflow:hidden;
}
.ws-hero-glow-min{position:absolute;inset:0;pointer-events:none;}
.ws-hero-content--min{
  position:relative;z-index:1;text-align:center;
  padding:0 24px;width:100%;max-width:1200px;margin:0 auto;
}

/* ── feature-grid ────────────────────────────────────────────────────────── */
.ws-feat-grid{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
  gap:24px;margin-top:56px;
}
.ws-feat-card{
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius-lg);padding:40px 36px;
  transition:box-shadow .2s,border-color .2s;
}
.ws-feat-card:hover{border-color:var(--accent);box-shadow:0 8px 32px var(--accent-alpha);}
.ws-feat-icon{
  width:52px;height:52px;background:var(--accent-alpha);
  border-radius:var(--radius-lg);display:flex;align-items:center;
  justify-content:center;color:var(--accent);margin-bottom:20px;
}
.ws-feat-title{
  font-family:var(--font-heading);font-size:1.15rem;font-weight:600;
  color:var(--color-heading);margin-bottom:10px;line-height:1.3;
}
.ws-feat-desc{font-size:0.9rem;color:var(--color-muted);line-height:1.7;}

/* ── pricing-tiers ───────────────────────────────────────────────────────── */
.ws-price-grid{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
  gap:24px;margin-top:24px;
}
.ws-price-card{
  background:var(--surface);border:1.5px solid var(--border);
  border-radius:var(--radius-lg);padding:44px 40px;
  position:relative;text-align:left;transition:border-color .2s,box-shadow .2s;
}
.ws-price-card:hover{box-shadow:0 8px 32px var(--accent-alpha);}
.ws-price-card--hi{box-shadow:0 12px 48px var(--accent-alpha);}
.ws-price-badge{
  display:inline-block;padding:4px 12px;border-radius:100px;
  font-size:0.7rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  margin-bottom:24px;
}
.ws-price-name{
  font-size:0.8rem;font-weight:700;letter-spacing:.1em;
  text-transform:uppercase;color:var(--color-muted);margin-bottom:16px;
}
.ws-price-amount{
  font-family:var(--font-heading);font-size:2.8rem;font-weight:700;
  color:var(--color-heading);line-height:1;margin-bottom:32px;
}
.ws-price-period{font-size:1rem;font-weight:400;color:var(--color-muted);}
.ws-price-features{list-style:none;margin-bottom:36px;}
.ws-price-feat{
  display:flex;align-items:flex-start;gap:10px;
  font-size:0.9rem;color:var(--color-text);padding:8px 0;
  border-bottom:1px solid var(--border);
}
.ws-price-feat span{color:var(--accent);flex-shrink:0;margin-top:2px;}

/* ── service-list ────────────────────────────────────────────────────────── */
.ws-svc-list{margin-top:48px;border-top:1px solid var(--border);}
.ws-svc-item{
  display:flex;justify-content:space-between;align-items:baseline;
  gap:24px;padding:28px 0;border-bottom:1px solid var(--border);
}
.ws-svc-left{flex:1;min-width:0;}
.ws-svc-title{
  font-family:var(--font-heading);font-size:1.1rem;
  font-weight:var(--heading-weight);color:var(--color-heading);
  margin-bottom:4px;line-height:1.3;
}
.ws-svc-desc{font-size:0.875rem;color:var(--color-muted);line-height:1.6;}
.ws-svc-price{
  font-size:1rem;font-weight:700;color:var(--accent);
  flex-shrink:0;white-space:nowrap;
}

/* ── listings-grid ───────────────────────────────────────────────────────── */
.ws-listing-grid{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));
  gap:24px;margin-top:56px;
}
.ws-listing-card{
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius-lg);overflow:hidden;
  transition:transform .25s,box-shadow .25s;
}
.ws-listing-card:hover{transform:translateY(-4px);box-shadow:0 16px 48px rgba(0,0,0,.12);}
.ws-listing-img{aspect-ratio:4/3;overflow:hidden;background:linear-gradient(135deg,var(--surface),var(--bg-alt));}
.ws-listing-body{padding:28px 24px;}
.ws-listing-title{
  font-family:var(--font-heading);font-size:1.15rem;font-weight:600;
  color:var(--color-heading);margin-bottom:6px;line-height:1.3;
}
.ws-listing-sub{
  font-size:0.78rem;font-weight:600;color:var(--accent);
  text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px;
}
.ws-listing-desc{font-size:0.875rem;color:var(--color-muted);line-height:1.65;margin-bottom:12px;}
.ws-listing-price{
  font-size:1.05rem;font-weight:700;color:var(--color-heading);
}

/* ── stats-band ──────────────────────────────────────────────────────────── */
.ws-stats{padding:80px 0;}
.ws-stats-inner{
  display:flex;flex-wrap:wrap;gap:48px;
  justify-content:space-around;align-items:center;
}
.ws-stat{text-align:center;}
.ws-stat-value{
  font-family:var(--font-heading);font-size:clamp(2.5rem,5vw,4rem);
  font-weight:700;line-height:1;margin-bottom:8px;
}
.ws-stat-label{font-size:0.875rem;color:#9CA3AF;font-weight:500;letter-spacing:.06em;text-transform:uppercase;}

/* ── process-steps ───────────────────────────────────────────────────────── */
.ws-steps{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
  gap:0;margin-top:64px;
}
.ws-step{padding:0 32px 0 0;position:relative;}
.ws-step-num{
  width:48px;height:48px;border-radius:50%;
  background:var(--accent);color:var(--accent-fg);
  display:flex;align-items:center;justify-content:center;
  font-weight:700;font-size:1.1rem;margin-bottom:20px;
}
.ws-step-line{
  position:absolute;top:24px;left:48px;right:0;height:1px;
  background:var(--border);
}
.ws-step:last-child .ws-step-line{display:none;}
.ws-step-title{
  font-family:var(--font-heading);font-size:1.05rem;font-weight:600;
  color:var(--color-heading);margin-bottom:8px;line-height:1.3;
}
.ws-step-desc{font-size:0.875rem;color:var(--color-muted);line-height:1.65;}

/* ── Mobile 375px ────────────────────────────────────────────────────────── */
@media(max-width:768px){
  .ws-nav-links{display:none;}
  .ws-nav-inner{padding:0 16px;}
  .ws-hero{min-height:80vh;}
  .ws-hero-content,.ws-hero-content--el{padding:0 16px 64px;}
  .ws-hero-headline,.ws-hero-headline--el,.ws-hero-headline--ee,.ws-hero-headline--ss{font-size:clamp(2rem,7vw,2.5rem);}
  .ws-hero-headline--split{font-size:clamp(1.875rem,6vw,2.25rem);}
  .ws-hero-sub,.ws-hero-sub--ss,.ws-hero-sub--split{font-size:1rem;max-width:100%;}
  .ws-hero-content--ee,.ws-hero-content--ss{padding:0 16px;}
  .ws-hero--split{flex-direction:column;min-height:auto;}
  .ws-hero-split-text{padding:64px 16px 48px;max-width:100%;order:2;}
  .ws-hero-split-media{min-height:52vw;order:1;flex:none;width:100%;}
  .ws-container{padding:0 16px;}
  .ws-section{padding:72px 0;}
  .ws-about-inner{flex-direction:column;gap:40px;}
  .ws-about-img{max-width:100%;height:300px;}
  .ws-services-grid{grid-template-columns:1fr;background:transparent;gap:0;}
  .ws-service-card{border-bottom:1px solid var(--border);}
  .ws-test-grid{grid-template-columns:1fr;}
  .ws-gallery-grid{grid-template-columns:1fr 1fr;gap:10px;}
  .ws-team-grid{grid-template-columns:1fr 1fr;}
  .ws-booking-inner{grid-template-columns:1fr;gap:48px;}
  .ws-form-row{grid-template-columns:1fr;}
  .ws-footer-inner{grid-template-columns:1fr;gap:36px;}
  .ws-cta-banner{padding:80px 0;}
  .ws-service-card{padding:32px 28px;}
  .ws-hero-glow{width:320px;height:320px;}
  .ws-hero--minimal{min-height:80vh;}
  .ws-hero-content--min{padding:0 16px;}
  .ws-feat-grid{grid-template-columns:1fr;}
  .ws-price-grid{grid-template-columns:1fr;}
  .ws-price-card{padding:36px 28px;}
  .ws-svc-item{flex-direction:column;gap:8px;}
  .ws-listing-grid{grid-template-columns:1fr;}
  .ws-stats-inner{gap:32px;}
  .ws-stat-value{font-size:clamp(2rem,8vw,3rem);}
  .ws-steps{grid-template-columns:1fr;gap:32px;}
  .ws-step{padding:0;}
  .ws-step-line{display:none;}
}
@media(max-width:480px){
  .ws-hero-headline,.ws-hero-headline--el,.ws-hero-headline--ee,.ws-hero-headline--ss{font-size:clamp(1.75rem,7.5vw,2.25rem);}
  .ws-hero-split-text{padding:48px 20px 40px;}
  .ws-gallery-grid{grid-template-columns:1fr;}
  .ws-team-grid{grid-template-columns:1fr;}
}
`.trim();
}

// ── Page script (anchor scroll + FAQ + form) ──────────────────────────────────
const PAGE_SCRIPT = `
(function(){
  // Prevent ALL anchor-link clicks from navigating the iframe away — smooth scroll only
  document.addEventListener('click',function(e){
    var node=e.target;
    while(node&&node.tagName!=='A')node=node.parentElement;
    if(!node)return;
    var href=node.getAttribute('href');
    if(!href||!href.startsWith('#'))return;
    e.preventDefault();
    var id=href.slice(1);
    if(!id){window.scrollTo({top:0,behavior:'smooth'});return;}
    var el=document.getElementById(id);
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  });
})();

function wsFaqToggle(i){
  var wrap=document.getElementById('faq-wrap-'+i);
  if(!wrap)return;
  var isOpen=wrap.classList.toggle('open');
  var btn=wrap.querySelector('[role="button"]');
  if(btn)btn.setAttribute('aria-expanded',isOpen?'true':'false');
}

function wsSubmitForm(e){
  e.preventDefault();
  var form=document.getElementById('booking-form');
  var errEl=document.getElementById('booking-error');
  var success=document.getElementById('booking-success');
  var btn=form?form.querySelector('button[type="submit"]'):null;
  var url=typeof window.__WS_SUBMIT_URL__==='string'?window.__WS_SUBMIT_URL__:'';
  if(!url){
    if(form)form.style.display='none';
    if(success)success.style.display='block';
    return false;
  }
  var data={};
  if(form){
    var els=form.querySelectorAll('input[name],select[name],textarea[name]');
    for(var i=0;i<els.length;i++){data[els[i].name]=els[i].value;}
  }
  if(btn){btn.disabled=true;btn.textContent='Sending…';}
  if(errEl)errEl.style.display='none';
  fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(function(r){return r.json().then(function(j){return{ok:r.ok,body:j};});})
    .then(function(res){
      if(!res.ok){
        if(btn){btn.disabled=false;btn.textContent=btn.getAttribute('data-label')||'Submit';}
        if(errEl){errEl.textContent=res.body.error||'Something went wrong — please try again.';errEl.style.display='block';}
      }else{
        if(form)form.style.display='none';
        if(success)success.style.display='block';
      }
    })
    .catch(function(){
      if(btn){btn.disabled=false;btn.textContent=btn.getAttribute('data-label')||'Submit';}
      if(errEl){errEl.textContent='Connection error — please try again.';errEl.style.display='block';}
    });
  return false;
}
`.trim();

// ── Language / RTL helpers ────────────────────────────────────────────────────
const LANG_CODE: Record<string, string> = {
  Arabic: "ar", French: "fr", Spanish: "es", German: "de",
  Italian: "it", Portuguese: "pt", Russian: "ru", English: "en",
};
const RTL_LANGS = new Set(["Arabic", "Hebrew", "Persian", "Urdu"]);

function htmlLangAttr(language: string | undefined): string {
  return LANG_CODE[language ?? ""] ?? "en";
}

// Arabic font (Cairo) + RTL layout overrides injected only when needed.
function buildRtlExtra(language: string | undefined): string {
  if (!RTL_LANGS.has(language ?? "")) return "";
  return `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
:root{--font-heading:'Cairo',sans-serif;--font-body:'Cairo',sans-serif;}
html[dir="rtl"] body{text-align:right;}
html[dir="rtl"] .ws-hero-content{text-align:right;}
html[dir="rtl"] .ws-about-inner{flex-direction:row-reverse;}
html[dir="rtl"] .ws-hero-ctas{flex-direction:row-reverse;}
html[dir="rtl"] .ws-bullet{flex-direction:row-reverse;text-align:right;}
html[dir="rtl"] .ws-nav-links{flex-direction:row-reverse;}
html[dir="rtl"] .ws-service-card{text-align:right;}
`.trim();
}

// ── Section index annotation ──────────────────────────────────────────────────
// Adds data-vs="{i}" to the outermost <section|footer> tag of each rendered section.
// The inline-edit script uses this to map DOM elements back to spec.sections[i].
function addDataVs(html: string, i: number | string): string {
  return html.replace(/^(<(?:section|footer)\b)/, `$1 data-vs="${i}"`);
}

// ── Main renderer ─────────────────────────────────────────────────────────────
export function renderWebsite(spec: WebsiteSpec, images: ImageMap, tenantId?: string, language?: string): string {
  // Resolve design tokens: v2 designDNA takes priority over legacy stylePreset
  const t: DesignTokens = spec.designDNA
    ? resolveDesignDNA(spec.designDNA)
    : resolveTokens((spec.stylePreset ?? "realestate") as PresetName, spec.accentColor);

  const name = spec.businessName || "My Business";

  const footerSection = spec.sections.find((s) => s.type === "footer");
  const footerContent = footerSection?.content ?? {};

  // Nav CTA: check both legacy and v2 hero/contact types
  const heroSection    = spec.sections.find((s) => ["hero","hero-fullbleed","hero-split","hero-minimal"].includes(s.type));
  const contactSection = spec.sections.find((s) => ["booking","contact-block"].includes(s.type));
  const navCta = (heroSection?.content?.ctaPrimary as string) ?? (contactSection?.content?.ctaText as string) ?? "Book Now";

  const bodyParts: string[] = [];
  bodyParts.push(renderNav(name, navCta));

  for (let i = 0; i < spec.sections.length; i++) {
    const s = spec.sections[i];
    const imgKey = String(i);

    // Helper: collect multi-image array for gallery/listings sections
    const multiImgs = (): (string | undefined)[] => {
      const queries = s.imageQueries ?? (s.content?.imageQueries as string[] | undefined) ?? [];
      return queries.map((_, j) => images[`${imgKey}_${j}`]);
    };

    switch (s.type) {
      // ── Legacy section types (v1 backward compat) ──────────────────────────
      case "hero":
        bodyParts.push(addDataVs(renderHero(t, s.content as Parameters<typeof renderHero>[1], images[imgKey]), i));
        break;
      case "about":
        bodyParts.push(addDataVs(renderAbout(t, s.content as Parameters<typeof renderAbout>[1], images[imgKey]), i));
        break;
      case "services":
        bodyParts.push(addDataVs(renderServices(t, s.content as Parameters<typeof renderServices>[1]), i));
        break;
      case "gallery": {
        const g = renderGallery(t, s.content as Parameters<typeof renderGallery>[1], multiImgs());
        if (g) bodyParts.push(addDataVs(g, i));
        break;
      }
      case "testimonials":
        bodyParts.push(addDataVs(renderTestimonials(t, s.content as Parameters<typeof renderTestimonials>[1]), i));
        break;
      case "team":
        bodyParts.push(addDataVs(renderTeam(t, s.content as Parameters<typeof renderTeam>[1]), i));
        break;
      case "booking":
        bodyParts.push(addDataVs(renderBooking(t, s.content as Parameters<typeof renderBooking>[1]), i));
        break;
      case "faq":
        bodyParts.push(addDataVs(renderFaq(t, s.content as Parameters<typeof renderFaq>[1]), i));
        break;
      case "cta_banner":
        bodyParts.push(addDataVs(renderCtaBanner(t, s.content as Parameters<typeof renderCtaBanner>[1]), i));
        break;
      case "footer":
        break;

      // ── v2 section types ───────────────────────────────────────────────────
      case "hero-fullbleed":
        bodyParts.push(addDataVs(renderHeroFullbleed(t, s.content as Parameters<typeof renderHeroFullbleed>[1], images[imgKey]), i));
        break;
      case "hero-split":
        bodyParts.push(addDataVs(renderHeroSplitSection(t, s.content as Parameters<typeof renderHeroSplitSection>[1], images[imgKey]), i));
        break;
      case "hero-minimal":
        bodyParts.push(addDataVs(renderHeroMinimal(t, s.content as Parameters<typeof renderHeroMinimal>[1]), i));
        break;
      case "feature-grid":
        bodyParts.push(addDataVs(renderFeatureGrid(t, s.content as Parameters<typeof renderFeatureGrid>[1]), i));
        break;
      case "pricing-tiers":
        bodyParts.push(addDataVs(renderPricingTiers(t, s.content as Parameters<typeof renderPricingTiers>[1]), i));
        break;
      case "service-list":
        bodyParts.push(addDataVs(renderServiceList(t, s.content as Parameters<typeof renderServiceList>[1]), i));
        break;
      case "gallery-grid": {
        const gg = renderGalleryGrid(t, s.content as Parameters<typeof renderGalleryGrid>[1], multiImgs());
        if (gg) bodyParts.push(addDataVs(gg, i));
        break;
      }
      case "listings-grid": {
        const lg = renderListingsGrid(t, s.content as Parameters<typeof renderListingsGrid>[1], multiImgs());
        if (lg) bodyParts.push(addDataVs(lg, i));
        break;
      }
      case "about-story":
        bodyParts.push(addDataVs(renderAboutStory(t, s.content as Parameters<typeof renderAboutStory>[1], images[imgKey]), i));
        break;
      case "team-grid":
        bodyParts.push(addDataVs(renderTeamGrid(t, s.content as Parameters<typeof renderTeamGrid>[1]), i));
        break;
      case "stats-band": {
        const sb = renderStatsBand(t, s.content as Parameters<typeof renderStatsBand>[1]);
        if (sb) bodyParts.push(addDataVs(sb, i));
        break;
      }
      case "process-steps": {
        const ps = renderProcessSteps(t, s.content as Parameters<typeof renderProcessSteps>[1]);
        if (ps) bodyParts.push(addDataVs(ps, i));
        break;
      }
      case "faq-accordion":
        bodyParts.push(addDataVs(renderFaqAccordion(t, s.content as Parameters<typeof renderFaqAccordion>[1]), i));
        break;
      case "cta-band":
        bodyParts.push(addDataVs(renderCtaBand(t, s.content as Parameters<typeof renderCtaBand>[1]), i));
        break;
      case "contact-block":
        bodyParts.push(addDataVs(renderContactBlock(t, s.content as Parameters<typeof renderContactBlock>[1]), i));
        break;
      default:
        break;
    }
  }

  bodyParts.push(addDataVs(renderFooter(name, footerContent as Parameters<typeof renderFooter>[1]), "footer"));

  const css = buildCss(t);
  const rtlExtra = buildRtlExtra(language);
  const specComment = `<!-- WEBSITE_SPEC: ${JSON.stringify(spec)} -->`;
  const submitUrl = tenantId ? `/api/site/${tenantId}/submit-form` : "";
  const htmlLang = htmlLangAttr(language);
  const dirAttr = RTL_LANGS.has(language ?? "") ? ` dir="rtl"` : "";

  return `<!DOCTYPE html>
<html lang="${htmlLang}"${dirAttr}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name}</title>
<style>${css}${rtlExtra ? `\n${rtlExtra}` : ""}</style>
</head>
<body>
${bodyParts.join("\n")}
<script>window.__WS_SUBMIT_URL__='${submitUrl}';<\/script>
<script>${PAGE_SCRIPT}<\/script>
${specComment}
</body>
</html>`.trim();
}
