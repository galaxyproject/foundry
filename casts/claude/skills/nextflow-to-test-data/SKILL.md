---
name: nextflow-to-test-data
description: "Resolve a Nextflow pipeline's own declared test fixtures into Galaxy workflow test-data refs."
---

# nextflow-to-test-data

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Resolve a Nextflow pipeline's own declared test fixtures into Galaxy workflow test-data refs.

## Inputs

- Read artifact `summary-nextflow`. Schema: summary-nextflow. Produced by `summarize-nextflow`. Structured Nextflow summary from summarize-nextflow; carries the enumerated `test_candidates[]` and explicit `test_selection`, with each candidate input represented by a role plus url/path, sha1, and filetype.
- Read artifact `nextflow-galaxy-interface`. Produced by `nextflow-summary-to-galaxy-interface`. Galaxy interface brief from nextflow-summary-to-galaxy-interface pinning the workflow input labels, collection shapes, and datatypes each resolved fixture must map onto.

## Outputs

- Write artifact `test-data-refs` as `test-data-refs.json`. Format: `json`. Test data resolved from the pipeline's declared fixtures, expressed as URLs/paths plus expected shapes for downstream test authoring. Shared id with find-test-data — the branch's search fallback fills only the inputs this Mold leaves unresolved.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/schemas/summary-nextflow.schema.json`: Schema file copied verbatim into the bundle. Input contract: read `test_selection` and the chosen `test_candidates[].inputs[]` — role, url/path, sha1, filetype — as the declared source of test data.

## Load On Demand

- `references/notes/component-nextflow-testing.md`: Research note copied verbatim into the bundle. Interpret nf-test profiles and fixture conventions before mapping declared fixtures onto Galaxy inputs. Use when: `test_selection` requires a scope choice or the selected candidate does not cover every workflow input.
- `references/notes/component-nextflow-testing.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/component-nextflow-testing.md`; read it where that note directs.
- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Map each declared fixture to an addressable Galaxy input label and the collection shape it must populate. Use when: mapping a declared fixture (often a samplesheet-driven input) onto a Galaxy input's collection shape.
- `references/notes/iwc-test-data-conventions.md`: Research note copied verbatim into the bundle. Express each ref remote-URL-first with SHA-1 integrity and per-input collection layout when recording resolved fixtures. Use when: writing each `test-data-refs` entry.

## Validation

- None declared.

## Procedure

Resolve the Nextflow pipeline's own declared test fixtures into Galaxy `test-data-refs`. The Nextflow summary carries every statically visible whole-pipeline case in `test_candidates[]` and records the default decision in `test_selection`. Each candidate owns its effective profiles, parameter delta, inputs, outputs, execution mode, scope, and assertions. Map the selected candidate's inputs onto the Galaxy workflow and emit one ref per input, ready for implement-galaxy-workflow-test to stage. If selection is unresolved, surface that scope decision before resolving data rather than silently choosing by profile name.

This skill is the source-specific first leg of the harness's `test-data-resolution` branch. It resolves what the pipeline itself declares; any input it cannot resolve from a declared fixture stays a reported gap and the harness falls through to find-test-data (search), then to `user-supplied`. Deciding to fall through is a harness concern, not this skill's — its job is an honest map of the pipeline's own fixtures.

### Sequence

1. **Enumerate Galaxy inputs and their required shape.** From the interface brief, list each workflow input: label, Galaxy collection shape (File / list / paired / list:paired / record), and datatype. This is the *target shape* every ref must satisfy.
2. **Resolve the candidate.** Read `test_selection`. If it names a candidate, collect that candidate's declared inputs: `role`, `url`/`path`, `sha1`, `filetype`, and description. If it reports `needs-scope-choice`, compare the candidates' scope, execution mode, and input coverage and record the caller's choice; do not infer scale or representativeness from a profile name alone.
3. **Map each declared fixture onto a Galaxy input.** Match by role and shape onto the interface's input labels. A samplesheet-driven Nextflow input often expands into a Galaxy collection — record the element identifiers and any split/concatenation prep needed to reach the Galaxy collection shape (galaxy-workflow-testability-design).
4. **Emit refs.** Write one `test-data-refs.json` entry per resolved input: prefer the declared remote `url` + `sha1` (remote-URL-first, iwc-test-data-conventions); fall back to the in-tree `path` plus provenance only when no URL is published. Carry datatype, collection element identifiers, and any subset/split prep. Each entry maps to an addressable workflow input label.
5. **Report genuine gaps.** An input with no declared fixture of the right shape stays `resolved: false` with a reason — this is what the harness hands to find-test-data. Do not search public sources here; searching is find-test-data's job, not this skill's.

### No fabrication

Never invent a URL, accession, or path, and never emit a placeholder for an input you could not resolve from a declared fixture. A declared fixture with no published URL is recorded by its in-tree `path` plus provenance, not papered over with a guessed URL. Every emitted ref points at data the pipeline actually declares; everything else is an honest gap for the next leg of the branch.

## Feedback Mode

- Feedback mode is off unless the caller explicitly enables `--feedback` or supplies a feedback-ledger path.
- When enabled, read `_feedback.md` before doing the work and use its registered `foundry-feedback.ledger.yml` protocol.
- Preserve harness-owned run and phase state. Append only concrete observations about a canonical Foundry source asset or a related project that this run showed to be at fault; do not put ordinary workflow requirements in this ledger.
- Before reporting completion, make one explicit pass over the work you just did. Do not ask yourself whether anything was unclear — recall what happened: where you guessed at something the instructions should have settled, needed information this bundle does not carry, hit an instruction that contradicted another or contradicted the artifacts in front of you, used a packaged reference that did not cover your case, or did something the procedure never describes.
- Append an entry for each such event that clears the protocol's bar. If none do, append nothing and report `no feedback` explicitly. Silence and a clean pass are not the same thing, and nothing downstream can tell them apart unless you say which one it was.
- Pass the same ledger path to any subagent used for this work, and merge updates serially so one writer cannot overwrite another.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
