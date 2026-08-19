# NEXTFLOW → GALAXY pipeline scenarios

Concrete end-to-end journeys for the NEXTFLOW → GALAXY pipeline, exercised
against the properties in `eval.md`. A pipeline scenario names the journey input
**once**; each step's Mold oracle applies to that step's output as the journey
advances (it does not re-list the per-Mold scenarios). Materialize Nextflow
fixtures with `make fixtures-nextflow`.

## Case: nf-core/demo end to end

- fixture: `workflow-fixtures/pipelines/nf-core__demo` (small; the full journey
  is tractable).
- expect: the journey produces a gxformat2 workflow that validates and
  round-trips; `params.input` / the sample sheet surfaces as the primary Galaxy
  input; FastQC/MultiQC-style reports surface as workflow outputs; no
  promoted-workflow TODO sentinels remain.

## Case: nf-core/sarek capped at 5 steps

- fixture: `workflow-fixtures/pipelines/nf-core__sarek`, scope-narrowed to the
  first 5 workflow steps.
- expect: the summary's load-bearing branch controls (`step`, `tools`,
  `aligner`) survive into the interface and data-flow briefs as scope decisions;
  the per-step loop concretizes each of the 5 steps; tool resolution is recorded
  per step (discover or author); the partial scope is stated explicitly rather
  than silently dropping the remaining pipeline.

## Case: nf-core/eager vs. a human-authored aDNA workflow (compare and contrast)

A **reference case**, not a matching test. galaxyproject/iwc#1234 ("Add
nf-core/eager style ancient DNA (aDNA) analysis workflow", human-authored by Mert
Aydın) targets the same source pipeline this journey converts, so it gives us a
hand-built answer to hold the machine's answer against. The journey will never
reproduce it, and shouldn't try — the value is in *where* and *why* the two
diverge. Nothing here is a pass/fail gate; the pipeline oracle in `eval.md` still
supplies the actual gates.

Three caveats to keep the comparison honest:

- **Version boundary.** The PR's README cites `nf-co.re/eager/2.5.3/` — eager
  2.x, which is DSL1 and therefore out of scope for [[summarize-nextflow]]. The
  fixture pins the DSL2 rewrite on `dev` (3.x). The aDNA tool vocabulary is
  substantially the same across the two, so the contrast is meaningful, but this
  is not a controlled A/B and per-step differences may be version artifacts
  rather than authoring differences.
- **Not in the corpus.** The PR is unmerged, so `paleogenomics/adna-analysis`
  does not exist at the pinned IWC SHA. [[compare-against-iwc-exemplar]] cannot
  reach it and will settle on some other exemplar; that phase's output is not the
  comparison. Supply the PR out-of-band by URL when doing the write-up, per the
  URL-not-mirror principle — do not mirror the `.ga` into the repo.
- **Human ≠ correct.** The PR is open and unreviewed. Where the journey diverges,
  either side may be the better answer.

- fixture: `workflow-fixtures/pipelines/nf-core__eager` (DSL2 `dev` pin; large —
  ~110 `.nf` files, ~45 nf-core modules, ~23 local subworkflows).
- reference: <https://github.com/galaxyproject/iwc/pull/1234>, workflow
  `paleogenomics/adna-analysis`.
- expect (gated by `eval.md`): eager is a toolkit, not a linear pipeline — its
  schema exposes ~15 independent `run_*`/`skip_*` branch groups (preprocessing,
  mapping, bam_filtering, deduplication, damage_manipulation,
  adna_damage_analysis, genotyping, metagenomics, contamination_estimation,
  human_sex_determination, consensus_sequence, host_removal, …). The journey must
  reach a **stated scope decision** about which branches it carries, and say so
  explicitly rather than silently flattening the toolkit into whichever path the
  template happened to take.

  A scope decision that freezes *every* branch into one hardcoded path satisfies
  the letter of that and misses the point: eager's optionality is much of what
  eager is, and a conversion that discards all of it has answered an easier
  question than the one asked. So the bar is that some meaningful part of the
  source's branch surface reaches the user as **run-time choice** — a workflow an
  analyst can steer without editing it. Which choices, how many, and by what
  mechanism are the journey's call, and a defensible small set beats a large one.
  The point is that the collapse to a single frozen path should have to be argued
  for, not fallen into.

  Deliberately not prescribed: the reference keeps four user-facing controls and
  spends 12 `when` steps doing it, but that is **calibration, not a quota** —
  evidence that this much optionality is reachable in gxformat2 at all. A journey
  that keeps three different controls, or reaches the same coverage through
  optional inputs rather than `when` gating, passes. A journey that pads its count
  with toggles eager's schema doesn't motivate fails on intent-fidelity — the
  optionality has to be earned by the source, not manufactured to hit a number.
- contrast (advisory; record, don't gate):
  - **Which branches survive as branches.** The PR is conditional-rich by IWC
    standards: 52 steps, of which 12 carry a `when`. It keeps four user-facing
    branch controls — `Choose Read Type` (SE/PE), `Choose Mapper` (BWA/Bowtie2),
    and two optional-input conditionals (HapMap present → ANGSD X-contamination;
    BED present → Sex.DetERRmine variant) — while hardcoding one pick for
    preprocessing (AdapterRemoval), dedup (Picard MarkDuplicates), genotyping
    (FreeBayes), profiling (Kraken2), and damage (mapDamage). Note the line drawn
    is *not* "data-flow shape stays, tool-swap goes": the mapper switch is a tool
    swap and survives. The kept set reads closer to "choices an aDNA analyst
    actually makes at runtime". Does the journey's scope decision land on a
    comparable set, and on what principle?
  - **The conditional plumbing tax.** Galaxy has no native if/else, so eager's
    toggles are paid for structurally: 7 `map_param_value` steps turn selections
    and optional-input presence into `when` booleans, and 6 `pick_value` steps
    rejoin the branches — 13 of 41 tool steps (~⅓) are param plumbing, not
    science. The pattern is duplicate-per-branch + gate + merge (`AdapterRemoval
    (Single-End)`/`(Paired-End)`, `Map with BWA`/`Bowtie2`). Record what the
    journey does here rather than scoring it against this idiom — duplicate-gate-
    merge is one known-workable answer, not the sanctioned one, and a cheaper
    route to the same run-time coverage would be a finding worth having. The tax
    is also the honest argument *for* a narrower scope: ~⅓ of the step budget
    going to plumbing is a real cost, and a journey that cites it while keeping
    fewer controls has reasoned, not given up. A worked human example of that
    trade priced out in full is the main reason this case earns its keep.
  - **Where the human answer looks arguable.** Steps 39/40 (Sex.DetERRmine
    with/without BED) are *both* registered workflow outputs, as are both ANGSD
    paths — so any given run yields outputs that are necessarily empty. If the
    journey avoids that, it is not automatically wrong for differing from the
    reference.
  - **Which branches were dropped entirely.** No circularmapper, malt/megan,
    metaphlan, krakenuniq, pmdtools, multivcfanalyzer/consensus, pileupcaller, or
    mapad in the PR. Does the journey's scope decision land on a comparable
    subset, and does it justify the cut?
  - **Tool resolution.** Per `eval.md`, every tool is discovered or authored. The
    human found Shed wrappers for the whole aDNA set (EndorSpy, Sex.DetERRmine,
    MtNucRatioCalculator, mapDamage included). Where the journey chose to *author*
    a wrapper for something that already exists in the Shed, that's a
    discover-shed-tool recall gap worth filing.
  - **Interface shape.** The human surfaced ~10 named inputs with prose-legible
    labels and pushed eager's flag sprawl into defaults. Compare against what the
    interface brief produced — count, naming, and how much of the ~200-param
    surface leaked through.
  - **Test strategy.** The PR ships a Planemo suite on sub-sampled `JK2067` /
    `hs37d5` / HapMap data. Compare against what
    [[nextflow-test-to-galaxy-test-plan]] → [[implement-galaxy-workflow-test]]
    produce — did the journey reach real aDNA fixtures, or synthesize? This is
    the case most likely to expose the pipeline's known test-data gap: the spine
    has no [[find-test-data]] phase, so `implement-galaxy-workflow-test` takes
    `test-data-refs` with nothing upstream producing it (the validator warns on
    exactly this). aDNA reference data is heavy and non-obvious; if the gap bites
    anywhere, it bites here.

## Case: branch-control fidelity

- fixture: a Nextflow summary with a skip-style branch control (e.g.
  `skip_trim`).
- expect: the branch control reaches the final workflow as an optional path or
  an explicit design decision; it is never silently folded away between the
  interface brief and the template.

## Case: ncbi/egapx — non-academic provenance, monolithic container

The hostile end of the ad-hoc corpus. Where nf-core/eager stresses *branch
breadth*, egapx stresses *the absence of every nf-core affordance the pipeline's
early phases lean on*: no `nextflow_schema.json`, no `meta.yml`, no nf-test, no
flat `params.*`, no per-process container directives, and sources under `nf/`
rather than the repository root. It is the case that answers "what does this
journey do when the summary comes back mostly empty?"

- fixture: `workflow-fixtures/pipelines/ncbi__egapx` (v0.5.2; large — 95
  processes across 68 subworkflows, no `modules/` directory).
- interface source: `examples/input_D_farinae_small.yaml` — the pipeline's real
  user interface is a YAML input file (`genome` URL, `taxid`, `short_reads` SRA
  accessions with public FTP mirrors, `locus_tag_prefix`, `cmsearch.enabled`,
  `trnascan.enabled`), not a Nextflow schema. Per-task flag strings live in
  `ui/assets/default_task_params.yaml`.

- expect (summary phase): [[summarize-nextflow]] exits 0 from the repository
  root with `warnings[]` naming both the auto-detected root (`nf`) and the
  chosen entrypoint (`ui.nf`) — a wrong pick here silently mis-scopes every
  downstream phase, so the choice must be reviewable, not implicit.

- expect (empty-summary honesty): the summary comes back with `params`,
  `tools`, `sample_sheets`, `profiles`, `reference_assets`, and `nf_tests` all
  empty, and `container`/`conda` null on all 95 processes — egapx declares one
  global `process.container = 'ncbi/egapx:0.5.2'`
  (`ui/assets/config/docker_image.config`, which sits *outside* the detected
  `nf/` root). Downstream phases must treat these as **absent evidence** and say
  so, not as "this pipeline has no parameters" or "this pipeline needs no
  tools". A journey that proceeds as if an empty `tools[]` meant zero tools has
  failed this case regardless of what it produces.

- expect (interface): the interface brief reaches egapx's actual inputs. Since
  no `params[]` survives the summary, the brief must either mine the example
  YAML as the interface source or record an explicit open requirement that the
  interface is undetermined from the summary alone. Silently emitting a
  parameterless Galaxy workflow is the failure mode this case exists to catch.

- expect (conditionals): the five detected guards — `proteins`,
  `short_reads_ids || short_reads`, `long_reads_ids || long_reads`,
  `params?.tasks?.cmsearch?.enabled`, `params?.tasks?.trnascan?.enabled` —
  reach the final workflow as optional inputs, gated steps, or a stated scope
  decision. The last two correspond one-to-one with toggles the example YAML
  actually sets, so they are user-facing choices by demonstration, not
  inference.

- expect (scope): 95 processes is not a Galaxy workflow. The journey must reach
  a **stated scope decision** naming which annotation planes it carries
  (`setup`, `rnaseq_short`, `rnaseq_long`, `target_proteins`, `gnomon`,
  `annot_proc`, `busco`, `cmsearch`, `trna_scan`, `orthology`) and why, rather
  than flattening or truncating silently.

- expect (tool resolution): this is the case where discover-or-author is
  expected to *mostly fall through to author*. egapx's steps are NCBI C++
  toolkit binaries (`chainer_wnode`, `gnomon_wnode`, `align_sort_sa`,
  `annot_builder_run`, …) shipped only inside `ncbi/egapx:0.5.2` — no
  BioContainers, no bioconda, no Shed wrappers. Per `eval.md`, every carried
  tool still needs a recorded decision; the interesting question is whether
  [[author-galaxy-tool-wrapper]] can produce a defensible wrapper when its only
  evidence is a `script:` block and one monolithic image, and whether it says so
  when it cannot.

- expect (test data): `test_fixtures` and `nf_tests` are empty, so
  [[nextflow-to-test-data]] must fall through the `test-data-resolution` chain
  rather than synthesize. `examples/input_D_farinae_small.yaml` is the intended
  landing spot — a genuinely small subsampled *D. farinae* dataset on public
  NCBI FTP — but nothing in the spine points a phase at it. Whether the chain
  reaches it, and through which link, is the finding.
