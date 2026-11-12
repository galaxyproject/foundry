---
type: cli-command
tool: foundry
command: check-scope-records
package: "@galaxy-foundry/gxwf-foundry"
tags:
  - cli/foundry
status: draft
created: 2026-11-12
revised: 2026-11-12
revision: 1
related_notes:
  - "[[open-requirements-ledger]]"
summary: "Check a ledger's source-scope decision and scope drops, and their `from` citations against a Nextflow summary."
---

# `foundry check-scope-records`

Read an [[open-requirements-ledger]] and check the records its **Source scope** section defines: the one decision under `decisions` that carries `scope`, and the `kind: dropped` entries that carry `scope_branch`. With a `summary-nextflow.json` as the second argument, also resolve every `from` citation, the scope's `candidate`, and every backticked unit name in a drop's `units` against that summary.

Without a summary, the check covers shape only:

- At most one scope decision, `decided_by: nextflow-summary-to-galaxy-interface`, with a non-empty `scope.controls` list of `{control, value, from}`.
- No scope drop without a scope decision.
- Each scope drop is `status: open`, `kind: dropped`, raised by the interface Mold, with `scope_branch.decision` naming the scope decision and a non-empty `selected_by` list.
- No `selected_by` control repeats a control value the scope fixes.
- `units` names at least one backticked summary subworkflow or process, and `because` names the scope decision.
- A scope drop has no top-level `step` and no `source_arg`.

A ledger with no scope records passes. Plain drops, including the steps a capped scope run leaves out, aren't scope records and aren't checked.

## Output

Exit `0` means no problem was found. Exit `4` means at least one was. A ledger that is neither a mapping nor a list, or a `decisions` or `entries` that holds something other than a list, exits `3`. Read and parse failures exit `1`.

Without `--json`, each problem prints on stderr as `<record id>: <problem>`, and a closing line names the scope decision and counts the drops and problems. With `--json`, stdout holds:

- `ok`: whether no problem was found.
- `decision`: `{id, candidate, controls}` for the scope decision, or `null`.
- `drops`: one `{id, status, decision, selected_by, units, unit_names}` per scope drop, where `unit_names` are the backticked names in `units`.
- `problems`: one `{record, problem}` per problem.

## Examples

```sh
foundry check-scope-records open-requirements.ledger.yml
foundry check-scope-records open-requirements.ledger.yml summary-nextflow.json --json
```

## Gotchas

- A citation is checked only against the summary it was given. Pass the run's own `summary-nextflow.json`, not one built at another revision.
- A `test_candidates[<id>]` citation with no field passes when the candidate's file stem is the value or ends in `_<value>`. The check reads the name only, as the ledger note allows.
- A free-text control written only in `because` isn't checked.
