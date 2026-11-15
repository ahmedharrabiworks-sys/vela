---
description: Find, score and prepare new Doha leads (hunter + qualifier, decision makers, messages, demos for 9/10 leads). Usage /sales-run [count], default 40.
---

Run the Vela sales pipeline for **$ARGUMENTS** new leads (default 40 if empty). Read `sales/config.json` and `.claude/agents/*.md` first; each step follows its agent file exactly.

1. **Hunt + qualify, in parallel batches.** Split the count across 4 batches by niche (aesthetic and dermatology clinics, dental clinics, high-end beauty salons and spas, multi-branch medical aesthetics groups). Launch one agent per batch at the same time, giving it the `hunter.md` and `qualifier.md` instructions, the list of names already in `sales/data/leads.csv` to skip, and its output path `sales/data/batches/hunt-<niche>-<date>.json`. Then `node sales/scripts/ingest.mjs <files>`.
2. **Decision makers.** Owner first: for every lead scoring 6+ without `dm_name`, run agents in parallel batches with `decision-maker-finder.md` (owner, confidence, direct contact, route A/B/C), output `sales/data/batches/dm-<n>-<date>.json`, then ingest. Not found = score minus 2 (done by ingest).
3. **Messages.** For every lead with a route (A, B or C) and no `sales/data/messages/<slug>.json`, run the `writer.md` agent (one agent for all of them, in order, so it can compare against earlier messages). It must pass `node sales/scripts/unique.mjs <slug>`.
4. **Demos.** Only for leads scoring 9 or 10 with a decision maker: write `sales/data/demos/<slug>.json` from their PUBLIC info (business, business_ar, area, hours, 3 to 5 services with public prices only, a 40 second Gulf Arabic sample call as `call: [{speaker: "caller" | "vela", text}]` about one of their real services with numbers written as words, and a 25 second `voice_note.text` where Vela introduces itself to the owner by name). Then `node sales/scripts/demo-voice.mjs <slug>` (stops at the weekly cap of 15,000 ElevenLabs characters; no Vapi), then `node sales/scripts/demo-publish.mjs <slug>` (needs migration_v44).
5. `node -e "import('./sales/scripts/lib.mjs').then(m=>m.closeRun())"`, then report: leads found, score spread, top 10, demos made, characters used, what could not be verified.

Rules: public information only, never log in anywhere, never send or schedule a message, never call a business. Skip leads already in leads.csv. No em or en dashes.
