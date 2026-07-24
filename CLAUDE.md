# CLAUDE.md — VELA PROJECT MASTER CONTEXT
*Upload to the Vela Claude Project files. Every new chat: read this first, then continue exactly where we left off.*
*Last updated: July 24, 2026*

---

## 0. HOW TO TALK TO OUSSAMA (READ FIRST)

- **BE DIRECT. SAY LESS.** Lead with the answer or the prompt. No essays unless he asks.
- **ONE Claude Code prompt per message**, fenced with `═══` borders.
- **Prompts must be LONG and detailed** — he wants maximum detail so Claude Code doesn't wander. The *chat talk to him* should be short, not the prompt.
- **Every prompt ends with:** "Then commit and push to GitHub."
- He communicates design taste through **screenshots and reference URLs**, not descriptions.
- Talk like a sharp cofounder-friend — warm, direct, "bro" energy fine, honest above all. Never corporate.
- **When something is broken and the cause is unknown, get diagnostic evidence FIRST** (Vercel logs, console errors) before writing a fix prompt. Guessing wastes Claude Code credits.
- **Verify claimed fixes.** Claude Code has repeatedly reported "fixed" when the bug persisted. Always get production evidence before chaining the next prompt.
- **ONE SINGLE-FOCUS FIX PER PROMPT** — unless Oussama explicitly asks for everything in one big prompt (he does this near Claude usage limits). Default to single-focus.

---

## 1. WHO

- **Oussama (Ahmed) Harrabi** — Tunisia. Builds via **Claude Code in VS Code (Windows 11, PowerShell)**. Folder: `C:\Users\ahmed\OneDrive\Desktop\vela`. Claude Pro — hits session/weekly limits; when capped, wait or switch to lighter model via Auto mode.
- Also runs **BrandLab Qatar** (AI photo studio, brandlab-qa.vercel.app).
- Business partner in Qatar; sister (doctor) in Germany.
- Also consults a separate "strategist" Claude chat for business/market strategy.

## 2. WHAT VELA IS

**AI Business Operating System SaaS — WORLDWIDE, 30+ business types** (clinics, gyms, salons, real estate, restaurants, law firms, e-commerce, agencies, etc. — never "Gulf-only").

Core loop: business signs up → connects Instagram/WhatsApp/Website → Vela AI answers customers 24/7 → qualifies leads → books appointments → updates dashboard.

**Flagship feature: AI voice phone agent** — answers real inbound business calls, multilingual, trained on the business's knowledge via voice interview, books appointments autonomously.

## 3. LIVE INFRASTRUCTURE

| Thing | Value |
|---|---|
| Live site | https://vela-g8h4.vercel.app (also aliased to tryvela.com) |
| Health | https://vela-g8h4.vercel.app/api/health |
| GitHub | https://github.com/ahmedharrabiworks-sys/vela (branch: master) |
| Supabase | puyinskgvwycmrvkzgac (West EU Ireland) |
| Vercel | brandlab/vela-g8h4 (Claude Code deploys via `npx vercel deploy --prod`) |
| Stack | Next.js 14 App Router · TailwindCSS · Supabase (Postgres+RLS) · OpenAI GPT-4o · Vapi (voice) · ElevenLabs (TTS + Scribe transcription) · Vercel |

## 4. PRICING (FINALIZED JULY 21, 2026)

### Tiers

| | Starter $95/mo | Pro $295/mo ⭐ | Premium $595/mo | Custom from $1,500/mo |
|---|---|---|---|---|
| Voice minutes | 150 | 650 | 1,300 | Negotiated |
| Text messages | 500/mo | Unlimited | Unlimited | Unlimited |
| Channels | 1 (phone OR IG OR WA) | All 3 | All 3 + priority | All 3 + custom |
| AI Voice Phone Agent | ❌ | ✅ | ✅ | ✅ |
| Languages | 1 | Up to 5 | Unlimited | Unlimited |
| Websites | 0 | 1 + custom domain | 3 + custom domain | Unlimited |
| Multi-location | ❌ | 2 locations | Unlimited | Unlimited |
| CRM | View-only | Full + automation | Full + custom pipelines | Full + white-label |
| Team members | 1 | 3 | Unlimited | Unlimited |
| AI training | Single interview | Unlimited edits | Priority retraining | Dedicated tuning |
| Analytics | Basic | Full funnel | Full + exports | Full + white-label |
| Support | Email 48h | Priority 24h | Dedicated call + chat | Account manager + SLA |
| Onboarding | Self-serve | Self-serve + checklist | Done-for-you | White-glove + training |
| Overage (voice) | $0.28/min | $0.20/min | $0.17/min | $0.25/min |

### Custom tier à la carte add-ons
Base platform $150/mo, then: extra website $25/mo, extra 500 voice min $80/mo (or $0.25/min with 100-min minimum), extra location $50/mo, extra team member $10/mo, extra phone number $20/mo, priority support $80/mo, API access $150/mo, SSO/security review $200/mo.

### Rules
- **"Cancel anytime" ONLY. NEVER re-add money-back/refund language.**
- No free trial language on site — direction discussed (14-day card-required trial) but NOT built.
- Single source of truth: `src/lib/pricing.ts` — **MUST BE UPDATED to reflect the new $95/$295/$595 tiers.**
- The old $79/$159/$299 pricing is SUPERSEDED. Update `pricing.ts` + landing + /pricing page.
- Pro is positioned as the obvious choice (voice agent only turns on at Pro).

### Unit economics
- Voice: $0.12/min (Vapi + ElevenLabs TTS + Scribe + GPT-4o)
- Text: ~$0.003-0.005/message (GPT-4o tokens — negligible)
- Target margin: ≥70% on every tier
- Blended margin (20% Starter / 60% Pro / 15% Premium / 5% Custom): ~72-74%

## 5. WHAT'S BUILT & CURRENT STATE

### Working ✅
- **Full dashboard**: Dashboard, Conversations, Leads/CRM, Appointments, Channels, Train your AI, Website Builder, AI Agent, Analytics, Marketing, Settings — all real zero-states, no fake data (fake only in `/demo`)
- **AI Agent section**: two-agent switcher (Vela Assistant + Phone Agent), Overview with call stats, Training with live Business Knowledge panel, Voice with 10 voices (ElevenLabs), Phone Number tab, Calls & Appointments, Settings
- **AI Agent brain**: ElevenLabs Scribe v1 transcriber (Arabic-capable — NEVER use Deepgram for Arabic), `firstMessageMode: "assistant-speaks-first-with-model-generated-message"` (barge-in fix), centralized config in `src/lib/vapi-agent-config.ts`, `clampSpeed()` for ElevenLabs 0.7-1.2 range
- **Website Builder**: undergoing major architecture rebuild — see §12 Session Log for current phase status
- **Train Your AI**: Magic Import, PDF/image upload, interview mode via Vela assistant, completeness score, wired into `/api/ai/reply` + `/api/ai/assistant`
- **Vela AI assistant**: responds in user's language (Arabic confirmed working), product knowledge, typing indicator, quick actions
- **Settings**: rebuilt Linear-style (left nav: Business Info / AI Configuration / Notifications / Billing / Appearance)
- **Demo**: converted to shared-component pattern — Dashboard, AI Agent, Website Builder, Conversations, Leads, Appointments, Analytics, Marketing, Settings all have fixture data. Uses `src/lib/demo-data.ts`.
- **Dark mode**: neutral grey Lovable/Linear-style, landing page excluded
- **`websites` table**: created with proper schema, RLS, indexes. Per-site: chat, intake, versions, draft/published HTML, slug, domain fields, **and now `design_strategy` JSONB (added Phase 1 of Design Engine rebuild — see §12)**

### 🔴 BROKEN / NOT WORKING (carried forward from July 21, unless noted as fixed in §12)

1. **Custom domain architecture is FUNDAMENTALLY WRONG.** Current code adds customer domains as Vercel project aliases on the MAIN Vela app — so `ahmedharrabi.com` loads the Vela landing page instead of the customer's published site. Oussama must first clean up Vercel → Settings → Domains (remove all test domains except `vela-g8h4.vercel.app` and `tryvela.com`). Then the whole domain system must be rebuilt using **middleware-based routing** (hostname → lookup website by domain → rewrite to `/site/[slug]`), NOT the Vercel Domains API on the main project.

2. **Domain "Connected" badge is STILL fake** — has been "fixed" 4+ times and keeps regressing. Every line that sets `domainStatus` to `verified`/`connected` must be found via grep and killed except the one inside the explicit Check Status handler that confirms Vercel `verified && !misconfigured`.

3. **Publish panel Save button may not work** — slug input shows preview URL but clicking Save has no visible effect in some tests. Need to verify if the slug actually persists to the `websites` row.

4. **Pre-publish check says "Contact info present — No phone or email"** even when user provided both during intake. The check reads from somewhere that doesn't have the intake data.

5. **Marketing tools: "AI generation failed"** on all 3 (Social Media Posts, Video Script, Broadcast Message). Root cause unknown — likely the API route, missing KB data, or OpenAI issue. Need Vercel logs.

6. **Training questions still too long** — the tone-pass prompt was written but may not have landed. Questions should be max 10 words, no examples by default.

7. **Phone training: mute + end call buttons not visible** during active calls in Overview and Training.

8. **AI assistant on mobile** — the floating widget covers action buttons on smaller screens.

9. **Demo vs real app mismatches** — some pages still don't exactly match (appointments table shape, settings layout, user name/plan in sidebar, hero phone mockup too dark).

10. **Sites list in sidebar** — only shows "New Project", not named clickable rows of existing sites with ⋯ menu (rename/delete). Has been claimed done multiple times but never verified in production.

11. **Landing page hero phone mockup** — too dark for the bright theme.

12. **`pricing.ts` still has OLD pricing** ($79/$159/$299) — must be updated to $95/$295/$595 with the new feature-gating spec.

*(Note: the old #9 "website builder: user questions get no response" and #10/#11 "generated sites too dark / contact gap / placeholder data" items from the July 21 list are being superseded by the Design Engine rebuild in §12 — re-verify against the new component pool architecture rather than assuming the old bug descriptions still apply as-is.)*

## 6. HARD RULES (CUMULATIVE)

1. Every Claude Code prompt ends with "Then commit and push to GitHub."
2. **Mobile 375px + security are standing requirements** in every prompt.
3. **Real app NEVER shows fake numbers.** Fake data only in `/demo`.
4. **`npm run build` must pass 100% before commit** — Vercel is stricter than local.
5. PowerShell BOM corrupts env vars. Paste keys clean.
6. Claude Code CANNOT click web dashboards. SQL → give Oussama SQL. External accounts → Oussama does in browser.
7. **NEVER paste raw API keys in chat.**
8. **ONE SINGLE-FOCUS FIX PER PROMPT** (unless explicitly asked for a big combined prompt).
9. **Verify claimed fixes in production with REAL output, not predicted output.** Multiple times fixes were reported done but the bug persisted because verification was skipped or faked. Standalone scripts that replicate logic are acceptable when the real endpoint is auth-gated, but must use real API calls, not hand-written expected results.
10. **Get diagnostic evidence before guessing** — Vapi logs, Vercel function logs, console errors.
11. Design bar: nothing that "looks AI-generated." Reference sites: kellywearstler.com, aesop.com, linear.app, sothebysrealty.com, smileset.com, compass.com, studio-mcgee.com.
12. Brand accents: orange `#FF6B35`, rose `#FF3366`. No emojis in dashboard UI.
13. Automation is already built in-code — do NOT add n8n/Make.com/Lovable/Replit.
14. **When Claude Code adds a new Supabase column, ALWAYS provide the exact SQL** (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` + `NOTIFY pgrst, 'reload schema';`).
15. **Deepgram does NOT support Arabic.** Transcriber is ElevenLabs Scribe v1. Never switch back.
16. **Custom domains must NOT be added as Vercel project aliases** — use middleware-based routing instead.
17. **"Cancel anytime" only. NEVER re-add trial/free/money-back language** until a real Stripe trial is built with honest charge-date disclosure.
18. **Website Builder components/templates: NEVER fabricate trust signals** — no invented review counts, certifications, years in business, patient/client numbers, prices, or testimonial content. A component with no real supporting data is omitted, not filled with placeholders.
19. **Website Builder architecture: bounded AI choice, not free-form.** GPT proposes selections (hero variant, trust/conversion components, etc.) from a defined pool; the server always validates eligibility and enforces the final composition. Never let GPT invent layout/structure outside the enforced pool — this was the root cause of the original broken/generic output before the template-assembly rebuild.

## 7. ROADMAP (CURRENT ORDER)

### Website Builder — Design Engine Rebuild (active — see §12 for detailed phase status)
Phase 1 (Design Intelligence) — DONE. Phase 2a (Hero pool) — DONE. Phase 2b (Trust/Conversion pool) — DONE. Phase 2c (category showcase components) — DONE. Phase 2d (content components) — NEXT. Phase 2e (nav/footer) — not started. Phase 3 (design system formalization) — not started. Phase 4 (image engine rebuild) — not started, well-diagnosed (queries need category+section+subject, not location-based). Phase 5 (rich editor improvements, constrained first) — not started.

### Phase A — Fix what's broken (before non-Website-Builder new features)
1. Clean up Vercel domains (Oussama, browser)
2. Custom domain architecture rebuild (middleware-based routing)
3. Domain "Connected" badge — grep + kill every false-positive setter
4. Publish panel: Save button, slug persistence, contact-info check reading real intake data
5. Marketing tools: diagnose + fix "AI generation failed"
6. Training question tone: max 10 words, no examples by default
7. Phone training: mute + end call buttons visible during calls
8. Mobile: widget not covering buttons
9. Sites list: real names, clickable, ⋯ menu, survives New Project

### Phase B — Pricing + plan gating
10. Update `pricing.ts` to $95/$295/$595 with new feature spec
11. Simplify pricing page: 4-5 punchy lines per tier, "Compare all features" expandable, Custom card with "Talk to us"
12. Build real plan enforcement: usage tracking per tenant (messages, voice minutes), server-side limit checks on every API route, clean upgrade prompts when at cap
13. Stripe integration: subscription creation, webhook → plan written to tenant row, trial config if decided
14. Paddle evaluation (Tunisia-friendly Merchant of Record alternative)

### Phase C — Demo + landing polish
15. Demo remaining mismatches (appointments, settings, sidebar user, hero brightness)
16. Landing hero: Lindy-style animated product showcase (coded, not video)
17. Landing: remove 60s intro gate, salvage story as scroll section
18. Landing: kill any remaining trial/free language

### Phase D — Channels + go-live
19. Website widget (zero external accounts, proves the full loop)
20. Meta developer verification (Oussama — selfie issue to resolve)
21. WhatsApp via Meta Cloud API (NOT Twilio for messaging)
22. Phone: Oussama connects Twilio, wire inbound → agent → call logs
23. Resend account → real email verification + booking notification emails
24. Security round: rate limiting on `/api/ai/reply`, webhook signatures, remove token fallbacks, fix + run `migration_v5.sql` RLS

### Phase E — Launch
25. Custom domain (getvela.ai or similar)
26. E-commerce website type (future — dropped from active Design Engine scope, see §12)
27. Voice notes in training (future — audio recording + transcription)
28. Video for landing page (Screen Studio or Remotion — after product is stable)

## 8. ENV / KEYS

- Vercel prod (clean): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_APP_URL`, `UNSPLASH_ACCESS_KEY`, `VAPI_API_KEY`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `ELEVEN_LABS_API_KEY`, `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`
- Pending: `RESEND_API_KEY`, Stripe/Paddle keys, Meta app credentials
- Balances to watch: OpenAI (PAYG, auto-recharge OFF — turn ON before real traffic, cap $50-100), Vapi (PAYG, has run low during testing), ElevenLabs
- **TO ROTATE:** OpenAI key, Unsplash key, an image-gen/Google key (all exposed in chat at various points)

## 9. SUPABASE SCHEMA (KEY TABLES)

- `tenants`: id, owner_id, name, industry, city, phone, website, plan, created_at
- `tenant_config`: tenant_id, knowledge_base, website_html, website_slug, website_versions (legacy — per-site versions now on `websites` table), website_visit_count, website_custom_domain/status/records, assistant_settings, agent_settings
- `websites`: id, tenant_id, name, slug (unique), draft_html, draft_spec, published_html, published_spec, is_published, published_at, domain, domain_status, chat, intake, versions, **design_strategy (JSONB, added Phase 1 of Design Engine rebuild)**, created_at, updated_at — RLS owner-scoped
- `website_versions`: id, website_id (FK cascade), label, html, spec, created_at — RLS owner-scoped
- `leads`: id, tenant_id, name, email, phone, source, status, ip_hash, form_data, created_at
- `marketing_generations` + `webhook_logs`: defined in migration_v5.sql but **NOT RUN** (RLS is wide-open `USING(true)` — must scope to owner before running)

## 10. PROMPT TEMPLATE FOR CLAUDE CODE

```
[One line: what's verified working / what this fixes]
[N] fix(es) — ideally ONE. Read every relevant file before editing. Surgical.
Mobile 375px + security are standing requirements.

FIX 1 — [Name].
[Exact files, exact behavior, exact values, what NOT to touch, how to verify]

Run npm run build — must pass 100% clean. Deploy npx vercel deploy --prod,
confirm READY. Report what changed + any SQL I must run.
Then commit and push to GitHub.
```

## 11. START-OF-CHAT CHECKLIST

1. Read this file. Ask what happened since last session.
2. **BE BRIEF in chat.** Lead with the prompt, not analysis.
3. Check: is the last deploy READY? Hard-refreshed? Session-limit interrupted?
4. Check what's broken from §5 and what's next from §7/§12.
5. Give ONE focused prompt. End with what to report back.
6. If Claude Code's fix touches Supabase, always ask "does this need a new column?" and provide the SQL proactively.

---

## 12. SESSION LOG — WEBSITE BUILDER DESIGN ENGINE REBUILD (started July 24, 2026)

### Architecture decision (locked)
Moving from fixed templates toward a **component pool selected via a Design Intelligence layer**, with server-side enforcement of eligibility — never free-form AI layout invention. This is a deliberate extension of the existing hybrid template-assembly approach (GPT proposes, server enforces), not a departure from it. Phases:

- **Phase 1 — Design Intelligence Layer (DONE, commits `ee332bf`, `b68493b`):**
  `design_strategy` JSONB column on `websites` table. Every generation now computes category, subcategory, positioning, brand_personality, conversion_goal, visual_mood, target_audience via the existing gpt-4o-mini classifier call (merged into the same request — no added cost/latency). Verified via real API calls across 5 categories + confirmed DB round-trip (write/read, correctly typed JSONB not stringified). Category-precision bug fixed: bakery was misclassified as `ecommerce`, now correctly `other` (rule: ecommerce only for online cart/checkout businesses, not in-person service businesses).

- **Phase 2a — Hero Component Pool (DONE, commits `7666ff5`, `b285f9f`):**
  13 hero variants across real_estate (5: full-image, split, search-first, editorial, property-first), dental (3: trust-focused, booking-focused, clinical-premium), gym (3: cinematic-dark, membership-focused, energy-driven), interior_design (3: editorial shared with RE, portfolio-first, luxury-showcase). Selected via `selectHeroVariant()` — weighted scoring on brand_personality/conversion_goal/positioning, gated by real data availability (e.g. no pricing data blocks membership-focused; fewer than 2 real photos blocks portfolio-first), server-enforced via `verifyHeroVariant()` same pattern as `enforceTemplate()`. A real scoring bug was caught via actual API verification (not just claimed fixed): a duplicate `editorial` scoring rule caused it to wrongly beat `portfolio-first` for interior_design sites even when portfolio data was confirmed present — fixed and reverified.

- **Phase 2b — Trust + Conversion Component Pool (DONE, commits `222d95e`, `c894c7e`):**
  9 components: `comparison-table`, `agent-card`, `press-quote-band`, `trainer-showcase`, `trust-badges-band` (trust pool); `multi-step-form`, `appointment-form`, `valuation-form`, `membership-form` (conversion pool). Same pool + server-enforcement pattern as heroes. Absolute rule: never fabricate trust signals — a component is omitted entirely if real supporting data isn't present (no fallback needed here, unlike heroes which must always render something). Verified end-to-end with a real dental clinic test site through the actual OpenAI + Unsplash pipeline: `trust-badges-band` rendered 5 real numeric stats (18+ years, 12,000+ patients, 480+ reviews, board certification, award), `appointment-form` rendered the real 7-service list, contact info matched exactly — zero fabrication confirmed.

- **Phase 2c — Category-specific showcase components (DONE, commit `c7fa099`):**
  4 showcase components in a data-gated pool: `property-listings-grid` (real_estate — requires bedroom count + price/area signals), `treatment-gallery` (dental — no extract gate; post-GPT `verifyShowcaseComponents()` guards services array), `portfolio-grid` (interior_design — requires ≥2 completion verbs in description), `membership-plans-display` (gym — requires tier names + inclusion keywords). Showcase injected before trust/conversion so final order is showcase → trust → conversion → contact-block. Verified end-to-end via 8 real GPT+Unsplash tests (4 categories × with/without data): extract gates fired correctly on 7/8 cases; dental "sparse" case correctly reached `verifyShowcaseComponents()` and was suppressed there (services:[] from GPT). Zero fabrication across all 8 outputs.

- **Phase 2d — Content components — not started.** Gallery variants, testimonials, FAQ variants.

- **Phase 2e — Navigation/footer systems — not started.**

- **Phase 3 — Design system formalization — not started.** Typography scale, spacing, shadows, radius as enforced tokens rather than GPT-invented values.

- **Phase 4 — Image engine rebuild — not started, well-diagnosed.** Current queries lean on location/generic terms instead of category+section-purpose+subject (e.g. a Tunisia-based real estate site pulled Tunisian street-scene photos instead of villa/property photos). Fix direction: query construction driven by category + section slot + specific subject matter, using category-specific reference photos as the target aesthetic.

- **Phase 5 — Rich editor improvements — not started.** Decision made: constrained rich editor first (spacing/padding/borders/shadows/reorder-within-section, extending the existing floating text panel), NOT a Figma/Webflow-style freeform canvas. True freeform drag-and-drop is a explicitly deferred future initiative post-launch, not part of this rebuild.

### Known Gaps / TODOs (tracked, not yet resolved)

**TEST-01 — E2E test script duplicates production route logic (drift risk).**
`src/scripts/e2e-test.ts` reimplements the generation pipeline (classify, buildFillSystem, selectHeroVariant, selectTrustComponents, enforceTemplate) rather than calling the real `/api/website/generate` route, because that route requires an authenticated session unavailable to the test runner. Future route changes could silently drift from this test copy without being caught. TODO: once an automated-test auth strategy exists (test service account, CI bypass token, or session-mocking), migrate the script to call the real endpoint instead of duplicating logic.

**TEST-02 — No 375px mobile screenshot from a real end-to-end generated site.**
Phase 2b validation confirmed desktop rendering + trust/conversion data integrity through the real pipeline, but did not capture a real mobile screenshot of a fully generated site. TODO: a future validation pass should generate one complete website through the real pipeline and capture both desktop + 375px mobile screenshots, specifically checking responsive behavior of showcase-type sections (galleries, grids, listings) and image loading — not just the form/hero sections already covered in Phase 2a/2b.

**TEST-03 — Showcase grid mobile layout verified via CSS analysis, not rendered screenshot.**
Phase 2c's 375px/768px verification for property-listings-grid and portfolio-grid was done by reading the actual generated CSS breakpoints and container widths from real HTML output and calculating expected behavior — not by rendering the page in a browser and observing it directly. Math checked out (1-col at 375px via the 480px rule, 2-col at 768px, no overflow), but this is inferred, not visually confirmed. TODO: a future pass should actually render one of the saved `src/scripts/e2e-phase2c-*.html` files at both widths and screenshot the result.

**KNOWN-GAP — property-listings-grid featured variant never dispatches.**
`renderPropertyListingsGrid` supports a `featured-plus-grid` layout (one large feature card + smaller grid) but the showcase injection pipeline in `route.ts` always passes `variant: ""`, so every real_estate site gets the plain 3-col grid regardless of listing count. The CSS for the featured variant ships unused. TODO: wire variant selection into the showcase injection logic (similar to how hero variants are chosen) so listing count/positioning can pick between the two layouts.
