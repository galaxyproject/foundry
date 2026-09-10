# mature-galaxy-workflow-for-iwc evaluation

## Property: workflow-only entry

- check: deterministic

A valid concrete `starting-galaxy-workflow` is sufficient to begin. Missing summary, test, context, ledger, README, changelog, or Dockstore inputs are reported distinctly and never cause the Mold to pretend that evidence was inspected.

## Property: checklist completeness

- check: deterministic + llm-judged

Every applicable check in both bundled IWC policy resources receives exactly one `pass`, `changed`, `needs-user-input`, or reasoned `not-applicable` result with a file/field or section citation.

## Property: evidence-bounded edits

- check: llm-judged

Every workflow or companion change traces to supplied content or a named upstream policy rule. Creators, identifiers, citations, licenses, releases, scientific intent, reference strategy, and durable URLs are never invented.

## Property: purpose preservation

- check: deterministic + llm-judged

Unrelated workflow regions, tool identities and versions, graph topology, meaningful parameter defaults, and existing test assertions remain unchanged. Generalization alters only an unambiguous sample-specific value or path whose configurable role is supported by the workflow and supplied evidence.

## Property: label synchronization

- check: deterministic

Any changed input, promoted-output, or `workflow_outputs` label is human-readable and its corresponding supplied test key changes in the same run. No old key remains orphaned and no assertion is weakened.

## Property: honest missing-test behavior

- check: deterministic

When no test is supplied, no `galaxy-workflow-test` output is fabricated. The report and ledger identify the missing evidence and route new test construction to the existing test-planning and implementation Molds.

## Property: companion coherence

- check: deterministic + llm-judged

README input/output descriptions agree with the emitted workflow; Dockstore paths address the emitted workflow and optional test correctly; changelog entries agree with evidenced release changes; creator metadata agrees across files when it is known.

## Property: explicit downstream boundary

- check: deterministic

The report states that validation, runtime testing, GitHub mutation, and publication were not performed. It never converts static inspection into a passing execution or publication claim.
