# Vela — Project Notes for Claude

Project-level context, conventions, and known gaps for AI-assisted development.
Add entries here when something non-obvious needs to survive across sessions.

---

## Known Gaps & Open TODOs

### TEST-01 — E2E test script duplicates production route logic (drift risk)
**File:** `src/scripts/e2e-test.ts`

The Phase 2b end-to-end test (`src/scripts/e2e-test.ts`) reimplements the generation
pipeline (classify, buildFillSystem, selectHeroVariant, selectTrustComponents,
enforceTemplate, etc.) rather than calling the real `/api/website/generate` route,
because that route requires an authenticated session unavailable to the test runner.

Future changes to the production route could silently diverge from the test copy.

**TODO:** once an automated-test auth strategy exists (test service account, CI bypass
token, or session-mocking approach), migrate the script to call the real endpoint
instead of duplicating its logic.

---

### TEST-02 — No 375px mobile screenshot from real end-to-end pipeline
**File:** `src/scripts/e2e-test.ts`

Phase 2b validation confirmed desktop rendering + trust/conversion data integrity
through the real OpenAI/Unsplash pipeline, but did not capture a 375px mobile
screenshot of a fully generated site.

**TODO:** a future validation pass should generate one complete website through the
real pipeline and capture desktop + 375px mobile screenshots, specifically checking
responsive behavior of showcase-type sections (galleries, grids, listings) and image
loading — not just the form/hero sections covered in Phase 2a/2b mockups.

---
