import { resolveTokens, type DesignTokens, type PresetName } from "./website-design-system";
import {
  renderNav, renderHero, renderAbout, renderServices,
  renderGallery, renderTestimonials, renderTeam, renderBooking,
  renderFaq, renderCtaBanner, renderFooter,
} from "./website-sections";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SectionSpec {
  type: "hero" | "about" | "services" | "gallery" | "testimonials" | "team" | "booking" | "faq" | "cta_banner" | "footer";
  imageQuery?: string;
  imageQueries?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>;
}

export interface WebsiteSpec {
  stylePreset: PresetName;
  accentColor?: string;
  businessName: string;
  sections: SectionSpec[];
}

// images[i] holds the resolved URL for section at index i (or gallery images at images[i+"_j"])
export type ImageMap = Record<string, string>;

// ── CSS generator ─────────────────────────────────────────────────────────────
function buildCss(t: DesignTokens): string {
  return `
@import url('${t.fontImport}');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
body{background:var(--bg);color:var(--color-text);font-family:var(--font-body);font-size:16px;line-height:1.65;overflow-x:hidden;}
a{color:inherit;text-decoration:none;}
img{display:block;max-width:100%;}
button,input,select,textarea{font-family:inherit;}

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
}

/* Typography */
.ws-eyebrow{font-size:0.68rem;font-weight:600;letter-spacing:0.13em;text-transform:uppercase;color:var(--accent);margin-bottom:12px;}
.ws-heading{font-family:var(--font-heading);font-size:clamp(1.8rem,3.5vw,2.75rem);font-weight:var(--heading-weight);line-height:1.16;letter-spacing:var(--heading-tracking);text-transform:var(--heading-transform);color:var(--color-heading);margin-bottom:16px;}
.ws-subheading{font-size:1rem;line-height:1.75;color:var(--color-muted);margin-bottom:32px;}

/* Layout */
.ws-container{max-width:1140px;margin:0 auto;padding:0 32px;}
.ws-section{padding:88px 0;}
.ws-section-alt{background:var(--bg-alt);}

/* Buttons */
.ws-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;border-radius:var(--radius);font-size:0.9rem;font-weight:600;cursor:pointer;transition:opacity .2s,transform .2s,background .2s,border-color .2s;border:2px solid transparent;line-height:1;}
.ws-btn-primary{background:var(--accent);color:var(--accent-fg);border-color:var(--accent);}
.ws-btn-primary:hover{opacity:.85;transform:translateY(-1px);}
.ws-btn-accent{background:var(--accent);color:var(--accent-fg);border-color:var(--accent);}
.ws-btn-accent:hover{opacity:.85;transform:translateY(-1px);}
.ws-btn-light{background:rgba(255,255,255,.1);color:white;border-color:rgba(255,255,255,.3);}
.ws-btn-light:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.5);}
.ws-btn-outline{background:transparent;color:var(--color-heading);border-color:var(--border);}
.ws-btn-outline:hover{border-color:var(--accent);color:var(--accent);}
.ws-btn-white{background:white;color:var(--accent);border-color:white;}
.ws-btn-white:hover{opacity:.9;}

/* Nav */
.ws-nav{position:sticky;top:0;z-index:100;background:var(--bg);border-bottom:1px solid var(--border);backdrop-filter:blur(12px);}
.ws-nav-inner{display:flex;align-items:center;justify-content:space-between;height:68px;max-width:1140px;margin:0 auto;padding:0 32px;}
.ws-nav-logo{font-family:var(--font-heading);font-size:1.1rem;font-weight:700;color:var(--color-heading);letter-spacing:-0.02em;text-transform:var(--heading-transform);}
.ws-nav-links{display:flex;gap:36px;}
.ws-nav-link{font-size:0.875rem;font-weight:500;color:var(--color-muted);transition:color .2s;}
.ws-nav-link:hover{color:var(--accent);}

/* Hero */
.ws-hero{display:grid;grid-template-columns:1fr 1fr;min-height:88vh;overflow:hidden;}
.ws-hero-text{background:var(--hero-bg);padding:80px 56px;display:flex;flex-direction:column;justify-content:center;}
.ws-hero-photo{position:relative;overflow:hidden;}
.ws-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.ws-hero-overlay{position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,0,0,.25) 0%,rgba(0,0,0,.05) 100%);}
.ws-hero-eyebrow{font-size:0.68rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:20px;}
.ws-hero-headline{font-family:var(--font-heading);font-size:clamp(2.2rem,4vw,3.5rem);font-weight:var(--heading-weight);line-height:1.12;letter-spacing:var(--heading-tracking);text-transform:var(--heading-transform);color:white;margin-bottom:20px;max-width:520px;}
.ws-hero-sub{font-size:1rem;line-height:1.75;color:rgba(255,255,255,.65);margin-bottom:40px;max-width:440px;}
.ws-hero-ctas{display:flex;gap:12px;flex-wrap:wrap;}

/* Services */
.ws-services-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;}
.ws-service-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:28px 24px;transition:box-shadow .25s,transform .25s;}
.ws-service-card:hover{box-shadow:0 12px 32px rgba(0,0,0,.09);transform:translateY(-4px);}
.ws-service-icon{width:48px;height:48px;background:var(--accent-alpha);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:18px;color:var(--accent);}
.ws-service-title{font-family:var(--font-heading);font-size:1.05rem;font-weight:600;color:var(--color-heading);margin-bottom:8px;letter-spacing:var(--heading-tracking);}
.ws-service-desc{font-size:0.875rem;color:var(--color-muted);line-height:1.65;}
.ws-service-price{display:inline-block;margin-top:14px;font-size:0.875rem;font-weight:700;color:var(--accent);}

/* About */
.ws-about-inner{display:flex;gap:72px;align-items:center;}
.ws-about-img{width:100%;max-width:480px;height:460px;object-fit:cover;border-radius:var(--radius-lg);flex-shrink:0;}
.ws-about-content{flex:1;min-width:0;}
.ws-bullet{display:flex;gap:14px;margin-bottom:22px;align-items:flex-start;}
.ws-bullet-icon{width:28px;height:28px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;color:var(--accent-fg);}
.ws-bullet-title{font-weight:600;font-size:0.9rem;color:var(--color-heading);margin-bottom:3px;}
.ws-bullet-text{font-size:0.85rem;color:var(--color-muted);line-height:1.55;}

/* Testimonials */
.ws-test-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;}
.ws-test-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:28px 24px;}
.ws-stars{color:#F59E0B;font-size:0.875rem;letter-spacing:2px;margin-bottom:14px;}
.ws-test-quote{font-size:0.9rem;line-height:1.7;color:var(--color-text);font-style:italic;margin-bottom:22px;}
.ws-test-footer{display:flex;align-items:center;gap:12px;}
.ws-test-avatar{width:40px;height:40px;border-radius:50%;background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:700;flex-shrink:0;}
.ws-test-name{font-weight:600;font-size:0.875rem;color:var(--color-heading);}
.ws-test-role{font-size:0.75rem;color:var(--color-muted);}

/* Gallery */
.ws-gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.ws-gallery-item{aspect-ratio:1;overflow:hidden;border-radius:var(--radius-lg);}
.ws-gallery-img{width:100%;height:100%;object-fit:cover;transition:transform .4s;}
.ws-gallery-item:hover .ws-gallery-img{transform:scale(1.06);}

/* Team */
.ws-team-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px;}
.ws-team-card{text-align:center;padding:28px 20px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);}
.ws-team-avatar{width:80px;height:80px;border-radius:50%;background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;margin:0 auto 16px;}
.ws-team-name{font-family:var(--font-heading);font-weight:600;font-size:1rem;color:var(--color-heading);margin-bottom:4px;}
.ws-team-role{font-size:0.8rem;color:var(--accent);font-weight:600;margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em;}
.ws-team-bio{font-size:0.85rem;color:var(--color-muted);line-height:1.6;}

/* Booking */
.ws-booking-inner{display:grid;grid-template-columns:1fr 1.4fr;gap:64px;align-items:start;}
.ws-booking-form{display:flex;flex-direction:column;gap:14px;}
.ws-form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.ws-form-group{display:flex;flex-direction:column;gap:6px;}
.ws-form-label{font-size:0.78rem;font-weight:600;color:var(--color-heading);letter-spacing:.03em;}
.ws-form-input{padding:11px 14px;border:1.5px solid var(--border);border-radius:var(--radius);font-size:0.9rem;color:var(--color-text);background:var(--bg);transition:border-color .2s;width:100%;outline:none;}
.ws-form-input:focus{border-color:var(--accent);}
.ws-contact-item{display:flex;gap:14px;align-items:flex-start;margin-bottom:24px;}
.ws-contact-icon{width:44px;height:44px;min-width:44px;background:var(--accent-alpha);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;}
.ws-contact-label{font-size:0.7rem;font-weight:600;color:var(--color-muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;}
.ws-contact-value{font-size:0.95rem;color:var(--color-heading);font-weight:500;}
.ws-form-success{display:none;text-align:center;padding:48px 24px;border:1px solid var(--border);border-radius:var(--radius-lg);}
.ws-form-success-icon{width:56px;height:56px;background:var(--accent);color:var(--accent-fg);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;}
.ws-form-success-title{font-family:var(--font-heading);font-size:1.3rem;font-weight:600;color:var(--color-heading);margin-bottom:8px;}
.ws-form-success-text{font-size:0.9rem;color:var(--color-muted);}

/* FAQ */
.ws-faq-list{border-top:1px solid var(--border);}
.ws-faq-item{border-bottom:1px solid var(--border);}
.ws-faq-q{display:flex;justify-content:space-between;align-items:center;padding:20px 0;cursor:pointer;font-size:0.95rem;font-weight:600;color:var(--color-heading);gap:20px;transition:color .2s;user-select:none;}
.ws-faq-q:hover{color:var(--accent);}
.ws-faq-icon{flex-shrink:0;font-size:1.3rem;line-height:1;color:var(--accent);transition:transform .25s;font-weight:400;}
.ws-faq-a{font-size:0.9rem;line-height:1.75;color:var(--color-muted);max-height:0;overflow:hidden;transition:max-height .3s ease,padding-bottom .3s;}
.ws-faq-item.open .ws-faq-a{max-height:400px;padding-bottom:20px;}
.ws-faq-item.open .ws-faq-icon{transform:rotate(45deg);}

/* CTA Banner */
.ws-cta-banner{background:var(--hero-bg);padding:88px 0;}
.ws-cta-headline{font-family:var(--font-heading);font-size:clamp(1.6rem,3vw,2.4rem);font-weight:var(--heading-weight);letter-spacing:var(--heading-tracking);text-transform:var(--heading-transform);color:white;margin-bottom:14px;}
.ws-cta-sub{font-size:1rem;color:rgba(255,255,255,.65);margin-bottom:36px;}

/* Footer */
.ws-footer{background:#0B1120;color:#9CA3AF;padding:60px 0 28px;}
.ws-footer-inner{display:grid;grid-template-columns:2fr 1fr 1fr;gap:40px;margin-bottom:40px;}
.ws-footer-logo{font-family:var(--font-heading);font-size:1.1rem;font-weight:700;color:white;margin-bottom:10px;}
.ws-footer-tag{font-size:0.875rem;line-height:1.6;max-width:280px;}
.ws-footer-heading{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:white;margin-bottom:16px;}
.ws-footer-link{display:block;font-size:0.875rem;color:#9CA3AF;margin-bottom:10px;transition:color .2s;}
.ws-footer-link:hover{color:white;}
.ws-footer-bottom{border-top:1px solid #1E293B;padding-top:20px;font-size:0.8rem;text-align:center;}

/* Mobile */
@media(max-width:768px){
  .ws-nav-links{display:none;}
  .ws-hero{grid-template-columns:1fr;min-height:auto;}
  .ws-hero-text{order:2;padding:52px 24px;}
  .ws-hero-photo{order:1;height:260px;}
  .ws-hero-headline{font-size:clamp(1.8rem,6vw,2.4rem);}
  .ws-container{padding:0 24px;}
  .ws-section{padding:60px 0;}
  .ws-about-inner{flex-direction:column;gap:32px;}
  .ws-about-img{max-width:100%;height:240px;}
  .ws-services-grid{grid-template-columns:1fr;}
  .ws-test-grid{grid-template-columns:1fr;}
  .ws-gallery-grid{grid-template-columns:1fr 1fr;}
  .ws-team-grid{grid-template-columns:1fr 1fr;}
  .ws-booking-inner{grid-template-columns:1fr;gap:40px;}
  .ws-form-row{grid-template-columns:1fr;}
  .ws-footer-inner{grid-template-columns:1fr;gap:32px;}
  .ws-cta-banner{padding:60px 0;}
}
@media(max-width:480px){
  .ws-gallery-grid{grid-template-columns:1fr;}
  .ws-team-grid{grid-template-columns:1fr;}
}
`.trim();
}

// ── Page script ───────────────────────────────────────────────────────────────
const PAGE_SCRIPT = `
function wsFaqToggle(i){
  var el=document.getElementById('faq-'+i);
  if(!el)return;
  el.classList.toggle('open');
}
function wsSubmitForm(e){
  e.preventDefault();
  var form=document.getElementById('booking-form');
  var success=document.getElementById('booking-success');
  if(form)form.style.display='none';
  if(success)success.style.display='block';
  return false;
}
`.trim();

// ── Main renderer ─────────────────────────────────────────────────────────────
export function renderWebsite(spec: WebsiteSpec, images: ImageMap): string {
  const t = resolveTokens(spec.stylePreset, spec.accentColor);
  const name = spec.businessName || "My Business";

  // Find footer content
  const footerSection = spec.sections.find((s) => s.type === "footer");
  const footerContent = footerSection?.content ?? {};

  // Find the primary CTA text from hero or booking
  const heroSection = spec.sections.find((s) => s.type === "hero");
  const bookingSection = spec.sections.find((s) => s.type === "booking");
  const navCta = (heroSection?.content?.ctaPrimary as string) ?? (bookingSection?.content?.ctaText as string) ?? "Book Now";

  const bodyParts: string[] = [];
  bodyParts.push(renderNav(name, navCta));

  for (let i = 0; i < spec.sections.length; i++) {
    const s = spec.sections[i];
    const imgKey = String(i);

    switch (s.type) {
      case "hero":
        bodyParts.push(renderHero(t, s.content as Parameters<typeof renderHero>[1], images[imgKey]));
        break;
      case "about":
        bodyParts.push(renderAbout(t, s.content as Parameters<typeof renderAbout>[1], images[imgKey]));
        break;
      case "services":
        bodyParts.push(renderServices(t, s.content as Parameters<typeof renderServices>[1]));
        break;
      case "gallery": {
        const galleryImages: (string | undefined)[] = [];
        const queries = s.imageQueries ?? [];
        for (let j = 0; j < queries.length; j++) {
          galleryImages.push(images[`${imgKey}_${j}`]);
        }
        bodyParts.push(renderGallery(t, s.content as Parameters<typeof renderGallery>[1], galleryImages));
        break;
      }
      case "testimonials":
        bodyParts.push(renderTestimonials(t, s.content as Parameters<typeof renderTestimonials>[1]));
        break;
      case "team":
        bodyParts.push(renderTeam(t, s.content as Parameters<typeof renderTeam>[1]));
        break;
      case "booking":
        bodyParts.push(renderBooking(t, s.content as Parameters<typeof renderBooking>[1]));
        break;
      case "faq":
        bodyParts.push(renderFaq(t, s.content as Parameters<typeof renderFaq>[1]));
        break;
      case "cta_banner":
        bodyParts.push(renderCtaBanner(t, s.content as Parameters<typeof renderCtaBanner>[1]));
        break;
      case "footer":
        break; // rendered after loop
      default:
        break;
    }
  }

  bodyParts.push(renderFooter(name, footerContent as Parameters<typeof renderFooter>[1]));

  const css = buildCss(t);
  const specComment = `<!-- WEBSITE_SPEC: ${JSON.stringify(spec)} -->`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name}</title>
<style>${css}</style>
</head>
<body>
${bodyParts.join("\n")}
<script>${PAGE_SCRIPT}<\/script>
${specComment}
</body>
</html>`.trim();
}
