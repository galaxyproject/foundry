# compare-against-iwc-exemplar eval

Evaluation plan for the `compare-against-iwc-exemplar` Mold. This file is the
**abstract oracle**: properties any run must satisfy, independent of which
design briefs or IWC corpus snapshot it ran against. Concrete fixtures and their
expected exemplars, confidence levels, and cited alignments live in
`scenarios.md`; the oracle here is applied to whatever a scenario produces.
Properties are tagged by bucket:

- **fidelity** — does the selection and diff faithfully reflect the briefs and the corpus?
- **handoff** — does the run surface the verdict and the exemplar view forward without silent loss?
- **corpus-reuse** — does repeated corpus access stay idempotent and offline-tolerant?

## Property: a nearest exemplar is selected with a confidence level and citation

- bucket: handoff
- check: deterministic
- assertion: when a nearest exemplar exists the run names exactly one selected
  exemplar, assigns it a confidence level (High / Medium / Low), and cites the
  abstract IWC workflow ID. The verdict is explicit and reviewable, never left
  as implicit prose.

## Property: selection is domain-aligned and confidence is justified

- bucket: fidelity
- check: llm-judged
- assertion: the selected exemplar shares the briefs' domain or analysis intent
  and input topology rather than only generic tooling, and the assigned
  confidence is consistent with the Feature-Hierarchy alignment — a partial
  tool-family or output match is not promoted to High. A structurally similar
  workflow in the wrong science area is not surfaced as a high-confidence
  exemplar.

## Property: the structural diff names real alignments and mismatches

- bucket: fidelity
- check: llm-judged
- assertion: the comparison notes call out the concrete points of alignment and
  the concrete divergences between the briefs and the selected exemplar (tool
  families, collection topology, DAG motifs, output/report shape, workflow
  scope), grounded in the briefs and the corpus rather than asserted generically.

## Property: no exemplar is forced when the corpus lacks a close match

- bucket: handoff
- check: deterministic
- assertion: when no candidate aligns on domain or topology, the run returns an
  explicit "no nearest exemplar" verdict instead of forcing a nearest, and lists
  the top weak candidates with rationale. The fallback is a stated outcome, not a
  silent high-confidence pick.

## Property: generic-tool overlap alone does not earn high confidence

- bucket: fidelity
- check: llm-judged
- assertion: candidates that share only generic or utility tools with the briefs
  are refused High confidence; tool-overlap-only similarity is reported as a weak
  candidate, not a domain exemplar.

## Property: a selected exemplar surfaces a gxformat2 view forward

- bucket: handoff
- check: deterministic
- assertion: on a High- or Medium-confidence selection the run writes the cleaned
  gxformat2 [[iwc-exemplar-gxformat2]] sibling artifact for the exemplar's
  relevant subgraph and inlines a bounded excerpt of that subgraph under a
  labeled section in the [[iwc-comparison-notes]] artifact, citing the abstract
  IWC workflow ID and the step labels the excerpt covers. The view is the
  relevant subgraph, not the whole workflow.

## Property: the inlined excerpt is the relevant subgraph

- bucket: fidelity
- check: llm-judged
- assertion: the inlined gxformat2 excerpt is the slice that matches the briefs'
  structure and stays size-bounded; it is not the entire workflow and not an
  unrelated subgraph.

## Property: a no-match result emits no exemplar view

- bucket: handoff
- check: deterministic
- assertion: when the verdict is "no nearest exemplar" the run emits neither the
  [[iwc-exemplar-gxformat2]] sibling artifact nor an inline gxformat2 excerpt in
  the [[iwc-comparison-notes]] notes.

## Property: corpus access reuses the local clone and tolerates offline

- bucket: corpus-reuse
- check: deterministic
- assertion: a repeat invocation against an IWC URL whose corpus is already
  present pulls and merges into the existing local clone instead of re-cloning,
  and proceeds without network errors when offline if the local clone is current.
