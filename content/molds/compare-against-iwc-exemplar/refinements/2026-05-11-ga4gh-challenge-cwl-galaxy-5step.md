---
mold: compare-against-iwc-exemplar
date: 2026-05-11
intent: 5-step CWL→Galaxy emulation on Barski-Lab/ga4gh_challenge biowardrobe_chipseq_se.cwl
decision: eval-add
---

## What worked

- Procedure adapted cleanly from a CWL-source brief. The Feature Hierarchy (domain → topology → tool family → DAG → outputs → tests) drove a useful structural diff against `epigenetics/chipseq-sr`.
- Routing-findings categories (template/data-flow, pattern, tool-step, test) mapped 1:1 to actionable handoffs for the downstream template skill and for future pattern work.
- "No tool discovery" non-goal held: I named IUC candidates ("`iuc/macs2`", "`devteam/bowtie2`") at the candidate level only, not at the `tool_id` level.

## Gaps surfaced

1. **Eval has zero CWL-source cases.** `eval.md` currently contains five cases:
   - `nf-core rnaseq nearest exemplar`
   - `nf-core viralrecon nearest exemplar`
   - `nf-core mag nearest exemplar`
   - `no acceptable exemplar`
   - `IWC clone reuse`

   The first four are Nextflow-flavored; the fifth is source-agnostic. The Mold is positioned in three pipelines (`nextflow-to-galaxy`, `cwl-to-galaxy`, `paper-to-galaxy`) but only one is exercised by eval. This run was unscored on every domain-specific case. **Recommend adding at least one CWL-source case** (ChIP-seq, RNA-seq, or metagenomics) so CWL drift is caught by eval.

2. **CWL-specific feature: nested workflow boundary.** The fixture's nested `#bam-bedgraph-bigwig.cwl` is a CWL idiom that has no direct nf-core analog (Nextflow subworkflows live in a different place in the source structure). The IWC comparison surfaced "inline as three Galaxy steps" as the right move, but the routing-findings vocabulary doesn't have a category for "this CWL nested-workflow boundary should be inlined vs. authored as a Galaxy sub-workflow." Consider whether nested-workflow handling needs to be a separate finding type or whether the existing template/data-flow category absorbs it cleanly.

3. **Faithful-conversion vs IWC-alignment is recurring.** Five of six routing findings in this run were of the form "the source CWL does X; the IWC chipseq-sr does Y; pick fidelity or alignment." This is the central tension when converting a real foreign workflow, but the current procedure doesn't name it. Worth adding to the Mold's prose: "When the source pipeline diverges from the IWC exemplar, name the fidelity-vs-alignment tradeoff and let the template skill decide per step rather than picking globally."

## Open questions

- Add a CWL eval case keyed on `epigenetics/chipseq-sr` and the ga4gh_challenge fixture? Or wait until the corpus has more CWL emulation runs?
- Promote the faithful-vs-aligned framing to a first-class section in the SKILL.md procedure?
- Should "Directory → reference data table" be surfaced as a candidate pattern page from this Mold's routing findings, or is that a step too far?
