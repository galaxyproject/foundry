# NEXTFLOW → CWL pipeline scenarios

Concrete end-to-end journeys for the NEXTFLOW → CWL pipeline, exercised against
the properties in `eval.md`. A pipeline scenario names the journey input **once**;
each step's Mold oracle applies to that step's output as the journey advances (it
does not re-list the per-Mold scenarios). Materialize Nextflow fixtures with
`make fixtures-nextflow`; CWL tool-library fixtures with `make fixtures-cwl`.

## Maturity note — this is a scoping target, not a passing suite

The CWL **target** tier these journeys run through is nascent. The upstream
extraction and design chain is real:

- [[summarize-nextflow]] → [[nextflow-summary-to-cwl-interface]] →
  [[nextflow-summary-to-cwl-data-flow]] → [[summary-to-cwl-template]] all carry
  bodies, references, and (for the shared summarizer) a schema.

But the per-tool authoring and validation loop is seeded stubs — one-line
procedural bodies added to lift them out of "effectively empty", with no `eval.md`
oracles and no packaged `references:` yet:

- [[summarize-cwl-tool]], [[implement-cwl-tool-step]], [[validate-cwl]],
  [[implement-cwl-workflow-test]], [[debug-cwl-workflow-output]].

So these cases define the **target** journey and its gates; they are not yet
walkable end-to-end. Each case's **blocks on** note names what the tier must gain
to walk it — the cases double as the CWL tier's build punch list. The
`## What a first walk needs` section at the bottom collects that list.

## Case: nf-core/demo end to end (the basic conversion)

- fixture: `workflow-fixtures/pipelines/nf-core__demo` (small; the full journey is
  tractable — the intended target for the first real walk).
- expect (gated by `eval.md`): the journey produces a CWL Workflow
  (`class: Workflow`) plus a CommandLineTool per step that pass `cwltool
  --validate`; `params.input` / the sample sheet surfaces as the primary workflow
  input; the FastQC/MultiQC-style reports surface as workflow outputs; no
  placeholder steps or unresolved `run:` targets remain.
- blocks on: [[summarize-cwl-tool]] and [[implement-cwl-tool-step]] need real
  bodies + eval oracles (today one-line stubs); [[validate-cwl]] needs a failure
  classification rubric. The upstream summary → interface → data-flow → template
  chain is already real and should carry this fixture unaided — a good first
  **partial-walk** target that proves the extraction tier before the authoring
  tier exists.

## Case: CWL-native branch + scatter mapping

- fixture: a Nextflow summary with a skip-style branch control (e.g. `skip_trim`)
  and a per-sample channel.
- expect: unlike gxformat2, CWL v1.2 has native step-level `when:` and `scatter:`.
  The skip control should reach the CWL Workflow as a `when`-gated step — not the
  duplicate-gate-merge plumbing the Galaxy target is forced into — and per-sample
  fan-out as `scatter`. The mapping is more direct than the Galaxy target's, and
  the data-flow brief should exploit it rather than emulate Galaxy's plumbing tax.
- blocks on: [[nextflow-summary-to-cwl-data-flow]] already names "CWL
  scatter/gather choices" in its remit — this case needs a walk to confirm it
  actually emits `when`/`scatter` decisions the template consumes, and that
  [[summary-to-cwl-template]] renders them.

## Case: tool provenance fidelity

- fixture: `nf-core/demo`'s FastQC / MultiQC modules (each pins a biocontainer via
  the module `container` directive); CWL tool-library reference
  `common-workflow-library/bio-cwl-tools` (`multiqc/multiqc.cwl`, `fastp/fastp.cwl`).
- expect: each authored CommandLineTool carries the module's container as
  `DockerRequirement` (or `SoftwareRequirement`), traceable to the NF module's
  `container` directive; [[summarize-cwl-tool]] records `baseCommand`, IO, and
  container; nothing is left unprovenanced.
- blocks on: [[summarize-cwl-tool]] (stub) must actually extract
  container/`baseCommand`/IO. Where a CommandLineTool already exists in
  `bio-cwl-tools`, reuse beats authoring from scratch — but there is no CWL
  discover-tool Mold analogous to [[discover-shed-tool]], so "reuse vs author" is
  currently an unowned decision. Worth a scoping call: extend the loop with a CWL
  tool-library lookup, or fold it into `summarize-cwl-tool`.

## Case: NF test evidence → CWL assertions

- fixture: `nf-core/demo`'s bundled nf-test snapshots.
- expect: the nf-test fixtures reach a cwltool-runnable job file with
  expected-output assertions via [[nextflow-test-to-cwl-test-plan]] →
  [[implement-cwl-workflow-test]]; `source.derived_from: test-evidence` is
  preserved, not synthesized.
- blocks on: [[implement-cwl-workflow-test]] (stub) needs a real body. **Runner
  tension worth surfacing:** the spine's execution phase is the generic
  [[run-workflow-test]], whose body is Planemo/Galaxy-oriented — a CWL run needs a
  `cwltool` execution path or an explicitly generic runner. This is a real
  architecture finding this pipeline exposes that the Galaxy pipelines don't.

## What a first walk needs

Collected from the **blocks on** notes above — the minimum to make even the demo
case walkable end-to-end:

1. Real bodies + `eval.md` oracles for [[summarize-cwl-tool]] and
   [[implement-cwl-tool-step]] (the per-tool authoring loop).
2. A failure-classification rubric for [[validate-cwl]] and a real body for
   [[implement-cwl-workflow-test]].
3. A decision on **CWL tool reuse vs author** — there is no [[discover-shed-tool]]
   analog; `bio-cwl-tools` is a pinned fixture but nothing looks it up.
4. A decision on the **CWL run path** — [[run-workflow-test]] is Planemo-oriented;
   CWL execution via cwltool is unowned.

Until (1)–(2) land, the tractable near-term move is the **partial walk** of the
demo case through the real extraction/design chain (summary → interface →
data-flow → template), stopping at the first placeholder CommandLineTool step.
