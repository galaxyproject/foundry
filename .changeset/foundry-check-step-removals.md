---
"@galaxy-foundry/gxwf-foundry": minor
---

Add `foundry check-step-removals <diff.json> <ledger.yml>`. It reads `gxwf diff --json` output and an open-requirements ledger, and exits 4 when a removed step has no `kind: dropped` entry naming it in its top-level `step`. It also reports the inputs that feed no step.
