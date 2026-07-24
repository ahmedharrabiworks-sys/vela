import { resolveTokens, resolveDesignDNA, type DesignTokens, type PresetName, type DesignDNA } from "./website-design-system";
import {
  renderNav, renderHero, renderAbout, renderServices,
  renderGallery, renderTestimonials, renderTeam, renderBooking,
  renderFaq, renderCtaBanner, renderFooter,
  // v2 section library
  renderHeroFullbleed, renderHeroSplitSection, renderHeroMinimal, renderHeroVariant,
  renderFeatureGrid, renderPricingTiers, renderServiceList,
  renderGalleryGrid, renderListingsGrid, renderAboutStory,
  renderTeamGrid, renderTestimonialsSection, renderStatsBand,
  renderProcessSteps, renderFaqAccordion, renderCtaBand, renderContactBlock,
  // new section types
  renderLogoStrip, renderProductGrid, renderFeatureShowcase, renderIntegrationGrid,
  // Phase 2b trust & conversion pool
  renderComparisonTable, renderAgentCard, renderPressQuoteBand,
  renderTrainerShowcase, renderTrustBadgesBand, renderMultiStepForm,
  renderAppointmentForm, renderValuationForm, renderMembershipForm,
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
    | "faq-accordion" | "cta-band" | "contact-block"
    // new section types
    | "logo-strip" | "product-grid" | "feature-showcase" | "integration-grid"
    // Phase 2b trust & conversion pool
    | "comparison-table" | "agent-card" | "press-quote-band"
    | "trainer-showcase" | "trust-badges-band" | "multi-step-form"
    | "appointment-form" | "valuation-form" | "membership-form"
    | string; // allow forward-compat
  variant?: string;
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
  _textStyles?: Record<string, Record<string, string>>;
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

/* ── booking left/right columns ─────────────────────────────────────────── */
.ws-booking-inner{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:start;}
.ws-booking-left{display:flex;flex-direction:column;}
.ws-booking-right{display:flex;flex-direction:column;}
.ws-contact-details{display:flex;flex-direction:column;gap:24px;margin-top:0;}
.ws-contact-inline-row{display:flex;flex-wrap:wrap;gap:24px 48px;justify-content:center;margin-top:32px;margin-bottom:48px;}

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
  /* v3 hero variants — 375px / 768px responsive */
  .ws-hero--fi{min-height:80vh;align-items:flex-end;}
  .ws-hero-fi-inner{padding:0 16px 56px;}
  .ws-hero-fi-h{font-size:clamp(2rem,7vw,2.75rem);}
  .ws-hero--res{grid-template-columns:1fr;min-height:auto;}
  .ws-hero-res-img{min-height:56vw;order:-1;}
  .ws-hero-res-text{padding:48px 16px 40px;}
  .ws-hero-res-h{font-size:clamp(1.875rem,6vw,2.5rem);}
  .ws-hero-res-stats{gap:20px;}
  .ws-hero--sf{min-height:80vh;}
  .ws-hero-sf-inner{padding:0 16px;}
  .ws-hero-sf-h{font-size:clamp(2rem,7vw,2.75rem);}
  .ws-hero-sf-bar{flex-direction:column;align-items:stretch;gap:10px;padding:14px 14px;}
  .ws-hero-sf-input{width:100%;}
  .ws-hero-sf-pills{flex-wrap:wrap;}
  .ws-hero-sf-go{width:100%;text-align:center;justify-content:center;}
  .ws-hero--pf{padding:48px 0;}
  .ws-hero-pf-inner{grid-template-columns:1fr;gap:32px;}
  .ws-hero--tf{grid-template-columns:1fr;min-height:auto;}
  .ws-hero-tf-img{min-height:56vw;}
  .ws-hero-tf-content{padding:48px 16px 40px;}
  .ws-hero-tf-h{font-size:clamp(1.875rem,6vw,2.5rem);}
  .ws-hero--bof{grid-template-columns:1fr;min-height:auto;}
  .ws-hero-bof-img{min-height:56vw;}
  .ws-hero-bof-content{padding:48px 16px 40px;}
  .ws-hero-bof-h{font-size:clamp(1.75rem,5.5vw,2.25rem);}
  .ws-hero--cprem{min-height:auto;padding:64px 0;}
  .ws-hero-cprem-inner{grid-template-columns:1fr;gap:40px;}
  .ws-hero-cprem-photo{display:none;}
  .ws-hero--cind{min-height:80vh;align-items:flex-end;}
  .ws-hero-cind-inner{padding:0 16px 56px;}
  .ws-hero-cind-h{font-size:clamp(2.5rem,10vw,4rem);}
  .ws-hero--mf{min-height:80vh;}
  .ws-hero-mf-inner{padding:0 16px;}
  .ws-hero-mf-tiers{flex-direction:column;align-items:center;}
  .ws-hero-mf-tier{width:100%;max-width:320px;}
  .ws-hero--ed{grid-template-columns:1fr;min-height:auto;}
  .ws-hero-ed-media{display:none;}
  .ws-hero-ed-text{padding:64px 16px;}
  .ws-hero-ed-h{font-size:clamp(2rem,7vw,3rem);}
  .ws-hero--port{padding:48px 0;}
  .ws-hero-port-grid{grid-template-columns:1fr;height:clamp(240px,70vw,360px);}
  .ws-hero-port-stack{display:none;}
  .ws-hero-port-meta{flex-direction:column;gap:20px;}
  .ws-hero-port-h{font-size:clamp(1.75rem,5.5vw,2.25rem);}
  .ws-hero--lux{min-height:80vh;}
  .ws-hero-lux-inner{padding:0 16px;}
  .ws-hero-lux-h{font-size:clamp(2.5rem,9vw,4rem);}
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

/* ── Hero: editorial-offset ──────────────────────────────────────────────── */
.ws-hero--editorial{min-height:100vh;display:flex;align-items:center;}
.ws-hero-editorial-inner{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;width:100%;}
.ws-hero-editorial-text{display:flex;flex-direction:column;}
.ws-hero-headline--editorial{
  font-family:var(--font-heading);
  font-size:clamp(3rem,6vw,6rem);
  font-weight:var(--heading-weight);
  letter-spacing:var(--heading-tracking);
  text-transform:var(--heading-transform);
  line-height:0.96;margin-bottom:40px;
}
.ws-hero-editorial-foot{margin-top:auto;}
.ws-hero-editorial-img{position:relative;}
.ws-hero-editorial-photo{
  width:100%;aspect-ratio:4/5;object-fit:cover;
  border-radius:var(--radius-lg);display:block;
}

/* ── Feature-grid: alternating-rows ─────────────────────────────────────── */
.ws-feat-rows{display:flex;flex-direction:column;gap:72px;margin-top:72px;}
.ws-feat-row{display:grid;grid-template-columns:auto 1fr;gap:48px;align-items:center;}
.ws-feat-row--rev{grid-template-columns:1fr auto;direction:rtl;}
.ws-feat-row--rev>*{direction:ltr;}

/* ── Feature-grid: numbered-list ─────────────────────────────────────────── */
.ws-feat-numbered{display:grid;grid-template-columns:1fr 1fr;gap:48px 64px;margin-top:64px;}
.ws-feat-num-item{display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:start;}
.ws-feat-num-label{font-family:var(--font-heading);font-size:3.5rem;font-weight:800;line-height:1;color:var(--accent);opacity:.18;user-select:none;}
.ws-feat-num-body{}

/* ── Feature-grid: bento ─────────────────────────────────────────────────── */
.ws-feat-bento{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:56px;}
.ws-feat-bento-hero{grid-column:span 2;grid-row:span 2;}

/* ── Service-list: two-column ────────────────────────────────────────────── */
.ws-svc-two-col{display:grid;grid-template-columns:1fr 1fr;gap:0 64px;margin-top:48px;border-top:1px solid var(--border);}

/* ── Service-list: bordered-cards ───────────────────────────────────────── */
.ws-svc-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:24px;margin-top:48px;}
.ws-svc-bcard{
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius-lg);padding:36px 32px;
  transition:border-color .2s,box-shadow .2s;
}
.ws-svc-bcard:hover{border-color:var(--accent);box-shadow:0 8px 32px var(--accent-alpha);}

/* ── Pricing: comparison-table ───────────────────────────────────────────── */
.ws-price-table-wrap{overflow-x:auto;margin-top:40px;}
.ws-price-table{width:100%;border-collapse:collapse;min-width:500px;}
.ws-price-table-feature-col{width:35%;}
.ws-price-table-th{
  padding:32px 24px;text-align:center;
  background:var(--surface);border:1px solid var(--border);
  vertical-align:top;
}
.ws-price-table-th--hi{border-radius:12px 12px 0 0;}
.ws-price-table-feat{
  padding:14px 0;text-align:left;font-size:0.875rem;
  color:var(--color-muted);border-bottom:1px solid var(--border);
}
.ws-price-table-row:last-child .ws-price-table-feat,.ws-price-table-row:last-child .ws-price-table-cell{border-bottom:none;}
.ws-price-table-cell{
  padding:14px 24px;text-align:center;
  border-left:1px solid var(--border);border-bottom:1px solid var(--border);
}
.ws-price-table-cell--hi{background:var(--accent-alpha);}

/* ── Pricing: single-highlight ───────────────────────────────────────────── */
.ws-price-single{display:grid;grid-template-columns:2fr 3fr;gap:24px;margin-top:40px;}
.ws-price-secondary{display:flex;flex-direction:column;gap:16px;}

/* ── Gallery: masonry ────────────────────────────────────────────────────── */
.ws-gallery-masonry{columns:3;column-gap:16px;}
.ws-gallery-masonry-item{break-inside:avoid;margin-bottom:16px;overflow:hidden;border-radius:var(--radius-lg);}

/* ── Gallery: full-bleed-strip ───────────────────────────────────────────── */
.ws-gallery-strip{
  display:flex;gap:16px;overflow-x:auto;
  padding:0 max(16px,calc((100vw - 1200px)/2));
  scrollbar-width:none;
}
.ws-gallery-strip::-webkit-scrollbar{display:none;}
.ws-gallery-strip-item{
  flex:0 0 clamp(240px,30vw,380px);
  height:280px;border-radius:var(--radius-lg);overflow:hidden;
  background:linear-gradient(135deg,var(--surface),var(--bg-alt));
}

/* ── Listings: masonry ───────────────────────────────────────────────────── */
.ws-listing-masonry{columns:3;column-gap:24px;}
.ws-listing-masonry .ws-listing-card{break-inside:avoid;margin-bottom:24px;display:inline-block;width:100%;}

/* ── Listings: wide-rows ─────────────────────────────────────────────────── */
.ws-listing-wide{display:flex;flex-direction:column;gap:32px;}
.ws-listing-wide-row{
  display:grid;grid-template-columns:1fr 1.5fr;
  gap:48px;align-items:center;
  border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;
}
.ws-listing-wide-row--rev{grid-template-columns:1.5fr 1fr;}
.ws-listing-wide-row--rev .ws-listing-wide-img{order:2;}
.ws-listing-wide-row--rev .ws-listing-wide-body{order:1;}
.ws-listing-wide-img{height:300px;overflow:hidden;background:linear-gradient(135deg,var(--surface),var(--bg-alt));}
.ws-listing-wide-body{padding:40px;}

/* ── Logo strip ──────────────────────────────────────────────────────────── */
.ws-logo-strip{padding:48px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);}
.ws-logo-strip-label{text-align:center;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--color-muted);margin-bottom:28px;}
.ws-logo-strip-inner{display:flex;flex-wrap:wrap;gap:20px 48px;align-items:center;justify-content:center;}
.ws-logo-name{font-size:1rem;font-weight:700;color:var(--color-muted);letter-spacing:.02em;opacity:.55;transition:opacity .2s;}
.ws-logo-name:hover{opacity:.9;}

/* ── Product grid ────────────────────────────────────────────────────────── */
.ws-product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:24px;margin-top:48px;}
.ws-product-card{
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius-lg);overflow:hidden;
  transition:transform .2s,box-shadow .2s;
}
.ws-product-card:hover{transform:translateY(-4px);box-shadow:0 16px 48px rgba(0,0,0,.12);}
.ws-product-img{
  aspect-ratio:1/1;overflow:hidden;position:relative;
  background:linear-gradient(135deg,var(--surface),var(--bg-alt));
}
.ws-product-badge{
  position:absolute;top:12px;left:12px;
  padding:3px 10px;border-radius:100px;
  font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
  background:var(--accent);color:var(--accent-fg);
}
.ws-product-body{padding:20px 20px 24px;}
.ws-product-name{
  font-family:var(--font-heading);font-size:1rem;font-weight:600;
  color:var(--color-heading);margin-bottom:6px;line-height:1.3;
}
.ws-product-desc{font-size:0.825rem;color:var(--color-muted);line-height:1.6;margin-bottom:12px;}
.ws-product-foot{display:flex;justify-content:space-between;align-items:center;margin-top:12px;}
.ws-product-price{font-size:1.1rem;font-weight:700;color:var(--accent);}

/* ── Feature showcase ────────────────────────────────────────────────────── */
.ws-showcase{display:flex;flex-direction:column;gap:72px;}
.ws-showcase-row{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;}
.ws-showcase-row--rev{direction:rtl;}
.ws-showcase-row--rev>*{direction:ltr;}
.ws-showcase-img{aspect-ratio:16/10;overflow:hidden;border-radius:var(--radius-lg);background:linear-gradient(135deg,var(--surface),var(--bg-alt));}
.ws-showcase-num{font-family:var(--font-heading);font-size:3.5rem;font-weight:800;color:var(--accent);opacity:.2;line-height:1;margin-bottom:16px;}
.ws-showcase-title{font-family:var(--font-heading);font-size:1.75rem;font-weight:var(--heading-weight);color:var(--color-heading);margin-bottom:16px;line-height:1.2;}
.ws-showcase-desc{font-size:1rem;color:var(--color-muted);line-height:1.75;}

/* ── Integration grid ────────────────────────────────────────────────────── */
.ws-integration-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:16px;margin-top:48px;}
.ws-integration-tile{
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius-lg);padding:24px 16px;
  text-align:center;transition:border-color .2s,box-shadow .2s;
}
.ws-integration-tile:hover{border-color:var(--accent);box-shadow:0 4px 16px var(--accent-alpha);}
.ws-integration-name{font-size:0.8rem;font-weight:600;color:var(--color-muted);}

/* ── Hero v3: full-image ─────────────────────────────────────────────────── */
.ws-hero--fi{position:relative;min-height:94vh;display:flex;align-items:flex-end;overflow:hidden;}
.ws-hero-fi-bg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.ws-hero-fi-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.36) 48%,rgba(0,0,0,.08) 100%);}
.ws-hero-fi-inner{position:relative;z-index:1;padding:0 max(24px,5vw) clamp(64px,10vh,120px);max-width:860px;}
.ws-hero-fi-eyebrow{font-size:0.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:20px;}
.ws-hero-fi-h{font-family:var(--font-heading);font-size:clamp(2.75rem,6vw,5.5rem);font-weight:var(--heading-weight);letter-spacing:var(--heading-tracking);text-transform:var(--heading-transform);color:#fff;line-height:1.0;margin-bottom:20px;}
.ws-hero-fi-sub{font-size:1.1rem;color:rgba(255,255,255,.76);max-width:520px;line-height:1.7;margin-bottom:44px;}

/* ── Hero v3: re-split ───────────────────────────────────────────────────── */
.ws-hero--res{display:grid;grid-template-columns:1fr 1fr;min-height:85vh;}
.ws-hero-res-text{display:flex;flex-direction:column;justify-content:center;padding:80px max(48px,6vw);}
.ws-hero-res-img{position:relative;overflow:hidden;background:var(--bg-alt);}
.ws-hero-res-eyebrow{font-size:0.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:24px;}
.ws-hero-res-h{font-family:var(--font-heading);font-size:clamp(2rem,4vw,3.5rem);font-weight:var(--heading-weight);letter-spacing:var(--heading-tracking);text-transform:var(--heading-transform);color:var(--color-heading);line-height:1.08;margin-bottom:20px;max-width:18ch;}
.ws-hero-res-sub{font-size:1rem;color:var(--color-muted);line-height:1.75;margin-bottom:36px;max-width:44ch;}
.ws-hero-res-stats{display:flex;gap:32px;margin-top:48px;padding-top:32px;border-top:1px solid var(--border);}
.ws-hero-res-stat-val{font-family:var(--font-heading);font-size:1.75rem;font-weight:700;color:var(--color-heading);margin-bottom:4px;}
.ws-hero-res-stat-lbl{font-size:0.75rem;color:var(--color-muted);text-transform:uppercase;letter-spacing:.08em;}

/* ── Hero v3: search-first ───────────────────────────────────────────────── */
.ws-hero--sf{position:relative;min-height:90vh;display:flex;align-items:center;overflow:hidden;}
.ws-hero-sf-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.ws-hero-sf-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72) 0%,rgba(0,0,0,.38) 45%,rgba(0,0,0,.1) 100%);}
.ws-hero-sf-inner{position:relative;z-index:1;padding:0 max(24px,5vw);width:100%;}
.ws-hero-sf-eyebrow{font-size:0.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:20px;}
.ws-hero-sf-h{font-family:var(--font-heading);font-size:clamp(2.5rem,6vw,5rem);font-weight:var(--heading-weight);letter-spacing:var(--heading-tracking);text-transform:var(--heading-transform);color:#fff;line-height:1.0;margin-bottom:16px;max-width:720px;}
.ws-hero-sf-sub{font-size:1.05rem;color:rgba(255,255,255,.72);max-width:560px;line-height:1.7;margin-bottom:32px;}
.ws-hero-sf-bar{display:flex;align-items:center;gap:12px;background:#fff;border-radius:var(--radius);padding:10px 14px;max-width:820px;flex-wrap:wrap;box-shadow:0 8px 32px rgba(0,0,0,.24);}
.ws-hero-sf-input{flex:1 1 200px;border:none;outline:none;font-size:0.95rem;color:#1A1A1A;padding:4px 0;min-width:0;}
.ws-hero-sf-pills{display:flex;gap:6px;flex-wrap:wrap;}
.ws-hero-sf-pill{padding:5px 12px;border-radius:100px;border:1.5px solid var(--border);font-size:0.78rem;cursor:pointer;background:transparent;color:var(--color-muted);transition:all .18s;white-space:nowrap;}
.ws-hero-sf-pill--on{background:var(--accent);color:var(--accent-fg);border-color:var(--accent);}
.ws-hero-sf-go{flex-shrink:0;white-space:nowrap;}

/* ── Hero v3: property-first ─────────────────────────────────────────────── */
.ws-hero--pf{padding:var(--section-pad) 0;}
.ws-hero-pf-inner{display:grid;grid-template-columns:1fr 1.2fr;gap:64px;align-items:center;}
.ws-hero-pf-eyebrow{font-size:0.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:20px;}
.ws-hero-pf-h{font-family:var(--font-heading);font-size:clamp(2rem,4.5vw,3.5rem);font-weight:var(--heading-weight);letter-spacing:var(--heading-tracking);text-transform:var(--heading-transform);color:var(--color-heading);line-height:1.08;margin-bottom:18px;}
.ws-hero-pf-sub{font-size:1rem;color:var(--color-muted);line-height:1.75;margin-bottom:36px;}
.ws-hero-pf-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.1);}
.ws-hero-pf-card-img{aspect-ratio:4/3;overflow:hidden;position:relative;}
.ws-hero-pf-price-tag{position:absolute;bottom:16px;left:16px;background:var(--accent);color:var(--accent-fg);font-weight:700;font-size:1.1rem;padding:6px 16px;border-radius:var(--radius);}
.ws-hero-pf-card-body{padding:24px 28px;}
.ws-hero-pf-card-title{font-family:var(--font-heading);font-size:1.05rem;font-weight:600;color:var(--color-heading);margin-bottom:8px;}
.ws-hero-pf-specs{font-size:0.875rem;color:var(--color-muted);}
.ws-hero-pf-dot{margin:0 4px;}

/* ── Hero v3: trust-focused ──────────────────────────────────────────────── */
.ws-hero--tf{display:grid;grid-template-columns:5fr 7fr;min-height:85vh;}
.ws-hero-tf-img{position:relative;overflow:hidden;background:var(--bg-alt);}
.ws-hero-tf-content{display:flex;flex-direction:column;justify-content:center;padding:80px max(48px,6vw);}
.ws-hero-tf-eyebrow{font-size:0.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:24px;}
.ws-hero-tf-h{font-family:var(--font-heading);font-size:clamp(2rem,4vw,3.25rem);font-weight:var(--heading-weight);letter-spacing:var(--heading-tracking);text-transform:var(--heading-transform);color:var(--color-heading);line-height:1.1;margin-bottom:18px;max-width:20ch;}
.ws-hero-tf-sub{font-size:1rem;color:var(--color-muted);line-height:1.75;margin-bottom:32px;max-width:44ch;}
.ws-hero-tf-badges{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:32px;padding:24px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);}
.ws-hero-tf-badge-val{font-family:var(--font-heading);font-size:1.5rem;font-weight:700;color:var(--accent);margin-bottom:4px;}
.ws-hero-tf-badge-lbl{font-size:0.78rem;color:var(--color-muted);text-transform:uppercase;letter-spacing:.07em;}

/* ── Hero v3: booking-focused ────────────────────────────────────────────── */
.ws-hero--bof{display:grid;grid-template-columns:1fr 1fr;min-height:80vh;}
.ws-hero-bof-img{position:relative;overflow:hidden;background:var(--bg-alt);}
.ws-hero-bof-content{display:flex;flex-direction:column;justify-content:center;padding:72px max(48px,6vw);}
.ws-hero-bof-eyebrow{font-size:0.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:20px;}
.ws-hero-bof-h{font-family:var(--font-heading);font-size:clamp(1.75rem,3.5vw,2.75rem);font-weight:var(--heading-weight);letter-spacing:var(--heading-tracking);text-transform:var(--heading-transform);color:var(--color-heading);line-height:1.1;margin-bottom:14px;}
.ws-hero-bof-sub{font-size:0.95rem;color:var(--color-muted);line-height:1.7;margin-bottom:28px;}
.ws-hero-bof-form{display:flex;flex-direction:column;gap:12px;}
.ws-hero-bof-inp{border:1px solid var(--border);border-radius:var(--radius);padding:11px 16px;font-size:0.95rem;background:var(--surface);color:var(--color-text);outline:none;transition:border-color .18s;}
.ws-hero-bof-inp:focus{border-color:var(--accent);}

/* ── Hero v3: clinical-premium ───────────────────────────────────────────── */
.ws-hero--cprem{min-height:85vh;display:flex;align-items:center;}
.ws-hero-cprem-inner{display:grid;grid-template-columns:1.1fr 1fr;gap:80px;align-items:center;width:100%;}
.ws-hero-cprem-eyebrow{font-size:0.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:24px;}
.ws-hero-cprem-h{font-family:var(--font-heading);font-size:clamp(2rem,4.5vw,3.5rem);font-weight:var(--heading-weight);letter-spacing:var(--heading-tracking);text-transform:var(--heading-transform);color:var(--color-heading);line-height:1.08;margin-bottom:20px;}
.ws-hero-cprem-sub{font-size:1rem;color:var(--color-muted);line-height:1.75;margin-bottom:36px;max-width:46ch;}
.ws-hero-cprem-photo{position:relative;}
.ws-hero-cprem-img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:var(--radius-lg);display:block;box-shadow:0 24px 64px rgba(0,0,0,.12);}

/* ── Hero v3: cinematic-dark ─────────────────────────────────────────────── */
.ws-hero--cind{position:relative;min-height:94vh;display:flex;align-items:flex-end;overflow:hidden;}
.ws-hero-cind-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.ws-hero-cind-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.92) 0%,rgba(0,0,0,.52) 50%,rgba(0,0,0,.2) 100%);}
.ws-hero-cind-inner{position:relative;z-index:1;padding:0 max(24px,6vw) clamp(64px,10vh,120px);}
.ws-hero-cind-eyebrow{font-size:0.72rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:24px;}
.ws-hero-cind-h{font-family:var(--font-heading);font-size:clamp(3rem,10vw,8rem);font-weight:900;letter-spacing:-.01em;text-transform:uppercase;color:#fff;line-height:.95;margin-bottom:24px;max-width:14ch;}
.ws-hero-cind-sub{font-size:1.05rem;color:rgba(255,255,255,.58);max-width:480px;line-height:1.65;margin-bottom:48px;}
.ws-hero-cind-cta{font-size:1rem;padding:14px 36px;}

/* ── Hero v3: membership-focused ─────────────────────────────────────────── */
.ws-hero--mf{position:relative;min-height:88vh;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;}
.ws-hero-mf-bg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:.25;}
.ws-hero-mf-glow{position:absolute;inset:0;pointer-events:none;}
.ws-hero-mf-inner{position:relative;z-index:1;padding:0 max(24px,8vw);}
.ws-hero-mf-h{font-family:var(--font-heading);font-size:clamp(2.5rem,6vw,5rem);font-weight:var(--heading-weight);letter-spacing:var(--heading-tracking);text-transform:var(--heading-transform);color:var(--color-heading);line-height:1.08;margin-bottom:20px;margin-top:24px;}
.ws-hero-mf-sub{font-size:1.05rem;color:var(--color-muted);line-height:1.75;max-width:52ch;margin:0 auto 48px;}
.ws-hero-mf-tiers{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:48px;}
.ws-hero-mf-tier{display:flex;flex-direction:column;align-items:center;padding:20px 32px;border:1px solid var(--border);border-radius:var(--radius-lg);text-decoration:none;transition:border-color .2s,background .2s;}
.ws-hero-mf-tier:hover{border-color:var(--accent);background:var(--accent-alpha);}
.ws-hero-mf-tier-name{font-size:0.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--color-muted);margin-bottom:6px;}
.ws-hero-mf-tier-price{font-family:var(--font-heading);font-size:1.5rem;font-weight:700;color:var(--color-heading);}
.ws-hero-mf-tier-period{font-size:0.85rem;font-weight:400;color:var(--color-muted);}

/* ── Hero v3: energy-driven ──────────────────────────────────────────────── */
.ws-hero--ed{display:grid;grid-template-columns:1fr 1fr;min-height:88vh;overflow:hidden;}
.ws-hero-ed-text{display:flex;flex-direction:column;justify-content:center;padding:80px max(48px,6vw);z-index:1;}
.ws-hero-ed-eyebrow{font-size:0.72rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:24px;}
.ws-hero-ed-h{font-family:var(--font-heading);font-size:clamp(2.25rem,5vw,4.5rem);font-weight:900;letter-spacing:var(--heading-tracking);text-transform:uppercase;color:var(--color-heading);line-height:.95;margin-bottom:24px;}
.ws-hero-ed-sub{font-size:1rem;color:var(--color-muted);line-height:1.7;margin-bottom:40px;max-width:40ch;}
.ws-hero-ed-media{position:relative;overflow:hidden;background:var(--bg-alt);clip-path:polygon(8% 0%,100% 0%,100% 100%,0% 100%);}
.ws-hero-ed-img{width:100%;height:100%;object-fit:cover;display:block;}

/* ── Hero v3: portfolio-first ────────────────────────────────────────────── */
.ws-hero--port{padding:var(--section-pad) 0;}
.ws-hero-port-inner{display:flex;flex-direction:column;gap:48px;}
.ws-hero-port-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:16px;height:clamp(380px,55vw,600px);}
.ws-hero-port-main{border-radius:var(--radius-lg);overflow:hidden;background:var(--bg-alt);}
.ws-hero-port-stack{display:grid;grid-template-rows:1fr 1fr;gap:16px;}
.ws-hero-port-stack-item{border-radius:var(--radius-lg);overflow:hidden;background:var(--bg-alt);}
.ws-hero-port-meta{display:flex;flex-wrap:wrap;gap:32px;align-items:center;}
.ws-hero-port-eyebrow{font-size:0.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);flex:0 0 100%;}
.ws-hero-port-h{font-family:var(--font-heading);font-size:clamp(2rem,4vw,3.25rem);font-weight:var(--heading-weight);letter-spacing:var(--heading-tracking);text-transform:var(--heading-transform);color:var(--color-heading);line-height:1.1;flex:1 1 320px;}
.ws-hero-port-sub{font-size:0.95rem;color:var(--color-muted);line-height:1.75;flex:1 1 300px;}

/* ── Hero v3: luxury-showcase ────────────────────────────────────────────── */
.ws-hero--lux{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;}
.ws-hero-lux-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.ws-hero-lux-overlay{position:absolute;inset:0;background:rgba(0,0,0,.42);}
.ws-hero-lux-inner{position:relative;z-index:1;padding:0 max(24px,10vw);}
.ws-hero-lux-eyebrow{font-size:0.72rem;font-weight:400;letter-spacing:.24em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:32px;}
.ws-hero-lux-h{font-family:var(--font-heading);font-size:clamp(3rem,8vw,8rem);font-weight:300;letter-spacing:-.01em;color:#fff;line-height:.96;margin-bottom:40px;}
.ws-hero-lux-rule{width:60px;height:1px;background:rgba(255,255,255,.5);margin:0 auto 40px;}
.ws-hero-lux-sub{font-size:1rem;color:rgba(255,255,255,.68);max-width:48ch;margin:0 auto 56px;line-height:1.75;}
.ws-hero-lux-cta{border-color:rgba(255,255,255,.6);color:#fff;font-size:0.875rem;letter-spacing:.08em;}
.ws-hero-lux-cta:hover{background:rgba(255,255,255,.15);border-color:#fff;}

/* ── Phase 2b: comparison-table ─────────────────────────────────────────── */
.ws-cmp-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;}
.ws-cmp-table{width:100%;border-collapse:collapse;min-width:520px;}
.ws-cmp-th{padding:12px 20px;font-size:0.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border-bottom:2px solid var(--surface);}
.ws-cmp-th-us{color:var(--accent);text-align:center;}
.ws-cmp-th-them{color:var(--color-muted);text-align:center;}
.ws-cmp-row{border-bottom:1px solid var(--surface);}
.ws-cmp-row:last-child{border-bottom:none;}
.ws-cmp-feat{padding:16px 20px;font-size:0.9rem;color:var(--color-text);}
.ws-cmp-us{padding:16px 20px;text-align:center;font-size:0.9rem;font-weight:600;color:var(--accent);}
.ws-cmp-them{padding:16px 20px;text-align:center;font-size:0.9rem;color:var(--color-muted);}

/* ── Phase 2b: agent-card ────────────────────────────────────────────────── */
.ws-agent-card{display:grid;grid-template-columns:280px 1fr;gap:48px;align-items:start;max-width:860px;margin:0 auto;}
.ws-agent-photo{width:100%;aspect-ratio:3/4;border-radius:12px;overflow:hidden;background:var(--surface);}
.ws-agent-name{font-family:var(--font-heading);font-size:clamp(1.6rem,3vw,2.4rem);font-weight:var(--heading-weight);color:var(--color-heading);margin-bottom:8px;}
.ws-agent-title{font-size:0.9rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:20px;}
.ws-agent-bio{font-size:0.98rem;color:var(--color-text);line-height:1.75;margin-bottom:28px;}
.ws-agent-contacts{display:flex;flex-direction:column;gap:12px;}
.ws-agent-contact{display:flex;align-items:center;gap:10px;font-size:0.95rem;color:var(--color-text);text-decoration:none;transition:color .2s;}
.ws-agent-contact:hover{color:var(--accent);}
.ws-agent-contact svg{color:var(--accent);flex-shrink:0;}

/* ── Phase 2b: press-quote-band ─────────────────────────────────────────── */
.ws-pqb{padding:80px 24px;}
.ws-pqb-inner{max-width:760px;margin:0 auto;text-align:center;}
.ws-pqb-mark{font-family:var(--font-heading);font-size:8rem;line-height:.6;color:var(--accent);opacity:.4;margin-bottom:16px;user-select:none;}
.ws-pqb-quote{font-family:var(--font-heading);font-size:clamp(1.3rem,2.5vw,2rem);font-weight:400;font-style:italic;color:#fff;line-height:1.5;margin-bottom:32px;}
.ws-pqb-foot{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;}
.ws-pqb-source{font-size:0.9rem;font-weight:600;color:rgba(255,255,255,.85);}
.ws-pqb-pub{font-size:0.85rem;color:rgba(255,255,255,.5);font-style:italic;}

/* ── Phase 2b: trainer-showcase ─────────────────────────────────────────── */
.ws-trainer-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:32px;margin-top:48px;}
.ws-trainer-card{text-align:center;padding:32px 24px;background:var(--bg-alt);border-radius:12px;}
.ws-trainer-avatar{width:72px;height:72px;border-radius:50%;background:var(--accent);color:#fff;font-family:var(--font-heading);font-size:1.4rem;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;}
.ws-trainer-name{font-size:1rem;font-weight:700;color:var(--color-heading);margin-bottom:6px;}
.ws-trainer-spec{font-size:0.82rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:12px;}
.ws-trainer-bio{font-size:0.88rem;color:var(--color-muted);line-height:1.65;}

/* ── Phase 2b: trust-badges-band ────────────────────────────────────────── */
.ws-tbadges{display:flex;flex-wrap:wrap;gap:32px;justify-content:center;margin-top:40px;}
.ws-tbadge{min-width:140px;padding:28px 20px;background:var(--surface);border-radius:10px;text-align:center;}
.ws-tbadge-val{font-family:var(--font-heading);font-size:1.8rem;font-weight:700;color:var(--accent);margin-bottom:6px;}
.ws-tbadge-lbl{font-size:0.82rem;color:var(--color-muted);font-weight:500;}

/* ── Phase 2b: shared form block ─────────────────────────────────────────── */
.ws-fb{background:var(--bg-alt);border-radius:16px;padding:40px;max-width:600px;margin:0 auto;position:relative;}
.ws-form-group{display:flex;flex-direction:column;gap:8px;}
.ws-form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.ws-form-label{font-size:0.82rem;font-weight:600;color:var(--color-muted);letter-spacing:.04em;}
.ws-form-input{padding:12px 16px;border:1.5px solid var(--surface);border-radius:8px;background:var(--bg);color:var(--color-text);font-size:0.95rem;font-family:var(--font-body);transition:border-color .2s;width:100%;box-sizing:border-box;}
.ws-form-input:focus{outline:none;border-color:var(--accent);}
.ws-fb-err{font-size:0.85rem;color:#e05;background:rgba(220,0,80,.07);padding:10px 14px;border-radius:6px;}
.ws-fb-ok{text-align:center;padding:48px 24px;}
.ws-fb-ok-icon{width:56px;height:56px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;}
.ws-fb-ok-title{font-family:var(--font-heading);font-size:1.4rem;font-weight:700;color:var(--color-heading);margin-bottom:10px;}
.ws-fb-ok-text{font-size:0.95rem;color:var(--color-muted);}

/* ── Phase 2b: multi-step-form ───────────────────────────────────────────── */
.ws-msf-wrap{max-width:560px;}
.ws-msf-progress{display:flex;align-items:center;gap:0;margin-bottom:32px;}
.ws-msf-step{display:flex;align-items:center;gap:10px;font-size:0.82rem;font-weight:600;color:var(--color-muted);}
.ws-msf-step--on{color:var(--accent);}
.ws-msf-step--on .ws-msf-dot{background:var(--accent);color:#fff;border-color:var(--accent);}
.ws-msf-dot{width:28px;height:28px;border-radius:50%;border:2px solid var(--surface);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;background:var(--bg-alt);color:var(--color-muted);flex-shrink:0;}
.ws-msf-bar{flex:1;height:2px;background:var(--surface);margin:0 8px;}
.ws-msf-page{display:flex;}

/* ── Phase 2b: appointment-form ─────────────────────────────────────────── */
.ws-appt-wrap{max-width:640px;margin:0 auto;}

/* ── Phase 2b: valuation-form ───────────────────────────────────────────── */
.ws-val-wrap{max-width:640px;margin:0 auto;}

/* ── Phase 2b: membership-form ──────────────────────────────────────────── */
.ws-mem-tiers{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin:32px 0;}
.ws-mem-tier{flex:1 1 160px;max-width:200px;padding:24px 20px;border:2px solid var(--surface);border-radius:12px;cursor:pointer;transition:border-color .2s,background .2s;text-align:center;}
.ws-mem-tier--on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent);}
.ws-mem-tier-name{font-size:0.85rem;font-weight:700;color:var(--color-heading);margin-bottom:8px;}
.ws-mem-tier-price{font-family:var(--font-heading);font-size:1.4rem;font-weight:700;color:var(--accent);}
.ws-mem-tier-period{font-size:0.75rem;color:var(--color-muted);font-family:var(--font-body);}
.ws-mem-form-wrap{max-width:520px;margin:0 auto;}

/* ── Mobile responsive: new variants ─────────────────────────────────────── */
@media(max-width:768px){
  .ws-hero-editorial-inner{grid-template-columns:1fr;gap:40px;}
  .ws-hero-editorial-img{display:none;}
  .ws-hero--split.ws-hero--split-right{flex-direction:column;}
  .ws-feat-rows{gap:48px;}
  .ws-feat-row,.ws-feat-row--rev{grid-template-columns:1fr;direction:ltr;}
  .ws-feat-numbered{grid-template-columns:1fr;}
  .ws-feat-bento{grid-template-columns:1fr 1fr;}
  .ws-feat-bento-hero{grid-column:span 2;}
  .ws-svc-two-col{grid-template-columns:1fr;}
  .ws-svc-cards{grid-template-columns:1fr;}
  .ws-price-single{grid-template-columns:1fr;}
  .ws-gallery-masonry{columns:2;}
  .ws-listing-masonry{columns:1;}
  .ws-listing-wide-row,.ws-listing-wide-row--rev{grid-template-columns:1fr;}
  .ws-listing-wide-row--rev .ws-listing-wide-img,.ws-listing-wide-row--rev .ws-listing-wide-body{order:unset;}
  .ws-listing-wide-img{height:200px;}
  .ws-listing-wide-body{padding:24px;}
  .ws-showcase-row,.ws-showcase-row--rev{grid-template-columns:1fr;direction:ltr;gap:32px;}
  .ws-integration-grid{grid-template-columns:repeat(auto-fill,minmax(90px,1fr));}
  .ws-booking-inner{grid-template-columns:1fr;gap:48px;}
  .ws-contact-inline-row{flex-direction:column;align-items:flex-start;}
  .ws-product-grid{grid-template-columns:repeat(auto-fill,minmax(180px,1fr));}
  /* Phase 2b mobile */
  .ws-agent-card{grid-template-columns:1fr;gap:32px;}
  .ws-agent-photo{aspect-ratio:1/1;max-width:280px;}
  .ws-form-row{grid-template-columns:1fr;}
  .ws-mem-tiers{gap:12px;}
  .ws-mem-tier{flex:1 1 140px;}
  .ws-fb{padding:28px 20px;}
}
@media(max-width:480px){
  .ws-feat-bento{grid-template-columns:1fr;}
  .ws-feat-bento-hero{grid-column:span 1;grid-row:span 1;}
  .ws-gallery-masonry{columns:1;}
  /* Phase 2b 375px */
  .ws-msf-step span{display:none;}
  .ws-msf-progress{gap:4px;}
  .ws-cmp-table{min-width:360px;}
  .ws-trainer-grid{grid-template-columns:1fr 1fr;}
  .ws-tbadges{gap:12px;}
  .ws-tbadge{min-width:100px;padding:18px 12px;}
  .ws-mem-tier{flex:1 1 120px;padding:16px 10px;}
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

function wsHeroSFPill(el){
  var pills=el.closest('.ws-hero-sf-pills');
  if(!pills)return;
  pills.querySelectorAll('.ws-hero-sf-pill').forEach(function(p){p.classList.remove('ws-hero-sf-pill--on');});
  el.classList.add('ws-hero-sf-pill--on');
}

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

/* Phase 2b — generic form block submit (uses .ws-form-block traversal, no hardcoded IDs) */
function wsFormBlock(e){
  e.preventDefault();
  var form=e.target;
  var wrap=form.closest('.ws-fb');
  var errEl=wrap?wrap.querySelector('.ws-fb-err'):null;
  var ok=wrap?wrap.querySelector('.ws-fb-ok'):null;
  var btn=form.querySelector('button[type="submit"]');
  var url=typeof window.__WS_SUBMIT_URL__==='string'?window.__WS_SUBMIT_URL__:'';
  var data={};
  var els=form.querySelectorAll('input[name],select[name],textarea[name]');
  for(var i=0;i<els.length;i++){data[els[i].name]=els[i].value;}
  if(!url){
    if(form)form.style.display='none';
    if(ok)ok.style.display='block';
    return false;
  }
  if(btn){btn.disabled=true;btn.textContent='Sending…';}
  if(errEl)errEl.style.display='none';
  fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(function(r){return r.json().then(function(j){return{ok:r.ok,body:j};});})
    .then(function(res){
      if(!res.ok){
        if(btn){btn.disabled=false;btn.textContent=btn.getAttribute('data-label')||'Submit';}
        if(errEl){errEl.textContent=res.body.error||'Something went wrong.';errEl.style.display='block';}
      }else{
        if(form)form.style.display='none';
        if(ok)ok.style.display='block';
      }
    })
    .catch(function(){
      if(btn){btn.disabled=false;btn.textContent=btn.getAttribute('data-label')||'Submit';}
      if(errEl){errEl.textContent='Connection error — please try again.';errEl.style.display='block';}
    });
  return false;
}

/* Phase 2b — multi-step form navigation */
function wsMsfNext(){
  var p0=document.getElementById('msf-page-0');
  var p1=document.getElementById('msf-page-1');
  var d0=document.getElementById('msf-dot-0');
  var d1=document.getElementById('msf-dot-1');
  if(!p0||!p1)return;
  if(!p0.closest('form').reportValidity())return;
  p0.style.display='none';
  p1.style.display='flex';
  if(d0)d0.classList.remove('ws-msf-step--on');
  if(d1)d1.classList.add('ws-msf-step--on');
}
function wsMsfBack(){
  var p0=document.getElementById('msf-page-0');
  var p1=document.getElementById('msf-page-1');
  var d0=document.getElementById('msf-dot-0');
  var d1=document.getElementById('msf-dot-1');
  if(!p0||!p1)return;
  p1.style.display='none';
  p0.style.display='flex';
  if(d1)d1.classList.remove('ws-msf-step--on');
  if(d0)d0.classList.add('ws-msf-step--on');
}

/* Phase 2b — membership tier radio toggle */
function wsMfTier(el){
  var group=el.closest('.ws-mem-tiers');
  if(!group)return;
  group.querySelectorAll('.ws-mem-tier').forEach(function(t){
    t.classList.remove('ws-mem-tier--on');
    t.setAttribute('aria-checked','false');
    var radio=t.querySelector('input[type="radio"]');
    if(radio)radio.checked=false;
  });
  el.classList.add('ws-mem-tier--on');
  el.setAttribute('aria-checked','true');
  var r=el.querySelector('input[type="radio"]');
  if(r)r.checked=true;
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
  return html.replace(/^(<(?:section|footer|nav)\b)/, `$1 data-vs="${i}"`);
}

// ── Dynamic nav links based on sections that exist ───────────────────────────
const SECTION_NAV: Record<string, { label: string; href: string }> = {
  "feature-grid":    { label: "Features",  href: "#services"      },
  "service-list":    { label: "Services",  href: "#services"      },
  "services":        { label: "Services",  href: "#services"      },
  "about-story":     { label: "About",     href: "#about"         },
  "about":           { label: "About",     href: "#about"         },
  "pricing-tiers":   { label: "Pricing",   href: "#pricing"       },
  "gallery-grid":    { label: "Gallery",   href: "#gallery"       },
  "gallery":         { label: "Gallery",   href: "#gallery"       },
  "listings-grid":   { label: "Listings",  href: "#listings"      },
  "team-grid":       { label: "Team",      href: "#team"          },
  "team":            { label: "Team",      href: "#team"          },
  "faq-accordion":   { label: "FAQ",       href: "#faq"           },
  "faq":             { label: "FAQ",       href: "#faq"           },
  "product-grid":    { label: "Products",  href: "#products"      },
  "feature-showcase":{ label: "Features",  href: "#features"      },
  // Phase 2b trust & conversion pool
  "comparison-table":  { label: "Why Us",      href: "#comparison"  },
  "agent-card":        { label: "Your Agent",  href: "#agent"       },
  "trainer-showcase":  { label: "Trainers",    href: "#trainers"    },
  "press-quote-band":  { label: "Press",       href: "#press"       },
  "trust-badges-band": { label: "Trust",       href: "#trust"       },
  "multi-step-form":   { label: "Inquire",     href: "#inquiry"     },
  "appointment-form":  { label: "Book",        href: "#appointment" },
  "valuation-form":    { label: "Valuation",   href: "#valuation"   },
  "membership-form":   { label: "Join",        href: "#join"        },
};

function buildNavLinks(spec: WebsiteSpec): Array<{ label: string; href: string }> {
  const seen = new Set<string>();
  const links: Array<{ label: string; href: string }> = [];
  for (const s of spec.sections) {
    const entry = SECTION_NAV[s.type];
    if (entry && !seen.has(entry.href)) {
      seen.add(entry.href);
      links.push(entry);
    }
  }
  links.push({ label: "Contact", href: "#booking" });
  return links;
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

  const navLinks = buildNavLinks(spec);

  const bodyParts: string[] = [];
  bodyParts.push(renderNav(name, navCta, navLinks));

  for (let i = 0; i < spec.sections.length; i++) {
    const s = spec.sections[i];
    const imgKey = String(i);

    // Helper: collect multi-image array for gallery/listings sections
    const multiImgs = (): (string | undefined)[] => {
      const queries = s.imageQueries ?? (s.content?.imageQueries as string[] | undefined) ?? [];
      return queries.map((_, j) => images[`${imgKey}_${j}`]);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = s.content as Record<string, any>;
    const v = s.variant;

    switch (s.type) {
      // ── Legacy section types (v1 backward compat) ──────────────────────────
      case "hero":
        // v2 variant-based dispatch when variant field is present
        if (v) {
          bodyParts.push(addDataVs(renderHeroVariant(t, c, v, images[imgKey], multiImgs()), i));
        } else {
          bodyParts.push(addDataVs(renderHero(t, c, images[imgKey]), i));
        }
        break;
      case "about":
        bodyParts.push(addDataVs(renderAbout(t, c, images[imgKey]), i));
        break;
      case "services":
        bodyParts.push(addDataVs(renderServices(t, c), i));
        break;
      case "gallery": {
        const g = renderGallery(t, c, multiImgs());
        if (g) bodyParts.push(addDataVs(g, i));
        break;
      }
      case "testimonials":
        bodyParts.push(addDataVs(renderTestimonials(t, c), i));
        break;
      case "team":
        bodyParts.push(addDataVs(renderTeam(t, c), i));
        break;
      case "booking":
        bodyParts.push(addDataVs(renderBooking(t, { ...c, variant: v }), i));
        break;
      case "faq":
        bodyParts.push(addDataVs(renderFaq(t, c), i));
        break;
      case "cta_banner":
        bodyParts.push(addDataVs(renderCtaBanner(t, c), i));
        break;
      case "footer":
        break;

      // ── v2 section types ───────────────────────────────────────────────────
      case "hero-fullbleed":
        bodyParts.push(addDataVs(renderHeroFullbleed(t, c, images[imgKey]), i));
        break;
      case "hero-split":
        bodyParts.push(addDataVs(renderHeroSplitSection(t, c, images[imgKey]), i));
        break;
      case "hero-minimal":
        bodyParts.push(addDataVs(renderHeroMinimal(t, c), i));
        break;
      case "feature-grid": {
        const fg = renderFeatureGrid(t, c, v);
        if (fg) bodyParts.push(addDataVs(fg, i));
        break;
      }
      case "pricing-tiers": {
        const pt = renderPricingTiers(t, c, v);
        if (pt) bodyParts.push(addDataVs(pt, i));
        break;
      }
      case "service-list": {
        const sl = renderServiceList(t, c, v);
        if (sl) bodyParts.push(addDataVs(sl, i));
        break;
      }
      case "gallery-grid": {
        const gg = renderGalleryGrid(t, c, multiImgs(), v);
        if (gg) bodyParts.push(addDataVs(gg, i));
        break;
      }
      case "listings-grid": {
        const lg = renderListingsGrid(t, c, multiImgs(), v);
        if (lg) bodyParts.push(addDataVs(lg, i));
        break;
      }
      case "about-story":
        bodyParts.push(addDataVs(renderAboutStory(t, c, images[imgKey]), i));
        break;
      case "team-grid":
        bodyParts.push(addDataVs(renderTeamGrid(t, c), i));
        break;
      case "stats-band": {
        const sb = renderStatsBand(t, c);
        if (sb) bodyParts.push(addDataVs(sb, i));
        break;
      }
      case "process-steps": {
        const ps = renderProcessSteps(t, c);
        if (ps) bodyParts.push(addDataVs(ps, i));
        break;
      }
      case "faq-accordion":
        bodyParts.push(addDataVs(renderFaqAccordion(t, c), i));
        break;
      case "cta-band":
        bodyParts.push(addDataVs(renderCtaBand(t, c), i));
        break;
      case "contact-block": {
        const cb = renderContactBlock(t, c, v);
        bodyParts.push(addDataVs(cb, i));
        break;
      }

      // ── New section types ──────────────────────────────────────────────────
      case "logo-strip": {
        const ls = renderLogoStrip(t, c);
        if (ls) bodyParts.push(addDataVs(ls, i));
        break;
      }
      case "product-grid": {
        const pg = renderProductGrid(t, c, multiImgs());
        if (pg) bodyParts.push(addDataVs(pg, i));
        break;
      }
      case "feature-showcase": {
        const fs = renderFeatureShowcase(t, c, multiImgs());
        if (fs) bodyParts.push(addDataVs(fs, i));
        break;
      }
      case "integration-grid": {
        const ig = renderIntegrationGrid(t, c);
        if (ig) bodyParts.push(addDataVs(ig, i));
        break;
      }

      // ── Phase 2b — trust & conversion pool ────────────────────────────────
      case "comparison-table": {
        const ct = renderComparisonTable(t, c);
        if (ct) bodyParts.push(addDataVs(ct, i));
        break;
      }
      case "agent-card": {
        const ac = renderAgentCard(t, c, images[imgKey]);
        if (ac) bodyParts.push(addDataVs(ac, i));
        break;
      }
      case "press-quote-band": {
        const pq = renderPressQuoteBand(t, c);
        if (pq) bodyParts.push(addDataVs(pq, i));
        break;
      }
      case "trainer-showcase": {
        const ts = renderTrainerShowcase(t, c);
        if (ts) bodyParts.push(addDataVs(ts, i));
        break;
      }
      case "trust-badges-band": {
        const tb = renderTrustBadgesBand(t, c);
        if (tb) bodyParts.push(addDataVs(tb, i));
        break;
      }
      case "multi-step-form": {
        const msf = renderMultiStepForm(t, c);
        if (msf) bodyParts.push(addDataVs(msf, i));
        break;
      }
      case "appointment-form": {
        const af = renderAppointmentForm(t, c);
        if (af) bodyParts.push(addDataVs(af, i));
        break;
      }
      case "valuation-form": {
        const vf = renderValuationForm(t, c);
        if (vf) bodyParts.push(addDataVs(vf, i));
        break;
      }
      case "membership-form": {
        const mf = renderMembershipForm(t, c);
        if (mf) bodyParts.push(addDataVs(mf, i));
        break;
      }

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
