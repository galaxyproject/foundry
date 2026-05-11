# Vendored upstream licenses

This directory holds verbatim copies of LICENSE files from upstream projects
whose content the Foundry redistributes (vendored JSON Schemas, structured
specs, etc.).

The Foundry's own license is the root `LICENSE` (MIT). Files under this
directory cover **only** the third-party content vendored alongside Foundry
notes — they don't license the Foundry itself.

Each schema or research note that redistributes upstream content declares
`license` and `license_file: LICENSES/<file>` in its frontmatter. The
validator (`npm run validate`) errors on:

- A `license_file` that points at a missing or empty file under `LICENSES/`.
- A `type: schema` note whose `upstream` URL is not under the Foundry repo
  but lacks a `license_file`.

## Current entries

| File | License | Vendored content |
|---|---|---|
| `nf-core-modules.LICENSE` | MIT (Philip Ewels) | nf-core module `meta-schema.json` and subworkflow `yaml-schema.json` from [`nf-core/modules`](https://github.com/nf-core/modules). |
| `nf-schema.LICENSE` | Apache-2.0 | `parameters_meta_schema.json` from [`nextflow-io/nf-schema`](https://github.com/nextflow-io/nf-schema). |
| `galaxy-tool-util-ts.LICENSE` | MIT (John Chilton) | Test-format schema from [`@galaxy-tool-util/schema`](https://github.com/jmchilton/galaxy-tool-util-ts). |
| `planemo.LICENSE` | MIT (Galaxy Contributors) | Planemo `test-report` JSON Schema (and follow-up planemo output schemas) from [`galaxyproject/planemo`](https://github.com/galaxyproject/planemo). |
