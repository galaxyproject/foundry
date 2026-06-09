# brew3r — 1 step degraded

MVP fixture for evaluating [[advance-galaxy-draft-step]]. Pair of files:

- `draft.gxwf.yml` — the BREW3R workflow with one tool step hand-degraded back to draft form: `tool_id: TODO`, missing `tool_state` / `tool_shed_repository` / `tool_version`, `TODO_<hint>` sentinels on `in[]` keys and `out[].id`, and free-text `_plan_state` / `_plan_context` / `_plan_in` / `_plan_out` describing the implementation intent a `*-summary-to-galaxy-template` Mold would have left behind. Class is `GalaxyWorkflowDraft`.
- `expected.gxwf.yml` — the unmodified IWC original, kept as the round-trip oracle.

## Source

`transcriptomics/brew3r/BREW3R` from IWC (cited abstractly per `AGENTS.md`; verbatim copy lives at `expected.gxwf.yml`).

## Degraded step

`merge assembled transcripts` — the StringTie merge step (`stringtie_merge` in the IUC suite). Picked because:

- Moderate `tool_state` (~10 fields), enough to make `_plan_state` non-trivial without overwhelming an MVP.
- Recognizable, shed-discoverable wrapper (well-known IUC StringTie suite).
- Both upstream sources exercised: one prior step output (`assembl with StringTie/output_gtf`) and one workflow input (`minimum FPKM for merge`).
- One downstream consumer (`BREW3R.r`'s `gtf_to_overlap` input), so the fixture exercises `outputSource` / `in[].source` repointing across the TODO_ rename.

Other steps left fully concrete on purpose: the orchestrator should pick this one step deterministically (via `gxwf draft-next-step`'s topological + alphabetical tiebreak) on the first iteration and then exit on `draft: false`.

## What was dropped vs preserved on the degraded step

Dropped:

- `tool_id`, `tool_version`, `tool_shed_repository` (the whole block), `tool_state` — wrapper-tier choices, deferred.
- `out[].hide`, `out[].rename` — UI annotations that presuppose a wrapper port name. `_plan_out` mentions them so they come back during concretization.

Preserved:

- Step `id` and `label` — topology-tier identity.
- `in[].source` references — the connection graph itself is topology, only the wrapper-side `in[].id` keys are TODO'd.
- `position` — UI metadata, not wrapper-tier.

## Downstream rewiring

`BREW3R.r`'s `gtf_to_overlap` source updated from `merge assembled transcripts/out_gtf` to `merge assembled transcripts/TODO_merged_gtf` so the connection graph still resolves while the wrapper-side output name is unresolved.

## Expected orchestrator behavior

One invocation of `advance-galaxy-draft-step` against `draft.gxwf.yml` should:

1. `gxwf draft-next-step` returns `draft: true`, `step: ["merge assembled transcripts"]` (leaf is the step to work on), and a `work` checklist of the step's `TODO_*` sentinels and `_plan_*` fields.
2. `discover-shed-tool` finds the IUC `stringtie_merge` wrapper.
3. `summarize-galaxy-tool` produces a tool summary.
4. `implement-galaxy-tool-step` fills in `tool_id` / `tool_state` / `out[].id`, renames `in[]` keys, and repoints BREW3R.r's source back to the concrete out name.
5. `gxwf draft-validate --concrete` passes.
6. The result, after class promotion via `gxwf draft-extract`, should be structurally equivalent to `expected.gxwf.yml` (modulo wrapper version pinning and parameter defaults the implementer chooses).

A subsequent invocation should report `draft: false` and exit immediately.

## Round-trip property

`expected.gxwf.yml` is the strongest oracle the fixture supports: same topology, same workflow inputs/outputs, original wrapper choice. The looser round-trip target is that the orchestrator's output matches `expected.gxwf.yml` modulo:

- (a) `tool_version` / `changeset_revision` drift,
- (b) defensible `tool_state` differences (e.g. min_iso `0.01` vs `0.05`),
- (c) `out[].hide` / `out[].rename` UI choices,
- (d) the trailing `unique_tools:` block — present in `expected.gxwf.yml` (IWC/TS-converter export metadata) but **not** produced by the per-step loop or `gxwf draft-extract`. It is also why we do **not** carry `unique_tools` into `draft.gxwf.yml`: its rows include `stringtie_merge`, which would leak the wrapper the orchestrator is supposed to discover.

Compare structurally, not byte-for-byte. Two further form differences are expected:

- `outputSource`: the draft uses the explicit `BREW3R.r/output` port form (the **draft** topology validator rejects a bare step id — `gxwf draft-validate` errors with "source BREW3R.r does not match any declared workflow input"), while the concrete oracle uses bare `outputSource: BREW3R.r` (the format2 validator accepts the single-output default). So `draft-extract` output may carry the `/output` form against the oracle's bare form — same source, equivalent.
- `gxwf draft-extract` promotes `class: GalaxyWorkflowDraft` → `GalaxyWorkflow` and strips all `_plan_*` fields.
