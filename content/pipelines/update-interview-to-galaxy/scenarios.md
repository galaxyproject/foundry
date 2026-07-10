# UPDATE-INTERVIEW → GALAXY pipeline scenarios

Concrete end-to-end journeys for the UPDATE-INTERVIEW → GALAXY pipeline. Unlike
the greenfield `→ GALAXY` pipelines, an update scenario names **two** inputs: an
existing Galaxy workflow (the thing being modified) and an interview result (the
requested change). The journey emits a modified workflow.

For update scenarios the oracle carries two properties greenfield pipelines
don't have:

- **Stability of untouched regions.** A structural diff of the emitted workflow
  against the starting workflow should touch **only** the steps/inputs/outputs
  the change-set names. Steps the interview never mentioned keep their `tool_id`,
  `tool_version`, `tool_state`, and wiring. Gratuitous churn is a failure, not a
  stylistic quibble.
- **Regression baseline.** Any test the starting workflow shipped must keep
  passing on the modified workflow, except where an edit intentionally changes an
  output. [[implement-galaxy-workflow-test]] augments the baseline with assertions
  for the new behavior; it does not silently discard the old ones.

The grounded case below uses a small, legible IWC anchor —
`transcriptomics/brew3r/BREW3R` (a five-step workflow that extends 3′
gene-annotation ends from STAR BAM evidence: two `map_param_value` steps
translate strandedness, `StringTie` assembles transcripts, `stringtie_merge`
merges them, and `BREW3R.r` extends the reference GTF). It exercises the
pipeline's no-tool-introduction half — a change-set that only retunes a default
and exposes an already-computed output, so the per-step loop is a no-op and "what
changed vs. what stayed" is inspectable by eye. The tool-introduction half — a
change-set that adds a step and runs the loop — is parked under *Further cases*
until it is grounded on an anchor whose shipped test validates cleanly and whose
graph naturally hosts an added upstream step.

The `.ga` → `.gxwf.yml` conversion is out of frame here: the anchor is already
gxformat2. A `.ga`-input case belongs in a later expansion of the
[[summarize-galaxy-workflow]] convert step.

## Case: retune a parameter default and expose a hidden intermediate (no-loop path)

- starting workflow: `BREW3R` — two `map_param_value` steps translate
  `strandedness`, `assembl with StringTie` assembles transcripts from the `BAM
  collection`, `merge assembled transcripts` (`stringtie_merge`) merges them, and
  `BREW3R.r` extends the reference `Input gtf`. The `minimum coverage` input
  defaults to `10` and reaches StringTie's `min_anchor_cov`/`min_bundle_cov` as a
  `ConnectedValue`; the merge step emits `out_gtf` (renamed "merged StringTie
  gtf") but **hides** it — only `extended_gtf` is a workflow output.
- interview result (fixture, stands in for a normalized transcript): "Make the
  assembly a bit stricter — require minimum coverage 20 instead of 10 — and
  surface the merged StringTie GTF as an actual workflow output so I can inspect
  what StringTie assembled before BREW3R extended it, alongside the extended GTF."
- change-set (expected): two entries, both **direct edits**, no tool introduced —
  `change-parameter` on the `minimum coverage` default (`10 → 20`) and
  `expose-output` promoting `merge assembled transcripts/out_gtf` (unhide, add a
  workflow output, e.g. `merged transcripts GTF`).
- expect: the emitted workflow validates and round-trips; the two `map_param_value`
  steps, `assembl with StringTie`, and `BREW3R.r` are otherwise **byte-stable** —
  same `tool_id`, `tool_version`, and the rest of the `tool_state` (the StringTie
  `adv` block beyond the connected coverage inputs, the `minimum FPKM for merge`
  wiring) untouched. Because `minimum coverage` reaches StringTie as a
  `ConnectedValue`, retuning it is a change to the **input default**, not the step
  — StringTie's `tool_state` does not move. The per-step loop
  ([[advance-galaxy-draft-step]]) runs **zero iterations** because nothing is
  drafty. The existing `extended_gtf` output survives; exactly one new output
  appears.
- regression: the shipped workflow test still passes on `extended_gtf` — its job
  sets `minimum coverage: 10` explicitly, so raising the *default* to 20 does not
  perturb the regression run; the new merged-GTF output gets an added
  presence/format assertion.
- spec check: the request is honored **narrowly** — the run must not also "tidy"
  unrelated defaults (the StringTie `adv` block, `minimum FPKM for merge`), rename
  `extended_gtf`, or reorder steps. Stricter coverage is a default change, not a
  hard-wired constant that removes the input's override.

## Further cases to add (directions, not yet grounded here)

Deliberately left as pointers so this file starts small and honest, not padded:

- **`add-step` + aggregator edit (loop path)** — introduce an upstream step and
  wire its output into an existing aggregator step, so a step lands **drafty**
  (`_plan_*`) and [[advance-galaxy-draft-step]] resolves it via the
  discover-or-author branch (finding a Tool Shed wrapper with [[discover-shed-tool]]
  rather than authoring). The hard part is **editing a settled step's `tool_state`
  in place** — adding a source to the aggregator's inputs — not just appending a
  fresh step; watch for the added step being introduced but never wired into the
  aggregator (intent silently dropped) and for a collection map-over collapsed to a
  single sample. Needs an anchor whose shipped test validates cleanly *and* whose
  graph naturally hosts an added upstream tool feeding an aggregator. The retired
  `fastp` → `MultiQC` "add FastQC, roll into MultiQC" sketch is the model.
- **`replace-tool` / version bump** on a second, different-domain anchor (e.g. a
  taxonomy-profiling or assembly workflow) — swap one tool for a newer revision or
  a sibling tool and confirm compatible wiring is preserved while incompatible
  parameters surface on the [[open-requirements-ledger]].
- **`remove-step`** — drop a step and confirm the pipeline rewires or flags the
  now-dangling consumers rather than leaving a broken graph.
- **`.ga` input** — a case whose starting workflow is a `.ga`, exercising the
  [[summarize-galaxy-workflow]] convert-to-`.gxwf.yml` entry.
