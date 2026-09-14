---
name: review-galaxy-workflow
description: "Apply the pinned upstream IWC review policy to one Galaxy workflow or pull request and emit one evidenced advisory Markdown review."
---

# review-galaxy-workflow

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Apply the pinned upstream IWC review policy to one Galaxy workflow or pull request and emit one evidenced advisory Markdown review.

## Inputs

- Read artifact `starting-galaxy-workflow`. Produced by `summarize-galaxy-workflow`. The normalized concrete gxformat2 workflow under review, as emitted by summarize-galaxy-workflow; the reviewed subject in the standard pipeline.
- Read artifact `galaxy-workflow`. Produced by `advance-galaxy-draft-step`, `mature-galaxy-workflow-for-iwc`. The equivalent concrete gxformat2 workflow when a Foundry run supplies one directly instead of routing through the summarizer.
- Read artifact `summary-galaxy-workflow`. Schema: summary-galaxy-workflow. Produced by `summarize-galaxy-workflow`. Structured summary of the reviewed workflow: inputs, outputs, tool ids and versions, defaults, connections, labels, annotations, and existing tests. Read it instead of re-extracting them.
- Read artifact `galaxy-workflow-validation-result`. Produced by `validate-galaxy-workflow`. Terminal structural validation handoff from validate-galaxy-workflow: the command run, its status, and its diagnostics. Cite it; never restate a validation claim this Mold did not receive.
- Read artifact `workflow-test-result`. Produced by `run-workflow-test`. Planemo execution handoff from run-workflow-test, including its honest test-definition-missing and not-run states. Cite its status; never infer a passing test from inspection.
- Read artifact `galaxy-workflow-test`. Optional; absence is allowed and must be reported honestly. Produced by `implement-galaxy-workflow-test`, `mature-galaxy-workflow-for-iwc`. The workflow's test file when one exists; absent when the submission ships no test, which is a reviewable finding rather than an error.
- Read artifact `galaxy-workflow-pr-context`. Optional; absence is allowed and must be reported honestly. Harness-supplied pull-request context: repository, pull request number, title and body, base and head SHAs, changed-file list, base-to-head diff, and the complete relevant files.
- Read artifact `iwc-dockstore-metadata`. Optional; absence is allowed and must be reported honestly. Produced by `mature-galaxy-workflow-for-iwc`. The submission's `.dockstore.yml` when present; it names the primary Galaxy descriptor under the IWC-Lab repository profile, which may be a `.gxwf.yml` file.
- Read artifact `iwc-comparison-notes`. Optional; absence is allowed and must be reported honestly. Produced by `compare-against-iwc-exemplar`. Existing structural diff from compare-against-iwc-exemplar when a Foundry run already produced one. Consume it; never rerun that comparison inside this Mold.
- Read artifact `open-requirements-ledger`. Optional; absence is allowed and must be reported honestly. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `mature-galaxy-workflow-for-iwc`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`. Carried obligations ledger open-requirements-ledger when a Foundry run supplied one; read-only here, used to report unresolved intent and surrendered work.

## Outputs

- Write artifact `galaxy-workflow-review` as `galaxy-workflow-review.md`. Format: `markdown`. Advisory IWC-policy review of one Galaxy workflow pull-request subject, citing structural validation, Planemo test evidence, and optional Foundry context.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/prompts/workflow-pr-review-command.md`: prompt reference copied verbatim into the bundle. Apply the pinned upstream IWC review command as the primary checklist and procedure, adapting repository terminology without changing policy.
- `references/schemas/summary-galaxy-workflow.schema.json`: Schema file copied verbatim into the bundle. Read the supplied workflow summary rather than re-deriving inputs, outputs, tool pins, defaults, connections, labels, and existing tests.

## Load On Demand

- `references/notes/galaxy-workflow-testability-design.md`: Research note copied verbatim into the bundle. Distinguish a genuine workflow-interface or test-addressing defect from a stylistic preference when a label and a test key disagree. Use when: an input, promoted output, collection identifier, or workflow-output label does not agree with the supplied test.
- `references/notes/iwc-shortcuts-anti-patterns.md`: Research note copied verbatim into the bundle. Recognize corpus-observed shortcuts so a finding cites an observed IWC anti-pattern rather than reviewer taste. Use when: a structural choice looks like a shortcut and the finding needs corpus grounding before it is raised as required.
- `references/notes/iwc-test-data-conventions.md`: Research note copied verbatim into the bundle. Judge test labels, durable remote fixtures, creator identifiers, and companion-file naming against current IWC conventions. Use when: assessing the submission's test file, test-data references, creator metadata, or release entry.
- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Read a supplied ledger's open and surrendered entries into the clearly labeled Foundry context section without treating their absence as an IWC failure. Use when: the harness supplied an open-requirements ledger and the review needs to report unresolved intent or surrendered work as Foundry context.

## Validation

- None declared.

## Procedure

Review one Galaxy workflow submission under the pinned upstream IWC review policy and return one advisory Markdown review. This skill reads evidence; it does not produce or change a workflow, and it cannot approve, push, comment, label, mark ready, or merge.

### Procedure

#### 1. Establish the reviewed subject and its evidence

- Read the concrete workflow — the normalized `starting-galaxy-workflow.gxwf.yml`, or the `galaxy-workflow.gxwf.yml` a Foundry run supplied directly.
- Read `summary-galaxy-workflow.json` for inputs, outputs, tool ids and versions, tool state, connections, labels, annotations, and existing tests. Do not re-extract what the summary already carries.
- Read `galaxy-workflow-validation-result.json` and `workflow-test-result.json`. Record each status verbatim. **Never run `gxwf validate` or `planemo test` inside this skill**, and never upgrade an unverified item to a pass on the strength of inspection.
- Inventory the optional inputs and record which ones were present. Never describe an absent artifact as inspected.

#### 2. Select the repository profile

- **IWC**: the primary descriptor is the native `.ga` workflow; apply the upstream checklist to it.
- **IWC-Lab**: the primary Galaxy descriptor is the one named by the submission's `.dockstore.yml`, which may be a `.gxwf.yml` file. Apply the same descriptor-level checks to that file.
- When no `.dockstore.yml` was supplied, state which profile was assumed and why.

#### 3. Apply the pinned IWC policy

Read the bundled review command and work its checklist in order. Adapt repository terminology where the profile requires it; do not silently add, drop, or soften a policy item. For each applicable item record exactly one of `pass`, `needs attention`, `not applicable`, or `unverified`, with file and field evidence. Prefer the deterministic evidence from step 1 wherever it answers a checklist question — cite the Planemo result rather than concluding from inspection that a test passed.

#### 4. Add Foundry context only when it was supplied

When `iwc-comparison-notes`, an `open-requirements-ledger`, or source and design handoffs are present, add a clearly labeled **Foundry context** section covering unresolved intent, surrendered or dropped work, and test strength. When they are absent, omit the section or state that no Foundry context was supplied. **Their absence is never an IWC finding.** Do not rerun compare-against-iwc-exemplar; consume its existing output.

#### 5. Write the review

Emit `galaxy-workflow-review.md` with, in order:

1. reviewed repository, pull request, head SHA, workflow directory, repository profile, and prompt provenance — name the bundled prompt reference and the hash recorded for it in this cast's provenance record, and make no claim about upstream policy newer than that pin;
2. the validation result and the Planemo test result, quoted as statuses rather than as conclusions;
3. the applicable IWC checklist, one status and its evidence per item;
4. the Foundry context section, when one was supplied;
5. required fixes, separated from optional improvements, separated from evidence that was unavailable; and
6. exactly one advisory recommendation: `approve`, `request changes`, or `needs discussion`.

### Non-goals

- No `gxwf validate` or `planemo test` execution, and no re-derivation of the summary.
- No workflow, test, or companion-file edit, and no changeset. An accepted edit is mature-galaxy-workflow-for-iwc's business, routed through apply-galaxy-workflow-changeset.
- No GitHub mutation of any kind — no review, approval, comment, label, push, ready-for-review, or merge.
- No JSON report, no stable finding ids, and no freshness claim about a correctly pinned prompt.

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
