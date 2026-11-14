---
description: Log an after-hours check. Usage /sales-check <lead> <sent-time> [reply-time|none], times as HH:MM (24h) or YYYY-MM-DD HH:MM
---

Run `node sales/scripts/check.mjs $ARGUMENTS` and show the output. Then, if that lead already has a message in `sales/data/messages/`, rerun the `writer.md` agent for that one lead so the check result becomes the hook (it must still pass `node sales/scripts/unique.mjs <slug>`), and rebuild `sales/today.html` with `node sales/scripts/build-today.mjs`.
