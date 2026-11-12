# nextflow-summary-to-galaxy-parity eval

This file is the **abstract oracle** for the `nextflow-summary-to-galaxy-parity` Mold: properties any report must satisfy, independent of fixture. Concrete runs and their expected values live in `scenarios.md`.

## Property: the report changes nothing

- bucket: handoff
- check: deterministic
- assertion: the final workflow, the ledger and the test result are byte-identical before and after the Mold runs. The run's next action never depends on the report.

## Property: every command finding is reported

- bucket: fidelity
- check: deterministic
- assertion: each `findings[]` item `foundry nextflow-parity` emits for the run's five inputs appears in the report's Findings section with its kind and subject.

## Property: no difference reads as carried without a reason

- bucket: fidelity
- check: deterministic
- assertion: every removed step and removed output in the parity JSON appears in the report, either with the ledger `id` that drops it or as a finding. Every input in `inputs.unwired` appears as not carried and never as exposed.

## Property: the source-argument table is complete

- bucket: fidelity
- check: deterministic
- assertion: the table has a row for each kept step and each entry id in `source_args.rows` that names it, and each row lists exactly the records the parity JSON joined to it. Overridden entries are not rows that need a record, and stray records are listed with their problem.

## Property: scope rows come from scope records only

- bucket: fidelity
- check: deterministic
- assertion: the Source scope section lists the decision carrying `scope` and exactly the entries whose `scope_branch.decision` names it. A drop without `scope_branch` never appears there, and a ledger with no scope decision yields a one-line section.

## Property: links point at real ledger records

- bucket: hallucination
- check: deterministic
- assertion: every ledger `id` the report cites exists in the ledger, and every step, input and output key it names exists in the snapshot or the final workflow.

## Property: the report doesn't judge

- bucket: fidelity
- check: llm-judged
- assertion: the report states differences and their recorded reasons without calling any difference acceptable, harmless or expected, and without ranking findings. A difference whose recorded reason is uncited or contradicted by later evidence is reported as such, not as settled.

## Property: unverifiable versions stay unverified

- bucket: hallucination
- check: llm-judged
- assertion: a Tool Shed wrapper's software requirement is never stated as matched from its version string alone. Each tool-version row shows both sides, and a comparison no input settles is listed under Unverified.

## Property: behavioural changes ignore TODO resolution

- bucket: fidelity
- check: llm-judged
- assertion: the Behavioural changes section lists changes to settled values, removed steps, `when` changes and moved settled connections, each linked to a ledger record or marked as a finding. It does not list a `TODO` sentinel replaced by the value the design asked for.
