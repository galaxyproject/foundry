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
change-set that adds a step and runs the loop — is grounded below on
`read-preprocessing/short-read-qc-trimming`, whose shipped test validates cleanly
and whose `fastp → MultiQC` graph naturally hosts an added QC step feeding the
aggregator.

The `.ga` → `.gxwf.yml` conversion is out of frame for *this* case — the BREW3R
anchor is already gxformat2 — but is exercised directly by the `.ga`-input case
below.

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

## Case: edit an unlabeled step and re-expose a bare-source output (unlabeled-step + bare-source robustness)

- starting workflow: `microbiome/pathogen-identification/taxonomy-profiling-and-visualization-with-krona`
  — a three-step linear chain (`kraken2` → `krakentools_kreport2krona` →
  `taxonomy_krona_chart`). Two quirks stress anchoring: every step is **unlabeled**
  (`id: _unlabeled_step_2`, no `label:`), and its workflow outputs use **bare
  `outputSource`** (`outputSource: _unlabeled_step_2`, no `/port`) — the same short
  form that tripped `gxwf draft-validate` on the BREW3R run.
- interview result: "Be stricter about kraken2 classifications — raise the
  confidence threshold from 0.1 to 0.5." (kraken2's raw `output` and `report_output`
  are *already* workflow outputs, so there is nothing to expose — the edit is a
  single step-state retune.)
- change-set (expected): one `change-parameter` on the kraken2 step's `confidence`
  **literal in `tool_state`** (`"0.1" → "0.5"` — a step-state edit, distinct from
  BREW3R's `ConnectedValue` input default). One **direct edit**; no tool introduced;
  loop is a no-op.
- expect: emitted validates + round-trips; the two downstream steps byte-stable.
  The change-set must anchor edits to steps that carry **no human label** (by
  `id`/`tool_id`/port, not `label`), and the summary must round-trip the unlabeled
  ids faithfully. If [[summarize-galaxy-workflow]] normalizes bare `outputSource`
  (the open refinement from the BREW3R run), emitted sources become `<step>/<port>`
  and `draft-validate` passes; if not, this case reproduces the same mid-pipeline
  `draft-validate` miss on a second anchor — either way it is a load-bearing
  regression probe for that finding.
- regression: unlike BREW3R's overridable input default, `confidence` is a step-state
  literal the test job **cannot** pin, so the regression run itself now uses 0.5. Any
  shipped assertion on classification-sensitive output legitimately shifts (an
  interview-requested behavior change) and is updated with a rationale in
  `omissions[]`, never deleted to force a pass; assertions on structure/format hold.
- spec check: confidence retuned, not hard-wired; no relabeling of the
  `_unlabeled_step_*` steps (tempting tidy-up, but churn); no reordering; no
  gratuitous expose of the already-exposed ports.

## Case: remove a leaf step and its output (remove-step, no-loop)

- starting workflow: `genome-assembly/assembly-with-flye` — `Flye: assembly` feeds
  `Quast genome report`, `Fasta statistics`, and `Bandage image: Flye assembly`;
  the Bandage step consumes `Flye: assembly/assembly_gfa` and produces the workflow
  output `Bandage Image: Assembly Graph Image` (`outfile`). Bandage is a **leaf** —
  nothing downstream consumes it.
- interview result: "Drop the Bandage assembly-graph image — we don't use it and
  it's slow to render. Keep everything else."
- change-set (expected): one `remove-step` on `Bandage image: Flye assembly`,
  cascading to removal of its `Bandage Image: Assembly Graph Image` workflow output.
  Direct edit; no loop.
- expect: emitted validates + round-trips; `Flye: assembly`, `Quast genome report`,
  and `Fasta statistics` byte-stable — including the still-live `assembly_gfa` port
  (removing one consumer must not perturb the producer). The dangling workflow
  output is removed cleanly — no orphaned `outputSource` pointing at a deleted step.
  Because Bandage is a leaf, no consumer needs rewiring; the harder mid-graph remove
  (a real dangling downstream consumer) stays under Further cases.
- regression: the removed output's assertion cannot survive (its output no longer
  exists), so [[changeset-to-galaxy-test-plan]] records it in `omissions[]` **with a
  rationale** — the sanctioned path for a baseline assertion an edit invalidates —
  rather than silently deleting it to force a pass. All other output assertions still
  pass unchanged. This is the one case that legitimately retires a baseline assertion,
  precisely because the interview *requested* removing that output; watch that only
  the assertion tied to the removed output is retired, not neighbouring ones.
- spec check: only Bandage and its output are removed; Quast / Fasta-stats and their
  outputs stay.

## Case: add a QC step and roll it into an existing aggregator (add-step, loop path)

- starting workflow: `read-preprocessing/short-read-qc-trimming` — `fastp` trims
  paired reads and emits `report_json`; `MultiQC` aggregates, its `tool_state.results`
  holding a single `software_cond` source (`fastp`, fed by `fastp/report_json`).
  Outputs: fastp JSON, trimmed reads, MultiQC HTML.
- interview result: "Also run FastQC on the raw reads and include it in the MultiQC
  report, so I get per-base quality alongside the fastp summary."
- change-set (expected): one `add-step` (FastQC on `Raw reads`) landing **drafty**
  (`_plan_*`), and one **in-place edit of `MultiQC`'s settled `tool_state`** —
  appending a second `results` entry (`software: fastqc`) wired to the new step's
  output. The added step routes through [[advance-galaxy-draft-step]]'s
  discover-or-author [branch]; FastQC is a shipped Tool Shed tool, so
  [[discover-shed-tool]] resolves it (no authoring).
- expect: the loop runs **at least one iteration** (unlike every prior case) and
  terminates at `draft: false`; FastQC is **wired into `MultiQC.results[]`**, not
  just appended as an orphan step (the named failure mode). `Raw reads` is a
  `list:paired` collection, so FastQC must **map over it** without collapsing to a
  single sample (the second named failure mode). `fastp` byte-stable.
- regression: shipped MultiQC test still passes; a MultiQC assertion is extended to
  confirm the FastQC section is present. The new FastQC input reuses the existing
  raw-reads fixture (or [[find-test-data]] if it needs its own).
- spec check: MultiQC's other `tool_state` (`title`, `export`, `png_plots`)
  untouched; `fastp` params untouched; FastQC added on the raw reads, not re-run on
  the trimmed output unless asked.

## Case: bump a tool version mid-graph (replace-tool / version bump, ledger)

- starting workflow: `epigenetics/atacseq/atacseq` — a 27-step ATAC-seq graph.
  Target: `Call Peak with MACS2` (`macs2_callpeak/2.2.9.1+galaxy0`).
- interview result: "Update MACS2 to the newest revision in the tool shed; keep the
  peak-calling settings the same where they still exist."
- change-set (expected): one `replace-tool` / version bump on the MACS2 step — same
  tool, newer `tool_version` / `changeset_revision`. If the new revision's parameter
  schema differs, incompatible or renamed parameters surface on the
  [[open-requirements-ledger]] rather than being silently dropped or guessed.
- expect: emitted validates + round-trips; the **other 26 steps byte-stable** (the
  scale test — a version bump must not ripple). MACS2's still-valid parameters are
  carried across; any parameter that no longer exists or changed shape is an explicit
  ledger entry, not a silent loss. If the bump forces re-resolution the step lands
  drafty and the loop runs; a clean in-place swap leaves it concrete.
- regression: the interview asked to **keep the settings the same**, so a peak-output
  shift is *not* a sanctioned output change — it is a genuine regression the run must
  surface for a human to adjudicate, not silently re-baseline. The trap this case
  sets: a version bump that quietly perturbs `Call Peak with MACS2` output tempts
  "edit the assertion until it passes"; the correct behavior is to flag the drift (via
  [[debug-galaxy-workflow-output]] / the ledger), not accommodate it. Only an output
  the interview *explicitly* asked to change may be re-baselined.
- spec check: only the named tool is bumped; no opportunistic bump of the other tools
  that happen to share a version family; no assertion is loosened to mask a
  bump-induced output change.

## Case: many direct edits at scale (large no-loop batch)

- starting workflow: `transcriptomics/rnaseq-pe/rnaseq-pe` — a 16-step RNA-seq graph
  (4 of them `run:` subworkflow steps) with 11 workflow outputs and a mix of labelled
  and `_unlabeled_step_*` steps. Inputs include `Forward adapter` / `Reverse adapter`
  (optional strings, no default), `Compute Cufflinks FPKM` (boolean), and
  `Strandedness`. STAR's `reads_per_gene` port is `hide: true` — a genuinely hidden
  intermediate available to expose.
- interview result: "Set default forward/reverse adapters so users don't have to type
  them, change whether Cufflinks FPKM runs by default, and surface the hidden STAR
  per-gene counts (`reads_per_gene`) as a workflow output." (three unrelated direct
  edits)
- change-set (expected): three entries — two `change-parameter` on input defaults +
  one `expose-output` — all direct, no tool introduced, loop a no-op.
- expect: the point is **byte-stability under breadth** — a diff against the 16-step
  starting workflow touches only the three named surfaces; none of the untouched steps
  (including the four `run:` subworkflows), the coexisting `_unlabeled_step_*` outputs,
  or the two MultiQC branches churn. The no-loop machinery must not be tempted into
  re-settling unrelated steps — the `run:` subworkflows especially must ride through
  untouched.
- regression: shipped rnaseq-pe test still passes; the exposed output gets an
  assertion; flipping the Cufflinks-FPKM default must not perturb a test job that
  sets the flag explicitly (mirrors BREW3R's coverage-default reasoning).
- spec check: honored narrowly across a big surface — no drive-by tidying of the many
  other defaults, no output renames beyond the one requested.

## Case: `.ga`-input variant (convert-step exercise)

- starting workflow: the **raw `.ga` form** of a small anchor (e.g.
  `genome-assembly/assembly-with-flye`), taken from its IWC source rather than the
  pre-converted `.gxwf.yml` fixture. This is the only case whose Phase-1
  [[summarize-galaxy-workflow]] must **convert** `.ga` → gxformat2 before anything
  downstream runs.
- interview result: a single small direct edit (e.g. retune one parameter default),
  so the convert step — not the edit — is what is under test.
- change-set (expected): one direct edit; loop a no-op.
- expect: the convert is **lossy-aware** — the summary records the `.ga` → gxformat2
  normalization, including whether `output_name` survives as `<step>/<port>` or
  degrades to the bare `outputSource` short form that tripped `draft-validate`. This
  case is the natural place to catch that defect **at its origin** (the convert),
  rather than two phases downstream where the BREW3R run first hit it. The
  post-convert baseline is what the edit and all oracles are judged against.
- regression: the anchor's shipped test passes on the converted-then-edited workflow.
- spec check: convert normalizes **format only** — it must not alter tool versions,
  step wiring, or parameters beyond the translation; the single requested edit is the
  only semantic change.

## Further cases to add (directions, not yet grounded here)

Deliberately left as pointers so this file stays honest, not padded:

- **mid-graph `remove-step` with a live downstream consumer** — the flye case above
  removes only a leaf; a harder case drops a step that another step (not just a
  workflow output) depends on, forcing the pipeline to rewire or flag the dangling
  consumer rather than leave a broken graph. No inspected small anchor hosts this
  naturally yet.
- **genuine `rewire`** — repoint an existing consumer at a *different* existing
  producer. No small IWC anchor surveyed hosts a semantically-sensible rewire (the
  small graphs are linear chains or parallel fans, not forks with an alternative
  source); needs a forked-graph anchor.
- **subworkflow / nested-workflow edit** — a change-set that reaches into a `run:`
  subworkflow step rather than a tool step. Groundable on
  `transcriptomics/rnaseq-pe/rnaseq-pe` (the large-batch anchor above), which hosts
  four `run:` subworkflow steps.
- **collection-structure change** — an edit that alters map-over shape (single sample
  → collection, or a `list:paired` restructure), stressing the collapse failure mode
  the add-step case only touches.
- **`author-galaxy-tool-wrapper` fallthrough** — the add-step case above resolves its
  new tool via [[discover-shed-tool]] (a shipped wrapper exists). The other leg of
  [[advance-galaxy-draft-step]]'s discover-or-author [branch] — adding a step whose
  tool has *no* acceptable Tool Shed wrapper, forcing authoring — is still uncovered.
