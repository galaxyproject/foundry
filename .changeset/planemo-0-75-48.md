---
"@galaxy-foundry/planemo-cli-meta": patch
"@galaxy-foundry/planemo-test-report-schema": patch
"@galaxy-foundry/gxwf-pi-harness": patch
"@galaxy-foundry/nfcore-tool-lab": patch
---

Pin planemo 0.75.48. The vendored CLI metadata and test-report schema are
regenerated against it (command list and schema unchanged), the
gxwf-pi-harness container installs it and its default image tag names it, and
nfcore-tool-lab now requires it through the test-report schema pin.
