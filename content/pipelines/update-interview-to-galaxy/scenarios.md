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

Both starting workflows below are the same small, legible IWC anchor —
`read-preprocessing/short-read-qc-trimming/short-read-quality-control-and-trimming`
(a two-step `fastp` → `MultiQC` paired-end QC/trimming workflow). Grounding the
pair on one fixture is deliberate: the two cases exercise the pipeline's two
structural halves — a change-set with no tool introduction (the per-step loop is
a no-op) versus one that introduces a tool (the loop runs) — on a workflow small
enough that "what changed vs. what stayed" is inspectable by eye.

The `.ga` → `.gxwf.yml` conversion is out of frame here: the anchor is already
gxformat2. A `.ga`-input case belongs in a later expansion of the
[[summarize-galaxy-workflow]] convert step.

## Case: retune a parameter default and expose a hidden report (no-loop path)

- starting workflow: `short-read-quality-control-and-trimming` — `fastp`
  (trimming) → `MultiQC` (aggregation). The `fastp` step already emits
  `report_html` but hides it and it is not a workflow output; the qualified
  quality-score parameter defaults to `15`.
- interview result (fixture, stands in for a normalized transcript): "Make the
  default quality filtering a bit stricter — Q20 instead of Q15 — and surface the
  fastp per-sample HTML report as an actual workflow output so reviewers can open
  it, alongside the JSON and the MultiQC report."
- change-set (expected): two entries, both **direct edits**, no tool introduced —
  `change-parameter` on the qualified quality-score default (`15 → 20`) and
  `expose-output` promoting `fastp/report_html` (unhide, add a workflow output,
  e.g. `fastp HTML report`).
- expect: the emitted workflow validates and round-trips; the `fastp` and
  `MultiQC` steps are otherwise **byte-stable** — same `tool_id`, `tool_version`,
  and the rest of the `fastp` `tool_state` (adapter options, length filtering, the
  `MultiQC` `results` block) untouched. The per-step loop
  ([[advance-galaxy-draft-step]]) runs **zero iterations** because nothing is
  drafty. The existing `fastp JSON report`, `fastp trimmed reads`, and `MultiQC
  HTML report` outputs all survive; exactly one new output appears.
- regression: the shipped workflow test still passes on trimmed-reads and JSON
  outputs; the new HTML output gets an added presence/format assertion.
- spec check: the request is honored **narrowly** — the run must not also "tidy"
  unrelated defaults, rename existing outputs, or reorder steps. Stricter-quality
  is a default change, not a hard-wired constant that removes the input's override.

## Case: add a FastQC step upstream and aggregate it in MultiQC (loop path)

- starting workflow: same anchor. `MultiQC` currently aggregates only the `fastp`
  JSON (its `results` has a single `software_cond` for `fastp`).
- interview result (fixture): "Add a FastQC pass on the raw reads before trimming,
  and roll the FastQC results into the existing MultiQC report so the one report
  covers both raw-read QC and the fastp trimming stats."
- change-set (expected): `add-step` (a `FastQC` step consuming the `Raw reads`
  collection, mapping over the `list:paired` structure) plus a `rewire` /
  `change-parameter` on the **existing** `MultiQC` step — add a second
  `software_cond` (`fastqc`) to its `results` block and connect FastQC's output
  to it.
- expect: the emitted workflow validates and round-trips. FastQC lands first as a
  **drafty** step (`_plan_*`), and [[advance-galaxy-draft-step]] resolves it — the
  discover-or-author branch finds the `devteam/fastqc` wrapper via
  [[discover-shed-tool]] (no authoring needed), [[summarize-galaxy-tool]] +
  [[implement-galaxy-tool-step]] concretize it. The `fastp` step is **untouched**.
  The `MultiQC` step *is* touched — but only its `results` list and its input
  connections; its `tool_id`/`tool_version` and unrelated `tool_state` stay put.
- regression: the shipped test still passes on the trimmed-reads / fastp-JSON
  outputs; the MultiQC HTML output remains present (its content changes — now
  covers FastQC too — so a content assertion may loosen while presence holds); a
  new FastQC-output assertion is added if FastQC's report is exposed.
- spec check: this case stresses the hard part of edit-in-place — **editing a
  settled step's `tool_state`** (MultiQC's `results`) rather than only appending a
  fresh step. Watch for two failure modes: (a) FastQC introduced but never wired
  into MultiQC (the "roll into the report" intent silently dropped), and (b) the
  collection map-over on `Raw reads` collapsed to a single-sample FastQC. If wiring
  FastQC into MultiQC proves to create a computability gap, the loop should
  escalate to [[repair-galaxy-draft-topology]], not silently rewire.

## Further cases to add (directions, not yet grounded here)

Deliberately left as pointers so this file starts small and honest, not padded:

- **`replace-tool` / version bump** on a second, different-domain anchor (e.g. a
  taxonomy-profiling or assembly workflow) — swap one tool for a newer revision or
  a sibling tool and confirm compatible wiring is preserved while incompatible
  parameters surface on the [[open-requirements-ledger]].
- **`remove-step`** — drop a step and confirm the pipeline rewires or flags the
  now-dangling consumers rather than leaving a broken graph.
- **`.ga` input** — a case whose starting workflow is a `.ga`, exercising the
  [[summarize-galaxy-workflow]] convert-to-`.gxwf.yml` entry.
