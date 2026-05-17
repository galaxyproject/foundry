# Cast Walkthrough

`COMPILATION_PIPELINE.md` describes casting abstractly. This page narrates one **real, committed** cast end to end so the abstraction has something concrete behind it: every file in the bundle, where it came from, and how `_provenance.json` lets you prove it.

The subject is **`discover-shed-tool`** (`content/molds/discover-shed-tool/`), cast to the Claude target at `casts/claude/skills/discover-shed-tool/`. It was chosen because its cast is **fully deterministic** — no `mode: condense` references, so no LLM step — which makes the walkthrough stable across rebuilds and lets us talk about provenance without "it depends on the model that day."

This is annotation of an existing artifact, not a synthetic example. Hashes below are abbreviated sha256s shown for shape; the committed bundle carries the full values.

## The bundle

```
casts/claude/skills/discover-shed-tool/
├── SKILL.md                                  # deterministic render of the Mold body
├── _provenance.json                          # the forensic record (schema v2)
├── _required_tools.json                      # aggregated tool install metadata
├── _verify.json                              # per-artifact verification contract
└── references/
    ├── cli/tool-search.json                  # ← cli-command ref, sidecar
    ├── cli/tool-versions.json                # ← cli-command ref, sidecar
    ├── cli/tool-revisions.json               # ← cli-command ref, sidecar
    ├── notes/component-tool-shed-search.md    # ← research ref, verbatim
    └── schemas/galaxy-tool-discovery.schema.json  # ← schema ref, verbatim
```

Nothing in `references/` is freehand. Each file is the destination of exactly one entry in the Mold's `references:` manifest, resolved through casting's per-kind dispatch.

## What came from where

`_provenance.json` `refs[]` is the index. Five entries, three dispatch behaviors:

### cli-command → JSON sidecar (×3)

`[[tool-search]]`, `[[tool-versions]]`, `[[tool-revisions]]` are CLI manual pages under `content/cli/gxwf/`. Cast `mode: sidecar`:

- `src: content/cli/gxwf/tool-search.md` → `dst: references/cli/tool-search.json`
- `src_hash` ≠ `dst_hash` — and that inequality is the point. The manpage markdown is *transformed* into a structured JSON sidecar (synopsis, flags, exit codes, error shapes), not copied. The hashes differ because the bytes legitimately differ; provenance records both so the transform is auditable.
- `load: on-demand`, so `SKILL.md` lists them under **Load On Demand** with each ref's `trigger` as the load condition.

### research → verbatim copy (×1)

`[[component-tool-shed-search]]` is a research note. Cast `mode: verbatim`:

- `src: content/research/component-tool-shed-search.md` → `dst: references/notes/component-tool-shed-search.md`
- `src_hash == dst_hash`. Byte-identical. A verbatim copy's matching hashes are the cheapest possible proof that nothing was paraphrased or silently edited on the way into the bundle.

### schema → verbatim from a package export (×1)

`[[galaxy-tool-discovery]]` is a `type: schema` note whose JSON is owned by a package, not the content tree:

- `src: package://@galaxy-foundry/foundry#galaxyToolDiscoverySchema` → `dst: references/schemas/galaxy-tool-discovery.schema.json`
- `src_hash == dst_hash` — the named runtime export is imported and serialized verbatim. The `package://` source form (rather than a file path) records *which* package export, so a package bump that changes the schema shows up as a `src_hash` change on re-cast.
- `evidence: cast-validated` and a `verification:` string ride along — this ref's correctness has been exercised, not just asserted.

Every entry here is `source: deterministic`. There is no `prompt` or `model` block because none was needed; there is no `pending_llm` entry because nothing is awaiting an LLM phase. A `mode: condense` Mold (e.g. `convert-nfcore-module-to-galaxy-tool`) would show `source: llm` entries carrying `prompt` (origin + identity + hash) and `model` — see [[cast-provenance]] for those fields.

## How `SKILL.md` is built

`SKILL.md` is **not** authored in the bundle. It is a deterministic render of `content/molds/discover-shed-tool/index.md`'s body: the `## When To Use`, `## Inputs`, `## Outputs`, `## Required Tools`, `## Load Upfront`, and `## Load On Demand` sections are projected from the Mold's frontmatter (`output_artifacts`, `references[].load`/`trigger`) and procedural body. The rule from `COMPILATION_PIPELINE.md` holds here literally: skill-body changes flow from Mold source changes; the LLM phase (when there is one) may fill condense refs but must not hand-edit `SKILL.md`. `_required_tools.json` aggregates install metadata (here: `gxwf`); `_verify.json` is the per-artifact verification contract — the `validator_bin` + `args` + `schema` a harness or CI runs to validate the artifact this skill produces (`galaxy-tool-pin`). Recorded validation *results* live in `_provenance.json`'s `validation_results[]` — empty here, since `galaxy-tool-pin` is produced at runtime, not at cast time.

## How provenance ties it together

The `mold` block anchors the whole bundle:

```json
"mold": {
  "name": "discover-shed-tool",
  "path": "content/molds/discover-shed-tool/index.md",
  "revision": 4,
  "content_hash": "11f14fee…",
  "commit": "8fed7f9…"
}
```

- **Drift detection** compares the live `content/molds/discover-shed-tool/index.md` content hash against `mold.content_hash`. Mismatch ⇒ the cast is stale; `foundry status` flags it, `foundry cast` regenerates it.
- **Reference drift** is per-ref: if `content/research/component-tool-shed-search.md` changes, its live hash no longer matches the recorded `src_hash`, so the stale reference is identifiable without re-reading the whole bundle.
- **Forensics**: "why does this bundle contain `references/cli/tool-search.json`?" → the `refs[]` entry whose `dst` is that path, back to `[[tool-search]]` in the Mold manifest, with `purpose` and `trigger` explaining why the Mold pulled it.
- **Artifact handoff**: `artifacts.produces` records `galaxy-tool-pin` with its producer-owned `schema: [[galaxy-tool-discovery]]`. A downstream Mold that consumes `galaxy-tool-pin` by shared `id` inherits that schema contract — provenance is where a harness reads the wiring.
- **`cast_history`** keeps the human-readable trail of why this cast was re-taken (here: five entries, schema wiki-link merge → runtime-facing render → marking the discovery schema cast-validated).

## What this proves

For a deterministic cast, re-casting an unchanged Mold with unchanged references reproduces byte-identical `SKILL.md` and `references/` — only cast timestamps and `cast_history` move. That is the reproducibility claim made checkable: not "trust the pipeline," but "here is a compiled skill, and here is exactly how every byte traces back to a Mold revision and a source hash." The per-field contract behind `_provenance.json` is the [[cast-provenance]] schema note.
