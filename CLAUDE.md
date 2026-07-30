# CLAUDE.md — VELA PROJECT MASTER CONTEXT
*Upload to the Vela Claude Project files. Every new chat: read this first, then continue exactly where we left off.*
*Last updated: July 31, 2026 (Phase A fully closed — 9/9 items ✅; Phase B item 10 pricing done, item 11 pricing page done — 33e8bc3, security Round 1 done — afc881f, security Round 2 done — 04caa1a, WhatsApp Meta Cloud API — 8f81949, Hard Rule 20 added, WhatsApp mocked-response test suite — 50/50 checks, **CRITICAL BUG FIXED: website chat widget broken for all new visitors since migration_v2 never ran in production — confirmed fixed, 16/16 E2E checks**, **Instagram DM reply loop + Page token fix — 557a576, 45/45 mock checks**, **AI Trainer 2.0 gaps closed — 698e272, 50/50 checks**, **Mission Control locked architecture added — §13, Hard Rules 21–22**, **Mission Control Phase 1 Step 1 done — code deployed dpl_9144QVsVSoMCP87N3w3k2rAK3ZTT, migration_v13.sql ⚠️ PENDING Oussama's run**)*

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
- **Phases execute one at a time, per explicit prompt.** Do not self-continue into the next phase after completing one — stop, report, wait for a new explicit prompt to start the next phase.

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
*(Phase A fully closed July 30, 2026 — items 1–7 struck below, items 8/10/12 previously struck, items 9/11 remain open as Phase C scope.)*

1. ~~**Custom domain architecture is FUNDAMENTALLY WRONG.** Current code adds customer domains as Vercel project aliases on the MAIN Vela app — so `ahmedharrabi.com` loads the Vela landing page instead of the customer's published site. Oussama must first clean up Vercel → Settings → Domains (remove all test domains except `vela-g8h4.vercel.app` and `tryvela.com`). Then the whole domain system must be rebuilt using **middleware-based routing** (hostname → lookup website by domain → rewrite to `/site/[slug]`), NOT the Vercel Domains API on the main project.~~ **FIXED** — Phase A items 1+2, commit `e28b284`. See §7.

2. ~~**Domain "Connected" badge is STILL fake** — has been "fixed" 4+ times and keeps regressing. Every line that sets `domainStatus` to `verified`/`connected` must be found via grep and killed except the one inside the explicit Check Status handler that confirms Vercel `verified && !misconfigured`.~~ **FIXED** — Phase A item 3, commit `c8286af`. See §7.

3. ~~**Publish panel Save button may not work** — slug input shows preview URL but clicking Save has no visible effect in some tests. Need to verify if the slug actually persists to the `websites` row.~~ **FIXED** — Phase A item 4, commit `cb26c70`. See §7.

4. ~~**Pre-publish check says "Contact info present — No phone or email"** even when user provided both during intake. The check reads from somewhere that doesn't have the intake data.~~ **FIXED** — Phase A item 4, commit `cb26c70`. See §7.

5. ~~**Marketing tools: "AI generation failed"** on all 3 (Social Media Posts, Video Script, Broadcast Message). Root cause unknown — likely the API route, missing KB data, or OpenAI issue. Need Vercel logs.~~ **FIXED** — Phase A item 5, commits `b223054` + `0a108a5`. See §7.

6. ~~**Training questions still too long** — the tone-pass prompt was written but may not have landed. Questions should be max 10 words, no examples by default.~~ **FIXED** — Phase A item 6, confirmed in `vapi-agent-config.ts:278`. See §7.

7. ~~**Phone training: mute + end call buttons not visible** during active calls in Overview and Training.~~ **FIXED** — Phase A item 7, commit `e3e6742`. See §7.

8. ~~**AI assistant on mobile** — the floating widget covers action buttons on smaller screens.~~ **FIXED & E2E VERIFIED** — see Phase A item 8 in §7.

9. **Demo vs real app mismatches** — some pages still don't exactly match (appointments table shape, settings layout, user name/plan in sidebar, hero phone mockup too dark).

10. ~~**Sites list in sidebar** — only shows "New Project", not named clickable rows.~~ **FIXED & E2E VERIFIED** — see Phase A item 9 in §7.

11. **Landing page hero phone mockup** — too dark for the bright theme.

12. ~~**`pricing.ts` still has OLD pricing** ($79/$159/$299)~~ — **FIXED** commit `0f2833f`. See Phase B item 10.

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
9. **Verify claimed fixes in production with REAL output, not predicted output.** Multiple times fixes were reported done but the bug persisted because verification was skipped or faked. Standalone scripts that replicate logic are acceptable when the real endpoint is auth-gated, but must use real API calls, not hand-written expected results. **Sub-rule: a migration file existing in the repo does NOT mean it ran in production.** Always confirm schema changes with a live diagnostic query before assuming the DB matches the file. (Lesson: migration_v2.sql existed since day one but was never run — website chat was broken for every new visitor until caught July 30, 2026.)
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
20. **Build against placeholder credentials until final integration day.** Every feature depending on an external API (Meta/Instagram/WhatsApp, Stripe/Paddle, Resend, etc.) must be built and fully tested using empty/placeholder env vars and mocked API responses — never blocked waiting on a real account, verification, or key. Missing env var → honest "Not connected" UI state, never a fake "connected" one. Test logic against mocked responses shaped like the real API's documented responses. Report clearly which env vars are still placeholder-only after each build. Endgame: one final integration pass at the end — swap every placeholder for a real value, verify each connection live, one at a time.
21. **Mission Control's access allowlist is hardcoded server-side, never database-driven.** If it lives in a database it can be modified via a SQL injection, a compromised admin route, or a supply-chain attack without touching deployed code. The allowlist must be a `const` in the source code — changing access requires a real code deployment. Re-checked on every request, not just at login. (See §13.)
22. **Every AI-employee personality/mood/confidence trait must derive from a named real signal, or the trait doesn't exist yet for that employee (stays Level 0 / Observed).** No decorative personality scores, no synthetic mood indicators, no simulated confidence levels. Each displayed trait must map to a real queryable fact in the database. A trait with no real signal is omitted entirely — not zero-padded, not hidden, not estimated. (See §13.)

## 7. ROADMAP (CURRENT ORDER)

### Website Builder — Design Engine Rebuild (active — see §12 for detailed phase status)
Phase 1 (Design Intelligence) — DONE. Phase 2a (Hero pool) — DONE. Phase 2b (Trust/Conversion pool) — DONE. Phase 2c (category showcase components) — DONE. Phase 2d (content components) — DONE. Phase 2e (nav/footer) — DONE. Phase 3 (design system formalization) — DONE. Phase 4 (image engine rebuild) — DONE. Phase 5a (section spacing controls) — DONE. Phase 5b (border/shadow/per-element spacing controls) — DONE.

### Phase A — Fix what's broken (before non-Website-Builder new features)
**E2E Playwright infrastructure** (added July 29, 2026): real browser tests running against production. Config in `playwright.config.ts`, specs in `e2e/`. Auth session (login once, reuse via `storageState`) in `e2e/.auth/user.json` (gitignored). Credentials in `.env.local` (gitignored). Test account: Pro plan, 2 sites. Mobile project uses Chromium+375px viewport (not WebKit — avoids browser install requirement). Run tests: `npx playwright test e2e/phase-a8-mobile-collision.spec.ts e2e/phase-a9-sites-list.spec.ts --reporter=list`. To re-bootstrap (e.g. after account expires): `npx playwright test --project=create-account e2e/create-test-account.spec.ts`.

1. ✅ Clean up Vercel domains (Oussama, browser) — done manually by Oussama
2. ✅ Custom domain architecture rebuild (middleware-based routing) — DONE commit `e28b284`. `middleware.ts` now queries Supabase PostgREST directly (`domain_status=eq.verified + is_published=eq.true`), 5-min in-memory cache, fallback `NextResponse.next()`. No Vercel Domains API calls (hard rule enforced). 24/24 checks via `e2e-test-domain-routing.ts`. **Item 3 (Connected badge) intentionally NOT touched — still open.**
3. ✅ Domain "Connected" badge — false-positive trap removed, commit `c8286af`. **Root cause:** `PUT /api/website/settings` had dead code that set `domain_status = "pending"` whenever `domain` appeared in the body — silently wiping "verified" on any settings save that included the domain field. No current frontend code triggered it, but it was a live regression trap. **Fix:** removed domain block + `DOMAIN_RE` from `settings/route.ts` entirely; added guard comments + type-level omission; domain is exclusively managed by `/api/website/domain` (POST/GET/DELETE). **Regression prevention:** guard comment + type omission in `settings/route.ts` body type make it structurally impossible for a future caller to accidentally reset status via this route. 34/34 checks via `e2e-test-phase-a3-domain-badge.ts` (exhaustive 13-route write-site audit, settings route static checks, domain/route.ts GET as sole "verified" path, frontend badge read-side check, live Supabase round-trip).
4. ✅ Publish panel — Save button + slug persistence + contact-info check, commit `cb26c70`. **Root causes:** (a) `handleSaveSettings` used `if (data.slug)` guard — if server returned null slug (edge case), `setSavedSlug` never fired, `isDirty` stayed true, Save appeared to do nothing. Fixed: `confirmedSlug = data.slug || siteSlug` always runs on success + green "✓ Saved" flash for 1.5s for explicit feedback. (b) `handleSwitchProject` response type omitted `intake` — after switching projects `contactInfo` reset to `{}` and intake from server state was silently discarded. Fixed: added `intake?: ContactInfo | null` to type + `if (data.intake) setContactInfo(data.intake)`. (c) `hasContactInfo` computed from global `tenant_config.website_intake` state, not the per-site spec. Fixed: `specHasContactInfo` useMemo reads spec sections in `draft_html` first (authoritative per-site source), falls back to `contactInfo` state. 27/27 checks via `e2e-test-phase-a4-publish-panel.ts`.
5. ✅ Marketing tools "AI generation failed" — commit `b223054`. **Root cause:** `.catch(() => null)` was chained directly on the unresolved Supabase query builder (`admin.from("marketing_generations").insert({...}).catch(() => null)`). Supabase JS v2 builders are thenable (`.then()` is defined) but do NOT expose `.catch()` as a standalone method on the unresolved builder. Calling `.catch()` on the builder immediately threw `TypeError: d.from(...).insert(...).catch is not a function`, which was caught by the surrounding OpenAI try/catch and returned as "AI generation failed" — even though generation had already succeeded. **Fix:** wrapped history insert in its own `try/catch` with `await`. DB failure logs a warning but NEVER prevents the generated content from reaching the user. **Regression prevention:** guard comment at the pattern; safe alternative documented. `generate/route.ts:2436` confirmed safe — uses `builder.then(noop).catch(noop)` which is the correct fire-and-forget pattern (`.then()` on a builder triggers execution and returns a real Promise; `.catch()` on that Promise is valid). **Note:** `marketing_generations` table confirmed to exist in Supabase. 17/17 checks via `e2e-test-phase-a5-marketing.ts`. **Latent bug (same pattern) subsequently fixed in commit `0a108a5`** — see below.
5b. ✅ Webhook logging latent bug closed — commit `0a108a5`. Same `.catch()-on-builder` pattern fixed in `webhooks/whatsapp/route.ts` and `webhooks/instagram/route.ts`. Both `webhook_logs` inserts wrapped in isolated try/catch with await. Logging failure logs a warning but never prevents the 200 ACK to Meta. Only the logging block was touched — payload parsing, tenant resolution, HMAC verification, and response logic are unchanged. Final sweep of all `src/app/api/` routes confirmed **zero remaining** dangerous `.catch()-on-unresolved-builder` instances. `webhook_logs` table absent (migration_v5.sql not yet run) — handled gracefully. 28/28 checks via `e2e-test-webhook-logging-fix.ts`.
6. ✅ Training interviews fixed — both surfaces, commit (see below). **Root causes (from Phase A6 audit):** (a) Phone training had a dead `prices` question at position 3 — its topic key `"prices"` was never in `RECORD_ANSWER_TOOL`'s enum, so prices were silently lost every phone training session. (b) `faqs` was in the enum but no question ever asked for FAQ content — the `faqs` progress row in the UI could never be filled. (c) Both interview surfaces (phone + chat) had no access to known business context, producing generic questions regardless of industry. **Fixes:** (1) `vapi-agent-config.ts` — merged prices into services question ("What services does your X offer, and what do they cost?"), added faqs question at position 6, exported `TrainingContext` interface, updated `buildTrainingSystem(savedLanguage?, ctx?)` to accept optional context for personalization + skip/confirm logic for already-known KB topics. (2) New `/api/ai-agent/training-context` endpoint — fetches tenant (name/industry/city) + parses `knowledge_base` into per-topic summaries; used by training page on load. (3) `training/page.tsx` — fetches training-context, passes to `buildTrainingSystem`. (4) `assistant/route.ts` — computes `ivSvcQ`/`ivCtxSection`/`ivExistingSection` from already-loaded `tenant` + `kb`, injects them into the interviewMode system prompt. Progress tracker (`filledCount / 7`) now correctly reaches 100% because all 7 topic keys are saveable. 69/69 checks via `e2e-test-phase-a6-training.ts`. **No SQL needed — no new Supabase columns.**
7. ✅ Overview "Talk to Vela" widget — ejection fix + redesign, commit `e3e6742`. **Root cause of ejection:** Vapi's server-side heartbeat disconnects the WebRTC call when the browser throttles it (tab hidden). The `visibilitychange` handler was NOT killing the call — it correctly re-synced mute on return. The ejection fires as an `error` event with `{"type":"ejected","msg":"Meeting has ended"}`. **Raw JSON bug root cause:** `toErrorText` checked `.message` but ejection payload uses `.msg` — fell through to `JSON.stringify(e)` and rendered raw object. **Fixes:** (1) `toErrorText` — added `.msg` top-level check, removed JSON.stringify fallback entirely (no raw JSON can ever reach UI now). (2) Error handler — detects `e?.type === "ejected"` and routes to `callStatus("ended")` with `wasEjected=true` instead of idle+error. (3) Widget redesign: 5-bar waveform (was 9 bars + squiggle wave SVG), volume-driven DOM-ref heights; live mm:ss timer in active controls row; mute button filled orange gradient when muted (clear toggle state); consistent 40×40px circle buttons idle/active; ejected ended state shows "Call dropped — tap to reconnect" + one-tap Reconnect button + Dismiss; normal ended state unchanged. Timer useEffect cleanup on unmount. `startCall` guard allows "ended" state for reconnect flow.
8. ✅ Mobile: VelaAssistant bubble collision — commit `a56418e`. **Root cause:** bubble had no awareness of bottom-sheet modals (PublishPanel on website builder, channel connection modals on channels page). **Fixes:** (1) New `src/lib/useBottomSheetState.ts` — module-level pub/sub singleton with `useSyncExternalStore`; no context/provider needed. (2) `website/page.tsx` — `useEffect` on `showPublishPanel` calls `setBottomSheetOpen`; import added. (3) `channels/page.tsx` — `useEffect` on `modal !== null` calls `setBottomSheetOpen`; import added. (4) `VelaAssistant.tsx` — bubble hides on mobile (`opacity-0 pointer-events-none`) when signal active + panel itself not open; desktop unaffected (`sm:opacity-100 sm:pointer-events-auto`); `transition-[transform,opacity]` for smooth fade. (5) Safe-area-inset: bubble + 3 toasts (channels, settings, ai-training) all use `bottom: max(24px, calc(env(safe-area-inset-bottom) + 16px))` instead of hardcoded `bottom-6`. (6) Z-index scale comment added to `globals.css`. **E2E VERIFIED** — `e2e/phase-a8-mobile-collision.spec.ts` (Playwright, Chromium 375×667): channels-modal collision test passes; Publish-panel collision test skips due to test-infrastructure limitation (on mobile the sidebar is hidden so the setup can't switch to a built site — the collision logic itself is identical for both surfaces, confirmed by the channels test). **The Website Builder site switcher is intentionally desktop-only** (sidebar `hidden md:flex`) — mobile site switching is a future UX enhancement, not an open bug.
9. ✅ Sites list: real names, clickable, ⋯ menu, survives New Project — **E2E VERIFIED** — `e2e/phase-a9-sites-list.spec.ts` (Playwright, Desktop Chrome 1280px): Tests A (≥2 named rows ✅), B (site switching ✅), C (rename persists to Supabase after reload ✅), D (New Project preserves all existing sites ✅) all pass. Test E (delete) skipped — **known test-suite limitation, not an app bug**: the test account is on Pro plan which caps at 2 websites; the delete flow itself works (the feature code is correct) but cannot be verified automatically without ≥3 sites. To run test E: either upgrade the test tenant to Premium in Supabase (`UPDATE tenants SET plan='premium' WHERE ...`) or create a Premium test account.

### Phase B — Pricing + plan gating
10. ✅ Pricing updated to $95/$295/$595 with real feature spec — commit `0f2833f`. **Root cause:** `pricing.ts` still had old $79/$159/$299; `plans.ts` had old prices + wrong website limits (Pro:2, Starter:1); `settings/page.tsx` had hardcoded ternary. **Single source of truth fix:** new `src/lib/plan-config.ts` (no "use client") exports `PLAN_CONFIG` — both `plans.ts` (client hook) and `generate/route.ts` (server route) import from it. `generate/route.ts` local `PLAN_WEBSITE_LIMITS` dict eliminated. `pricing.ts` updated: Starter $95/$76, Pro $295/$236, Premium $595/$476 (≈20% annual discount). Custom tier added (`isCustom:true`, filtered from 3-card grid on landing/pricing/signup, shown as wide "Talk to us" row). Settings billing price is now a PLAN_CONFIG dynamic lookup. EN locale features updated. **⚠️ GRANDFATHERING:** Pro website limit changed 2→1. Existing Pro tenants with 2 sites keep both (only new creation blocked). **⚠️ AR/FR/DE locale features are now stale** — feature strings still show old text in those languages, need translation update. **NEXT BLOCKER: Stripe integration requires API keys from Oussama** — both stripe routes are stubs (`return new Response('ok')`). No plan is enforced at payment level; any user can self-assign any plan in signup for free.
11. ✅ Pricing page simplified — commit `33e8bc3`. `highlightFeatures: string[]` added to `Plan` interface in `pricing.ts`; each tier has 4–5 punchy differentiators on the card (full `features[]` array preserved). `pricing/page.tsx`: cards now render only `highlightFeatures` (checkmark-only, no X). "Compare all features ↓" toggle (collapsed by default) expands a 13-row semantic `<table>` across all 4 tiers with Pro column highlighted in orange. Table wrapped in `overflow-x:auto` container with `min-w-[580px]` — scrollable on 375px mobile, zero page overflow.
12. ✅ **Build real plan enforcement — ALL 5 STEPS DONE.** Usage tracking per tenant (messages, voice minutes), server-side limit checks on every API route, clean upgrade prompts when at cap.
    - Step 1 ✅ (code-complete, SQL confirmed run) — `supabase/migration_v11.sql`: adds `tenant_id UUID` to `messages`, backfills from conversations join, adds `idx_messages_tenant_period` partial index.
    - Step 2 ✅ — commit `0ef2914`. Added `tenant_id: tenantId` to both `.insert()` calls in `ai/reply/route.ts` (user message ~line 149, assistant reply ~line 324). Verified via direct Supabase write: both rows stored correct `tenant_id` (PASS). Deployed `dpl_DY3QqJii8yCSiqUfJf9whcSwq6Lp` READY.
    - Step 3 ✅ — commit `8a22f91`. New `src/lib/usage.ts`: `getUsageSummary(admin, tenantId)` — queries `messages` COUNT (role=assistant, current UTC month, uses `idx_messages_tenant_period`) + `agent_calls` SUM(duration_seconds) → voice minutes. Enforcement in `ai/reply/route.ts` section ── 2 (before any OpenAI call): reads `PLAN_CONFIG[planId].textMessages`; skips entirely for Infinity plans; returns 429 `{ error, limitType, used, limit }` for Starter at/over 500. E2E verified 9/9: Starter@cap→429 ✅, Pro→200 ✅, Starter under cap→200 ✅. Deployed `dpl_GGPJ6Mt4VQhrFiarhNQgFeGapFgv` READY. Voice-minutes enforcement deferred (call-webhook fires post-call; Step 3 is text only per plan).
    - Step 4 ✅ — commit `12cbbd0`. New `src/app/api/stats/usage/route.ts` — same auth pattern as `stats/route.ts` (createSupabaseServerClient + ensureTenant); fetches plan separately (ensureTenant doesn't return plan); calls getUsageSummary; Infinity → null (JSON-safe unlimited signal); periodEnd = first moment of next UTC month. E2E verified 14/14: unauthenticated → 401 ✅, Pro plan → messages.limit=null, voiceMinutes.limit=650 ✅, no Infinity in JSON ✅, all shape fields present ✅. Deployed `dpl_5duyTiwEQP3rEDNd2HG8xf9mDzo9` READY.
    - Step 5 ✅ — commit `b817a4d`. Usage meters in Settings → Billing tab: fetches `/api/stats/usage` lazily on tab open; shows Messages + Voice minutes progress bars; orange bar at 90%+, red at 100%; green track + "Unlimited" text when limit=null (Pro/Premium/Custom). 90%+ inline warning banner (amber, with "upgrade to Pro" link); at-cap inline red banner + auto-opens `UsageCapModal` (exact Modal + icon + title + description + Cancel/Upgrade buttons pattern from `channels/page.tsx`). 375px safe — percentage-width bars, no hardcoded px widths. E2E verified 10/10 (e2e-phase-b12-step5-usage-ui.ts): A: under cap ✅, B: 90%+ ✅, C: at cap ✅, D: Pro null limits ✅, E: 375px safe ✅. Deployed `dpl_H1UXmFfXkGvo3Mzz4aiaRQBpZRsH` READY.
13. **[POSTPONED]** Stripe integration: subscription creation, webhook → plan written to tenant row, trial config if decided. Blocked on Oussama's Stripe API keys. Deferred until payment activation decision.
14. **[POSTPONED]** Paddle evaluation (Tunisia-friendly Merchant of Record alternative). Tied to Stripe/payment decision.

### Phase C — Demo + landing polish
15. Demo remaining mismatches (appointments, settings, sidebar user, hero brightness)
16. Landing hero: Lindy-style animated product showcase (coded, not video)
17. Landing: remove 60s intro gate, salvage story as scroll section
18. Landing: kill any remaining trial/free language

### Phase D — Channels + go-live
19. Website widget (zero external accounts, proves the full loop) — **underlying 500 bug confirmed fixed July 30, 2026** (migration_v2 columns + lead_id nullable, 16/16 E2E checks via `src/scripts/e2e-widget-hotfix-verify.ts`)
20. Meta developer verification (Oussama — selfie issue to resolve)
21. ✅ **WhatsApp Meta Cloud API — commit `8f81949`**: Full multi-tenant Embedded Signup v4 integration. Architecture: `whatsapp_accounts` table (UNIQUE on `phone_number_id` for webhook routing, owner-scoped RLS) + `whatsapp_waba_id` on `tenant_config`. `sendWhatsAppMessage()` helper (`src/lib/whatsapp-send.ts`) using Graph API v22.0. `/api/auth/whatsapp/callback` — code exchange → phone validation → WABA webhook subscription → DB writes (access token NEVER returned to client). `/api/webhooks/whatsapp` — GET challenge (fail-closed on `META_WHATSAPP_VERIFY_TOKEN`) + POST HMAC-SHA256 (fail-closed on `META_APP_SECRET`) + `phone_number_id` tenant routing + AI reply + send back. Channels page WhatsApp modal replaced: Twilio OTP flow removed, Embedded Signup v4 popup added (`window.FB.login`). No "Pending activation" language anywhere. Disconnect clears `whatsapp_accounts.is_active` + `whatsapp_waba_id`. **Twilio paths (`send-code`, `verify-code`, old webhook) are dead code — NOT deleted, NOT referenced from UI.** **✅ VERIFIED via mocked-response test suite** (`src/scripts/e2e-test-whatsapp-meta-mock.ts`, 50/50 checks): sendWhatsAppMessage() success+error paths, callback route fail-closed at steps 4/5/6 + happy path + partial-write audit, HMAC-SHA256 logic, webhook no-match routing, env var status, connected-state guarantee (0 tenants falsely connected). **⚠️ BLOCKED ON META APP REVIEW:** production customer WABAs require Business Verification + Advanced Access for `whatsapp_business_messaging` + `whatsapp_business_management` (~1-4 weeks). **⚠️ RUN IN SUPABASE SQL EDITOR:** `supabase/migration_v9.sql`. **⚠️ ADD TO VERCEL:** `META_WHATSAPP_VERIFY_TOKEN` (new — separate from Instagram's `META_WEBHOOK_VERIFY_TOKEN`), `NEXT_PUBLIC_META_APP_ID` (same value as `META_APP_ID`, needed for `FB.init`), `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID` (from Meta App dashboard after adding WhatsApp product + creating Embedded Signup config). **`META_APP_ID`/`META_APP_SECRET` confirmed shared between Instagram and WhatsApp.** Graph API v22.0 used throughout (v20.0 sunsets Sep 2026). **Env vars still PLACEHOLDER (all 5 WhatsApp-specific vars) — add to Vercel before going live for a real customer.**
22. ✅ **Instagram DM reply — commit `557a576`**: Full reply loop. Five gaps from audit all closed: (1) webhook now extracts `entry[].messaging[].sender.id + message.text`, calls `ai/reply` with `channel:"instagram"`, sends reply via `sendInstagramMessage()`. (2) `auth/instagram/callback` now stores the **Page Access Token** (`page.access_token` from `/me/accounts`) instead of the 60-min short-lived user token — variable renamed `shortLivedUserToken` to make intent clear. (3) New `instagram_page_id` column stored (FB Page ID required for `POST /{PAGE_ID}/messages`). (4) Graph API v19.0 → v22.0 throughout callback. (5) `pages_messaging` added to OAuth scope. New helper `src/lib/instagram-send.ts` — `POST https://graph.facebook.com/v22.0/{pageId}/messages`, `messaging_type:"RESPONSE"`, token never logged. **✅ VERIFIED via mocked-response test suite** (`src/scripts/e2e-test-instagram-meta-mock.ts`, 45/45 checks). **⚠️ RUN IN SUPABASE SQL EDITOR:** `supabase/migration_v12.sql` (adds `instagram_page_id TEXT DEFAULT ''` to `tenant_config`). **⚠️ BLOCKED ON META APP REVIEW:** `pages_messaging` permission requires Meta Business Verification + approval (~1-4 weeks). **⚠️ EXISTING CONNECTIONS:** Tenants who connected Instagram before this fix have a stale 60-min user token in `instagram_access_token` — they will see a log warning "Missing page credentials" until they reconnect via the Channels page. No data is lost; reconnecting overwrites with the correct Page token.
23. Phone: Oussama connects Twilio, wire inbound → agent → call logs
24. Resend account → real email verification + booking notification emails
25. ✅ **Security hardening Round 1 — commit `afc881f`** + **Round 2 — commit `04caa1a`**: (a) `/api/ai/reply`: 30 req/min per-tenant in-memory rate limiter + 2000-char input cap. **Limitation: in-memory resets on Vercel cold starts — durable store deferred post-launch.** (b) `/api/whatsapp/webhook`: Twilio HMAC-SHA1 sig verification via native crypto — fail closed. CORS wildcard + OPTIONS handler removed (server-to-server only). (c) `/api/webhooks/instagram`: fail closed if `META_WEBHOOK_VERIFY_TOKEN`/`META_APP_SECRET` absent. (d) `/api/ai-agent/call-webhook`: fail closed if `VAPI_WEBHOOK_SECRET` absent. (e) `supabase/migration_v8.sql` — owner-scoped RLS for `webhook_logs` (errored on `marketing_generations` in production — gap closed by `migration_v10.sql`, confirmed run July 30, 2026). (f) `supabase/schema.sql` — plan CHECK now includes `'custom'`. (g) Error disclosure sanitized in `calls/route.ts` + `phone/route.ts` (raw Supabase/Vapi messages go to server log only). (h) `signup/page.tsx` — auth errors normalized to generic message (email enumeration prevention). (i) Forgot-password full flow: inline modal on login page + `/auth/reset-password` page (expiry detection, password update, success redirect). **⚠️ ACTION REQUIRED before activating integrations:** add env vars to Vercel — `TWILIO_AUTH_TOKEN`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `VAPI_WEBHOOK_SECRET`. ~~**⚠️ RUN IN SUPABASE SQL EDITOR:** `supabase/migration_v8.sql`~~ **✅ webhook_logs done; marketing_generations gap closed by migration_v10.sql (July 30, 2026)**. **⚠️ RUN ALTER TABLE SQL** for plan CHECK constraint (get constraint name first — see §5). **NOTE: Reset email needs Resend** (Phase D item 23) — until then, Supabase built-in provider used. **Remaining deferred:** (1) durable rate-limit store; (2) ~~`webhooks/whatsapp/route.ts` Meta-DM sig verification~~ **DONE in commit `8f81949`** (HMAC-SHA256 via META_APP_SECRET, fail-closed); (3) `site_visits` RLS audit (Oussama manual check).

26. ✅ **AI Trainer 2.0 — commit `698e272`, 50/50 checks.** Closes all remaining gaps from the Phase A item 6 follow-up audit. Five fixes: **(1)** `save-call/route.ts` now accepts `toolCallKb` from the training page — injects into GPT prompt for services parsing; deterministically overrides `business.hours/address/bookingPolicy` post-extraction (no longer re-extracted from noisy speech-to-text); appends `businessType` + `special` to `kb.extra` with "Business type:" / "Unique selling point:" markers. **(2)** `training/page.tsx` now passes `toolCallKb` to `/api/ai-agent/save-call` — was previously only sent to the call log. **(3)** `training-context/route.ts` now regex-extracts businessType + special back out of `kb.extra` markers and populates `existingKb.businessType` / `existingKb.special` — skip/confirm logic now fires for all 7 topics on repeat interviews, not just 5. Markers are stripped before mapping to `existingKb.faqs` so FAQ display is clean. **(4)** `assistant/route.ts` chat interview expanded 5 → 7 steps: Step 1 "What does your business do?" + Step 7 "What makes you stand out?"; `[save_kb:...]` token now writes both with markers into `extra`; `ALREADY ON FILE` block shows businessType + special when present; `ivFaqsText` strips markers from extra before showing as "common questions"; pricing fixed $79/$159/$299 → $95/$295/$595 to match `pricing.ts`. **(5)** `ai-training/route.ts` merge strategy flipped existing-wins → new-wins (re-training now actually updates KB; extra appended not discarded). **No new SQL — no new columns.** **Future AI Trainer 3.0 ideas (tracked, not scheduled):** differential re-training (only surface empty/stale topics); individual service editing without full interview; parse `kb.faqs` as structured Q&A array from interview; KB staleness signal (>90 days nudge); multi-language KB.

### Mission Control — Phase 1 (active)
Step 1 ✅ — Schema instrumentation (code deployed, migration pending):
- `supabase/migration_v13.sql` created. **⚠️ PENDING: Oussama must run in Supabase SQL Editor.** Adds `knowledge_base_updated_at TIMESTAMPTZ DEFAULT NULL` to `tenant_config` + composite index `idx_agent_calls_tenant_period ON agent_calls(tenant_id, created_at)`. Note: §13 originally said `started_at` — corrected to `created_at` (the actual column name in `agent_calls`).
- `save-call/route.ts` + `ai-training/route.ts`: both KB write paths now set `knowledge_base_updated_at: new Date().toISOString()` in the same payload. Tone/language/website/channel settings writes confirmed NOT touched — 19/19 static checks (`e2e-test-mc-phase1-schema.mjs`).
- **After Oussama runs migration_v13.sql**, confirm with these SQL queries in Supabase SQL Editor:
  ```sql
  -- Column check:
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'tenant_config' AND column_name = 'knowledge_base_updated_at';

  -- Index check (should see idx_agent_calls_tenant_period):
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'agent_calls' ORDER BY indexname;

  -- EXPLAIN for Phase 1 aggregation (should use the composite index, not full scan):
  EXPLAIN SELECT tenant_id, SUM(duration_seconds)
  FROM agent_calls WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY tenant_id;
  ```

Step 2 (next) — Access control: hardcoded allowlist route, TOTP, audit log. This is a prerequisite before any MC data routes are exposed — see §13.

Step 3 (after) — Phase 1 data routes: Theoretical MRR, tenant roster, voice-minute margin, at-risk proxy, engagement signals, activity aggregation.

### Phase E — Launch
27. Custom domain (getvela.ai or similar)
28. E-commerce website type (future — dropped from active Design Engine scope, see §12)
29. Voice notes in training (future — audio recording + transcription)
30. Video for landing page (Screen Studio or Remotion — after product is stable)

## 8. ENV / KEYS

- Vercel prod (clean): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_APP_URL`, `UNSPLASH_ACCESS_KEY`, `VAPI_API_KEY`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `ELEVEN_LABS_API_KEY`, `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`
- Pending (add to Vercel before activating integrations): `RESEND_API_KEY`, Stripe/Paddle keys, `TWILIO_AUTH_TOKEN`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN` (Instagram), `META_APP_ID`, `VAPI_WEBHOOK_SECRET`, **`META_WHATSAPP_VERIFY_TOKEN`** (new, WhatsApp only), **`NEXT_PUBLIC_META_APP_ID`** (same value as META_APP_ID, public), **`NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID`** (from Meta dashboard)
- Balances to watch: OpenAI (PAYG, auto-recharge OFF — turn ON before real traffic, cap $50-100), Vapi (PAYG, has run low during testing), ElevenLabs
- **TO ROTATE:** OpenAI key, Unsplash key, an image-gen/Google key (all exposed in chat at various points)

## 9. SUPABASE SCHEMA (KEY TABLES)

- `tenants`: id, owner_id, name, industry, city, phone, website, plan, created_at
- `tenant_config`: tenant_id, knowledge_base, website_html, website_slug, website_versions (legacy — per-site versions now on `websites` table), website_visit_count, website_custom_domain/status/records, assistant_settings, agent_settings, instagram_connected, instagram_username, instagram_access_token (Page Access Token — non-expiring), instagram_business_id, **`instagram_page_id TEXT` (added by migration_v12.sql ⚠️ PENDING run)**, **`knowledge_base_updated_at TIMESTAMPTZ` (added by migration_v13.sql ⚠️ PENDING run)**
- `websites`: id, tenant_id, name, slug (unique), draft_html, draft_spec, published_html, published_spec, is_published, published_at, domain, domain_status, chat, intake, versions, **design_strategy (JSONB, added Phase 1 of Design Engine rebuild)**, created_at, updated_at — RLS owner-scoped
- `website_versions`: id, website_id (FK cascade), label, html, spec, created_at — RLS owner-scoped
- `leads`: id, tenant_id, name, email, phone, source, status, ip_hash, form_data, created_at
- `marketing_generations` + `webhook_logs`: created by migration_v5.sql (confirmed run in production). ✅ **RLS gap fully closed as of July 30, 2026** — `webhook_logs` owner-scoped by migration_v8.sql; `marketing_generations` owner-scoped by migration_v10.sql (v8 errored on this table in production, v10 completed the fix). Both tables now require `tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())`. All app routes use admin client (bypasses RLS) — this is defense-in-depth.
- `whatsapp_accounts`: id, tenant_id (FK→tenants CASCADE), waba_id, phone_number_id (UNIQUE), phone_number, display_name, access_token, token_acquired_at, is_active, created_at, updated_at — RLS owner-scoped. **⚠️ PENDING:** run `supabase/migration_v9.sql` in Supabase SQL Editor. Also adds `whatsapp_waba_id TEXT` to `tenant_config`.
- `messages`: id, conversation_id (FK→conversations CASCADE), role, content, created_at, **`tenant_id UUID` (FK→tenants CASCADE, added by migration_v11.sql)**. **⚠️ PENDING:** run `supabase/migration_v11.sql` in Supabase SQL Editor (adds column + backfill + enforcement index). RLS: `"messages_owner"` policy scopes via `conversation_id IN (SELECT c.id FROM conversations c JOIN tenants t ...)` — no conflict with new column.

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

- **Phase 2d — Content components (DONE, commit `339bc95` + gate fix commit):** Three content component additions: (1) Gallery variants — `selectGalleryVariant(strategy)` maps `brand_personality`/`visual_mood` → masonry | full-bleed-strip | uniform; patches gallery-grid variant in the template before GPT runs so `enforceTemplate` locks it in. (2) Testimonials — two new pool types: `testimonial-single-quote` (centered single quote, elegant/minimal_luxury brands) and `testimonial-grid` (2–3 card quotes, bold/energetic/trustworthy brands); detection via `/"[^"]{20,}"/.test(description)` (real quoted speech required); GPT must provide `sourceEvidence` (verbatim substring); `verifyContentComponents()` post-GPT backstop removes any section where sourceEvidence doesn't substring-match description; ABSOLUTE RULE #2 updated to clarify server-controlled injection. (3) FAQ two-column — `selectFaqVariant()` returns `"two-column"` for `real_estate | saas | legal` categories and `minimal_luxury | elegant` brand personalities; `faq-accordion` switch case now passes variant `v`; internal `renderFaqTwoColumn()` uses 2-col grid CSS. Verified via 5/5 real GPT+Unsplash pipeline tests: (A) real quote → selected + sourceEvidence verified; (B) marketing-speak → no testimonial; (C) luxury brand → masonry + single-quote; (D) legal → two-column FAQ selected; (E) bold/dark brand → full-bleed-strip gallery. KEY FINDING: `"other"` category removed from two-column FAQ list — too broad. **Gate correction (post-ship):** initial `selectTestimonialComponent` had `positioning === "premium"` as an independent OR condition, which meant GPT's classifier bias toward "premium" for professional services caused `testimonial-grid` to be nearly unreachable in production. Fixed to pure `bp`-based decision: `minimal_luxury | elegant` → single-quote; everything else → grid regardless of positioning. Confirmed `testimonial-grid` renders correctly at 375px via real HTML output (BeatBox Fitness test case): `repeat(auto-fill, minmax(280px,1fr))` collapses to 1-col at 375px, backed by explicit `@media(max-width:480px){grid-template-columns:1fr}`. Cards stack vertically, no overflow, left accent border intact. Also added `content ?? {}` null guard in `website-renderer.ts` render loop for robustness against GPT occasionally omitting the `content` key.

- **Phase 2e — Navigation/footer systems (DONE, commits `066aea8`, hamburger fix commit):**
  3 nav variants: `standard` (default sticky), `transparent` (glass over hero, becomes solid on scroll via JS scroll handler), `minimal` (logo + CTA only, no links). 3 footer variants: `standard` (token-based, fixed hardcoded `#080E1A` → `var(--footer-bg)`), `editorial` (large display brand name + tagline left, links/contact right — for real_estate/interior_design/elegant brands), `compact` (single-row bar — for saas). Selection: `selectNavVariant()` — transparent for real_estate/interior_design/gym-bold/cinematic visual_mood; minimal for saas+minimal_luxury. `selectFooterVariant()` — category takes priority over brand_personality (catches saas+minimal_luxury going to compact not editorial). navVariant/footerVariant added to WebsiteSpec; stamped on spec before renderWebsite; edit-path defaults to empty string. Priority bug caught during verification (saas+minimal_luxury was getting editorial footer — category gate moved before brand_personality gate). 5/5 selection + 9/9 HTML structure tests pass. **Mobile nav fix (post-ship):** confirmed pre-existing gap — `.ws-nav-links{display:none}` at ≤768px had NO toggle mechanism; links were permanently unreachable on mobile for all nav variants. Built full hamburger system: `NAV_BURGER` button (44×44px min tap target, `aria-expanded`, `onclick="wsNavToggle(this)"`), `wsNavToggle()` JS (closest `.ws-nav`, `.ws-nav--open` class toggle, auto-close on link tap), positioned dropdown (`position:absolute;top:100%`) that opens via `.ws-nav--open .ws-nav-links{display:flex}`, transparent nav dropdown forced to `var(--footer-bg,#0D1526)` dark background for white-link contrast. `renderNavMinimal` intentionally has NO burger (no links to show). Verified via `src/scripts/e2e-test-phase2e-mobile.ts` — 3/3 tests pass: Test A (Maison Prestige real_estate, real GPT pipeline, 22/22 checks), Test B (APEX gym, real GPT pipeline, 16/16 checks), Test C (nav-minimal direct render, 6/6 checks). Known gap: `saas+minimal_luxury` → `nav-minimal` path verified via direct render only (Test C) — production classifier may classify SaaS differently from test classifier, so this pairing is hard to trigger via real GPT pipeline (see TEST-01 expanded below).

- **Phase 3 — Design system formalization (DONE, commits `2b1cd03`, `0c94db9`):**
  All changes are additive — existing component output is visually identical; the token system is now the authority for future edits.
  (1) **Type scale tokens**: `--fs-display` (clamp 3–8rem display), `--fs-hero-xl` (clamp 2.5–4rem hero headline), `--fs-h2` (clamp 1.75–2.5rem section heading), `--fs-h3` (clamp 1.15–1.5rem subsection), `--fs-body` (1rem), `--fs-small` (0.875rem), `--fs-eyebrow` (0.75rem) — all defined in `:root` of `buildCss()`. `.ws-eyebrow`, `.ws-heading`, `.ws-stat-label` font-size wired to their respective tokens (first component mappings; remaining components carry current hardcoded values until a future pass).
  (2) **Spacing scale tokens**: `--sp-xs:8px`, `--sp-sm:16px`, `--sp-md:24px`, `--sp-lg:32px`, `--sp-xl:48px`, `--sp-2xl:64px`, `--sp-3xl:96px` — defined in `:root`. **All exact-match values wired**: 28 zero-visual-change replacements across grid/flex layout containers — covers feat-row, feat-numbered, feat-bento, svc-cards, svc-two-col, product-grid, integration-grid, treat-grid, port-grid, port-masonry, prop-grid, prop-featured-grid, mpdisplay-grid, tgrid, faq-two-col, test-grid, trainer-grid, tbadges, agent-card, msf-progress, mem-tiers, footer-inner, footer-ed-right, footer-ed-inner (margin), booking-inner, stats-inner, steps, contact-details, contact-inline-row, bullet. Off-scale values (40/56/72/80px) are intentional component-internal rhythm spacings left as-is.
  (3) **Color bug fixes**: `.ws-stat-label{color:#9CA3AF}` → `var(--color-muted)` (only rogue non-token muted color in `buildCss()`); `.ws-trainer-avatar`, `.ws-fb-ok-icon`, `.ws-msf-step--on .ws-msf-dot` all had `color:#fff` on accent backgrounds — replaced with `color:var(--accent-fg)` (correct for themes where accentFg is dark, e.g. fitness preset's #E8FF3A).
  (4) **Radius bug fixes**: Phase 2b/2c components had 8/10/12/16px hardcoded border-radius — all replaced with `var(--radius)` or `var(--radius-lg)` as appropriate: `ws-agent-photo`, `ws-trainer-card`, `ws-tbadge`, `ws-fb`, `ws-form-input`, `ws-mem-tier`, `ws-mpdisplay-card`, `ws-price-table-th--hi`. Semantic exceptions preserved: `ws-fb-err` (6px error state) and pill buttons (`100px`) — both intentional, not radius-token candidates.
  (5) **FIX 4 (enforcement) — ✅ fully server-enforced**: `coerceDesignDNA` in `route.ts` now drops `bg`/`text`/`muted` from GPT entirely — always uses `MOOD_DEFAULT_DNA[mood].palette`. `accent` validated server-side against `APPROVED_ACCENTS` (28-value set matching Part 5 of `buildFillSystem`): any hex not in that set (including user-requested colors like "hot pink") is silently replaced with the mood's default accent. Uppercase-normalized before lookup. GPT's `bg`/`text`/`muted` fields are now structurally unreachable — palette is fully deterministic per mood. The brand-color allowance from the system prompt is preserved (GPT is told to pick the closest approved value from the table; `coerceDesignDNA` now also validates that it actually did).
  **Full audit findings** (all documented, none surprising): `#F59E0B` stars amber, `#1A1A1A` search-bar input, `#fff`/rgba-white on dark overlays (hero, footer, CTA, press-quote-band, featured overlays, transparent nav), `#e05`/`#DC2626` error states — all intentional, cannot be tokenized. `body{font-size:16px}` is the architectural root baseline. No rogue `box-shadow` values outside intentional use.
  **Verification**: `e2e-test-phase3.ts` — 71/71 checks (token defs, spacing wires, type wires, color/radius fixes, intentional exceptions, Phase 2e hamburger regression, multi-preset rendering, **enforcement: hot pink → rejected, approved accent → passed, lowercase normalized, all 28 approved accents pass**). Phase 2e real-pipeline regression: 3/3 tests, 44/44 checks.

- **Phase 4 — Image engine rebuild (DONE):** Root cause was city/businessType concatenation in `ensureImageQueries` and `[business type] [city or region]` formula in both Part 7 GPT instruction blocks — causing Unsplash to return location street-scene photos instead of business-subject photos. Fixed across all 14 query construction sites:
  - `PRESET_HERO_SUFFIX` / `PRESET_ABOUT_SUFFIX` → replaced with `HERO_PHOTO_QUERY` / `ABOUT_PHOTO_QUERY` (15-key dicts, subject-first full queries, no city prefix, cover all v2 category keys)
  - Hero + about-story construction: now uses dict directly (`HERO_PHOTO_QUERY[rawCategory] ?? HERO_PHOTO_QUERY[preset]`), zero `locationCtx`/`businessType` in the string
  - Gallery fallback: removed 12 `${businessType}` prefix strings → uses `PRESET_GALLERY_QUERIES[preset]`
  - Listings-grid / product-grid / feature-showcase fallbacks: removed `${businessType}` prefix + numbered suffix → use `PRESET_GALLERY_QUERIES[preset]` pool cycling
  - property-listings-grid: removed `locCtx` (city) → uses `PROPERTY_LISTING_QUERIES` (6 varied property subjects)
  - portfolio-grid: removed `locCtx` (city) → uses `PORTFOLIO_GRID_QUERIES` (6 varied interior design subjects)
  - treatment-gallery: removed numbered suffix → uses `TREATMENT_QUERIES` (6 varied dental subjects)
  - Auto-injected gallery: removed `${businessType}` prefix strings, headline changed from `${businessType} in Focus` → `"Our Gallery"`
  - Part 7 v1 + v2: formula changed from `[business type] [city or region]` to `[VISUAL SUBJECT] [AESTHETIC/MOOD] [QUALITY SUFFIX]`; all city-name examples (Tunisia, Dubai, Paris, London) removed; ABSOLUTE RULE against city/country/region names added with per-category subject examples
  **Verification**: `e2e-test-phase4.ts` — 38/38 checks (static: dicts, Part 7 text, structural). `e2e-test-phase4-real.ts` — 8/8 checks (real gpt-4o pipeline, two city-named businesses). GPT-produced queries:
    - Dental clinic in Casablanca → `"dental treatment room bright white clean minimal professional photography"` (no city ✅)
    - Real estate in Marrakech → `"luxury villa exterior pool architecture daylight editorial minimal"` + `"real estate agent modern office interior bright professional photography"` (no city ✅)
  **Real-pipeline compliance gap: CLOSED.** GPT precisely followed the new VISUAL SUBJECT formula and ABSOLUTE RULE against city names on the first real run with city-named businesses.

- **Phase 5a — Section spacing controls (DONE, commit `25b959d`):** Added preset section padding top/bottom controls to the existing floating text-edit panel. 5 presets per axis: — (none) / S (16px) / M (32px) / L (48px) / XL (64px) — tied to Phase 3 `--sp-sm` / `--sp-lg` / `--sp-xl` / `--sp-2xl` tokens. Persists via `spec._sectionSpacing` (new `WebsiteSpec` field in `website-renderer.ts`), same 800ms debounced `handleSaveEdit` save as text styles. Re-applied on edit mode re-entry. Real-time preview: iframe spacing updates instantly on button click. `—` resets to CSS default (removes inline style). New postMessage type `vela-spacing` wired in parent `useEffect` handler. Build 100% clean. Deferred: borders, shadows, per-element spacing, drag/freeform (Phase 5b+).
  **Verification** (`e2e-test-phase5a.ts` — 36/36 checks):
  - Check 1 (panel DOM): All 15 EDIT_SCRIPT strings confirmed — `psp()`, `SP_VALS`/`SP_LBLS`, `topGrp`/`botGrp`, divider, `show()` reads and setActive calls, top/bot button click handlers, `_sectionSpacing` re-apply block.
  - Check 1b (parent handler): `vela-spacing` case present; extracts `sectionIndex`/`paddingTop`/`paddingBottom`; writes `_sectionSpacing`; 800ms debounce; deletes key when both empty.
  - Check 2 (spec round-trip): `renderWebsite(spec, imageMap)` with `_sectionSpacing: {"0": {paddingTop:"48px", paddingBottom:"32px"}, "1": {paddingTop:"64px"}}` — `extractSpec` recovered exact values from HTML comment. Actual output: `{"0":{"paddingTop":"48px","paddingBottom":"32px"},"1":{"paddingTop":"64px"}}`. `_textStyles` preserved (no clobber). HTML saved to `test-output-phase5a/test-site-with-spacing.html`.
  - Check 3 (375px): Only `paddingTop`/`paddingBottom` applied (no `paddingLeft`/`paddingRight` — zero horizontal overflow risk). Panel clamped to `window.innerWidth-8`. No inline width overrides on `[data-vs]` sections. Max preset value 64px (no extreme values).

- **Phase 5b — Border, shadow, per-element spacing controls (DONE, commit `7fbe4e0`):**
  Three additive fixes to the constrained rich editor, same architecture as 5a.
  FIX 1 — Section border controls: Border width (—/1px/2px) × solid style × color picker (`bdrClrInp`). Stores as `_sectionBorders[si] = { border }` (computed CSS shorthand). Color is read from spec on panel open (not from `secEl.style.border`) to avoid browser normalization. Reset clears width + reverts color to `#374151`. New `vela-border` postMessage; parent handler writes to `_sectionBorders` with 800ms debounce.
  FIX 2 — Section shadow controls: 4 presets (—/Low/Med/High) mapped to fixed `box-shadow` values (`SHADOW_VALS`). Stores as `_sectionShadows[si] = { boxShadow }`. Shadow values read from spec on panel open (not from element's computed style). New `vela-shadow` postMessage.
  FIX 3 — Per-element spacing: El ↑ / El ↓ buttons (same SP_VALS as 5a) — appear only when a heading (headline/subheadline/eyebrow) or CTA (ctaPrimary/ctaSecondary/ctaText) element is selected. Stores in `_sectionSpacing` using `"si_type"` keys (e.g. `"0_heading"`, `"0_cta"`) to avoid collision with section-level keys (pure numeric `"0"`, `"1"`, etc.). New `vela-el-spacing` postMessage. Re-apply block detects element-level keys via `key.indexOf('_') !== -1`, then selects matching `[data-ve-f]` elements and applies marginTop/Bottom.
  Panel CSS: `max-height:80vh;overflow-y:auto` added — panel now scrollable when viewport is short.
  WebsiteSpec type updated: `_sectionSpacing` extended with `marginTop?/marginBottom?`, `_sectionBorders` and `_sectionShadows` added.
  **Verification** (`e2e-test-phase5b.ts` — 68/68 checks):
  - Check 1 (EDIT_SCRIPT DOM/state/functions): 33 checks — all DOM groups, state vars, helper functions, show() reads, button wiring, re-apply blocks confirmed present.
  - Check 1b (parent handlers): 13 checks — vela-border, vela-shadow, vela-el-spacing handlers exist with correct field writes and 800ms debounce.
  - Check 2 (round-trip): 12 checks via real `renderWebsite` — actual output: `_sectionBorders: {"0":{"border":"1px solid #374151"}}`, `_sectionShadows: {"1":{"boxShadow":"0 4px 16px rgba(0,0,0,.12)"}}`, `_sectionSpacing: {"0":{"paddingTop":"48px","paddingBottom":"32px"},"0_heading":{"marginTop":"16px","marginBottom":"8px"},"0_cta":{"marginTop":"24px"}}`. Phase 5a spacing regression confirmed.
  - Check 3 (375px): 5 checks — border uses shorthand (no left/right independently), box-shadow x-offsets all 0 (no horizontal bleed), element spacing sets marginTop/Bottom only.
  - Check 4 (5a regression): 5 checks — section spacing controls unchanged.
  Next candidates (Phase 5c, if needed): section reordering enhancements. NOT freeform drag-and-drop — explicitly deferred post-launch forever.

### Known Gaps / TODOs (tracked, not yet resolved)

**TEST-01 — E2E test scripts duplicate production route logic (drift risk).**
`src/scripts/e2e-test-phase2c.ts` and `e2e-test-phase2d.ts` reimplement the generation pipeline (classify, buildFillSystem, selectHeroVariant, selectTrustComponents, enforceTemplate, pool selection functions) rather than calling the real `/api/website/generate` route, because that route requires an authenticated session unavailable to the test runner. Future route changes could silently drift from these test copies without being caught. TODO: once an automated-test auth strategy exists (test service account, CI bypass token, or session-mocking), migrate scripts to call the real endpoint instead of duplicating logic. `e2e-test-phase4-real.ts` follows the same pattern — it reconstructs a representative system prompt (Part 7 text hardcoded) rather than calling the real `buildFillSystem` directly, for the same auth-wall reason.

**TEST-02 — No 375px mobile screenshot from a real end-to-end generated site.**
Phase 2b validation confirmed desktop rendering + trust/conversion data integrity through the real pipeline, but did not capture a real mobile screenshot of a fully generated site. TODO: a future validation pass should generate one complete website through the real pipeline and capture both desktop + 375px mobile screenshots, specifically checking responsive behavior of showcase-type sections (galleries, grids, listings) and image loading — not just the form/hero sections already covered in Phase 2a/2b.

**TEST-03 — Showcase grid mobile layout verified via CSS analysis, not rendered screenshot.**
Phase 2c's 375px/768px verification for property-listings-grid and portfolio-grid was done by reading the actual generated CSS breakpoints and container widths from real HTML output and calculating expected behavior — not by rendering the page in a browser and observing it directly. Math checked out (1-col at 375px via the 480px rule, 2-col at 768px, no overflow), but this is inferred, not visually confirmed. TODO: a future pass should actually render one of the saved `src/scripts/e2e-phase2c-*.html` files at both widths and screenshot the result.

**KNOWN-GAP — property-listings-grid featured variant never dispatches.**
`renderPropertyListingsGrid` supports a `featured-plus-grid` layout (one large feature card + smaller grid) but the showcase injection pipeline in `route.ts` always passes `variant: ""`, so every real_estate site gets the plain 3-col grid regardless of listing count. The CSS for the featured variant ships unused. TODO: wire variant selection into the showcase injection logic (similar to how hero variants are chosen) so listing count/positioning can pick between the two layouts.

**TEST-01 expanded — saas+minimal_luxury (nav-minimal) hard to trigger via real pipeline.**
The test classifier in `e2e-test-phase2e-mobile.ts` is a simplified prompt that diverges from the production classifier in `route.ts`. Attempts to get `category=saas` for a SaaS business description failed (returned `other`), so the `nav-minimal` variant path was only verified via direct render (Test C in `e2e-test-phase2e-mobile.ts`), not through a real GPT classify→generate pipeline. To fully verify: would need to either (a) use a real authenticated session to call `/api/website/generate` with a SaaS business, or (b) confirm the production classifier returns `saas` for a known SaaS description by inspecting Vercel logs during a real generation.

---

## 13. MISSION CONTROL — LOCKED ARCHITECTURE (Owner Operating System)

*Architecture decisions locked in design discussion. Implementation begins with Phase 1 schema additions. This section is a decision record — not a feature spec to be reinterpreted.*

---

### Core Philosophy

Mission Control is an **operating system**, not a dashboard. The dashboard is one renderer of it. The distinction matters: an OS has persistent state, autonomous actors, authority boundaries, and a chain of escalation. A dashboard only reads and displays.

**The hard real-signal rule** (also Hard Rule 22): every personality/mood/confidence trait attributed to an AI employee must derive from a named, queryable real signal in the database. If no real signal exists for a trait, the trait does not exist yet for that employee — it stays Level 0 / Observed. No synthetic indicators. No decorative numbers. No simulated activity.

**UI claim discipline**: every number, status badge, trend line, or health score rendered in Mission Control must map to a real queryable fact. Fake zeros are not acceptable (a zero count is only shown when a real query returned zero rows). Decorative metrics that fill space are not acceptable. If the data doesn't exist yet, the section shows an honest empty/pending state.

Built in three sequential phases, not one v1:
- Phase 1 — Financial/Customer/Activity Data Layer (real data foundation, no AI employees yet)
- Phase 2 — AI-Employee Layer (autonomous actors on top of the Phase 1 data layer)
- Phase 3 — Security Agent (active adversarial probing, separate larger effort)

---

### Access Control *(built before any Phase 1 route ships)*

Access control is a prerequisite — no Phase 1 route is exposed until this is in place.

**Allowlist model** (also Hard Rule 21):
- A `const ALLOWED_EMAILS: string[]` hardcoded in the server-side route file — never a database table, never a Supabase row, never an env var that can be changed without a deploy.
- On every authenticated request to any `/mission-control/*` route: check `ALLOWED_EMAILS.includes(session.user.email)`. If not matched: call `supabase.auth.signOut()` immediately and return 401. No exceptions, no grace period.
- Allowlist is re-checked on **every request**, not only at login. A session cookie that was valid at login does not persist access if the allowlist changes in a new deploy.

**Isolation**:
- Runs on an isolated subdomain (e.g. `ctrl.tryvela.com`) or a deeply nested path with its own middleware guard — never co-mingled with tenant-facing routes at the routing level.
- Dedicated cookie key/prefix (e.g. `mc_session_`) so mission control session state is never shared with or overwriteable by the main app session.

**TOTP**:
- A genuine second factor — not a PIN, not a magic link, not a "remember this device" flow.
- TOTP seed generated on first setup, stored encrypted, never exposed again.
- Every login requires: email/password → 6-digit TOTP code → allowlist check. All three must pass.

**Audit log** — append-only, no UPDATE or DELETE permitted:
```sql
CREATE TABLE mission_control_access_log (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT NOT NULL,
  action        TEXT NOT NULL,  -- 'login_attempt' | 'login_success' | 'login_failure' | 'request' | 'signout'
  success       BOOLEAN NOT NULL,
  ip_hash       TEXT,            -- SHA-256 of client IP — never raw IP stored
  user_agent_hash TEXT,
  path          TEXT,            -- route accessed
  accessed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- No RLS policy that permits UPDATE or DELETE — append-only enforced at DB level
-- No tenant_id column — this table is outside the tenant data model entirely
```

---

### Phase 1 — Financial / Customer / Activity Data Layer

Phase 1 is purely a **data layer** — no AI employees, no autonomous actions, no task chains. It establishes the honest signal foundation that Phase 2 employees will read from. Every section either queries real data or shows an honest empty state.

**Labeling discipline (hard rules for Phase 1 UI):**
- Revenue figures are always labeled **"Theoretical MRR"** — never "MRR" or "Revenue." Theoretical = plan price × active tenants, before any real payment integration. Once Stripe/Paddle is live, a separate "Actual MRR" figure appears alongside it; theoretical is never silently replaced.
- Churn-risk segmentation uses **"At-Risk"** (behavioral proxy — e.g. no login in N days, KB never trained) and **"Churned"** (account explicitly cancelled or plan downgraded to none) as distinct labeled states. Never conflate behavioral proxies with confirmed churn.
- **"Currently online" users** cannot be tracked with real-time presence in the current infrastructure. The honest proxy is **"active within the last N minutes"** (based on `last_sign_in_at` or a session-update timestamp) — always labeled as such, never displayed as literal real-time presence.

**Phase 1 data sections and their sources:**

| Section | Signal source | Blocked until |
|---|---|---|
| **Tenant roster** | `tenants` table — name, plan, city, industry, created_at | Nothing — always queryable |
| **Plan breakdown** | `tenants.plan` grouped count | Nothing |
| **Theoretical MRR** | `PLAN_CONFIG[plan].price × count(tenants)` by plan tier, summed | Always shown as "Theoretical" until Stripe live |
| **Voice-minute margin** | `agent_calls.duration_seconds` SUM → minutes; margin = (plan voice allowance − used minutes) × $0.12/min cost | Requires `agent_calls` composite index (see schema additions) |
| **Billing section** | Actual revenue, payment failures, subscription events | **Blocked** — shows "Billing data unavailable until Stripe/Paddle is connected" — never fake zeros |
| **Engagement signals** | `agent_calls` count + `messages` count + `knowledge_base_updated_at` per tenant | Requires `knowledge_base_updated_at` column (see schema additions) |
| **Activity aggregation** | Total calls, messages, leads, appointments across all tenants by day/week | `agent_calls`, `messages`, `leads`, `appointments` tables — real counts only |
| **Activity drill-down** | Per-tenant detail view — same tables, filtered by `tenant_id` | Same |
| **At-risk proxy** | Tenants matching: no login in 14+ days OR KB never trained (`knowledge_base_updated_at IS NULL`) OR zero agent calls in 30 days — always labeled "At-Risk (behavioral)" | Requires `knowledge_base_updated_at` column |

**Usage-analytics and pattern-detection**: When Phase 2 Analytics + Insights detects a behavioral pattern (e.g. usage spike, churn-risk signal, anomalous call volume), the resulting proposed action flows through the existing **Level-1/Level-2 approval mechanism** — it enters the approval queue as a Draft (Level 1) or Proposal (Level 2), never auto-executed. There is no separate approval path for analytics-derived actions; the same autonomy ceiling and task-chain model that governs all employees applies here.

**Schema additions required for Phase 1** (run as `migration_v13.sql` before any Phase 1 route ships):
```sql
-- 1. Track when a tenant's KB was last trained (at-risk proxy signal)
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS knowledge_base_updated_at TIMESTAMPTZ;

-- 2. Composite index on agent_calls for efficient voice-minute aggregation.
-- Column is `created_at` (NOT `started_at` — agent_calls has no started_at column;
-- original §13 draft had an error; migration_v13.sql uses the correct column).
CREATE INDEX IF NOT EXISTS idx_agent_calls_tenant_period
  ON agent_calls (tenant_id, created_at);

NOTIFY pgrst, 'reload schema';
```

`knowledge_base_updated_at` is written by `save-call/route.ts` and `ai-training/route.ts` whenever a successful KB save occurs — both routes already have the admin client write path, so this is a one-line addition to each.

---

### Phase 2 — AI-Employee Layer

Phase 2 builds on Phase 1's data foundation. Employees read from Phase 1 signals; they cannot hallucinate signals that don't exist. Implementation is a separate larger effort — this section records the locked architecture decisions.

**v1 Employee roster (7 employees):**

| Employee | Primary scope | Honest caveat |
|---|---|---|
| **Website** | Website Builder — generate, publish, monitor visits | Can generate and publish; cannot autonomously update a live published site without owner approval |
| **Trainer** | AI knowledge base — detect staleness, suggest re-training | Can read KB and signal staleness; cannot trigger a training call autonomously; KB write requires owner confirmation |
| **Phone Agent** | Voice calls — monitor call quality, flag anomalies | Signal quality depends entirely on `agent_calls` data being present; Level 0 until real call history exists |
| **Analytics + Insights** | Cross-tenant and per-tenant signal aggregation, trend detection | Read-only signal extraction; no predictive or prescriptive capability in v1 |
| **Conversations** | Inbox / channel health — unanswered threads, channel connectivity | Level 0 until conversations table has real data; cannot send messages autonomously in v1 |
| **Support Agent** | Customer support ticket triage, response drafting | Requires new `support_tickets` table + inbound email infra — a separate larger effort; does not wrap an existing system |
| **DevOps Agent** | Build health, runtime error monitoring, regression and correctness detection | Distinct from Security Agent (Security = adversarial probing; DevOps = availability/correctness) — also a separate larger effort; does not wrap an existing system |

Of the 7 employees, **5 wrap existing Vela systems** (Website, Trainer, Phone Agent, Analytics + Insights, Conversations). **Support Agent and DevOps Agent are new-capability builds** — they require new infrastructure before any Phase 2 work can begin on them and are sized as their own larger efforts, not cheap additions to Phase 2.

**Psychology and behavioral learning** are NOT a separate employee. The Shared Operational KB — scoped by department, confidence-stamped, TTL-decaying — handles this role by design. Personality signals, mood indicators, and behavioral patterns are traits that employees write to the Shared KB as confidence-stamped entries; they do not require a dedicated employee actor.

**Departments** (grouping for health rollup — explicit dormant-state honesty):
A department is **Dormant** (not "healthy" or "failing") when its employees have no real signal data to act on. Dormant is an honest state, not a failure state. A new tenant with zero calls, zero KB, zero conversations has all departments dormant — this is shown as-is, not hidden.

**Four-level autonomy ceiling** (stored on the employee record, upgradeable only via a code change, never via a dashboard toggle):
- **Level 0 — Observed**: employee watches signals, generates no output visible to the system. Used during data-collection phase.
- **Level 1 — Draft**: employee creates drafts (reports, suggestions, proposed actions) that the owner reads. No execution. Owner discards or acts manually.
- **Level 2 — Propose**: employee surfaces proposed actions in an approval queue with a clear description + reversibility label. Owner approves/rejects. Employee executes after approval.
- **Level 3 — Act**: employee executes autonomously within a named, bounded set of actions. Every action logged with full audit trail. Hard ceiling: the named action set is defined in code, not configurable at runtime.

No employee in v1 ships above Level 2. Level 3 is the ceiling for any employee post-v1, requiring explicit unlock via code change + documented rationale.

**Company Brain vs Shared Operational KB** — two genuinely distinct layers:

*Company Brain* (long-term institutional memory):
- **Write-only from employees** — employees write verified facts to it; they cannot read back and self-modify what other employees wrote.
- **Four closed promotion triggers** for a fact to be written: (1) verified fact confirmed by a real signal, (2) named source (which employee, which signal, which table/row), (3) timestamp of observation, (4) employee confidence level (must be above a hard threshold — not configurable at runtime).
- **Read-only by owner** — the owner reads it; employees cannot query it to inform their own decisions (prevents circular reinforcement loops).

*Shared Operational KB* (short-term working memory):
- **Employee read/write** — employees read from it to inform current task execution, write interim findings.
- **Scoped by department** — an employee in the Conversations dept cannot write to the Website dept's KB scope.
- **Confidence-stamped** — every entry carries a confidence level; low-confidence entries are visually differentiated; they decay (are marked stale) after a configurable TTL.

**Task chain model** — hybrid auto-advance / approval-queue:
- Steps within an employee's autonomy ceiling auto-advance without owner interruption.
- Steps that exceed the employee's autonomy ceiling enter the approval queue automatically — the chain pauses, the owner is notified, and execution resumes only after explicit approval.
- No task chain ever silently skips an approval gate. If the approval queue is unattended for 72 hours, the chain times out and the employee returns to its safe default action.

**Direct escalation trigger** — two conditions must be simultaneously true (AND, not OR):
1. **Active harm**: an ongoing action is producing confirmed negative effects (data loss, message sending error, customer-visible failure).
2. **No safe containment**: the employee's named safe default action cannot stop or contain the harm.

If only condition 1 is true but the safe default action can contain it: execute safe default, log, notify owner asynchronously.
If only condition 2 is true (uncertain but not actively harmful): pause, log, enter approval queue.
Both must be true simultaneously to trigger immediate owner interrupt.

**Per-employee safe default action** — a named, documented, always-available fallback defined in code before any execution authority is granted:
- Must be defined and reviewed before the employee is allowed any Level 2+ autonomy.
- Must be reversible or at minimum idempotent.
- Examples: Website employee's safe default = "pause any pending publish, preserve draft" · Phone employee's safe default = "stop accepting calls, log reason" · Trainer employee's safe default = "stop any pending KB write, preserve existing KB intact."

**Two-level health rollup**:
Employee health score → aggregated to Department health score → aggregated to Company health score. Each level has its own weighting logic. A department with one dormant employee and one healthy employee is not marked as sick — dormant employees do not drag down the aggregate; only employees with real signal data below threshold contribute negatively.

---

### Phase 3 — Security Agent Real Capability

Phase 3 is a separate, larger effort. Not scoped for Phase 1 or Phase 2 timelines. Architecture decisions locked here as a record.

The Security Agent is not a dashboard panel or a log viewer — it has **active adversarial probing** capability:
- Runs on a defined schedule (not continuous) to avoid false-positive storm during normal operation.
- Probes its own system: attempts known attack vectors against Vela's own endpoints (rate-limit bypass, IDOR variants, injection patterns) in a sandboxed staging context.
- Does not probe production live traffic — production probing is a scheduled offline replay against a shadow copy.

**Authority ceiling**: fail-closed / deny / pause / rollback only. The Security Agent can:
- Block a request pattern it identifies as malicious (fail-closed).
- Pause a subsystem (e.g. pause new webhook ingestion) while a potential attack is investigated.
- Roll back a reversible operation (e.g. undo a KB write that triggered a pattern match).

The Security Agent **cannot**:
- Permanently delete data.
- Revoke user accounts.
- Change configuration.
- Take any irreversible action.

**Escalation threshold**: genuinely rare. The Security Agent should be able to contain and log the vast majority of incidents autonomously without owner interrupt. Direct escalation is reserved for: confirmed credential compromise (not suspected), confirmed data exfiltration in progress, or an attack pattern that exceeds the agent's containment authority ceiling.

---

### Parking Lot *(decisions not yet finalized — do not treat as final)*

- **Custom-tier pricing moving to self-serve à-la-carte**: discussed but not settled. When pricing/billing is revisited, this possibility should be re-evaluated from scratch — do not assume it's the direction or implement it preemptively. The current locked pricing (§4) and `isCustom: true` flag in `pricing.ts` remain authoritative until explicitly changed.
