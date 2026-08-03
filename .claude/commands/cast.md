---
description: Cast a Mold to a target — deterministic prepare, verify, optional agentic review.
argument-hint: "<mold-name> [--target=claude]"
---

# Cast a Mold

Drive the cast pipeline for `$1` against the named target (default `claude`).

**The cast itself is entirely deterministic.** The caster resolves every reference, copies or
builds each one, and renders `SKILL.md` — there is no step where you author bundle content. Your
job is to run it, read what it produced, and judge whether the *Mold* was right. If a bundle is
wrong, the fix is in `content/`, never in `casts/`: the next `make casts` overwrites anything you
hand-edit, and `make check-casts` fails in the meantime.

## 0. Orient

- **`content/meta/mold-spec.md`** — Mold source layout. `index.md` is the contract;
  `cast-skill-verification.md` is for the post-cast review pass; `eval.md` never lands in the bundle.
- **`casts/<target>/_target.yml`** — per-kind dst conventions, required outputs, skill constraints.
- **`reference_contract.yml`** — kinds, modes, used_at/load/evidence vocabulary, and each kind's
  `cast:` block (how it resolves, its default mode, whether it may carry companions).

Resolve `$1` to `<mold-name>`. Default `--target=claude` unless the user overrode.

## 1. Mold-scoped validate

Run validate scoped to this Mold. The full repo validate is too broad; only this Mold's
frontmatter and ref resolution must be clean before casting.

```sh
npm run validate
```

If validate is not yet path-scoped, fall back to `npm run validate` and grep for findings on this
Mold's path. Stop on errors; warnings are advisory.

## 2. Deterministic cast

```sh
npm run cast -- <mold-name> --target=<target>
```

This:

- reads `content/molds/<mold-name>/index.md` `references:` as source of truth
- resolves each ref by the strategy its kind declares in `reference_contract.yml`, copies verbatim
  refs, builds CLI sidecars
- renders `SKILL.md`
- writes `casts/<target>/skills/<mold-name>/_provenance.json` (schema v4)
- prunes orphans under `references/` that the manifest no longer names

To preview without writing, use `--check`. To stamp a history note, add `--note="..."`.

## 3. Read what it produced

Read `_provenance.json` and `SKILL.md`. Group `refs[]` by:

- verbatim copies — each proves itself with `src_hash == dst_hash`
- CLI sidecars
- `used_at: runtime` vs `cast-time` (the runtime ones must be discoverable from `SKILL.md`)
- `load: on-demand` triggers (`SKILL.md` must teach when to read each)

Report this summary. Anything that looks wrong here is a finding about the Mold's manifest or its
source notes — record it, do not patch the bundle.

## 4. Deterministic verification

```sh
npx tsx scripts/cast-skill-verify.ts <mold-name> --target=<target>
```

This AJV-validates the provenance against `scripts/lib/schemas/cast-provenance.schema.json` and
checks the bundle against the target's constraints. Common failures: on-demand ref not mentioned
in `SKILL.md`, raw wiki-link left in `SKILL.md`, schema doesn't parse, a file under `references/`
the manifest does not account for.

`make check-verify` runs this over every Mold, and `make check-casts` re-derives every bundle from
live sources; both are in `make check` and CI.

## 5. Optional agentic verification

If `content/molds/<mold-name>/cast-skill-verification.md` exists, treat its contents as the prompt
for a final agentic review of the bundle. Read the file, then perform the review it describes
against `casts/<target>/skills/<mold-name>/`. Use `content/molds/<mold-name>/index.md` and the
bundle's `_provenance.json` as context. Report findings only — do not edit files. If the file is
absent, skip this step silently.

## 6. Wrap up

- Confirm the only files modified are inside the bundle, and that they are the caster's output
  rather than anything you wrote.
- Summarize what changed: which refs moved, any drift reconciled, any open verification items.
- List unresolved questions if any (concise, no grammar).
