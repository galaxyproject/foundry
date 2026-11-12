# nextflow-summary-to-galaxy-template scenarios

## Case: demo skeleton validates structurally

- fixture: committed `nf-core__demo` summary, interface brief, data-flow brief,
  and optional IWC comparison notes.
- expect: emitted `galaxy-workflow-draft.gxwf.yml` has no gxformat2 structural or
  encoding errors under `gxwf validate --json`. Missing concrete tool IDs may be
  skipped or clearly marked as TODOs.

## Case: skeleton preserves prior design decisions

- fixture: any source summary plus interface/data-flow briefs containing explicit
  inputs, outputs, placeholders, and open questions.
- expect: workflow inputs, outputs, placeholder steps, and TODO notes reflect the
  prior briefs. The template may simplify, but it must not silently contradict a
  high-confidence upstream decision.

## Case: TODO placeholders are actionable

- fixture: a data-flow brief with unresolved tool needs and collection reshaping
  placeholders.
- expect: each placeholder step or TODO records source process/operator context,
  expected input/output shape, and the likely downstream owner. It should be
  enough for later tool-discovery or per-step implementation to start.

## Case: bamtofastq aliases keep their own `samtools view` flags

- fixture: nf-core/bamtofastq at `869832186b25d2ccbcd31d5f69edacc1ba32b718`,
  summarized by `summarize-nextflow`, with its interface and data-flow briefs.
  `SAMTOOLS_VIEW` has six aliases. `conf/modules.config` gives five of them
  their own `ext.args`: four view filters, plus `SAMTOOLS_CHR`'s `"-hb"`.
  `SAMTOOLS_PE` has none.
- expect: the steps translating `SAMTOOLS_VIEW_MAP_MAP`,
  `SAMTOOLS_VIEW_MAP_UNMAP`, `SAMTOOLS_VIEW_UNMAP_MAP`, and
  `SAMTOOLS_VIEW_UNMAP_UNMAP` carry `'-b -f1 -F12'`, `'-b -f8 -F260'`,
  `'-b -f4 -F264'`, and `'-b -f12 -F256'` respectively in
  `_plan_state.resolved_args`, each with its own `prefix` entry and with the
  `id` the alias's `effective_args` rows name. Each step's `calls` is its
  alias's path, e.g.
  `NFCORE_BAMTOFASTQ:BAMTOFASTQ:ALIGNMENT_TO_FASTQ:SAMTOOLS_VIEW_MAP_MAP`. No
  step carries another alias's entries or `SAMTOOLS_CHR`'s, and a step
  translating `SAMTOOLS_PE` keeps a plain-text `_plan_state`. Each
  `expression` parses back to the summary's string, closures included. The
  collate steps carry `args2: '-N'`. `gxwf draft-validate --json` exits 0.

## Case: an overridden entry stays out of `_plan_state`

- fixture: the bamtofastq case above, with one more synthetic
  `SAMTOOLS_VIEW` entry in `resolved_args`: `args: '-h'` from
  `withName:SAMTOOLS_VIEW` in a module `nextflow.config`. Each view alias's
  `effective_args` row for `args` still names only the alias's own entry.
- expect: no step's `_plan_state.resolved_args` contains the `'-h'` entry.
  Each view step lists the alias's `args` and `prefix` entries only, as in
  the case above.

## Case: rnaseq's `SALMON_QUANT` keeps each subworkflow's arguments

- fixture: nf-core/rnaseq at `47b3b0d3daad69e99d45c9e2dd8db19ee28307a1`,
  summarized by `summarize-nextflow`. `SALMON_QUANT` is called by
  `FASTQ_SUBSAMPLE_FQ_SALMON`, by `QUANTIFY_PSEUDO_ALIGNMENT`, and by that
  subworkflow's alias `QUANTIFY_BAM_SALMON`, each with its own
  `withName:.*:<subworkflow>:SALMON_QUANT` `ext.args`.
- expect: the step translating the subsampling call has `calls:
  ["NFCORE_RNASEQ:RNASEQ:FASTQ_QC_TRIM_FILTER_SETSTRANDEDNESS:FASTQ_SUBSAMPLE_FQ_SALMON:SALMON_QUANT"]`
  and only the `'--skipQuant'` entry. The quantification steps each list
  their own path (`NFCORE_RNASEQ:RNASEQ:QUANTIFY_BAM_SALMON:SALMON_QUANT` or
  `NFCORE_RNASEQ:RNASEQ:QUANTIFY_PSEUDO_ALIGNMENT:SALMON_QUANT`) and only
  that path's `{ params.extra_salmon_quant_args ?: '' }` entry. No
  quantification step carries `--skipQuant`.

## Case: collection inputs use gxformat2-compatible structure

- fixture: a brief with Galaxy collection or sample-sheet-shaped inputs.
- expect: gxformat2 input entries use valid `type`, `collection_type`, `format`,
  and `optional` shapes. Schema details such as `format` array/null behavior are
  validated rather than trusted from prose.

## Case: IWC findings are guidance, not hidden rewrites

- fixture: interface/data-flow briefs plus high- and low-confidence IWC comparison
  notes.
- expect: high-confidence structural findings may alter the skeleton;
  low-confidence findings are carried as TODO/review notes. The emitted workflow
  should make applied IWC guidance traceable.
