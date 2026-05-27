---
mold: compare-against-iwc-exemplar
date: 2026-05-11
intent: 5-step CWL→Galaxy emulation on hubmapconsortium/salmon-rnaseq pipeline.cwl
decision: eval-add
---

## What worked

- Local IWC mirror (`~/projects/repositories/workflow-fixtures/iwc-format2/`) was already populated; reuse case (eval "IWC clone reuse") passed.
- "No single exemplar covers the whole workflow" framing emerged honestly — the brief carved the pipeline into three slices (fastq-to-matrix front-half, scanpy-clustering back-half, velocity branch) and matched each independently. None forced a high-confidence claim.
- Concrete IWC reference workflows (10x v3, scanpy-clustering, velocyto) gave actionable structural guidance to the downstream template Mold — especially the `pick_value` idiom and `map_param_value`-for-version-switching pattern.

## Gaps surfaced

1. **`eval.md` has zero CWL-flavored cases.** Same finding as the ga4gh run. Every existing case (`nf-core rnaseq`, `nf-core viralrecon`, `nf-core mag`, `no acceptable exemplar`, `IWC clone reuse`) is nf-core-flavored; only `IWC clone reuse` is fixture-agnostic enough to apply to a CWL run. This run is unscored against the eval. Add at minimum:
   - "CWL scRNA-seq workflow nearest exemplar" — expected to surface the scRNAseq subdirectory exemplars at medium confidence and call out the slice-by-slice mismatch.
   - "CWL multi-slice translation" — when the source pipeline has no single IWC analogue but multiple partial analogues, the brief should *not* force one exemplar.

2. **No IUC Salmon-Alevin scRNA-seq workflow in the local mirror.** I asserted this from the local clone only. Worth a quick GitHub-side check to confirm before refining; if absent, the Mold should surface "no exemplar for primary tool family" as a low-confidence ranking signal, not as a Mold gap.

3. **The brief leaned on tool selection (IUC `pick_value`, `map_param_value`) that the data-flow brief did not name.** This is fine — IWC comparison is the natural place to suggest IUC tools — but it crosses into territory the data-flow Mold deliberately keeps neutral on (no invented tool IDs). The boundary between "IWC comparison may name tools" and "data-flow stays neutral" is implicit; worth a short sentence in the Mold procedure.

## Open questions

- Add a CWL-flavored case set to `eval.md`? Recommend yes.
- Is the "name IUC tools observed in nearest exemplars" boundary deliberate? Document either way.
