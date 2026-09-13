---
"@galaxy-foundry/planemo-cli-meta": patch
"@galaxy-foundry/planemo-test-report-schema": patch
---

Re-vendor against planemo 0.75.47. `cli-meta.json` picks up the new `list_workflows`
command; `test-report.schema.json` is byte-identical to the 0.75.45 vendoring, so only
its provenance stamp moves.

The pin moves for a packaging reason rather than a feature one: `galaxy-tool-util`
declares `galaxy-tool-util-models` unconstrained, so a fresh resolve of an older planemo
pairs a 25.1.x tool-util with a 26.x models and fails at import. planemo constrains that
transitive dependency itself from 0.75.46 on.
