---
type: research
subtype: component
title: "Nextflow conditional to Galaxy subworkflow / when"
tags:
  - research/component
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-08
revised: 2026-05-08
revision: 1
ai_generated: true
related_notes:
  - "[[nextflow-to-galaxy-reference-data-mapping]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
  - "[[summary-nextflow]]"
  - "[[gxformat2-schema]]"
related_molds:
  - "[[nextflow-summary-to-galaxy-data-flow]]"
  - "[[nextflow-summary-to-galaxy-template]]"
sources:
  - "https://github.com/galaxyproject/gxformat2"
  - "https://github.com/iwc-workflows"
summary: "Stub. Translate Nextflow conditionals into Galaxy `when:` (single-workflow v1). Subworkflow vs inline is an aesthetic call, not a rule."
---

# Nextflow conditional to Galaxy subworkflow / when

Stub. Surfaced from sarek emulation (2026-05-08). Companion to [[nextflow-to-galaxy-reference-data-mapping]] — same v1 posture (one Galaxy workflow per source pipeline; trench-coat shape is acceptable as a draft for human review), different gap (control flow rather than reference data).

## Posture

For v1 of the Nextflow-to-Galaxy translation Molds the output is a single Galaxy workflow per source pipeline, even when the source has substantial branching. IWC reviewers historically prefer sibling workflows for what looks like one pipeline with toggles, and we agree; but for the *translation step* a single artifact keeps the Mold pipeline deterministic, the harness simple, and the reviewer's mental model of "this draft maps 1:1 to the source" intact. Sibling-extraction is a polish pass a human or follow-up Mold runs *after* translation, not a decision the translation Mold makes.

The question this note addresses is: given that v1 is one Galaxy workflow, *how* should source conditionals translate? The two structural tools available are:

- **Inline `when:` on a tool step.** Step runs or doesn't, based on an ECMAScript 5.1 expression over workflow inputs. Lightweight; doesn't change the DAG shape.
- **`when:` on a subworkflow step.** A bundle of steps runs or doesn't as a unit. Adds a subworkflow boundary and the wiring overhead that comes with it (typed inputs, typed outputs, explicit pass-through). When the parent's `when:` is false the inner steps inherit the skip via the engine's `when_values` propagation.

Both are first-class in gxformat2. Schema definition: `gxformat2/schema/gxformat2_strict.py:354` (`when: None | str = Field(...)`, "If defined, only run the step when the expression evaluates to `true`. If `false` the step is skipped. A skipped step produces a `null` on each output."). The note is about choosing between them.

## This is an aesthetic call, not a rule

The translation Mold should not apply a hard threshold ("3 steps cascade → subworkflow"). It should make a *design* decision, weighing several pieces of evidence each time. The intent is to make the Galaxy draft read well to a human reviewer — which means matching source structure where the source structure is meaningful, and flattening it where the source is over-structured for what the conditional actually gates.

The agent producing the data-flow brief should reach for the heuristics below, surface its reasoning briefly in the brief itself ("treated `aligner` as inline `when` because the swap touches only `align` and the merge fan-in is one step"), and let the human review the call.

## Evidence that points toward a subworkflow `when:`

- **Source already uses a subworkflow boundary for this conditional.** If the source pipeline scopes the gated work inside a named Nextflow `workflow` or `subworkflow` block — `BAM_VARIANT_CALLING_GERMLINE_ALL`, `PREPARE_INTERVALS`, `FASTQ_PREPROCESS_PARABRICKS` — that's the strongest signal. The source author already decided this work is a coherent unit. Reusing the subworkflow boundary preserves their structural intent and gives a Galaxy reviewer something to recognize. (Sarek's `wes` toggle is the canonical example.)
- **The cascade is wide.** Many downstream steps depend on the gated work, and gating each one inline would smear the conditional across the workflow. A subworkflow consolidates the conditional to one boundary.
- **The gated work has a small typed interface.** A handful of inputs in, a handful of outputs out, no fan-in/fan-out gymnastics. Subworkflow boundaries shine when the wiring at the boundary is simple.
- **The gated work is internally cohesive.** Several steps that obviously belong together (alignment + post-alignment indexing + alignment-QC). The boundary is recognizable independent of the conditional.

## Evidence that points toward inline `when:` (no subworkflow)

- **The cascade is short.** One or two steps. Wrapping two steps in a subworkflow adds boundary wiring that costs more than it earns. Two `when:`-gated parallel tool steps + a merge at the rejoin point reads cleaner.
- **Designing a subworkflow would introduce many delicate connections.** If the gated work splices into several upstream channels and produces several outputs that propagate further, the subworkflow's typed interface ends up wide and brittle. Every shared upstream input becomes a `take:` slot; every shared downstream output becomes an `emit:` slot. Two minor changes to the surrounding pipeline now require three changes to the subworkflow signature. Inline `when:` keeps those connections in the main workflow where they already live.
- **The source doesn't structure this work as a subworkflow.** A bare `if (params.aligner == 'parabricks') { PARABRICKS_FQ2BAM(...) } else { BWA_MEM(...) }` inside the main workflow body — no source-level subworkflow boundary, no cohesion signal. Manufacturing a Galaxy subworkflow for it imposes structure the source author rejected.
- **The conditional is a pure tool-swap, not a phase swap.** "Use parabricks instead of bwa-mem" replaces one process with another. Two `when:`-gated alignment steps + a merge captures this exactly. A subworkflow per branch would add ceremony around something that's structurally one step.

## Mixed signals — examples worth thinking through

These are the cases where the call is genuinely judgment, and an agent rendering this note should expect to weigh tradeoffs case by case:

- **Sarek `aligner` (bwa-mem | bwa-mem2 | dragmap | sentieon | parabricks).** Five-way. Source has `FASTQ_ALIGN_BWAMEM_MEM2_DRAGMAP_SENTIEON` as one subworkflow, plus a separate `FASTQ_PREPROCESS_PARABRICKS` because parabricks bundles align+sort+dedup. Mixed signal: the source leans subworkflow for four of the five, parabricks is its own beast. Probably means: subworkflow for the four-way alignment swap (matches source), a sibling `when:`-gated subworkflow step for parabricks (matches source). Inline `when:` would scatter five alignment tool choices through the main workflow body.
- **Sarek `wes`.** Two-way boolean. Source scopes WES handling inside `PREPARE_INTERVALS` and a few variant-calling internals. Strong "subworkflow `when:`" signal — source already structured it that way, cascade is wide, interface is narrow (intervals BED in, intervals BED out).
- **Sarek `tools` selector (variant callers).** Source scopes each caller in its own subworkflow (`BAM_VARIANT_CALLING_HAPLOTYPECALLER`, `BAM_VARIANT_CALLING_FREEBAYES`, …). Each caller's outputs land in a downstream merge. Strong "subworkflow `when:` per caller" signal — but the wiring at the merge is delicate (each branch contributes a different VCF format), so the merge step itself becomes the awkward part. Maybe the right answer here is sibling Galaxy workflows after all, even at v1 — flag for the human reviewer.

## Output fan-in: use `pick_value`, not a generic merge

Whichever shape we pick, the merge at the rejoin is where the awkwardness lands. Two `when:`-gated branches both producing a BAM need a downstream that consumes "whichever BAM ran." Galaxy ships an explicit primitive for this: the **`pick_value`** workflow module (`galaxy/lib/galaxy/workflow/modules.py:2062-2089`). It detects skipped inputs by checking `value.extension == "expression.json" and value.blurb == "skipped"` — i.e. the typed sentinel Galaxy writes when a step is skipped — and offers three modes:

- `first_non_null` — return the first non-skipped input.
- `first_or_skip` — return the first non-skipped input; if all are skipped, propagate the skip downstream.
- `the_only_non_null` — assert exactly one branch ran; error if zero or multiple did. Use this when the `when:` clauses are mutually exclusive by construction.

This is the structural primitive the heuristics above implicitly want. "Merge collections" / "Concatenate datasets" *also* tolerate skipped inputs (because Galaxy's connection layer resolves a skipped output to the typed `expression.json` sentinel and collection-construction tools tolerate it), but `pick_value` is the idiomatic choice when the semantics are "select the branch that ran" rather than "concatenate two collections that both ran."

Twin-downstream-cascade fallback (each branch carries its own downstream consumers, all `when:`-gated by the same expression) is the alternative when `pick_value` doesn't apply — typically because the gated branches produce *different* outputs that subsequent steps consume differently. DAG roughly doubles in width. Acceptable for a 1-step gated section; explosive for a 10-step gated section. This is the "many delicate connections" failure mode in the heuristics above.

When `pick_value` applies, prefer it. When it doesn't, the conditional probably wanted to be a subworkflow boundary anyway.

### IWC corpus precedent

IWC uses the `when:` + `pick_value` pattern in production. Two confirmed examples worth pointing at:

- `sars-cov-2-variant-calling/sars-cov-2-pe-illumina-artic-ivar-analysis/pe-wgs-ivar-analysis.gxwf.yml` — two parallel tool steps both gated by `when: $(inputs.when)` from a shared boolean, merged downstream with a `pick_value` step.
- `comparative_genomics/hyphy/capheine-core-and-compare.gxwf.yml` — multiple HyPhy analyses guarded by optional foreground/background booleans, merged downstream.

So `when:` + `pick_value` for branch selection is corpus-observed and IWC-acceptable. **What is *not* observed in IWC**: dynamic tool selection via `when:` (e.g. "run bwa-mem or parabricks based on a `tools` selector input"). Every IWC workflow commits to a fixed tool stack at authoring time. A Nextflow-to-Galaxy translation that surfaces aligner choice as a runtime `when:`-gated swap would be a novel pattern in IWC. The mechanism is well-supported by the engine; the precedent is missing. Worth flagging in any draft brief that proposes it: "this works mechanically, but IWC has no exemplar for tool-selection-via-when, and a reviewer may push back toward sibling workflows."

## Confirmed engine behavior

Subagent research on 2026-05-08 confirmed the following against Galaxy and gxformat2 source:

- **`when:` is supported on tool and subworkflow steps both.** Defined on the base `WorkflowStep` class in `gxformat2_strict.py`; both `module type="tool"` and `module type="subworkflow"` inherit it.
- **A skipped step produces typed null outputs, not missing outputs.** When `__when_value__` evaluates false, `galaxy/lib/galaxy/tools/execute.py:305-306` and `galaxy/lib/galaxy/tools/actions/__init__.py:751-760` mark the job `SKIPPED` and emit each output as a real HDA with `extension="expression.json"`, `blurb="skipped"`, and JSON content `null`. Galaxy can therefore distinguish "intentionally skipped" from "errored."
- **Downstream `in:` connections to a skipped output resolve to a `NO_REPLACEMENT` sentinel.** `galaxy/lib/galaxy/workflow/modules.py:502-530` (`replacement_for_connection`). Required tool inputs error on `NO_REPLACEMENT`; optional inputs and the `pick_value` module tolerate it.
- **A downstream step's own `when:` is evaluated *before* its inputs are fetched.** `galaxy/lib/galaxy/workflow/modules.py:2832-2859`. So a downstream `when:` that evaluates false short-circuits the dependency on a skipped upstream cleanly — the downstream step is itself skipped without the engine trying to resolve `NO_REPLACEMENT` inputs into a tool invocation.
- **Subworkflow `when:` cascades to inner steps via `when_values` propagation.** `galaxy/lib/galaxy/workflow/modules.py:874-906`. The inner steps inherit the outer skip; no manual fanout of the conditional through every inner step is needed.
- **`pick_value` is the documented merge primitive.** Three modes (`first_non_null`, `first_or_skip`, `the_only_non_null`) covered above.

The engine's design here is more deliberate and more tolerant than the working mental model assumed. The translation Mold can lean on it confidently.

## When this note's posture stops working

- **A pipeline whose conditionals don't cleanly bucket either way.** If the heuristics keep producing "mixed signals" across most conditionals, the source pipeline is probably one where sibling Galaxy workflows really are the right answer at v1, and the translation Mold should surface that as an Open Question on the brief rather than force one workflow.
- **Galaxy invocation engine doesn't behave the way this note assumes.** Confirmed against source on 2026-05-08; the engine is robust here. Risk reopens only if a future Galaxy refactor changes `when:` semantics or the `pick_value` module is deprecated.
- **A second Nextflow pipeline emulation surfaces a third pattern.** sarek covers tool-swap (`aligner`), boolean phase toggle (`wes`), and selector (`tools`). RNAseq might add quantifier choice (`salmon | star_salmon | hisat2`) — likely a subworkflow case but worth checking. Taxprofiler might add database-driven branching. New patterns sharpen the heuristics.

## Corpus footing

Thin. One pinned exemplar (`nf-core__sarek` 3.8.1) drove this stub. Promote out of `status: draft` after subagent research lands and after at least one more pipeline (rnaseq or taxprofiler) is emulated against the heuristics.
