---
name: cwl-to-test-data
description: "Resolve a CWL workflow's own declared test cases into Galaxy workflow test-data refs."
---

# cwl-to-test-data

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Resolve a CWL workflow's own declared test cases into Galaxy workflow test-data refs.

## Inputs

- Read artifact `summary-cwl`. Schema: summary-cwl. Produced by `summarize-cwl`. Structured CWL summary from summarize-cwl; carries the source's test cases (`tests[]`) — each a `job_path` (a CWL job file naming the test inputs) plus `expected_outputs`.
- Read artifact `cwl-galaxy-interface`. Produced by `cwl-summary-to-galaxy-interface`. Galaxy interface brief from cwl-summary-to-galaxy-interface pinning the workflow input labels, collection shapes, and datatypes each resolved fixture must map onto.

## Outputs

- Write artifact `test-data-refs` as `test-data-refs.json`. Format: `json`. Test data resolved from the CWL source's declared test cases, expressed as URLs/paths plus expected shapes for downstream test authoring. Shared id with find-test-data — the branch's search fallback fills only the inputs this Mold leaves unresolved.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/schemas/summary-cwl.schema.json`: Schema file copied verbatim into the bundle. Input contract: read `tests[]` — each case's `job_path` inputs and `expected_outputs` — as the declared source of test data.

## Load On Demand

- `references/notes/component-cwl-workflow-anatomy.md`: Research note copied verbatim into the bundle. Interpret a CWL job file's input objects (File/Directory, secondaryFiles, arrays, inline literals) before mapping them onto Galaxy inputs. Use when: reading a `job_path`'s declared inputs to decide their Galaxy shape.
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Map each declared job input to an addressable Galaxy input label and the collection shape it must populate. Use when: mapping a CWL File-array or secondaryFiles input onto a Galaxy collection shape.
- `references/notes/iwc-test-data-conventions.md`: Research note copied verbatim into the bundle. Express each ref remote-URL-first with SHA-1 integrity and per-input collection layout when recording resolved fixtures. Use when: writing each `test-data-refs` entry.

## Validation

- None declared.

## Procedure

Resolve the CWL workflow's own declared test cases into Galaxy `test-data-refs`. The CWL summary carries the source's test cases (`tests[]`) — each a `job_path` (a CWL job file naming the test inputs) plus `expected_outputs`. Read the declared inputs and map them onto the Galaxy workflow's inputs, emitting one ref per input, ready for implement-galaxy-workflow-test to stage.

This skill is the source-specific first leg of the harness's `test-data-resolution` branch. It resolves what the CWL source itself declares; any input it cannot resolve from a declared test case stays a reported gap and the harness falls through to find-test-data (search), then to `user-supplied`. Deciding to fall through is a harness concern, not this skill's — its job is an honest map of the source's own test cases.

### Sequence

1. **Enumerate Galaxy inputs and their required shape.** From the interface brief, list each workflow input: label, Galaxy collection shape (File / list / paired / list:paired / record), and datatype. This is the *target shape* every ref must satisfy.
2. **Read the declared test cases.** From the summary's `tests[]`, read each case's `job_path` inputs — File/Directory objects with their `location`/`path`, `secondaryFiles`, arrays, and inline literals — plus `expected_outputs`. Prefer the case whose inputs best cover the workflow's inputs.
3. **Map each declared input onto a Galaxy input.** Match by id and shape onto the interface's input labels. A CWL File array maps to a Galaxy list; a File carrying `secondaryFiles` may map to a record or composite datatype — record element identifiers and any prep needed to reach the Galaxy collection shape (galaxy-workflow-testability-design).
4. **Emit refs.** Write one `test-data-refs.json` entry per resolved input: prefer a remote `location` URL when the job references one (remote-URL-first, iwc-test-data-conventions); fall back to the in-tree `path` plus provenance only when no URL is published. Carry datatype, collection element identifiers, and any subset/split prep. Each entry maps to an addressable workflow input label.
5. **Report genuine gaps.** An input with no declared test-case input of the right shape stays `resolved: false` with a reason — this is what the harness hands to find-test-data. Do not search public sources here; searching is find-test-data's job, not this skill's.

### No fabrication

Never invent a URL, accession, or path, and never emit a placeholder for an input you could not resolve from a declared test case. A declared input with no published URL is recorded by its in-tree `path` plus provenance, not papered over with a guessed URL. Every emitted ref points at data the source actually declares; everything else is an honest gap for the next leg of the branch.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
