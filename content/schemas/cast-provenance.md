---
type: schema
name: cast-provenance
title: "Cast provenance (_provenance.json, schema v4)"
upstream: "https://github.com/galaxyproject/foundry/blob/main/scripts/lib/schemas/cast-provenance.schema.json"
tags:
  - meta
status: draft
created: 2026-05-17
revised: 2026-08-02
revision: 2
summary: "_provenance.json contract beside every cast: Mold revision, per-ref src/dst hashes, license lineage, artifact handoff. Schema v4 — deterministic casts only."
---

Every cast bundle carries a sibling `_provenance.json`: the forensic record of *what* was produced, *from which Mold revision*, *by which method*, and *what each reference resolved to on both sides of the copy*. It is required, but it is **not** part of the skill — consumers read `SKILL.md` and `references/`; maintainers read `_provenance.json`.

**Contract of record.** The authoritative schema is the repo-local JSON Schema at `scripts/lib/schemas/cast-provenance.schema.json` (`provenance_schema_version` is a `const: 4`). It is Foundry-authored — there is no upstream package and no `package_export`; the `upstream` link above points at the in-repo file. The narrative in `content/meta/casting.md` describes *why* the shape is what it is; this note plus the JSON Schema are the *contract*. When the two disagree, the JSON Schema wins.

**Enforcement.** The deterministic verifier `scripts/cast-skill-verify.ts` AJV-validates a committed `_provenance.json` against the schema and checks the bundle against the target's constraints. `make check-verify` runs it over every Mold and is wired into `make check` and CI — before that it ran against one Mold in two tests, so the schema was enforced on 1 of 47 records. The verifier — not a packaged `validator_bin` — is the enforcement point, which is why this note declares neither `package` nor `validator_bin`.

**Versioning.** `provenance_schema_version` is a hard `const`, currently `4`. v3 added per-ref license lineage (`license`, `license_file`, `license_file_hash`) so the license of every redistributed byte is part of the record. **v4 removed the LLM half**: `mode` no longer admits `condense`, `source` no longer admits `llm`, and `pending_llm` / `prompt` / `model` are gone — this Foundry built that phase, ran it to zero live references, and deleted it, so the record stops describing a shape it can no longer emit. That is a *narrowing*, which is the direction that requires a bump: a document valid under v3 last week can be invalid under v3 today unless the version moves with it. Re-adding an LLM phase later would *widen* the enums, which is backward-compatible for readers and needs no bump. Any future bump follows the same rule — change the `const`, re-cast existing bundles, and revise this note rather than silently redefining a version in place. Old bundles do not auto-upgrade; `foundry status` surfaces staleness and `foundry cast` regenerates.

## What it records

- **`mold`** — name, source path, `revision`, `content_hash`, and the `commit` the cast was taken from. Drift detection compares the live Mold `index.md` content hash against `mold.content_hash`; a mismatch marks the cast stale.
- **`refs[]`** — one entry per resolved typed reference, sorted by `(kind, src)` for stable diffs. Each records `mode` (`verbatim` / `sidecar`), resolved `src` and bundle `dst`, `src_hash` / `dst_hash` (sha256 at cast time), and **`source`**, which is `deterministic` and nothing else. `source` is retained rather than dropped because it is the claim the record *makes*; a reader should not have to infer determinism from the absence of a field.
- **The verbatim guarantee** — a `verbatim` entry proves itself: `src_hash == dst_hash`, checked over the whole corpus by `make check-verify` and by the deterministic-end-to-end tests. A bundle whose source has since moved on still satisfies that equality against the note *as it used to be*, which is why `make check-casts` re-derives from live sources as well.
- **License lineage** — when a ref redistributes third-party content, the entry carries `license` (id from the source note's frontmatter), `license_file` (repo-relative `LICENSES/` path, for verbatim-carry licenses), and `license_file_hash` (sha256 of that file at cast time). Foundry-authored refs (root `LICENSE`) omit these. The cast refuses a `verbatim`/`sidecar` mode when the license resolves to own-words-only in the shared license-policy table (`@galaxy-foundry/license-policy`; foundry-pattern#4).
- **`artifacts`** — the pipeline handoff contract copied from the Mold's frontmatter: `produces[]` (with producer-owned `schema`) and `consumes[]` (with `inherited_schema` and resolved `producers`), so a harness can wire a prior step's output path to a stable `id`.
- **`validation_results[]`** — process evidence from artifact-validator CLI runs: `validator_bin`, `status` (`passed` / `failed` / `error`), `exit_code` (authoritative), and captured `stdout` / `stderr` plus their hashes (opaque diagnostics).

## Why it exists

Provenance is the foundation for three things the Foundry promises: **drift detection** (Mold or ref changed since the cast), **reproducibility audits** (the same Mold at the same revision re-casts to the same bytes), and **"why does this cast contain X" forensics** (every `dst` traces back to a Mold ref and a `src` hash). Assembly is byte-stable aside from timestamps, `commit`, and `cast_history` — which is what makes `cast --check` a usable gate rather than a diff review.

The field tables below are generated from the JSON Schema itself; anchors are stable for deep-linking from Mold bodies and design docs.
