---
type: research
title: "Open-requirements ledger"
tags:
  - target/galaxy
status: draft
created: 2026-06-16
revised: 2026-06-16
revision: 1
ai_generated: true
related_notes:
  - "[[galaxy-workflow-draft-format]]"
related_molds:
  - "[[advance-galaxy-draft-step]]"
  - "[[repair-galaxy-draft-topology]]"
  - "[[implement-galaxy-tool-step]]"
summary: "Carried unresolved-requirements artifact the source→Galaxy pipeline discharges or explicitly surrenders, autonomously."
---

# Open-requirements ledger

The `open-requirements-ledger` is a single artifact threaded through the source→Galaxy pipeline that records **obligations the pipeline has taken on but not yet met** — a declared output with no producer, a parameter whose value the source never pinned, a tool with no corpus exemplar. Each Mold that surfaces one **appends** it; each Mold whose decision closes one **marks it resolved**; the terminal path **surrenders** whatever remains open, explicitly, into the final artifact.

## Framing: obligations the pipeline discharges, not questions a human answers

This is deliberately *not* an "open questions for the user" list. The pipeline is autonomous — no human-in-the-loop gate is assumed. The ledger's consumers are **Molds and the loop's convergence gate**, with human readout a secondary affordance. An entry is closed by a downstream Mold doing work (wiring a producer, picking a wrapper, settling a value), or — when nothing can close it — surrendered: written into the final draft as a known, labelled gap rather than silently dropped or fabricated around.

The distinction matters because a "questions for a human" framing leaks an operator's personal interaction style into a tool meant to run inside anyone's harness. The ledger must behave identically cast into a fresh harness with no ambient configuration; that holds only because every obligation is **materialized in the artifact**, never carried as operator habit.

## Entry shape (v1, loose)

Like the `_plan_*` family in [[galaxy-workflow-draft-format]], ledger entries are intentionally low-ceremony for v1 — enough structure to count and close, no contract pretending to be machine-parameterizable yet. A reasonable per-entry shape:

```yaml
- id: sccmec-evidence-missing
  status: open                # open | resolved | surrendered
  raised_by: implement-galaxy-tool-step   # Mold that appended it
  step: classify_context       # draft step the obligation attaches to (if any)
  unmet: "SCCmec-region candidate output category"
  missing: "no wired input carries SCCmec cassette evidence"
  resolved_by: null            # Mold that closed it, once closed
  note: ""                     # how it was closed or why surrendered
```

Provenance (`raised_by`, `resolved_by`) is the audit trail for *when* each obligation entered and left — the traceability #281 asked for, and the evidence the convergence gate reads.

## Role in topology repair

In the Galaxy per-step loop, the ledger is the substrate the topology-repair escalation rides on (see [[galaxy-workflow-draft-format]] and [[repair-galaxy-draft-topology]]):

- **[[implement-galaxy-tool-step]]** detects, mid-implementation, that a declared step output cannot be computed from its wired inputs — a defect invisible to `gxwf` structural validation, because the connection graph knows ports connect, not what they contain. Rather than fabricate, it appends a blocking entry and falls through to repair.
- **[[repair-galaxy-draft-topology]]** reads the open blocking entries, re-wires the affected region (template-tier authoring — one step or a small sub-path), and marks each entry it closes `resolved`; the existing discover-or-author → implement machinery then realizes the new steps.
- The loop's **decreasing-blocker invariant** counts open blocking entries: each repair escalation must strictly reduce that count, under a hard cap on escalations. When the cap is hit with entries still open, those entries are **surrendered** into the final draft — the clean terminal that replaces spin-or-fabricate.

So the ledger is not a convenience here; it is the countable state the termination guard depends on.

## Escalation budget (loop-level state)

The decreasing-blocker invariant needs more than the entries themselves: "strictly reduce the open count, under a hard cap" is *loop-level* state — it spans iterations and belongs to no single entry. The ledger carries it in a small `topology_repair` header beside the `entries:` list:

```yaml
topology_repair:
  escalations: 2           # repairs invoked this run
  cap: 5                   # hard ceiling; at cap, still-open entries are surrendered
  open_history: [4, 3, 2]  # open blocking-entry count after each escalation — must be strictly decreasing
entries:
  - id: sccmec-evidence-missing
    status: open
    # … per-entry shape above
```

- `escalations` — how many times [[advance-galaxy-draft-step]] has escalated to [[repair-galaxy-draft-topology]] this run. The orchestrator increments it on each escalation.
- `cap` — the hard ceiling. When `escalations` reaches `cap`, the loop stops escalating and surrenders any still-`open` blocking entries into the final draft as labelled gaps rather than retrying forever.
- `open_history` — the open blocking-entry count recorded after each escalation. The convergence gate requires it to be strictly decreasing: a repair that fails to lower the open count — or raises it by inserting a producer that is itself uncomputable — is non-convergent and trips the gate immediately, without waiting for the cap.

This block lives in the ledger as a v1 expedient: the ledger is already the carried, cast-visible state the loop reads each iteration. Its better long-term home is the **draft itself** — a workflow-level annotation that travels with the artifact it bounds, so the budget survives even when the ledger is stripped at the terminal. Recorded here for now; migrate when the draft grows a home for it.

## Threaded through the whole design tier

The ledger is not loop-only. It is a single artifact every design-tier Mold in the source→Galaxy pipelines **consumes and re-emits** — the interface, reference-data, data-flow, IWC-comparison, and template Molds (`*-summary-to-galaxy-interface`, `*-summary-to-galaxy-data-flow`, `*-summary-to-galaxy-reference-data`, `compare-against-iwc-exemplar`, `*-summary-to-galaxy-template`). The first design Mold in a run creates it; each subsequent Mold reads the open entries, **appends** the unknowns it newly surfaces, and **marks resolved** the ones its own decisions close (the template settling a topology choice the data-flow left open, the interface pinning a parameter, …). This is the direct answer to #281: the chain stops re-deriving the same unknowns because each Mold inherits them.

The template Mold's computability review pass is one notable appender — `*-summary-to-galaxy-template` re-reads each settled step and, where an output needs evidence no input carries, wires the producer or records the gap as a blocking entry. Source-summary Molds upstream of the design tier keep their own free-text open-questions; the design tier is where those formalize into the ledger.

## Open work

- Decide whether entry structure should harden (typed `unmet` / `missing`, links back to source-summary evidence, machine-checkable `status` transitions) once two or three worked runs exercise it.
- Decide whether the source-summary Molds should also emit structured entries, or keep their free-text open-questions until the design tier formalizes them.
- Specify how surrendered entries surface in the runnable gxformat2 (a workflow-level annotation, a report output, or a sidecar) when the draft is stripped of `_plan_*` and TODO sentinels.
- Move the `topology_repair` escalation budget out of the ledger and into the draft (a workflow-level annotation) so it travels with the artifact it bounds; the ledger home is a v1 expedient.
