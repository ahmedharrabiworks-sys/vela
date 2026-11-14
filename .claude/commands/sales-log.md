---
description: Log a lead's status. Usage /sales-log <lead> <sent|replied|demo-booked|trial|won|lost|do-not-contact> [note]
---

Run `node sales/scripts/log.mjs $ARGUMENTS` and show the output. `sent` on a lead already contacted counts as a follow-up. `do-not-contact` is permanent. If the lead name is ambiguous, show the matches and ask which one.
