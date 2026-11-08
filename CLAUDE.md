# CLAUDE.md: VELA PROJECT MASTER CONTEXT
*Read this first in every new chat, then continue where we left off.*
*Last updated: November 3, 2026 (full resync after ~54 undocumented commits: Qatar-first pivot, QAR pricing, MVP scope-down, auth rebuild, landing/hero rebuild, new dev PC).*

---

## 0. HOW TO WORK WITH OUSSAMA (READ FIRST)

- **Be direct. Say less.** Lead with the answer or the prompt. No essays unless asked.
- **One grouped Claude Code prompt per task**, fenced with `═══` borders. The prompt itself is long and detailed so Claude Code doesn't wander; the chat around it is short.
- **Every prompt includes mobile 375px + security** as standing requirements.
- **Every prompt ends with:** "Then commit and push to GitHub."
- **Real evidence only.** Never "should work". Verify in production with real output (logs, live requests, screenshots, DB queries). Claude Code has reported "fixed" many times when the bug persisted.
- **Diagnose before fixing.** When the cause is unknown, get Vercel logs / console errors / DB state first.
- **Never burn OpenAI credits unnecessarily.** No repeated real-GPT test loops when a mocked or static check proves the same thing.
- He communicates design taste through **screenshots and reference URLs**.
- Tone: sharp cofounder-friend, warm, honest, "bro" energy fine, never corporate.
- **Phases run one at a time**, per explicit prompt. Finish, report, stop.

## 1. WHO

- **Oussama (Ahmed) Harrabi**, Tunisia. Builds via Claude Code in VS Code on Windows 11.
- Business partner in Qatar. Also runs BrandLab Qatar (brandlab-qa.vercel.app). Consults a separate "strategist" Claude chat for business strategy.

## 2. WHAT VELA IS

**AI Business Operating System SaaS for service businesses, Qatar-first (about 70% of focus), Gulf/GCC-wide.** Clinics, gyms, salons, real estate, restaurants, law firms, agencies, etc.

- **Language:** English is the main site language. Full Arabic with RTL is supported (EN/AR toggle).
- **Core loop:** business signs up, connects Instagram / WhatsApp / Phone, Vela AI answers customers 24/7, qualifies, books appointments, updates the dashboard.
- **Flagship:** AI voice phone agent that answers real inbound business calls, trained on the business's knowledge, books appointments.

## 3. INFRASTRUCTURE

| Thing | Value |
|---|---|
| Live site | https://velaos.co (live, canonical). Also aliased: vela-g8h4.vercel.app, tryvela.com |
| Health | https://velaos.co/api/health |
| GitHub | https://github.com/ahmedharrabiworks-sys/vela (branch `master`) |
| Supabase | `puyinskgvwycmrvkzgac` (eu-west-1, Ireland) |
| Vercel | team `brandlab`, project `vela-g8h4`. Functions pinned to region **`dub1`** (`vercel.json`), next to Supabase |
| Email | Resend SMTP, sender `no-reply@velaos.co` |
| Stack | Next.js 14 App Router, TailwindCSS, Supabase (Postgres + RLS), OpenAI GPT-4o, Vapi (voice), ElevenLabs (TTS + Scribe), Twilio (numbers), Vercel |

### Dev setup (new PC, Nov 2026)
- Repo at `C:\Projects\vela`. Linked with `vercel link` (CLI writes `.vercel/repo.json`, not `project.json`). Env via `vercel env pull .env.local --environment=production`.
- **Vercel "Sensitive" vars cannot be pulled** (they arrive as `[SENSITIVE]`). Paste locally by hand: `OPENAI_API_KEY`, `META_INSTAGRAM_APP_ID`, `META_INSTAGRAM_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_WHATSAPP_VERIFY_TOKEN`. Build passes without them; AI features need `OPENAI_API_KEY` in dev.
- `.env.local` and `.vercel` are gitignored. Never commit them, never print values.
- PowerShell BOM can corrupt env vars: paste keys clean.
- Deploy: `npx vercel deploy --prod` (only when a prompt asks for it).

## 4. PRICING (CURRENT)

Single source of truth: `src/lib/plan-config.ts` (limits, `price` in QAR) + `src/lib/pricing.ts` (display). Currency conversion: `src/lib/currency.ts` (static rates, QAR/AED pegged to USD, refresh EUR periodically).

| | Starter | Pro (recommended) | Premium |
|---|---|---|---|
| Price / month | **500 QAR** | **1,500 QAR** | **3,000 QAR** |
| Voice agent | No | Yes, 550 min | Yes, 1,000 min |
| Text messages | 500 / month (enforced, 429 at cap) | Unlimited | Unlimited |
| Channels | 1 | All 3 | All 3 |
| Team members | 1 | Unlimited | Unlimited |

- **QAR shown first**, with a USD / EUR / AED toggle.
- **"Unlimited" text is genuinely uncapped.** The safety net is the daily usage-alert log in `api/ai/reply/route.ts` (visibility, never a block). Observe real usage before ever setting a cap.
- **CTA is always "Start for Free".** No trial wording anywhere. **Never any refund / money-back language.**
- A `custom` tier exists in `plan-config.ts` (`isCustom`, "Talk to us"); not a public card.
- **Payments are not live.** Stripe routes are stubs; any plan is currently self-assigned at signup. Stripe/Paddle decision is postponed.
- Old USD pricing ($79/$159/$299 and $95/$295/$595) is superseded.

## 5. CURRENT STATE

### MVP scope-down (feature flags)
`src/config/features.ts`: `MARKETING_ENABLED`, `LEADS_CRM_ENABLED`, `ANALYTICS_ENABLED`, `WEBSITE_BUILDER_ENABLED` are all `false`. Enforced in the Sidebar (nav) and `middleware.ts` (direct URL). Pages, components and tables are untouched: restoring a feature = flip the flag to `true`.

**Channels = Instagram, WhatsApp, Phone.** There is no Website channel card (the website chat widget code still exists).

### Working
- Dashboard (real-data redesign, glass cards), Conversations (takeover replies, read tracking, live unread badge, needs-human resolve), Appointments (reschedule indicator), Recycle Bin soft-delete for leads/conversations/appointments, in-app notifications (new lead, booking, missed call).
- **One knowledge base:** `tenant_config.knowledge_base` is the only source for text chat, phone agent and owner assistant (`src/lib/knowledge-base.ts`), edited in one shared component (Train your AI and AI Agent > Knowledge Base). `phone_agent_knowledge_base` is no longer read; kept as a backup. Suggested knowledge needs `migration_v41.sql`.
- AI Agent section (voice, phone number, calls, settings). Owner-facing assistant has an explicit scope boundary (declines off-topic) and server-persisted history.
- Settings (Business Info, AI Configuration, Notifications, Billing with usage meters).
- `/demo` with fixture data (the only place fake data is allowed).

### Auth (rebuilt)
- Strong passwords (common-password check), real-email checks (disposable-domain block), phone validation (`libphonenumber-js`).
- Email verification + reset via **6-digit codes** (Supabase OTP length 6, expiry 900s), sent through Resend SMTP from `no-reply@velaos.co`.
- **DB-backed rate limiting** (`src/lib/auth/rate-limit-db.ts`, table `auth_rate_limits`, RPC `auth_rate_hit`). Survives cold starts.
- **Explicit account-status messages** (e.g. "no account with this email", "not verified"). This is Oussama's deliberate product decision over enumeration-hiding; don't revert it.
- Google OAuth button on login/signup. Split-card auth design. Signup defaults country to Qatar.
- Sidebar account menu with an instant red Log out (no confirm).

### Channels status
- **Instagram:** rebuilt on **Instagram Business Login** (old Facebook-Login scopes rejected by Meta). Uses `META_INSTAGRAM_APP_ID` / `META_INSTAGRAM_APP_SECRET`; webhook accepts either Meta app secret and logs every attempt. Deauthorize + data-deletion callbacks implemented. Token expiry tracked (migration_v39). Blocked on Meta App Review.
- **WhatsApp:** Meta Cloud API, Embedded Signup v4, multi-tenant via `whatsapp_accounts`. Twilio WhatsApp paths are dead code (not deleted, not referenced). Blocked on Meta Business Verification + App Review.
- **Phone:** backend code-complete (`agent_calls`, call-webhook, Calls page, voice usage). See §8 for the call-routing plan.

### Known open items
- AR/FR/DE locale strings may lag EN after pricing/feature changes; check before launch.
- Demo vs real app small mismatches (appointments shape, settings layout, sidebar user/plan).
- Migrations exist up to `migration_v39.sql`. **Which ones ran in production is not recorded here: confirm with a live query before relying on any column** (Hard Rule 9).

## 6. DESIGN RULES

- **White backgrounds, black text. Orange only for accents** (`#FF6B35` family).
- **Every CTA uses the same orange gradient**: `.btn-primary` / `--btn-gradient` in `globals.css`, shared `CtaButton` component.
- **"Static glass"**: glass look via borders/gradients/opacity, **no `backdrop-filter`** except the header and modals. Real blur everywhere caused sitewide lag.
- **No dark mode. Removed permanently.** Don't reintroduce theme toggles. (Mission Control is an internal dark-styled tool; that's not app dark mode.)
- **Original fonts and original logos.** The single-font (Poppins) experiment was reverted. Fonts are defined in `src/app/layout.tsx` (Inter for body/UI, Bricolage Grotesque for display headings).
- **Header:** desktop header is NOT fixed (scrolls away); phone header is sticky.
- **No em/en dashes anywhere** in `src/`. Enforced by `node src/scripts/lint-no-dashes.mjs` (run it before committing copy changes).
- **Arabic:** natural, Gulf-friendly MSA. "Your business" = **"شركتك"**, never "عملك". **"Vela" always in Latin letters**, never transliterated.
- No emojis in dashboard UI. Nothing that "looks AI-generated". References: linear.app, aesop.com, kellywearstler.com, compass.com.

### Performance
- Vercel functions in `dub1`, next to Supabase eu-west-1.
- **Animations only run when in view** (IntersectionObserver gating, e.g. `useAutoplayStep`). No perpetual off-screen loops, no `scale()` on large ambient-glow layers.

### Landing hero
- The **"missed call story"**: 3D phone, 3 steps, red (missed) vs green (Vela answers) endings, autoplays only when in view, phone swipe nav, wall-clock-anchored timeline. Components in `src/components/landing/` (e.g. `HeroPhoneStory.tsx`).
- **Restore points:** git tags `hero-v1` … `hero-v6` and `faq-fix-2`. **Rule: tag before any big redesign** so restoring is one command (`git checkout hero-vN -- <files>`).

## 7. HARD RULES (CUMULATIVE)

1. Every Claude Code prompt ends with "Then commit and push to GitHub."
2. Mobile 375px + security are standing requirements in every prompt.
3. **The real app never shows fake numbers.** Fake data only in `/demo`.
4. `npm run build` must pass before commit (Vercel is stricter than local).
5. Claude Code cannot click web dashboards. SQL and external accounts → give Oussama exact steps / SQL.
6. **Never paste or write raw API keys / secret values** in chat, docs or commits.
7. **When adding a Supabase column, always provide the exact SQL** (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...;` + `NOTIFY pgrst, 'reload schema';`).
8. **Verify with real output, not predicted output.** A migration file in the repo does NOT mean it ran in production; confirm schema with a live query. (Lesson: migration_v2 never ran, website chat was broken for every new visitor until July 30, 2026.)
9. **Phone voice stack (`src/lib/vapi-phone-assistant.ts`, also used by browser test calls):** transcriber Soniox `stt-rt-v5` (ar + en hints, not strict) with Speechmatics `ar_en` fallback; voice ElevenLabs `eleven_v4_turbo` with `eleven_flash_v2_5` fallback; LLM `gpt-4.1-mini`. Why: in scripted calls (Nov 8, 2026) it answered in 1.1 to 1.7s vs 3.9 to 4.2s on the old Scribe + multilingual_v2 + gpt-4o stack, kept Arabic words in mixed Arabic/English speech where Scribe romanized them ("زين" became "Zane"), and cost about 12% less on the Vapi bill. Deepgram does not support Arabic: never use it. Scribe is only for voicemail transcription.
10. Custom domains are never Vercel project aliases; use middleware hostname routing.
11. **No trial / free-trial wording, no refund / money-back language.** CTA = "Start for Free".
12. Automation is built in code. No n8n / Make / Lovable / Replit.
13. Website Builder (when re-enabled): never fabricate trust signals (reviews, years, certifications, prices, testimonials); GPT chooses from a bounded, server-enforced component pool, never free-form layout.
14. **Build against placeholder credentials until final integration day.** Missing env var → honest "Not connected" state, never fake "connected". Test against mocked responses shaped like the real API. Report which env vars are still placeholder.
15. **Mission Control's access allowlist is a hardcoded `const` in source**, never DB- or env-driven, re-checked on every request.
16. **Every AI-employee trait/metric must derive from a named, queryable real signal**, or it doesn't exist yet. No decorative scores.
17. Supabase JS builders have no `.catch()` on the unresolved builder: wrap in `try { await ... } catch {}`.

## 8. ROADMAP & LAUNCH PLAN

### Phone agent plan
- **Vapi + Twilio.** Twilio has **no Qatar numbers**, so Qatari businesses **keep their real number and forward calls** to a hidden Vela bridge number (currently a **US Twilio number**) wired to the Vapi agent.
- Twilio account upgraded (Individual). **Compliance profile pending verification.**
- `VAPI_WEBHOOK_SECRET` still needs to be added to Vercel before real end-of-call payloads are accepted.

### Launch order
1. Twilio compliance verification
2. Real Qatar call test (forward a real Qatari number → bridge → Vapi)
3. Register a Qatar company (~9,000 QAR)
4. Meta Business Verification + App Review (WhatsApp + Instagram)
5. Test WhatsApp + Instagram live
6. Publish

**Goal: 10+ paying clients before June 2028.**

### Postponed / later
- Stripe or Paddle payments (subscription + webhook → plan on tenant row).
- Re-enable flagged features (Marketing, Leads/CRM, Analytics, Website Builder) one at a time when needed.
- Durable usage-alert / billing analytics once payments are live.
- Voice notes in training, landing video.

## 9. ENV VARS (NAMES ONLY)

- **Set in Vercel prod:** Supabase (URL, anon, service role), `OPENAI_API_KEY` (Sensitive), `NEXT_PUBLIC_APP_URL`, `UNSPLASH_ACCESS_KEY`, `VAPI_API_KEY`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `ELEVEN_LABS_API_KEY`, `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `RESEND_API_KEY`, `META_APP_ID`, `META_APP_SECRET`, `META_INSTAGRAM_APP_ID` / `META_INSTAGRAM_APP_SECRET` (Sensitive), `META_WEBHOOK_VERIFY_TOKEN` / `META_WHATSAPP_VERIFY_TOKEN` (Sensitive), `NEXT_PUBLIC_META_APP_ID`, `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID`.
- **Still missing (add on integration day):** `VAPI_WEBHOOK_SECRET`, `TWILIO_AUTH_TOKEN`, Stripe/Paddle keys.
- Mission Control placeholders to replace before using it live: `OWNER_EMAILS` const and `MC_TOTP_SECRET` in `src/lib/mission-control-auth.ts` (confirm current values in code, never write them here).
- Balances to watch: OpenAI (turn auto-recharge ON with a cap before real traffic), Vapi, ElevenLabs.
- **To rotate:** OpenAI key, Unsplash key, an image-gen/Google key (exposed in chat at various points).

## 10. SUPABASE (KEY TABLES)

- `tenants` (`business_name`, plan, industry, city, phone; unique `owner_id` since v38), `tenant_config` (knowledge_base, `knowledge_base_updated_at`, phone-agent KB, Instagram token fields, theme preset, assistant/agent settings).
- `conversations` (site-scoped, needs_human + resolved_at, read tracking, soft delete), `messages` (`tenant_id`, `is_test`, owner-takeover flag), `leads` (intent_summary, soft delete), `appointments` (rescheduled flag, soft delete), `notifications`, `pending_service_requests` (requested services not yet trained).
- `agent_calls` (voice calls; verified working end-to-end July 31, 2026), `whatsapp_accounts`, `webhook_logs`, `marketing_generations`, `websites` / `website_versions`, `site_visits`.
- Auth: `auth_rate_limits` + RPC `auth_rate_hit`.
- Mission Control: `mission_control_access_log` (append-only), `departments`, `employees`, `employee_signals`, `learning_log`, `employee_insights`; RPC `get_rls_policies()` for the Security Agent.
- All app routes use the admin client; RLS is owner-scoped defense-in-depth.

## 11. MISSION CONTROL (OWNER OPERATING SYSTEM)

Internal owner-only console at `/mission-control`. **Access:** Google OAuth → hardcoded email allowlist → TOTP (RFC 6238) → HMAC-signed `mc_session_verified` cookie (path `/mission-control`, sameSite strict, 8h). Middleware re-checks allowlist + cookie on every request. Every attempt logged to `mission_control_access_log`.

**Pages:**
- `/mission-control`: overview (tenant roster, plan breakdown, **Theoretical MRR in QAR**, voice margin, At-Risk (behavioral)).
- `/mission-control/tenants/[id]`: engagement + activity drill-down.
- `/mission-control/employees` and `/employees/[id]`: AI-employee roster, signal history, learning log, on-demand analysis (`src/lib/mission-control/analysis.ts`, writes `employee_insights`; patterns need ≥2 compute runs, recommendations ≥3 corroborating signal IDs).
- **`/mission-control/executive`**: chat with an "executive" GPT-4o agent (`POST /api/mission-control/executive`, MC-cookie-gated). It answers owner questions by calling tools over real data only: tenant roster, theoretical MRR (always labeled theoretical, always QAR), voice margin, platform activity, at-risk tenants, employee roster/detail, tenant engagement/activity, employee analysis, and a **Security Agent audit** (`security-checks.ts`: report-only, zero execution authority, every finding cites real evidence, incl. RLS policy audit).

**Locked principles:**
- Labeling discipline: "Theoretical MRR" until real payments exist; "At-Risk (behavioral)" ≠ "Churned"; "active within N minutes", never fake real-time presence; billing section shows an honest unavailable state.
- AI employees: only seed an employee when a real capability + real signals exist (Website Agent first). Autonomy levels 0 Observed / 1 Draft / 2 Propose / 3 Act; nothing ships above Level 2; levels change only via code. Each employee has a named, reversible safe default action before any Level 2+ authority. Escalation to owner only when active harm AND no safe containment.
- Security Agent authority ceiling: block / pause / rollback only, never delete data, revoke accounts or change config.
