---
name: repair-galaxy-draft-topology
description: "Make the smallest structural edit that closes an open blocking entry in a settled Galaxy draft."
---

# repair-galaxy-draft-topology

Follow the procedure below and use the artifact/reference sections as the runtime contract.

## When To Use

- Make the smallest structural edit that closes an open blocking entry in a settled Galaxy draft.

## Inputs

- Read artifact `galaxy-workflow-draft`. Schema: galaxy-workflow-draft. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`, `workflow-brief-to-galaxy-template`. Partially-realized gxformat2 draft (see galaxy-workflow-draft-format) with an open blocking entry.
- Read artifact `open-requirements-ledger`. Produced by `advance-galaxy-draft-step`, `apply-galaxy-workflow-changeset`, `compare-against-iwc-exemplar`, `cwl-summary-to-galaxy-data-flow`, `cwl-summary-to-galaxy-interface`, `cwl-summary-to-galaxy-template`, `freeform-summary-to-galaxy-data-flow`, `freeform-summary-to-galaxy-interface`, `freeform-summary-to-galaxy-template`, `implement-galaxy-tool-step`, `interview-to-galaxy-workflow-changeset`, `mature-galaxy-workflow-for-iwc`, `nextflow-summary-to-galaxy-data-flow`, `nextflow-summary-to-galaxy-interface`, `nextflow-summary-to-galaxy-reference-data`, `nextflow-summary-to-galaxy-template`, `repair-galaxy-draft-topology`, `workflow-brief-to-galaxy-data-flow`, `workflow-brief-to-galaxy-interface`, `workflow-brief-to-galaxy-template`. Carried obligations ledger open-requirements-ledger: the run's open, resolved, and surrendered entries with their provenance. Absent on the first Mold of a run; start an empty one.

## Outputs

- Write artifact `galaxy-workflow-draft` as `galaxy-workflow-draft.gxwf.yml`. Format: `yaml`. Schema: galaxy-workflow-draft. Edited gxformat2 draft. Each blocking entry addressed is closed by the named edits, and new or replaced steps land at draft tier.
- Write artifact `open-requirements-ledger` as `open-requirements.ledger.yml`. Format: `yaml`. Carried obligations ledger re-emitted by this step: entries it appended or closed updated, every other entry passed through with its provenance intact.

## Required Tools

- **`gxwf`** (gxwf). `npm install -g '@galaxy-tool-util/cli@^1.15.0'`.
  Ephemeral run: `npx --yes --package @galaxy-tool-util/cli@1.15.0 gxwf`.
  Check: `gxwf --help | grep -q draft-validate`.
  Docs: https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli

## Load Upfront

- `references/cli/draft-validate.json`: CLI command reference packaged as a sidecar. Check the draft contract, including dangling edges and sources, on the edited draft. Use when: after every edit.
- `references/notes/galaxy-data-flow-draft-contract.md`: Research note copied verbatim into the bundle. Edit the affected region consistently with the data-flow design that settled the surrounding topology.
- `references/notes/galaxy-workflow-draft-format.md`: Research note copied verbatim into the bundle. Emit added or replaced steps in the draft superset (TODO tool_id, _plan_* fields) so existing per-step machinery realizes them; respect the settle-vs-repair boundary.
- `references/notes/open-requirements-ledger.md`: Research note copied verbatim into the bundle. Scope the repair from the open blocking entries — each names the step and what's missing — then mark resolved each one repaired, and leave any it cannot close open with a note.
- `references/schemas/galaxy-workflow-draft.schema.json`: Schema file copied verbatim into the bundle. In/out contract: the draft this Mold reads and edits conforms to galaxy-workflow-draft; cast bundles the JSON Schema so the edited draft stays inside the superset the per-step loop expects.

## Load On Demand

- `references/patterns/galaxy-collection-patterns.md`: Pattern note copied verbatim into the bundle. Choose a corpus-attested collection recipe when the missing producer is a collection construction, reshape, or bridge. Use when: an added step needs collection cleanup, reshaping, relabeling, identifier synchronization, or a collection-tabular bridge.
- `references/patterns/galaxy-conditionals-patterns.md`: Pattern note copied verbatim into the bundle. Choose how to merge when a `when`-gated step's output feeds another step. Use when: an inserted or rewired step consumes a `when`-gated step's output.
- `references/patterns/galaxy-tabular-patterns.md`: Pattern note copied verbatim into the bundle. Choose a corpus-attested tabular recipe when the missing evidence is a column, key, or aggregate a tabular step can produce. Use when: an added step needs a computed column, join key, filter criterion, or aggregate the blocked step depends on.
- `references/notes/galaxy-collection-semantics.md`: Research note copied verbatim into the bundle. Preserve collection typing and map-over/reduction semantics when an edit joins or reshapes collection inputs, and quote the rule when a removal rests on it. Use when: the repair inserts or rewires steps touching collection inputs, outputs, or mapped/reduced connections, or a removal rests on collection semantics.
- `references/notes/galaxy-collection-semantics.yml`: Companion file copied verbatim into the bundle. Sibling of `references/notes/galaxy-collection-semantics.md`; read it where that note directs.
- `references/notes/gxformat2-schema.md`: Research note copied verbatim into the bundle. Keep post-job actions and nested parameter keys correct when an edit moves them. Use when: an edit touches `out:` actions (`hide`, `rename`, `change_datatype`) or wires a nested parameter.
- `references/notes/gxformat2.schema.json`: Companion file copied verbatim into the bundle. Sibling of `references/notes/gxformat2-schema.md`; read it where that note directs.

## Validation

- Validate `galaxy-workflow-draft.gxwf.yml` for artifact `galaxy-workflow-draft` against the galaxy-workflow-draft schema when a validator is available.

## Procedure

Topology is settled upstream by the `*-summary-to-galaxy-template` skill, and the per-step loop doesn't edit it. This skill makes the structural edits a settled draft still needs. It runs on an open blocking entry in the open-requirements-ledger: the settled draft can't give a correct run, and a structural edit closes it. A missing wrapper is this case only when the discover-or-author branch is exhausted: no stock, shed or authored wrapper can produce the step's declared output from its wired inputs, or the ledger already records the wrapper as confirmed absent. A tool version missing from a local cache is not absence. When the ledger records absence, don't search again. A chosen wrapper that can't produce one of the step's declared outputs is this case too, whatever other wrappers might do: an `add-step` carries that output, and the loop resolves its wrapper later.

Decide the edit from the entry, the surrounding data-flow design (galaxy-data-flow-draft-contract), IWC structure, and the pattern pages.

**Edit.** Close each open blocking entry you have evidence for, not only the one that triggered the call, with the smallest set of edits, named by change-set kind: `remove-step`, `rewire`, `change-parameter`, `add-input`, `remove-input`, `add-output` / `expose-output`, `remove-output`, `add-step`, `replace-tool`. Apply all but the last two in place. `add-step` and `replace-tool` land at draft tier (galaxy-workflow-draft-format): concrete topology and edges, wrapper-tier `TODO` for `tool_id` and ports, `_plan_*` carrying intent. The discover-or-author → `summarize-galaxy-tool` → `implement-galaxy-tool-step` machinery realizes them on later loop iterations. A step duplicated from a realized step keeps its pin and `state`, and changes only the key that distinguishes it. Everything the entries don't name stays as it is.

**Interface.** Change the workflow interface only when an entry names that as the remedy or a narrowing requires it. Promote an input with a default equal to the literal it replaces, and remove the literal from `state`. Expose an output by removing its `hide`, unless the design wants it hidden. Removing an input or output is a narrowing: append a `kind: dropped` entry with its `units` and a cited `because`.

**Claims.** A claim about a step with no resolved wrapper is not a fact. Attach it to that step as a plain ledger entry with `step:` set, and keep it out of `doc:`. "Computable" means the tool's semantics give what the output declares, including element count and identifiers for collections. Reading a pinned wrapper's command block or a consumer's parser is allowed. Picking a wrapper is not.

**Removal.** When nothing can close an entry against a drafty step, narrow the step if it isn't fully redundant, and rewrite its `_plan_*` to the reduced job. Otherwise remove it, append the `kind: dropped` entry, and resolve the blocking entry with a note naming the drop. A removal's `because` quotes the primary artifact it rests on: the search run, the wrapper's ports or command block, the semantics rule. The quoted artifacts must carry the removal alone: strike everything uncited, and the removal must still follow. Naming the blocking entry is not a citation, and a tool search says nothing about stock tools. Don't remove a realized step.

**After every edit:**

1. Remove what existed only to feed a removed step: compute it by walking every step's `in:`, the workflow outputs, and `${label}` in `out:` `rename`, not from the entry's wording.
2. Rewrite or remove mentions of removed ids and labels in `doc`, `_plan_*` and comment frames, and any `doc` promising what a removed step supplied.
3. Move a removed step's `rename` or `change_datatype` to the step that inherits its consumers.
4. If an edit touched a step with a twin, a step duplicated from the same tool and plan, make the same edit there.
5. Run draft-validate, with `--concrete --strict-state` when an edit touched a realized step, and fix what it reports.

**Ledger.** Mark each entry you close `resolved`, with a note naming the kinds you applied. A repair must leave fewer open blocking entries than it found, or say it could close none, which ends escalation. Never insert a producer whose own output is uncomputable from what feeds it. Leave an entry `open`, with a note saying what's unproven, when a consumer truly needs the removed output, when no other edit closes an entry on a realized step, or when the removal doesn't follow from what you can quote. An entry on a realized step reaches the final artifact as a labelled gap. A drafty step stays drafty, and the call reports it.

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
