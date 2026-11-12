# nextflow-summary-to-galaxy-data-flow scenarios

## Case: demo data flow preserves source process intent

- fixture: committed `nf-core__demo` summary plus its interface brief.
- expect: draft includes FastQC map-over, optional SeqTK trimming, MultiQC report
  aggregation, and the `skip_trim` branch as source facts. It must not present
  unresolved `collect` / `mix` behavior as already implemented Galaxy wiring.

## Case: sarek data flow stays inside the germline scope

- fixture: `summarize-nextflow` output for `workflow-fixtures/pipelines/nf-core__sarek`
  (3.8.1, `4bd2948f`), its interface brief, and the interface Mold's
  `examples/sarek-germline-scope/open-requirements.ledger.yml`.
- expect: the draft covers BWA-MEM alignment, duplicate marking, base
  recalibration, Strelka germline calling and QC. It has no node for
  `BAM_VARIANT_CALLING_SOMATIC_ALL`, `VCF_ANNOTATE_ALL` or the other aligners,
  no `when:` on `aligner` or `step`, and all nine scope drops are still `open`
  in the re-emitted ledger.

## Case: operator translation is classified, not guessed

- fixture: a summary whose `workflow.edges[].via` includes operators such as
  `map`, `join`, `mix`, `groupTuple`, or `branch`.
- expect: draft classifies each meaningful operator as wiring, collection
  semantics, explicit placeholder step, or review trigger. Low-confidence
  Groovy/operator semantics become open questions instead of invented Galaxy
  tools.

## Case: collection shape survives across nodes

- fixture: a summary with sample-sheet or tuple(meta, path...) input and at least
  one mapped process.
- expect: draft keeps the collection shape and identifier/metadata story visible
  from input through mapped steps and any gather/reduce step.

## Case: unresolved tool needs are bounded

- fixture: any non-trivial summary with multiple processes.
- expect: draft lists unresolved Galaxy tool or placeholder needs with enough
  source context for later tool discovery and template authoring, but does not
  resolve exact Tool Shed IDs or detailed parameters.

## Case: template Mold can consume the draft

- fixture: source summary, interface brief, and data-flow brief.
- expect: `nextflow-summary-to-galaxy-template` can turn the draft into workflow
  inputs, placeholder steps, rough connections, and TODO notes without asking for
  missing basics such as node names, source processes, or open questions.
