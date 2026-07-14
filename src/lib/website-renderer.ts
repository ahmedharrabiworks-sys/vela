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
}

/* ── Typography ──────────────────────────────────────────────────────────── */
.ws-eyebrow{
  font-size:0.68rem;font-weight:600;letter-spacing:0.14em;
  text-transform:uppercase;color:var(--accent);margin-bottom:14px;
}
.ws-heading{
  font-family:var(--font-heading);
  font-size:clamp(2rem,4vw,3.25rem);
  font-weight:var(--heading-weight);
  line-height:1.14;
  letter-spacing:var(--heading-tracking);
  text-transform:var(--heading-transform);
  color:var(--color-heading);
  margin-bottom:18px;
}
.ws-subheading{
  font-size:1rem;line-height:1.75;color:var(--color-muted);margin-bottom:40px;
  max-width:540px;
}

/* ── Layout ──────────────────────────────────────────────────────────────── */
.ws-container{max-width:1160px;margin:0 auto;padding:0 48px;}
.ws-section{padding:120px 0;}
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
  height:72px;max-width:1160px;margin:0 auto;padding:0 48px;
}
.ws-nav-logo{
  font-family:var(--font-heading);font-size:1.15rem;font-weight:700;
  color:var(--color-heading);letter-spacing:-0.02em;
  text-transform:var(--heading-transform);
}
.ws-nav-links{display:flex;gap:40px;}
.ws-nav-link{font-size:0.875rem;font-weight:500;color:var(--color-muted);transition:color .2s;}
.ws-nav-link:hover{color:var(--accent);}

/* ── Hero — full-bleed, enormous type ───────────────────────────────────── */
.ws-hero{
  position:relative;min-height:95vh;
  display:flex;align-items:flex-end;
  overflow:hidden;background:var(--hero-bg);
}
.ws-hero-img{
  position:absolute;inset:0;
  width:100%;height:100%;object-fit:cover;display:block;
}
.ws-hero-overlay{
  position:absolute;inset:0;
  background:linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.5) 45%,rgba(0,0,0,.18) 100%);
}
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
  font-size:clamp(3.2rem,8vw,8rem);
  font-weight:var(--heading-weight);
  line-height:1.03;
  letter-spacing:var(--heading-tracking);
  text-transform:var(--heading-transform);
  color:white;max-width:960px;margin-bottom:24px;
}
.ws-hero-sub{
  font-size:1.1rem;line-height:1.75;
  color:rgba(255,255,255,.7);max-width:520px;margin-bottom:48px;
}
.ws-hero-ctas{display:flex;gap:14px;flex-wrap:wrap;}

/* ── Services — editorial grid, no icon circles ─────────────────────────── */
.ws-services-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(300px,1fr));
  gap:1px;background:var(--border);
  margin-top:64px;
}
.ws-service-card{
  background:var(--surface);padding:44px 40px;
  transition:background .2s;
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
.ws-cta-banner{background:var(--hero-bg);padding:120px 0;}
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

/* ── Mobile ──────────────────────────────────────────────────────────────── */
@media(max-width:768px){
  .ws-nav-links{display:none;}
  .ws-nav-inner{padding:0 24px;}
  .ws-hero{min-height:88vh;}
  .ws-hero-content{padding:0 24px 72px;}
  .ws-hero-headline{font-size:clamp(2.8rem,10vw,4.5rem);}
  .ws-hero-sub{font-size:1rem;}
  .ws-container{padding:0 24px;}
  .ws-section{padding:80px 0;}
  .ws-about-inner{flex-direction:column;gap:40px;}
  .ws-about-img{max-width:100%;height:300px;}
  .ws-services-grid{grid-template-columns:1fr;}
  .ws-test-grid{grid-template-columns:1fr;}
  .ws-gallery-grid{grid-template-columns:1fr 1fr;gap:10px;}
  .ws-team-grid{grid-template-columns:1fr 1fr;}
  .ws-booking-inner{grid-template-columns:1fr;gap:48px;}
  .ws-form-row{grid-template-columns:1fr;}
  .ws-footer-inner{grid-template-columns:1fr;gap:36px;}
  .ws-cta-banner{padding:80px 0;}
  .ws-service-card{padding:32px 28px;}
}
@media(max-width:480px){
  .ws-hero-headline{font-size:clamp(2.4rem,9vw,3.5rem);}
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
  var el=document.getElementById('faq-'+i);
  if(el)el.classList.toggle('open');
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

// ── Main renderer ─────────────────────────────────────────────────────────────
export function renderWebsite(spec: WebsiteSpec, images: ImageMap, tenantId?: string): string {
  const t = resolveTokens(spec.stylePreset, spec.accentColor);
  const name = spec.businessName || "My Business";

  const footerSection = spec.sections.find((s) => s.type === "footer");
  const footerContent = footerSection?.content ?? {};

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
        const gImgs: (string | undefined)[] = [];
        const queries = s.imageQueries ?? [];
        for (let j = 0; j < queries.length; j++) {
          gImgs.push(images[`${imgKey}_${j}`]);
        }
        bodyParts.push(renderGallery(t, s.content as Parameters<typeof renderGallery>[1], gImgs));
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
        break;
      default:
        break;
    }
  }

  bodyParts.push(renderFooter(name, footerContent as Parameters<typeof renderFooter>[1]));

  const css = buildCss(t);
  const specComment = `<!-- WEBSITE_SPEC: ${JSON.stringify(spec)} -->`;
  const submitUrl = tenantId ? `/api/site/${tenantId}/submit-form` : "";

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
<script>window.__WS_SUBMIT_URL__='${submitUrl}';<\/script>
<script>${PAGE_SCRIPT}<\/script>
${specComment}
</body>
</html>`.trim();
}
