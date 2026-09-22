# Freeform-to-brief scenarios

## Case: selected paper work stays high-level

- fixture: `content/molds/freeform-summary-to-workflow-brief/examples/paper/`
- expect: Read quality reporting is included; alignment, variant calling, and aggregate reporting stay excluded. The agent chooses no Galaxy datatypes, collections, or wrapper availability. The emitted brief is structurally valid.

## Case: interview evidence preserves expert boundaries

- fixture: `content/molds/freeform-summary-to-workflow-brief/examples/interview/`
- expect: The same source-supported scope becomes a brief. Expert editing precedes the separate implementation journey.

## Case: blockers remain visible in a valid brief

- fixture: `content/molds/freeform-summary-to-workflow-brief/examples/blocked/`
- expect: Structural validation exits 0, but the readiness check exits 4 and reports both Workflow and Agent Environment blockers. Production returns the brief for review without implementation.
