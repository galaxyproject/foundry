# NEXTFLOW → GALAXY pipeline eval

Pipeline-level oracle for the NEXTFLOW → GALAXY journey. This judges the
**end-to-end** and **cross-step** properties no single Mold owns; each member
Mold's own `eval.md` still applies to its step's output (composition). Properties
are abstract — concrete journeys live in `scenarios.md`.

## Property: the final workflow validates and round-trips

- check: deterministic
- assertion: the gxformat2 workflow emerging from the journey passes terminal
  `gxwf validate` and round-trips (export/import) without loss; the promoted
  workflow carries no unresolved `TODO`/`TODO_<hint>` sentinels.

## Property: source scientific intent survives to the target

- check: llm-judged
- assertion: the primary data inputs, scientific outputs, and load-bearing
  branch controls identified in the Nextflow summary appear in the final Galaxy
  workflow — as inputs, workflow-outputs, or explicit scope decisions — and none
  is silently dropped or contradicted across the journey.

## Property: each handoff is consumable without re-derivation

- check: llm-judged
- assertion: every step consumes its declared upstream artifact without
  re-deriving it from the original Nextflow source — interface brief binds to the
  summary, data-flow brief to the interface, template to the data-flow, and so
  on. A step that must reach past its declared input surfaces the gap rather than
  silently re-summarizing the source.

## Property: the per-step loop terminates at a real endstate

- check: deterministic
- assertion: the `[loop]` phase (`advance-galaxy-draft-step`) is judged at its
  endstate, not per iteration: the loop exits only when its own oracle
  (`gxwf draft-next-step`) reports no drafty steps remain, and every workflow
  step is concretized before the journey proceeds to testing.

## Property: tool resolution is decided, never assumed

- check: llm-judged
- assertion: every tool the workflow needs is resolved through the
  discover-or-author path — a pinned Tool Shed changeset or an authored wrapper —
  and no step assumes a tool exists without a discovery or authoring decision
  recorded.
