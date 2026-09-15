---
type: research
title: "Selecting the first Nextflow test case"
tags:
  - source/nextflow
status: draft
created: 2026-09-15
revised: 2026-09-15
revision: 1
summary: "A deterministic policy for choosing the first whole-pipeline Nextflow test case without mistaking profile names for coverage."
sources:
  - "https://github.com/galaxyproject/foundry/issues/67"
  - "https://www.nf-test.com/docs/configuration/"
  - "https://www.nf-test.com/docs/cli/list/"
  - "https://www.nextflow.io/docs/latest/config.html#config-profiles"
related_molds:
  - "[[summarize-nextflow]]"
  - "[[nextflow-test-to-galaxy-test-plan]]"
  - "[[nextflow-test-to-cwl-test-plan]]"
related_notes:
  - "[[component-nextflow-testing]]"
  - "[[component-nextflow-inspect]]"
  - "[[open-requirements-ledger]]"
---

# Selecting the first Nextflow test case

The first translated test should be small enough to run during workflow construction while still exercising the scientific path the translated workflow claims to implement. Profile names help find candidates, but they do not establish either property.

This note owns **selection**. [[component-nextflow-testing]] owns fixture and assertion interpretation after a case has been selected. [[summarize-nextflow]] owns applying the selection policy because its singular `test_fixtures` field already commits downstream Molds to one candidate. The two Nextflow test-plan Molds consume that decision; they must not silently choose a different case. [[run-workflow-test]] is downstream of translation and sees a Galaxy or CWL test artifact, not a Nextflow profile, so it does not use this note.

## Unit of selection

A candidate is a whole-pipeline execution, not merely a profile name:

- for nf-test, one `test(...)` case inside a `nextflow_pipeline { ... }` suite, identified by file path and test name;
- otherwise, an explicitly selected profile or a resolved profile whose body-derived `kinds` contains `test`; or
- otherwise, a no-profile launch using the pipeline's declared parameter defaults.

Each candidate includes its effective profile chain, parameter delta, input fixtures, execution mode (`real` or `stub`), and the pipeline stages it enables or disables. Module- and subworkflow-scoped nf-tests are evidence about components, not candidates for the first whole-pipeline translation test.

Resolve an nf-test candidate's profiles in the order documented by nf-test: `nf-test.config` profile, suite/test-level `profile`, then CLI `--profile`. A later value replaces the prior value unless it uses nf-test's `+name` form to extend it. This is a resolution operation, not unconditional string concatenation. A CLI profile override changes the effective profiles of a selected nf-test case; it does not by itself identify which `test(...)` case to select. Resolve the resulting Nextflow configuration with Nextflow itself when available.

## Deterministic default rule

An explicit caller choice of test case wins. Without one:

1. Enumerate `test(...)` cases only from files containing a live `nextflow_pipeline { ... }` suite. Prefer `nf-test list --format json` for enumeration, then inspect the selected source file for profiles, params, assertions, and stub options.
2. Classify each candidate using the scale and coverage modifiers below. If exactly one primary-coverage candidate lives in `tests/default.nf.test` or `tests/main.nf.test`, select it. If neither canonical file contains a primary candidate but there is exactly one eligible whole-pipeline case overall, select that case.
3. If several whole-pipeline cases remain and none is uniquely canonical, return `needs-scope-choice` with the candidates and their differing science branches. Do not pick the alphabetically first test or shortest-looking profile.
4. If there are no whole-pipeline nf-test cases, select an explicit CLI profile when the caller supplied one. Otherwise filter the resolved `profiles[]` inventory to entries whose body-derived `kinds` contains `test`, then apply the scale and coverage modifiers below. Prefer the conventional name `test` only when it is in that filtered set and remains primary-coverage; if exactly one eligible profile remains, select it, and if several incomparable profiles remain, return `needs-scope-choice`.
5. Otherwise form a no-profile candidate from the pipeline's own parameter defaults. Select it only when all required launch inputs resolve to bundled or reachable fixtures. If required inputs remain unset, return `needs-scope-choice`; “no profile” is still the fallback candidate, but it is not proof of runnability.

Profile candidacy comes from the structured `profiles[]` inventory emitted by [[summarize-nextflow]], not from a name prefix or the presence of `conf/<name>.config`. Its `kinds`, `signals`, `includes`, and `source_path` make the body-derived classification auditable; confirm the inventory with `nextflow config -show-profiles` when available. A config file can exist without being wired into `profiles {}`, while a profile such as `mutect` can carry test input evidence without a `test*` name.

## Scale and coverage modifiers

`test_full`, `test_minimal`, and `test_tiny` are naming conventions observed in the pinned corpus, not Nextflow or nf-test semantics. They modify the default ranking; they are not unconditional exclusions.

- **`test_full`: reference-scale by default.** Do not auto-select it merely because it exists. Preserve it as a secondary candidate describing realistic scale. It may become the first target through an explicit caller choice or evidence that it is the only bounded case exercising the intended path.
- **`test_minimal` / `test_tiny`: inspect coverage.** Mark the case `bootstrap-only` when its parameter delta disables every core scientific stage or runs only stubs. Such a case can validate topology and plumbing, but it cannot be the sole acceptance target for a workflow claiming the disabled science. It may be the sole target when it still exercises the declared primary behavior, or when the caller explicitly scopes the result to a topology bootstrap.
- **`test`: inspect coverage too.** The conventional profile is usually the cheapest green path through the pipeline spine, but it may deliberately skip costly advertised stages. Surface those disabled stages before treating the profile as representative.

These rules generalize the corpus result: prefer bounded, repeatable, real-output evidence that crosses the claimed science path. Names are useful priors for cost and intent, never substitutes for checking the resolved params and enabled stages.

## Corpus grounding

The issue #67 survey measured 26 pinned pipelines: 16 nf-core and 10 ad hoc. All 16 nf-core pipelines exposed an input-bearing `test` profile, 15 exposed pipeline-level nf-test, and the only ad-hoc profile named `test` was a mode switch rather than a test-data profile. Fourteen of the 15 nf-core pipelines with pipeline nf-tests had `default.nf.test` or `main.nf.test`; `nf-core/references` was the important counterexample. The ad-hoc majority therefore needs the no-profile branch, while the references counterexample requires an explicit ambiguity result rather than another silent filename heuristic.

The same survey found that `test_full` was oriented toward cloud or release-scale runs and usually lacked the resource caps present in `test`, while several `test_minimal` profiles disabled the pipeline's central scientific stages. Those observations justify ranking and coverage checks. They do not justify treating the three names as reserved words with universal meaning.

## Representation needed in the summary

The current [[summary-nextflow]] contract now classifies profile declarations in `profiles[]`, but it retains one singular `test_fixtures` object and an unranked `nf_tests[]` enumeration. It can identify input-bearing profile candidates without a name heuristic; it still cannot say which whole-pipeline test case was selected, why it won, or why alternatives were deferred. A future schema revision should add:

```yaml
test_candidates:
  - id: tests/main.nf.test::default
    kind: nf-test # nf-test | profile | pipeline-defaults
    effective_profiles: [test]
    params_delta: {}
    execution_mode: real # real | stub | mixed | unknown
    scope: primary # primary | bootstrap-only | reference-scale | unknown
    disposition: selected # selected | eligible | deferred
    rationale: "canonical main.nf.test case"
test_selection:
  status: selected # selected | needs-scope-choice
  selected_candidate_id: tests/main.nf.test::default # null when unresolved
  rationale: "one primary candidate in the canonical test file"
```

`test_fixtures` should remain singular and resolve the selected candidate. Alternatives belong in `test_candidates[]`; a target test-plan Mold can translate additional candidates into additional test entries later. On the Galaxy path, intentionally omitted scientific branches can become `kind: dropped` entries in [[open-requirements-ledger]] once the design tier begins carrying that artifact.

Until that schema revision lands, a cast must not imply that the existing default `profile: test` was selected by this policy. It should either receive an explicit profile from its caller or report the unresolved selection limitation in `warnings[]`.

## Evidence boundary

- **Corpus-observed:** the counts, concrete counterexamples, and profile-shape comparisons above come from the 26-pipeline survey recorded on galaxyproject/foundry#67 at the SHAs pinned by that survey.
- **External documentation:** nf-test defines profile precedence and `+` extension; Nextflow defines profile resolution and `-show-profiles` behavior.
- **Design decision:** the candidate model, canonical-file tiebreaker, `needs-scope-choice` terminal, and scale/coverage classifications are Foundry policy proposed from that evidence.
