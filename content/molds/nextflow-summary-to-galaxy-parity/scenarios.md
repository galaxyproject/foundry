# nextflow-summary-to-galaxy-parity scenarios

## Case: a test-phase removal and an unwired control, with no ledger record

- fixture: `packages/gxwf-foundry/test/fixtures/nextflow-parity/bamtofastq/` (`summary-nextflow.json` built from `pipeline/`, `open-requirements.ledger.yml`, `galaxy-workflow-draft.snapshot.gxwf.yml`, `galaxy-workflow.gxwf.yml`, and `parity-diff.json` from `gxwf diff --json`).
- expect: `foundry nextflow-parity` exits 0 with seven findings, and the report lists all seven:
  - Step `chr_filter` removed with no drop, and output `chr_alignment` removed with it.
  - Inputs `chr`, `samtools_collate_fast` and `reads_in_memory` as not carried, never as exposed.
  - Entry `conf/modules.config#withName:SAMTOOLS_COLLATE/args` on step `collate` with no flag record.
  - Record `arg-view-map-map-header` as stray, citing the overridden `withName:SAMTOOLS_VIEW/args`.
- expect: the decision `chr-extract-unconditional` still says the chain runs the chr extract. The report shows it contradicted by the removed step and doesn't treat it as a reason.
- expect: the source-argument table joins `-b -f1 -F12` on `view_map_map` to a carried decision. Both tied `SAMTOOLS_VIEW_UNMAP_UNMAP` prefixes appear as open gaps under Unverified. `to_fastq`, which has no `_plan_state`, gets its call from its flag record. The `collate` row shows that the step sets no `state`.
- expect: tool-version rows set `samtools` 1.17 (`biocontainers/samtools:1.17--h00cdaf9_0`) beside wrappers at `1.15.1+galaxy*`, flagged as differing and marked unverified. `multiqc-not-built` appears as a design-tier drop. Source scope says there is no scope decision.

## Case: the same removal, recorded as a drop

- fixture: the case above, with the `chr-filter-dropped` entry from `packages/gxwf-foundry/test/nextflow-parity.test.ts` appended to `entries`: `kind: dropped`, `step: chr_filter`, `units` naming `SAMTOOLS_CHR`, and `because: samtools view rejected the region list`.
- expect: `chr_filter` and `chr_alignment` are listed as dropped by `chr-filter-dropped` and leave the Findings section. The unwired `chr` input is still listed as not carried. A plain gap on `chr_filter` instead of a drop would leave both findings in place.

## Case: a scope-narrowed pipeline

- fixture: a nextflow-to-galaxy run on nf-core/sarek 3.8.1, as pinned in `workflow-fixtures/fixtures.yaml`, whose interface phase writes the scope records in `content/molds/nextflow-summary-to-galaxy-interface/examples/sarek-germline-scope/open-requirements.ledger.yml`. The run supplies the snapshot, the final workflow and their diff.
- expect: `foundry check-scope-records` with that ledger and the run's summary exits 0. The Source scope section gives `scope-germline-strelka` with candidate `tests/default.nf.test::dynamically-generated` and its three controls (`params.step: mapping`, `params.aligner: bwa-mem`, `params.tools: strelka`), then its nine scope drops, each with `selected_by`, `units` and `because`. No scope drop appears among the removed steps or as a finding.
- expect: a call whose path passes through a scope drop's unit, such as `BAM_VARIANT_CALLING_SOMATIC_ALL`, is `covered_by` that drop and is not a `call-unmapped` finding.

## Case: the original bamtofastq run, rerun with a snapshot

- fixture: a nextflow-to-galaxy run on nf-core/bamtofastq 2.2.1 with DeepSeek V4.1 Flash, the source and model of galaxyproject/iwc-lab#8, keeping the per-step loop's snapshot.
- expect: the report lists the chr filter step, the `chr` input and the `chr_alignment` output as removed in the test phase with no ledger entry, though `model-test-log.md` and `workflow-debug-report.md` describe the removal. The ledger's chr-extract decision is shown as contradicted.
