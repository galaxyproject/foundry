---
name: find-test-data
description: "Search IWC fixtures and public sources for test data matching a data-flow shape."
---

# find-test-data

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Search IWC fixtures and public sources for test data matching a data-flow shape.

## Inputs

- Read artifact `freeform-summary`. Produced by `interview-to-freeform-summary`, `summarize-paper`. Source summary from summarize-paper / interview-to-freeform-summary; mine its sample-data, public-data-candidate, accession, and data-sizing guidance — this is where the source's dataset evidence lives (the design briefs strip it).
- Read artifact `summary-nextflow`. Schema: summary-nextflow. Produced by `summarize-nextflow`. Source summary from summarize-nextflow; mine its test_fixtures / sample-data evidence when running the NEXTFLOW → GALAXY pipeline.
- Read artifact `summary-cwl`. Schema: summary-cwl. Produced by `summarize-cwl`. Source summary from summarize-cwl; mine its test-data / sample-data evidence when running the CWL → GALAXY pipeline.
- Read artifact `freeform-galaxy-interface`. Produced by `freeform-summary-to-galaxy-interface`. Galaxy interface brief from freeform-summary-to-galaxy-interface pinning input labels, collection shapes, and datatypes for the PAPER / INTERVIEW → GALAXY pipelines.
- Read artifact `nextflow-galaxy-interface`. Produced by `nextflow-summary-to-galaxy-interface`. Galaxy interface brief from nextflow-summary-to-galaxy-interface pinning input labels, collection shapes, and datatypes for the NEXTFLOW → GALAXY pipeline.
- Read artifact `cwl-galaxy-interface`. Produced by `cwl-summary-to-galaxy-interface`. Galaxy interface brief from cwl-summary-to-galaxy-interface pinning input labels, collection shapes, and datatypes for the CWL → GALAXY pipeline.

## Outputs

- Write artifact `test-data-refs` as `test-data-refs.json`. Format: `json`. Test data matched from IWC fixtures or public sources, expressed as URLs/paths plus expected shapes for downstream test authoring.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- None declared.

## Load On Demand

- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Confirm the collection shapes and labels the resolved data must populate so downstream tests can address them. Use when: mapping an input label in the data-flow brief to a concrete file or collection of files.
- `references/notes/iwc-test-data-conventions.md`: Research note copied verbatim into the bundle. Match IWC test-data conventions — Zenodo/remote-URL first, SHA-1 integrity, per-input collection layout — when selecting or describing candidate fixtures. Use when: choosing where test data should come from or describing the shape a candidate file must have.

## Validation

- None declared.

## Procedure

Resolve concrete test data for the workflow's inputs. Read the interface brief for each input's Galaxy shape and datatype, **and the source summary for the data the source itself names** — then search IWC fixtures and public sources for data that matches. Emit `test-data-refs.json`: one entry per input, each carrying a URL or path plus the expected shape, ready for implement-galaxy-workflow-test to stage.

This skill is the first leg of the harness's `test-data-resolution` branch. It resolves what it can and reports gaps; the harness routes any unresolved input to the `user-supplied` fallthrough. Deciding to ask the user is a harness concern, not this skill's — its job is an honest, source-backed match.

### Sequence

1. **Enumerate inputs and their required shape.** From the interface brief, list each workflow input: label, Galaxy collection shape (File / list / paired / list:paired / record), and datatype. This is the *target shape* every match must satisfy.
2. **Mine the source summary for named data.** The interface and data-flow briefs are design artifacts — they deliberately drop dataset provenance. The source summary (`freeform-summary` / `summary-nextflow` / `summary-cwl`) is where the source names its data: sample-data locations, accessions, public-data candidates, fallback bundles, and sizing guidance ("one chromosome", "precomputed count matrix", "small subset"). Pull every candidate dataset and every data-sizing instruction the source gives.
3. **Match each named candidate against the required shape — and don't stop at a shape mismatch.** Check each candidate against step 1's target shape and datatype. A candidate that is the wrong *shape* (e.g. raw signal / reads named when the input is a count matrix) is **not** a resolution — but it is also **not** the end of the search. When the source's named candidates don't fit, follow the source's own guidance to the right-shape public artifact: if the source says the input is a precomputed count matrix, find the canonical public count matrix for that study/domain (GEO/ENCODE/ArrayExpress series, a published supplementary table) rather than reporting "no data." "Named candidates are the wrong shape" ≠ "no data exists."
4. **Search IWC fixtures and public sources.** Prefer existing IWC test data for the same domain — it already conforms to iwc-test-data-conventions (remote URL, recorded hash, known collection layout); a near-neighbour IWC `-tests.yml` is the strongest source. Otherwise resolve the right-shape public dataset found in step 3, sized for a fast test run.
5. **"Small" is a documented subset of a real source, not a fabricated stand-in.** When the source asks for a small fixture (one chromosome, selected loci, a few samples) and only a full real dataset exists, that input is **resolved**: record the real source URL plus the data-import-boundary prep needed to reach the small shape (row-subset by key, column/sample split into the collection's element identifiers). The prep is a note on the ref, not an analysis step and not an excuse to mark the input unresolved. Resolve the *data*; leave analysis parameters (factors, thresholds, reference levels, top-N) to the design skills — they are not this skill's to decide.
6. **Emit refs.** Write one `test-data-refs.json` entry per input: the URL/path, the expected Galaxy shape, datatype, element identifiers when it is a collection, integrity hash when known, and any subset/split prep. Per galaxy-workflow-testability-design, make sure each entry maps to an addressable input label.
7. **Report genuine gaps only.** Mark `resolved: false` with a reason **only** when steps 2–5 turn up no real source of the right shape — not merely because the source's first-named candidate was the wrong shape or because a real source needs a documented subset. These honest gaps are what the harness hands to `user-supplied`.

### No fabrication

Never invent a URL, accession, or path to make an input look resolved, and never emit a placeholder path (`sampleA.tabular`, `test-data/…`) for an input you could not resolve — an unresolved input stays `resolved: false` all the way through to the test, never papered over with a made-up path downstream. A wrong-but-plausible fixture reference is worse than an honest gap: it survives static checks and fails only at run time, far from this skill. Every emitted ref must point at data that exists (a real source, optionally plus a reproducible subset/split); everything else is a reported gap.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
