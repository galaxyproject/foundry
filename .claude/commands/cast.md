---
description: Cast a Mold to a target — deterministic prepare, LLM follow-up, verify.
argument-hint: "<mold-name> [--target=claude]"
---

# Cast a Mold

Drive the cast pipeline for `$1` against the named target (default `claude`). The deterministic and verification steps are scripts; the LLM follow-up is your job.

## 0. Orient

- **`content/meta/mold-spec.md`** — Mold source layout. `index.md` is the contract; `casting.md` is for you (cast-time guidance); `cast-skill-verification.md` is for the post-cast review pass; `eval.md` never lands in the bundle.
- **`casts/<target>/_target.yml`** — per-kind dst conventions, required outputs, skill constraints.
- **`reference_contract.yml`** — kinds, modes, used_at/load/evidence vocabulary.

Resolve `$1` to `<mold-name>`. Default `--target=claude` unless the user overrode.

## 1. Mold-scoped validate

Run validate scoped to this Mold. The full repo validate is too broad; only this Mold's frontmatter and ref resolution must be clean before casting.

```sh
npm run validate
```

If validate is not yet path-scoped, fall back to `npm run validate` and grep for findings on this Mold's path. Stop on errors; warnings are advisory.

## 2. Deterministic prepare/check

```sh
npm run cast -- <mold-name> --target=<target>
```

This:

- reads `content/molds/<mold-name>/index.md` `references:` as source of truth
- resolves each ref by kind, copies verbatim refs, builds CLI sidecars
- writes `casts/<target>/<mold-name>/_provenance.json` (schema v2)
- records any `mode: condense` ref as `pending_llm: true` if no prior LLM output exists or if the source has drifted

To preview without writing, use `--check`. To stamp a history note, add `--note="..."`.

## 3. Summarize the plan

Read `_provenance.json`. Group `refs[]` by:

- deterministic verbatim copies (already on disk)
- CLI sidecars (already on disk)
- `pending_llm: true` entries (need LLM output before commit)
- `used_at: runtime` vs `cast-time` (the runtime ones must be discoverable from `SKILL.md`)
- `load: on-demand` triggers (`SKILL.md` must teach when to read each)

Report this summary before doing LLM work.

## 4. LLM follow-up

Read `content/molds/<mold-name>/index.md` (full body, not just frontmatter). If `content/molds/<mold-name>/casting.md` exists, read it for skill-assembly guidance and condensation prompts. Read `casts/<target>/_target.yml` for skill constraints.

Then:

- Produce or update `casts/<target>/<mold-name>/SKILL.md`. Frontmatter must declare every field listed in `_target.yml.skill_constraints.frontmatter_required` (typically `name`, `description`).
- For each `pending_llm: true` ref, produce the condensed output at the recorded `dst`. Identify the prompt source (target default, casting.md section, or mold-manifest prompt). Update the corresponding `refs[]` entry in `_provenance.json`: set `dst_hash` to sha256 of the new file, drop `pending_llm`, fill in `prompt: { origin, identity, hash }` and `model: { name, version }`.
- Resolve any raw `[[wiki-links]]` in `SKILL.md` — the verifier rejects them.
- Do not reference `content/molds/`, `content/research/`, or `content/schemas/` from `SKILL.md`. The bundle is self-contained at runtime.

## 5. Deterministic verification

```sh
npx tsx scripts/cast-skill-verify.ts <mold-name> --target=<target>
```

Fix any reported errors and re-run until clean. Common failures: pending_llm not resolved, on-demand ref not mentioned in SKILL.md, raw wiki-link left in SKILL.md, schema doesn't parse.

## 6. Optional agentic verification

If `content/molds/<mold-name>/cast-skill-verification.md` exists, treat its contents as the prompt for a final agentic review of the bundle. Read the file, then perform the review it describes against `casts/<target>/<mold-name>/`. Use `content/molds/<mold-name>/index.md` and `casts/<target>/<mold-name>/_provenance.json` as context. Report findings only — do not edit files. If the file is absent, skip this step silently.

## 7. Wrap up

- Confirm `_provenance.json` is the only metadata file modified (no `_cast-plan.json` in this contract).
- Summarize what you changed: which refs got LLM output, which were deterministic, any drift reconciled, any open verification items.
- List unresolved questions if any (concise, no grammar).
