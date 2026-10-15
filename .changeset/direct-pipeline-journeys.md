---
"@galaxy-foundry/gxwf-foundry-note-schema": minor
---

Require each pipeline note to carry exactly one `journey/*` tag (`direct-build`, `plan`, `build-from-plan`, or `existing-workflow`). Pipeline notes without a journey tag, or with more than one, now fail validation. Accompanies the restored direct Galaxy pipeline routes and the optional Workflow Brief planning journey.
