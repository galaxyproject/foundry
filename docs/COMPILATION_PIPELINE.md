# Initial Compilation Pipeline

Initial sketch of how Molds become cast artifacts. Anchored to the file layout in `ARCHITECTURE.md` (`molds/<name>/` → `casts/<target>/<name>/`). Working premise: **LLM-driven, evolution-friendly, reproducible enough to diff**. Casting is not deterministic; it is recorded.

## What casting is

Casting takes a Mold (a typed reference manifest plus a procedural body) and its declared references — pattern pages, CLI manual pages, IO schemas, prompt fragments, examples, and operational research notes — and produces a target-specific cast artifact. The cast is **condensed and isolated** — no links back to the Foundry, no runtime dependency on it.

Casting operates as **per-kind dispatch** over the manifest, not a single resolve-and-inline pass. Different reference kinds get different transformations:

| Reference kind | Source location | Casting transformation | Lands at | Status |
|---|---|---|---|---|
| `pattern` | `content/patterns/*.md` | Verbatim copy or LLM-condense per `mode` | `references/patterns/<slug>.md` | v1 |
| `cli-command` | `content/cli/<tool>/<cmd>.md` | Deterministic JSON sidecar | `references/cli/<slug>.json` (flat — `<slug>` is the source basename) | v1 |
| `schema` | `[[wiki-link]]` to a `type: schema` note in `content/schemas/`. The note declares `package` + `package_export`; cast imports the named runtime export at build time and serializes it. Foundry-authored: schemas in `packages/<name>-schema/src/<name>.schema.json` (e.g. `summary-nextflow`, `galaxy-tool-discovery`). Vendored: schemas synced from upstream packages into `packages/<name>-schema/src/` (e.g. `tests-format` from `@galaxy-tool-util/schema`). | Verbatim copy of the imported export, JSON-serialized | `references/schemas/<note-slug>.schema.json` | v1 |
| `research` | `content/research/*.md` or paired structured sources under `content/research/` | Verbatim copy or LLM condense per `mode` | `references/notes/<source-basename>` (strict 1:1) | v1 |
| `prompt` | `content/prompts/*.md` | Inlined verbatim, no LLM rewrite | `references/prompts/` (inlined or copied) | **deferred** — rejected by v1 caster as "not implemented" until a real Mold needs it |
| `example` | `content/molds/<slug>/examples/`, shared `content/examples/` | Verbatim copy | `references/examples/` | **deferred** — same as `prompt` |
| `eval` | `content/molds/<slug>/eval.md` | **Never packaged** | — (Foundry-only) | n/a |
| `mold` (smell) | another Mold | Discouraged; see Open questions | — | n/a |

Verbatim-copy paths are deterministic; LLM-driven condensation is reserved for kinds where it adds value (patterns, research notes). `mode: condense` is implemented as a **two-phase contract**: the deterministic caster records a `pending_llm: true` placeholder for the ref (with a slot for prompt provenance and dst hash), and the `/cast` LLM phase fills it in. The deterministic verifier rejects committed provenance with any unfilled `pending_llm` entry.

`example` and `prompt` are declared in the contract but no Mold uses them yet, so the v1 caster fails fast on them rather than guessing dst conventions; the first Mold to need either kind shapes the rule.

### Typed reference manifest

Molds may declare the new object-shaped `references` manifest. It is additive during migration and will replace `patterns`, `cli_commands`, `prompts`, and `examples` once enough Molds have moved. Mold IO contracts live on `input_artifacts[]` / `output_artifacts[]`, with the producer-owned `output_artifacts[].schema` wiki-link pointing at the schema note that cast packages.

```yaml
references:
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: both
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Validate emitted summary JSON."
  - kind: research
    ref: "[[component-nextflow-testing]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: hypothesis
    purpose: "Extract nf-test fixtures and snapshots."
    trigger: "When filling test_fixtures or nf_tests."
    verification: "Run the generated summarize-nextflow skill on nf-core/bacass and confirm nf_tests extraction improves."
```

Field contract:

- `kind` selects the resolver and transformation handler: `pattern`, `cli-command`, `schema`, `prompt`, `example`, or `research`.
- `ref` is a wiki link for note-backed kinds (`pattern`, `cli-command`, `prompt`, `research`) and a path for file-backed kinds (`schema`, `example`).
- `used_at` is `cast-time`, `runtime`, or `both`; it says whether the reference is consumed while building the cast, consulted by the generated skill at runtime, or both.
- `load` is `upfront` or `on-demand`; it is the progressive-disclosure contract and should be honored by generated skill instructions and sidecar layout.
- `mode` is `verbatim`, `condense`, or `sidecar`; it declares the transformation.
- `evidence` is `hypothesis`, `corpus-observed`, or `cast-validated`; it records whether the connection is speculative, observed in real-world source/corpus work, or verified by a generated-skill run.
- `verification` is required when `evidence: hypothesis`; it names the real-data run or check needed to prove the connection is useful.
- `purpose` and `trigger` are optional prose for maintainers and generated-skill instructions. `trigger` is especially important for `load: on-demand` references.

`load: never` is deliberately omitted. Non-operational graph links stay in `related_notes`; once a reference appears in `references`, casting and validation should treat it as operational.

#### Reference evidence

Reference connections can be exploratory without hiding that uncertainty:

- `hypothesis` — added because it seems useful; not yet proven by a real cast run. Requires `verification`.
- `corpus-observed` — grounded in survey or research over real workflows, upstream source, or runtime behavior.
- `cast-validated` — a generated skill used this reference successfully on real data.

This lets maintainers add promising references while preserving an implicit TODO: run the generated skill on real-world data and promote or remove the connection based on the result.

The controlled vocabulary, labels, descriptions, and help links for `kind`, `used_at`, `load`, `mode`, and `evidence` live in `reference_contract.yml`. Validation and site rendering both read that registry.

### Agent-facing vs. human-facing vendored artifacts

When an upstream project ships *both* a structured source (YAML, JSON Schema, IDL) *and* a derived human-rendered form (LaTeX-heavy Markdown, generated HTML), **cast from the structured source, not the rendered form.** The structured source is denser per token, schema-regular, and preserves identifiers (labels, test pin names) that the renderer typically discards.

Canonical examples: [[galaxy-collection-semantics]] and [[galaxy-xsd]]. Upstream (`galaxyproject/galaxy`) keeps the formal collection type-rule spec in `lib/galaxy/model/dataset_collections/types/collection_semantics.yml`, runs `semantics.py` to generate `doc/source/dev/collection_semantics.md` (MyST admonitions + LaTeX math), and keeps the Galaxy tool wrapper XML contract in `lib/galaxy/tool_util/xsd/galaxy.xsd`. The Foundry vendors these artifacts at the same SHA:

- `content/research/galaxy-collection-semantics.yml` — canonical for casting and for any agent reasoning about collection mapping/reduction. Carries `tests:` blocks pinning concrete Galaxy test names that the rendered MD drops.
- `content/research/galaxy-collection-semantics.upstream.myst` — vendored solely so the site can render the upstream view for human readers. Not consumed by casting.
- `content/research/galaxy.xsd` — canonical for casting and agent reasoning about Galaxy tool wrapper XML. Framed by [[galaxy-xsd]] and synced through the same vendored-upstream manifest as the collection-semantics artifacts.

Casting policy: a cast that needs collection-semantics knowledge resolves the `.yml` and inlines/condenses from there; a cast that needs Galaxy wrapper syntax resolves `galaxy.xsd`; the rendered MyST is a site-rendering concern only. Pattern generalizes — when both forms exist, agents read structure, humans read prose.

The casting process is itself expected to evolve. Today: an LLM with a target-specific prompt for the condensation steps; deterministic file copies for the rest. Tomorrow: maybe smarter prompts, different models per kind, partial determinism within a kind. The Foundry does not lock in a casting algorithm; it locks in a **contract** (input shape, output shape, provenance).

## When casting runs

Three triggers, in increasing automation:

1. **Manual.** Today: `npm run cast -- <mold-name> --target=<target>` for the deterministic prepare, plus the `/cast` slash command for the full validate → prepare → LLM → verify loop.
2. **CI on Mold change.** When a PR touches `molds/<name>/`, CI re-casts that Mold against all configured targets and surfaces the diff in review. (Not wired yet — cast artifacts are committed manually.)
3. **Watch-on-change** (dev convenience). Future.

Drift surfaces today via `foundry-build cast <mold> --check` (per-Mold) and `cast-skill-verify.ts <mold>` (verifier rejects hash drift, missing dst, pending LLM entries). A repo-wide `foundry status` is future work.

## Input contract

To cast a Mold, the casting process consumes:

- **The Mold directory** — `index.md` (frontmatter manifest + procedural body) plus, if the schema permits, casting hints. The cast consumes only the procedural body of `index.md`; sibling files (`eval.md`, `changes.md`, `cast-skill-verification.md`) are Foundry-only and never packaged. Author-facing meta-content (changelog entries, casting open-questions) belongs in those sibling files, not in the body of `index.md` — anything in the body is a candidate for the cast.
- **All typed references declared in the manifest**, resolved by kind:
  - `references` — object-shaped typed references with `kind`, `ref`, `used_at`, `load`, and `mode`; this is the preferred manifest for new operational references.
  - `patterns` — legacy wiki links into `content/patterns/`.
  - `cli_commands` — legacy wiki links into `content/cli/<tool>/<cmd>.md`.
  - `output_artifacts[].schema` (and inherited consumer-side schemas via `input_artifacts[].id`) — wiki-links into `content/schemas/<name>.md`; resolved at cast time via the schema note's `package` + `package_export` to a runtime import from `packages/<name>-schema/`.
  - `prompts` — legacy wiki links into `content/prompts/` (when the Mold needs them).
  - `examples` — legacy paths into `content/molds/<slug>/examples/` or shared `content/examples/`.
  - IWC exemplar URLs cited in pattern bodies are resolved by the pattern transformation, not by the casting top-level (URLs stay URLs in pattern bodies; pinning to a SHA is at the pattern author's discretion).
  - Other Molds (`related_molds`) — flagged as a smell; see Open questions.
- **The cast target spec** — a per-target adapter (prompt templates per kind + output structure) declared in `casts/<target>/_target.yml`.
- **A casting model and prompt version** — recorded in provenance.

Resolution policy is per-kind, not a single rule:
- `pattern` — verbatim inline if under a size threshold; LLM-summarize otherwise. Casting hints (`inline: true` / `summarize: true`) may override.
- `cli-command` — always cast to JSON sidecar (deterministic structuring; no token-budget condensation needed because the sidecar is loaded only when the agent needs that command).
- `schema`, `example`, `prompt` — always verbatim copy unless the typed reference declares a future supported transformation.
- `research` — operational background; copied or condensed according to `mode`, and loaded according to `used_at` / `load`. `mode: condense` is specified but not implemented in v1 tooling yet.
- `eval` — never packaged.

## Output contract

Per cast: `casts/<target>/<mold-name>/`. Layout depends on target.

For the **Claude target**:
```
casts/claude/<mold-name>/
├── SKILL.md                  # the skill body Claude loads
├── references/               # supporting content, organized by kind
│   ├── schemas/              # verbatim *.schema.json
│   ├── cli/                  # deterministic JSON sidecars (flat, <slug>.json)
│   ├── patterns/             # verbatim or condensed pattern excerpts
│   ├── notes/                # research notes (verbatim by default; condense per ref mode)
│   ├── prompts/              # (deferred — kind not yet wired)
│   └── examples/             # (deferred — kind not yet wired)
└── _provenance.json          # required, not part of the skill (schema v2 — see below)
```

Per-kind dst conventions are declared in `casts/<target>/_target.yml` (`kinds.<kind>.dst_dir` + `dst_extension` + allowed `modes`). For verbatim modes the dst basename matches the source 1:1; for sidecars it's `<source-slug><dst_extension>`.

Per-kind subdirectories under `references/` mirror the casting dispatch and let the generated skill's runtime locate any artifact deterministically.

For the **web target** (sketch):
```
casts/web/<mold-name>/
├── skill.json                # structured skill description
├── prompt.md
└── _provenance.json
```

For **generic**: shape TBD; probably a single self-contained markdown.

`_provenance.json` is required for every cast. The contract is `scripts/lib/schemas/cast-provenance.schema.json` (schema version 2). Sketch:

```json
{
  "provenance_schema_version": 2,
  "cast_target": "claude",
  "mold": {
    "name": "summarize-nextflow",
    "path": "content/molds/summarize-nextflow/index.md",
    "revision": 7,
    "content_hash": "<sha256 of index.md>",
    "commit": "<git SHA at cast time>"
  },
  "cast_at": "2026-05-02T22:44:00.546Z",
  "cast_history": [
    { "rev": 1, "date": "2026-05-01", "note": "initial hand-cast" }
  ],
  "refs": [
    {
      "kind": "research",
      "mode": "verbatim",
      "ref": "[[component-nextflow-testing]]",
      "src": "content/research/component-nextflow-testing.md",
      "dst": "references/notes/component-nextflow-testing.md",
      "used_at": "runtime",
      "load": "on-demand",
      "evidence": "hypothesis",
      "src_hash": "<sha256>",
      "dst_hash": "<sha256>",
      "source": "deterministic"
    },
    {
      "kind": "research",
      "mode": "condense",
      "ref": "[[some-other-note]]",
      "src": "content/research/some-other-note.md",
      "dst": "references/notes/some-other-note.md",
      "used_at": "runtime",
      "load": "on-demand",
      "src_hash": "<sha256>",
      "dst_hash": "<sha256 of LLM output>",
      "source": "llm",
      "prompt": { "origin": "casting_md", "identity": "research-condense", "hash": "<sha256>" },
      "model": { "name": "claude-opus-4-7", "version": "..." }
    }
  ]
}
```

`refs[]` is sorted by `(kind, src)` for stable diffs. Each entry's `source` field records whether the dst was produced deterministically or by an LLM step. While a condense ref is awaiting LLM output, the entry carries `pending_llm: true` and the deterministic verifier rejects committed provenance with any unfilled entry.

Provenance is the foundation for drift detection, reproducibility audits, and "why does this cast contain X" forensics.

## Schema artifacts in casts

**The test-format schema is the canonical case.** `@galaxy-tool-util/schema` ships `tests.schema.json` (generated from `galaxy.tool_util_models.Tests` Pydantic models — see [galaxyproject/galaxy#22566](https://github.com/galaxyproject/galaxy/pull/22566) and [jmchilton/galaxy-tool-util-ts#75](https://github.com/jmchilton/galaxy-tool-util-ts/pull/75) for the source-of-truth chain). It carries every assertion's parameters, types, defaults, required fields, the `that` discriminator constant, and the original Python docstring as `description`. An agent equipped with that JSON Schema can author syntactically valid `<workflow>-tests.yml` and look up what each assertion does — no prose vocabulary catalog required.

Casting policy for upstream-package schemas:

- **Source of truth lives upstream.** The Foundry pins a version (in its toolchain `package.json` for npm, etc.) but does not edit the schema.
- **Casting copies the schema verbatim into `references/schemas/`.** The generated skill's runtime loads it for AJV / equivalent validation; no Foundry round-trip needed.
- **Bundle helper functions when applicable.** For test-format specifically, `@galaxy-tool-util/schema` also exports `validateTestsFile` and `checkTestsAgainstWorkflow` (label/type cross-check between a `.ga` and a tests file). When a cast's runtime is Node-capable, depending on the package directly is cleaner than vendoring just the JSON; the dependency is also recorded in `_provenance.json` so reviewers can see the version pin.
- **Schema-page rendering in the Foundry uses the same vendored copy.** The Foundry syncs the vendored test schema to `packages/tests-format-schema/src/tests.schema.json` and renders it via `site/src/lib/schema-registry.ts` as a navigable schema note, so research notes and Mold bodies can deep-link individual `$defs` (e.g. `[[tests-format#has_text]]`). The vendored JSON is the single source for both casting output and site rendering.

Other schemas that fall under this policy as they land:

- **`gxformat2`** — workflow source format. Schema-Salad-derived; vendored similarly.
- **Mold IO summary schemas** (`summarize-paper`, `summarize-nextflow`, `summarize-cwl` outputs) — Foundry-authored under `packages/<name>-schema/src/`, paired with a `<name>.md` schema note in `content/schemas/`; cast and site-rendered through the same machinery so consumers see one consistent surface.

The reference-kind `schema` does not distinguish between Foundry-authored and upstream-vendored at cast time — both are verbatim copies. The distinction matters only for sync/update flow: upstream schemas update via package bumps, Foundry-authored schemas update via direct edits.

## Process steps (per cast)

```
cast_mold(mold_name, target):
  mold     <- read molds/<mold_name>/index.md
  validate mold against frontmatter schema (incl. typed-reference manifest)
  refs     <- resolve_manifest(mold)               # by kind: references plus legacy fields
  validate every ref exists and conforms to its kind's contract
  target   <- load_target_adapter(target)

  # Per-kind dispatch (v1):
  for ref in refs:
    case ref.kind:
      pattern      -> verbatim copy or LLM-condense per mode
                      write to references/patterns/<source-basename>
      cli-command  -> deterministic JSON sidecar from frontmatter + body
                      write to references/cli/<source-slug>.json
      schema       -> copy verbatim to references/schemas/<source-basename>
      research     -> copy verbatim or condense per mode
                      write to references/notes/<source-basename>
      prompt       -> reject (deferred — not implemented in v1)
      example      -> reject (deferred — not implemented in v1)
      eval         -> skip (never packaged)

  skill_md  <- target.assemble_skill(mold.body, condensed_refs, manifest)
  write SKILL.md to casts/<target>/<mold_name>/
  write _provenance.json (schema v2: mold object, refs[] sorted by kind+src,
                          per-ref src_hash/dst_hash, source=deterministic|llm,
                          pending_llm flag for unfilled condense entries,
                          prompt + model identity for LLM-produced entries)
```

The deterministic phase (`foundry-build cast`) handles verbatim copies, sidecars, and condense placeholders without invoking an LLM. The LLM phase lives in the `/cast` slash command: it reads the Mold and any `casting.md` guidance, fills in `pending_llm` entries, updates SKILL.md, and rewrites `_provenance.json`. The deterministic verifier (`scripts/cast-skill-verify.ts`) enforces the contract on the result.

## Drift detection

A cast is **stale** when any of:
- The Mold's `index.md` content hash differs from `_provenance.mold.content_hash`.
- Any resolved ref's source hash differs from the recorded `refs[*].src_hash`, or its dst hash drifts from `refs[*].dst_hash`.
- The target adapter (prompt version) has changed.
- The casting model has changed (and we want to re-cast against the new model).

`foundry status` enumerates stale casts; `foundry cast --all` re-casts every stale entry. Re-casting against an unchanged Mold and unchanged refs with the same model produces a different artifact because the LLM is non-deterministic — that's expected and reviewed via diff.

## Versioning

**No semver on Molds, no semver on casts.** Identity is content hash + commit SHA. Re-casting is the migration path. If a generated skill needs to be "frozen" (e.g., a published skill on a marketplace), pin it by commit SHA in the consumer.

This keeps the Foundry's iteration loop fast: change a Mold, re-cast, review the diff. Don't bump versions, don't manage compatibility tables, don't write changelogs for every cast.

## Reproducibility

Casting is **non-deterministic** (LLM). What we guarantee instead is **traceability**: every cast records exactly what went into it (Mold hash, ref hashes, model, prompt version). A reviewer can:

- Check whether a cast is up-to-date (drift detection).
- Reproduce the *inputs* to a cast (clone the repo at the recorded commit SHA, re-cast).
- Compare two casts' provenance to explain content differences.

We do not guarantee that re-casting produces byte-identical output. We do guarantee that re-casting produces output derivable from the same inputs.

## What casting does *not* do

- **Does not write to the Foundry.** Casting is read-only against `content/molds/`, `content/patterns/`, `content/cli/`, `content/prompts/`, `content/examples/`, and `content/schemas/`. All writes go to `casts/`.
- **Does not invoke gxwf or Planemo.** Those are the generated skill's responsibility at runtime, not casting time. (Validation tooling does invoke schemas, but that's distinct.)
- **Does not update Molds.** If casting reveals a Mold is wrong, that's a hand edit by the maintainer.
- **Does not touch eval plans.** `eval.md` is Foundry-only; never read by casting.

## v1 minimum

To exercise the architecture without overbuilding:

- One cast target: **Claude**. Web and generic deferred.
- One casting model: pick one, pin in `casts/claude/_target.yml`.
- Cast 3-4 Molds end-to-end: `summarize-paper` (exercises `schema` + `pattern`), `implement-galaxy-tool-step` (exercises `pattern` + `example`), `validate-galaxy-step` (exercises `cli-command` reference from an action Mold), `validate-galaxy-workflow` (exercises terminal validation posture). Diversity exercises the per-kind dispatch, not just the prompt.
- Manual `foundry cast` only — no CI, no watch.
- Commit casts to the repo so we can review the actual outputs.

If those casts look reasonable and the provenance flow holds, scale to more Molds and more targets.

## Open questions

- **Casting prompt granularity.** Per-kind prompts are baseline (pattern-condense vs. manpage-to-JSON vs. skill-assembly are different jobs). Open: do action Molds vs. analytical Molds want different *skill-assembly* prompts? v1: one skill-assembly prompt per target; refactor when one prompt no longer fits.
- **Recursive casting depth.** If Mold A wiki-links Mold B (`related_molds`), do we resolve B's content into A's cast, or just summarize that B exists? v1: surface as a smell, allow but warn. The intended escape valve for "two Molds need shared content" is to factor that content into a **pattern page, CLI manual page, prompt fragment, or schema** — kinds that already have casting transformations — not a Mold-to-Mold link. Revisit if a legitimate Mold-to-Mold need surfaces.
- **Caching ref resolution.** Re-resolving every wiki link every cast is wasteful at scale. v1: no cache. Add when casting count makes it noticeable.
- **Cast diff hygiene.** LLM output is noisy; casts will produce churny diffs even on small Mold edits. Consider an output-stabilization pass (deterministic re-formatting). Defer until churn becomes painful.
- **Multi-target casts in one run.** `foundry cast <mold-name>` (no `--target`) — cast to all configured targets in parallel? v1: explicit `--target` required.
