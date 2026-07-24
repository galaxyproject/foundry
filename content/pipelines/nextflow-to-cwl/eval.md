# NEXTFLOW → CWL pipeline eval

Pipeline-level oracle for the NEXTFLOW → CWL journey. This judges the
**end-to-end** and **cross-step** properties no single Mold owns; each member
Mold's own `eval.md` still applies to its step's output (composition). Properties
are abstract — concrete journeys live in `scenarios.md`.

The CWL authoring tier this journey depends on is still nascent (see the maturity
note in `scenarios.md`), so today these properties are the **target** the walk is
gated against, not a suite the pipeline already passes.

## Property: the final CWL Workflow validates

- check: deterministic
- assertion: the emitted CWL Workflow (`class: Workflow`) and every
  CommandLineTool it references pass `cwltool --validate` and the schema lint in
  [[validate-cwl]]; no placeholder step, `TODO` sentinel, or unresolved `run:`
  target remains in the promoted workflow.

## Property: source scientific intent survives to the target

- check: llm-judged
- assertion: the primary data inputs, scientific outputs, and load-bearing
  branch/skip controls identified in the Nextflow summary appear in the final CWL
  Workflow — as workflow inputs, workflow outputs, `scatter`/`when` structure, or
  an explicit stated scope decision — and none is silently dropped or contradicted
  across the journey.

## Property: each handoff is consumable without re-derivation

- check: llm-judged
- assertion: every step consumes its declared upstream artifact without
  re-deriving it from the original Nextflow source — the interface brief binds to
  the summary, the data-flow brief to the interface, the template to the
  data-flow, and each CommandLineTool to its `cwl-tool-summary`. A step that must
  reach past its declared input surfaces the gap rather than silently
  re-summarizing the source.

## Property: the per-tool loop terminates at a real endstate

- check: deterministic
- assertion: the paired `[loop]` phases ([[summarize-cwl-tool]] →
  [[implement-cwl-tool-step]]) are judged at endstate, not per iteration: every
  placeholder step in the `cwl-workflow-draft` is replaced by a concrete
  CommandLineTool step with a resolved `run:` target before the journey proceeds
  to testing. Unlike the Galaxy spine's `gxwf draft-next-step` oracle, the CWL
  spine has no shared endstate oracle yet — this property names the endstate the
  tier must learn to detect.

## Property: every tool is a concrete, provenanced CommandLineTool

- check: llm-judged
- assertion: each tool step resolves to a concrete CommandLineTool carrying
  container or software provenance (`DockerRequirement` or `SoftwareRequirement`),
  traceable to the source module's `container` directive — authored fresh or
  reused from a CWL tool library — and no step leaves `baseCommand`/container
  unresolved or assumes a tool without recording the decision. This is the CWL
  analog of the Galaxy discover-or-author gate; there is no Tool Shed, so
  resolution is authoring-first.

## Property: NF test evidence reaches CWL assertions

- check: llm-judged
- assertion: the real nf-test fixtures carried by [[nextflow-test-to-cwl-test-plan]]
  reach [[implement-cwl-workflow-test]] as a job file plus expected-output
  assertions runnable under cwltool; test provenance (`source.derived_from:
  test-evidence`) is preserved across the handoff, not synthesized.
