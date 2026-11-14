---
description: Build sales/today.html (today's contacts, messages, demos, follow-ups due) and sales/check-plan.html (tonight's after-hours checks).
---

1. Follow-ups: run the `follow-up.md` agent for leads due today (day 2, 5, 9 after first contact; stop after 3 or on any no; never do-not-contact). It appends drafts to `sales/data/messages/<slug>.json`.
2. `node sales/scripts/build-today.mjs` writes `sales/today.html` (max `daily_limit` new contacts, sorted by score).
3. `node sales/scripts/build-check-plan.mjs` writes `sales/check-plan.html`.
4. Tell me how many new contacts and follow-ups are on the page. Nothing is ever sent automatically: I send every message myself.
