---
name: repair-galaxy-draft-topology
description: "Re-wire a Galaxy draft region when a step's declared output can't be computed from its wired inputs."
---

# repair-galaxy-draft-topology

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Re-wire a Galaxy draft region when a step's declared output can't be computed from its wired inputs.

## Inputs

- Read artifact `galaxy-workflow-draft`. Schema: galaxy-workflow-draft. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`. Partially-realized gxformat2 draft (see galaxy-workflow-draft-format) whose topology can't support a declared step — the region to repair.
- Read artifact `open-requirements-ledger`. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`. Carried obligations from open-requirements-ledger; the open blocking entries name which step output is uncomputable and what evidence is missing.

## Outputs

- Write artifact `galaxy-workflow-draft` as `galaxy-workflow-draft.gxwf.yml`. Format: `yaml`. Schema: galaxy-workflow-draft. Re-wired gxformat2 draft: a producer step (or small sub-path) inserted so the previously-blocked step's declared output is computable; new steps land at draft (TODO) tier.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Ledger with the addressed blocking entries marked resolved, or surrendered with a note when no producer can be found within the escalation budget.

## Required Tools

- None declared. Procedure should not assume external CLIs are present.

## Load Upfront

- `references/notes/galaxy-data-flow-draft-contract.md`: Research note copied verbatim into the bundle. Re-wire the affected region consistently with the data-flow design that settled the surrounding topology.
- `references/notes/galaxy-workflow-draft-format.md`: Research note copied verbatim into the bundle. Emit re-wired steps in the draft superset (TODO tool_id, _plan_* fields) so existing per-step machinery realizes them; respect the settle-vs-repair boundary.
- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Read open blocking entries to scope the repair; mark each resolved or surrender it, feeding the loop's decreasing-blocker convergence gate.
- `references/schemas/galaxy-workflow-draft.schema.json`: Schema file copied verbatim into the bundle. In/out contract: the draft this Mold reads and re-wires conforms to galaxy-workflow-draft; cast bundles the JSON Schema so the re-wired draft stays inside the superset the per-step loop expects.

## Load On Demand

- `references/patterns/galaxy-collection-patterns.md`: Pattern note copied verbatim into the bundle. Choose a corpus-attested collection recipe when the missing producer is a collection construction, reshape, or bridge. Use when: the repair sub-path needs collection cleanup, reshaping, relabeling, identifier synchronization, or a collection-tabular bridge.
- `references/patterns/galaxy-tabular-patterns.md`: Pattern note copied verbatim into the bundle. Choose a corpus-attested tabular recipe when the missing evidence is a column, key, or aggregate a tabular step can produce. Use when: the repair sub-path needs a computed column, join key, filter criterion, or aggregate the blocked step depends on.
- `references/notes/galaxy-collection-semantics.md`: Research note copied verbatim into the bundle. Preserve collection typing and map-over/reduction semantics when an inserted producer step joins or reshapes collection inputs. Use when: the repair inserts or rewires steps touching collection inputs, outputs, or mapped/reduced connections.
- `references/notes/galaxy-collection-semantics.upstream.myst`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/galaxy-collection-semantics.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.

## Validation

- Validate `galaxy-workflow-draft.gxwf.yml` for artifact `galaxy-workflow-draft` against the galaxy-workflow-draft schema when a validator is available.

## Procedure

Topology is settled upstream by the `*-summary-to-galaxy-template` skill, and the per-step loop is wrapper-tier — it does not edit topology. This skill is the **escalation target** the loop reaches when implementation proves the settled topology cannot support a declared step: a step output that needs evidence no wired input carries (the connection graph validates fine, but nothing produces what the output requires). Wrapper-tier gaps — no Tool Shed wrapper picked yet — are not this case; those route through the discover-or-author branch.

You are invoked with the partially-realized draft and the open-requirements-ledger. Read the open blocking entries: each names a step, the uncomputable output, and the missing evidence. Your job is **bounded topology repair** — not re-settling the workflow. Repair the named region and nothing else; the surrounding topology, already-realized steps, and workflow interface stay put.

Decide the *shape* of the fix from the missing evidence, the surrounding data-flow design (galaxy-data-flow-draft-contract), IWC structure, and the pattern pages. It may be one producer step, or a small sub-path of a few tools, or — when the declared output is genuinely uncomputable and no producer exists — narrowing the step to what its inputs can support. Insert the new step(s) in the draft superset (galaxy-workflow-draft-format): concrete topology and edges, wrapper-tier `TODO` for `tool_id` and ports, `_plan_*` fields carrying intent. The existing discover-or-author → `summarize-galaxy-tool` → `implement-galaxy-tool-step` machinery realizes them on later loop iterations; do not resolve wrappers here.

Then update the ledger. For each blocking entry your repair addresses, mark it `resolved` with a note on how (producer added, sub-path added, output narrowed). The loop's convergence gate counts open blocking entries and requires each escalation to strictly reduce that count, under a hard cap on escalations. If you cannot close an entry — no producer is discoverable and the output cannot be honestly narrowed — **surrender it**: leave it open with a note, so the terminal path writes it into the final draft as a labelled gap rather than spinning or fabricating. Never insert a producer whose own output is uncomputable from what feeds it; that grows the DAG without reducing the open count and the loop will not converge.

## Runtime Notes

- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.
- Preserve declared artifact filenames unless the user or harness supplies explicit paths.
- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.
