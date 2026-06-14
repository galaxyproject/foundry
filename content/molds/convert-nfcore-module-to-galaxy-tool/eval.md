# convert-nfcore-module-to-galaxy-tool eval

This file is the **abstract oracle** for the `convert-nfcore-module-to-galaxy-tool` Mold: properties any cast run must satisfy, independent of which module it ran on. Concrete module fixtures and their expected values live in `scenarios.md`; the oracle here is applied to whatever a scenario produces.

## Property: generated wrapper is complete

- check: deterministic
- assertion: the generated tool directory contains a complete Galaxy wrapper — local macros, provenance, requirements, inputs, outputs, and help — for any conforming module input; no required wrapper artifact is silently absent.

## Property: citations appear when source metadata provides them

- check: deterministic
- assertion: when the source module metadata supplies citation data, the generated wrapper carries citations; citations are omitted only because the source metadata lacks them, never silently dropped when present.

## Property: every shipped wrapper carries a runnable, fixture-backed test

- check: deterministic
- assertion: a shipped wrapper contains at least one runnable test; when the module source has no usable test fixture, the wrapper is not shipped with a placeholder test — the gap is surfaced rather than papered over.

## Property: convergence gates pass or leave structured artifacts

- check: deterministic
- assertion: `planemo lint` and `planemo test --test_output_json` either pass, or produce structured artifacts ready for focused repair; the loop never exits on an unstructured free-text signal.

## Property: wrapper is faithful to the underlying module, with divergence visible

- check: llm-judged
- assertion: the wrapper command, parameters, requirements, output declarations, test fixtures, and recorded provenance look faithful to the underlying Nextflow module. Any intentional divergence, unresolved mapping, or missing fixture is visible rather than silently papered over.
