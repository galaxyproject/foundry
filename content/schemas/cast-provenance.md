---
type: schema
name: cast-provenance
title: "Cast provenance (_provenance.json, schema v2)"
upstream: "https://github.com/galaxyproject/foundry/blob/main/scripts/lib/schemas/cast-provenance.schema.json"
tags:
  - meta
status: draft
created: 2026-05-17
revised: 2026-05-17
revision: 1
ai_generated: true
summary: "_provenance.json contract beside every cast: Mold revision, per-ref deterministic-vs-LLM origin, src/dst hashes, artifact handoff. Schema v2."
---

Every cast bundle carries a sibling `_provenance.json`: the forensic record of *what* was produced, *from which Mold revision*, *by which method*, and *what each reference's deterministic-vs-LLM provenance looks like*. It is required, but it is **not** part of the skill — consumers read `SKILL.md` and `references/`; maintainers read `_provenance.json`.

**Contract of record.** The authoritative schema is the repo-local JSON Schema at `scripts/lib/schemas/cast-provenance.schema.json` (`provenance_schema_version` is a `const: 3`). It is Foundry-authored — there is no upstream package and no `package_export`; the `upstream` link above points at the in-repo file. The narrative in `docs/COMPILATION_PIPELINE.md` describes *why* the shape is what it is; this note plus the JSON Schema are the *contract*. When the two disagree, the JSON Schema wins.

**Enforcement.** The deterministic verifier `scripts/cast-skill-verify.ts` AJV-validates every committed `_provenance.json` against the schema and additionally rejects any entry still carrying `pending_llm: true` (an unfilled `mode: condense` placeholder). The verifier — not a packaged `validator_bin` — is the enforcement point, which is why this note declares neither `package` nor `validator_bin`.

**Versioning.** `provenance_schema_version` is a hard `const`, currently `3`. v3 added per-ref license lineage (`license`, `license_file`, `license_file_hash`) so the license of every redistributed byte is part of the record. A future v4 is a deliberate schema bump: change the `const`, migrate or re-cast existing bundles, and revise this note rather than silently widening v3. Old bundles do not auto-upgrade; `foundry status` surfaces staleness and `foundry cast` regenerates.

## What it records

- **`mold`** — name, source path, `revision`, `content_hash`, and the `commit` the cast was taken from. Drift detection compares the live Mold `index.md` content hash against `mold.content_hash`; a mismatch marks the cast stale.
- **`refs[]`** — one entry per resolved typed reference, sorted by `(kind, src)` for stable diffs. Each records `mode` (`verbatim` / `condense` / `sidecar`), resolved `src` and bundle `dst`, `src_hash` / `dst_hash` (sha256 at cast time), and **`source`** (`deterministic` vs `llm`). Verbatim copies and sidecars are deterministic; only `mode: condense` refs are LLM-produced.
- **LLM provenance** — when `source: llm`, the entry must carry `prompt` (origin + identity, optionally hash) so a cast can be reproduced; `model` (name/version) is optional but strongly recommended. `pending_llm: true` marks a condense slot the deterministic phase emitted but the LLM phase has not yet filled — committed provenance with any such entry fails verification.
- **License lineage** — when a ref redistributes third-party content, the entry carries `license` (id from the source note's frontmatter), `license_file` (repo-relative `LICENSES/` path, for verbatim-carry licenses), and `license_file_hash` (sha256 of that file at cast time). Foundry-authored refs (root `LICENSE`) omit these. The cast refuses a `verbatim`/`sidecar` mode when the license resolves to own-words-only in the root `license-policy.yml` table (foundry-pattern#4).
- **`artifacts`** — the pipeline handoff contract copied from the Mold's frontmatter: `produces[]` (with producer-owned `schema`) and `consumes[]` (with `inherited_schema` and resolved `producers`), so a harness can wire a prior step's output path to a stable `id`.
- **`validation_results[]`** — process evidence from artifact-validator CLI runs: `validator_bin`, `status` (`passed` / `failed` / `error`), `exit_code` (authoritative), and captured `stdout` / `stderr` plus their hashes (opaque diagnostics).

## Why it exists

Provenance is the foundation for three things the Foundry promises: **drift detection** (Mold or ref changed since the cast), **reproducibility audits** (which prompt and model produced a condensed reference), and **"why does this cast contain X" forensics** (every `dst` traces back to a Mold ref and a `src` hash). Deterministic assembly is expected to be byte-stable aside from timestamps and `cast_history`; explicit LLM condensation is not guaranteed byte-identical, but `source`, `prompt`, and `model` make each LLM-produced byte reviewable.

The field tables below are generated from the JSON Schema itself; anchors are stable for deep-linking from Mold bodies and design docs.
