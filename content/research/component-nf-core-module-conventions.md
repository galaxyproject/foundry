---
type: research
subtype: component
tags:
  - research/component
  - source/nextflow
component: "nf-core Module Conventions"
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
summary: "RFC 2119 conventions enforced by nf-core/tools module lint, with lint-check pointers. Backs summarize-nextflow + author-galaxy-tool-wrapper."
sources:
  - "https://nf-co.re/docs/guidelines/components/modules"
  - "https://github.com/nf-core/tools/tree/main/nf_core/modules/lint"
  - "https://github.com/nf-core/modules/blob/master/modules/meta-schema.json"
  - "https://github.com/nf-core/modules/blob/master/modules/environment-schema.json"
  - "https://github.com/nf-core/tools/blob/main/nf_core/module-template/main.nf"
related_molds:
  - "[[summarize-nextflow]]"
  - "[[author-galaxy-tool-wrapper]]"
related_notes:
  - "[[component-nf-core-tools]]"
  - "[[component-nextflow-containers-and-envs]]"
  - "[[nf-core-module-meta]]"
---

# nf-core Module Conventions

Structured digest of the nf-core module specification — the conventions a module **MUST** or **SHOULD** follow to pass `nf-core modules lint`. Operational grounding for two Molds:

- [[summarize-nextflow]] — when extracting tools/containers/IO from a real nf-core module, the conventions tell the cast skill what to *expect* and what to *flag as drift*.
- [[author-galaxy-tool-wrapper]] — when translating an nf-core module into a Galaxy UDT, the conventions are the contract the source-side has already enforced (versions are emitted, args go through `task.ext.args`, containers carry both branches, etc.).

Companion structured form: `component-nf-core-module-conventions.yml`. Per-rule entries with `id`, `level`, `description`, `lint_check`, `evidence`, `affects`. Cast skill consumes the YAML for confidence-checking and warning suppression.

## Rule levels

- **MUST** — module fails lint if violated. The cast skill can assume these hold for a lint-clean module; surface a warning if not.
- **SHOULD** — lint warns but does not fail. The cast skill should *not* assume these; treat as a hint, not a contract.

## Categories

The YAML groups rules into:

1. **Layout** — directory structure, file inventory.
2. **Containers and conda** — directive form, environment.yml shape (also covered structurally in [[component-nextflow-containers-and-envs]]).
3. **Process and IO** — input/output channel declarations, meta map keys, args via `task.ext.args`.
4. **Versions** — how each tool emits its version, the `topic: versions` convention.
5. **Stubs and tests** — mandatory stub block, nf-test presence.
6. **Documentation** — meta.yml fields, descriptions, keywords.
7. **Code hygiene** — no `System.exit`, no leftover Jinja, no merge markers, no TODOs in committed code.

## Source provenance

Each rule's `lint_check` field names the lint test inside `nf-core/tools` that enforces it (e.g., `main_nf`, `meta_yml`, `environment_yml`, `module_changes`, `module_tests`). The rule fires when the lint test reports a fail or a warn. The lint suite registry is `nf_core/modules/lint/__init__.py`'s `lint_tests` list; individual tests live in `nf_core/modules/lint/<name>.py`.

The `evidence` field cites either a specific lint-test source path or the documented spec page. When neither is precise (e.g., "convention emerges from the module template"), `evidence` cites the template file.

## Cross-references

- [[component-nf-core-tools]] — wider tool ecosystem (modules.json, the install/update flow).
- [[component-nextflow-containers-and-envs]] — container and conda directive deep-dive (the "containers and conda" category here is the policy layer; the other note is the URL grammar).
- [[nf-core-module-meta]] — the JSON Schema this convention list operationalizes.

## Open gaps

_Updated when a real module exposes a convention not captured here. Each entry names the motivating module._
