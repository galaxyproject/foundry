---
mold: cwl-summary-to-galaxy-data-flow
date: 2026-05-11
intent: 5-step CWL→Galaxy emulation on hubmapconsortium/salmon-rnaseq pipeline.cwl
decision: schema-change
---

## What worked

- The brief consumed both the interface brief and the `summary-cwl.json` graph cleanly for the *main* workflow.
- The `when:` / `pickValue` translation framing in `cwl-when-pickvalue-to-galaxy-branching` mapped onto the salmon-rnaseq case naturally: collapse-into-single-parameterized-tool was the obvious recommendation once the branch was visible.
- The downstream template Mold consumed the brief without re-asking for collection-shape, topology, or branch-handling decisions.

## Gaps surfaced

1. **Nested-workflow `when:` / `pickValue` invisible from the summary.** This is the same root cause as the matching `summarize-cwl` refinement, but it bit hardest in this Mold. The whole point of the data-flow brief is to surface translation pressure: scatter, when, pickValue, ExpressionTool, secondaryFiles. Of those, this fixture has all of them concentrated inside `steps/salmon-quantification.cwl` — and the summary surfaced none. I had to drop down to raw CWL to write the brief honestly. Two `eval.md` cases are at risk: "pickValue is not silently dropped" and "ExpressionTool steps surface as placeholders". A faithful run of *this* Mold can pass those cases only if the upstream summary actually carries the markers.

   The data-flow Mold's procedure should either (a) require that the summary carry nested-workflow internals (and refuse to operate if it doesn't), or (b) acknowledge the source CWL as a fallback input and document the fallback. (a) is the right answer; the Mold is the consumer that breaks first when the contract is incomplete.

2. **`Directory` → Galaxy collection shape is underspecified.** The reference note `galaxy-collection-semantics.md` covers list / paired / list:paired / paired_or_unpaired / sample_sheet, but does not have a worked recipe for CWL `Directory` / `Directory[]` inputs. The brief recommends `list:list` (and then the IWC comparison brief flipped that to `list:paired`). The Mold has to make a guess here. A short reference note `cwl-directory-to-galaxy-collection.md` covering the four common cases (`Directory`, `Directory[]`, `Directory?`, `Directory` + scatter) would prevent the guess.

3. **No native gxformat2 `when:` is hard to express clearly.** The brief acknowledged Galaxy's lack of step-level conditional execution but the framing for "use optional outputs and let absent ones be empty" is fragmented across `galaxy-collection-semantics.md` and `cwl-when-pickvalue-to-galaxy-branching.md`. The latter focuses on `when:` driven by *input topology* (paired vs unpaired reads), not by *parameter values* (organism=human|mouse). A reference note (or a section in the existing one) covering "parameter-driven when:" specifically would help.

## Open questions

- Should this Mold's procedure declare a hard precondition: nested-workflow internals must be in the summary, or operation halts?
- Worth a focused `cwl-directory-to-galaxy-collection.md` note (4 shapes × 2 contexts) or a section in the existing `galaxy-collection-semantics.md`?
- Where should "parameter-driven `when:` translation" live — extend `cwl-when-pickvalue-to-galaxy-branching.md` or add a sibling note?
