---
name: find-test-data
description: "Search IWC fixtures and public sources for test data matching a data-flow shape."
---

# find-test-data

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Search IWC fixtures and public sources for test data matching a data-flow shape.

## Inputs

- No upstream artifact inputs declared. See the procedure for user-supplied runtime inputs.

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

Resolve concrete test data for the workflow's inputs. Read the upstream data-flow / interface brief, and for each workflow input search the IWC corpus and public sources for data that matches its Galaxy collection shape and datatype. Emit `test-data-refs.json`: one entry per input, each carrying a URL or path plus the expected shape, ready for implement-galaxy-workflow-test to stage.

This skill is the first leg of the harness's `test-data-resolution` branch. It resolves what it can and reports gaps; the harness routes any unresolved input to the `user-supplied` fallthrough. Deciding to ask the user is a harness concern, not this skill's — its job is an honest, source-backed match.

### Sequence

1. **Read the brief.** From the data-flow / interface brief, enumerate the workflow inputs: label, Galaxy collection shape (File / list / paired / list:paired / record), and datatype.
2. **Search IWC fixtures first.** Prefer existing IWC test data for the same domain — it already conforms to the conventions in iwc-test-data-conventions (remote URL, recorded hash, known collection layout). A near-neighbour IWC workflow's `-tests.yml` is the strongest source.
3. **Fall to public sources.** When no IWC fixture fits, look for small public data (Zenodo, reference data archives) sized for a fast test run, matching the datatype and shape.
4. **Emit refs.** Write one `test-data-refs.json` entry per input: the URL/path, the expected Galaxy shape, datatype, and integrity hash when known. Per galaxy-workflow-testability-design, make sure each entry maps to an addressable input label.
5. **Report gaps.** For any input with no acceptable match, emit the input with `resolved: false` and a short reason rather than a guessed URL. These are what the harness hands to `user-supplied`.

### No fabrication

Never invent a URL, accession, or path to make an input look resolved. A wrong-but-plausible fixture reference is worse than an honest gap: it survives static checks and fails only at run time, far from this skill. Every emitted ref must point at data that exists; everything else is a reported gap.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
