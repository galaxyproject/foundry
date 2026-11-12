# GALAXY WORKFLOW EFFICIENCY pipeline eval

## Property: nothing is applied without approval

- check: deterministic
- assertion: phase 3 receives only change-set entries a person approved after
  phase 2. A run that applies an entry nobody approved, or applies the
  change-set before it was shown, is a failed journey.

## Property: an empty change-set ends the run unchanged

- check: deterministic
- assertion: when phase 2 emits no entries, the run reports the levers consulted
  and the steps kept, runs no later phase, and emits no modified workflow.

## Property: untouched steps survive byte for byte

- check: deterministic
- assertion: a structural diff of the final workflow against the phase-1
  baseline touches only the steps the approved change-set names and the edges
  those edits require. Any other difference is a failed journey.

## Property: the swap does not change what the workflow computes

- check: deterministic
- assertion: when the baseline carries tests, phase 8 runs them against the
  final workflow, and every assertion still passes except the ones a change-set
  entry named as broken by the swap, which were replaced. A pass reached by
  loosening any other assertion is a failed journey.

## Property: each replacement is pinned to the identity the change-set named

- check: deterministic
- assertion: every step a `replace-tool` entry targeted runs, in the final
  workflow, the exact `tool_id` that entry named, at a resolved version and
  changeset. A replacement chosen by search under a different owner is a failed
  journey.
