# IWC Exemplar Comparison — cwl-userguide-1st-workflow

## Verdict: **No nearest exemplar**

The candidate workflow's domain (Java source compilation, generic file-archive extraction) sits entirely outside IWC's curated bioinformatics corpus. Searches against `~/projects/repositories/workflow-fixtures/iwc-format2/` for "javac", "compile", and "tar extract" returned zero matches. No domain alignment + no tool-family alignment + no DAG motif alignment ⇒ classifying anything as "nearest" would be misleading.

## Searches performed

- Substring match across `iwc-format2/` for: `javac`, `java compile`, `compile.*class`, `tar.*extract`. No hits.
- Quick scan of top-level domains: `amplicon`, `bacterial_genomics`, `comparative_genomics`, `computational-chemistry`, `data-fetching`, `epigenetics`, `genome_annotation`, `genome-assembly`, `imaging`, `metabolomics`, … all bioinformatics. None plausible as a domain match.

## Feature hierarchy walk

1. **Domain / analysis intent** — fail. This is a teaching example for archive extraction → Java compilation. IWC corpus is bioinformatics-only.
2. **Input collection topology** — generic 2-input linear flow (one File, one string). Topology shape is too thin to differentiate.
3. **Primary tool families** — `tar`, `javac`. Neither family appears in IWC.
4. **DAG motifs** — trivial linear two-step, no scatter/conditional/fan-in.
5. **Output types** — `*.class` binary; no IWC analogue.
6. **Test style** — fixture's `1st-workflow-job.yml` is a CWL job file; not directly mappable to IWC test conventions.

## Findings & routing forward

- **Template skill (`cwl-summary-to-galaxy-template`)**: proceed without an exemplar floor. Emit a gxformat2 skeleton that mirrors the CWL graph 1:1 (two steps, scalar inputs, single output). Mark both steps as `TODO: discover-or-author`. Do not borrow structural choices from an unrelated IWC workflow.
- **Pattern issue**: none — no Galaxy idiom recurs here.
- **Tool-step issue**: high probability both steps go through `author-galaxy-tool-wrapper` rather than `discover-shed-tool`. Surface this so the per-step loop budgets wrapper-authoring time. The `tar` extraction case might find a Galaxy wrapper for archive extraction, but member-selected extraction is the unusual shape.
- **Test issue**: defer to `cwl-test-to-galaxy-test-plan`. The CWL job fixture provides inputs but no expected outputs; the test plan will need to define an assertion strategy from scratch (e.g., assert `compiled_class` is non-empty, or has the `.class` extension).

## Anti-pattern checks

None to flag — the design briefs propose no shortcuts that would clash with IWC conventions, since the workflow falls outside the corpus entirely.

## Confidence

- **Comparison verdict**: high (the absence is well-supported by direct searches).
- **Recommendation to proceed without exemplar**: high.

## Open questions

- Should the Foundry capture "no nearest exemplar" as a first-class signal that the harness can use to short-circuit a real-corpus comparison run? Currently it's just a free-text verdict.
- For non-bio CWL test fixtures like this one, is there value in *any* generic-Galaxy comparator (e.g., "linear two-step custom-wrapper workflows"), or should the skill just emit "no exemplar" and stop?
