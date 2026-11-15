---
description: One batch of the deep hunt (resumable). Claims the next niche and area from the plan, finds up to 50 businesses, saves each lead as it is found, runs the owner-finder on 6+ leads, writes their messages and the niche voice note. Usage /sales-hunt
---

One batch of the deep hunt. Read `sales/config.json` (`hunt`, `offer`) and the agent files in `.claude/agents/` first; each step follows its agent file exactly.

1. **Claim a cell.** `node sales/scripts/hunt.mjs next`. It prints `CELL {"id","niche","area","batch_size",...}` or `PLAN COMPLETE` (then stop and say so).
2. **Hunt and score.** Run 3 hunter agents in parallel on the cell (split the search angles: directories and Maps listings / booking sites and Instagram / websites, news and Qatar Chamber), each following `hunter.md` and `qualifier.md`, together up to `batch_size` businesses in that niche and area. Every lead is checked with `hunt.mjs seen` first and saved the moment it is done (one file per lead, then `ingest.mjs`), so nothing is lost if the run stops. Keep moving: about 3 minutes and 4 to 6 page reads per business, then save it with what is proven and the rest in `unknowns` (the owner-finder digs deeper only for 6+ leads).
3. **Owner first.** For every lead from this cell scoring `hunt.owner_pass_min_score` (6) or more without `dm_name` and without `dm_source`: run the owner-finder (`decision-maker-finder.md`), in parallel batches of about 8, saving and ingesting after each lead (`sales/data/batches/dm-<cell id>-<slug>.json`).
4. **Messages.** For every lead from this cell with a `route` (A, B or C) and no `sales/data/messages/<slug>.json`: run the `writer.md` agent (one agent, in order, so it can compare with earlier messages). Each must pass `node sales/scripts/unique.mjs <slug>`.
5. **Niche voice note.** If `sales/data/niche-notes/<niche>.json` does not exist, write it: `{ "niche", "ar": { "text" }, "en": { "text" } }`, about 25 seconds each (Arabic 40 to 48 words, English 55 to 62 words), Vela introducing itself in the first person as the AI receptionist and what it does for THIS niche (answers calls 24/7 in Gulf Arabic and English, books, the niche's typical after-hours moment). No business names, no prices, no promises, no em or en dashes, numbers written as words. Then `node sales/scripts/niche-voice.mjs <niche>` (stops at the weekly ElevenLabs cap; that is fine).
6. **Demos.** Only for leads from this cell scoring 9 or 10 with an owner: step 4 of `.claude/commands/sales-run.md`.
7. **Close the cell.** `node sales/scripts/hunt.mjs done <cell id> <number of new leads saved>`, adding `--exhausted` if the niche and area had fewer real businesses than the batch size. Then `node sales/scripts/build-today.mjs`.
8. Report in 3 lines: cell, new leads saved (score spread), owners found (confidence), messages written, voice note made or skipped.

Rules: public information only, never log in anywhere, never send or schedule a message, never fill a form, never call a business. No em or en dashes.
