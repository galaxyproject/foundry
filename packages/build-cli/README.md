# @galaxy-foundry/build-cli

Build and authoring CLI for Galaxy Workflow Foundry source trees.

## Status

`v0.0.0` — initial package boundary for validation, deterministic casting, and generated content checks.

## Install

```sh
pnpm add -D @galaxy-foundry/build-cli
```

## Usage

```sh
foundry-build validate --root .
foundry-build cast summarize-nextflow --root . --target=claude --check
foundry-build generate-index --root . --check
foundry-build generate-dashboard --root . --check
foundry-build test-pipeline nextflow-to-galaxy --root . \
  --scenario "nf-core/demo end to end" --through 2 \
  --engine pi --sandbox container \
  --provider anthropic --model MODEL_ID --credential-env ANTHROPIC_API_KEY

# Use an OpenAI subscription for an explicitly local diagnostic run.
foundry-build pi-test-auth login
foundry-build test-pipeline nextflow-to-galaxy --root . \
  --scenario "nf-core/demo end to end" --engine pi --sandbox local \
  --provider openai-codex --model MODEL_ID --pi-test-auth

# A non-default store can be selected consistently for login and execution.
foundry-build pi-test-auth login --auth-dir /secure/foundry-eval-auth
foundry-build test-skill summarize-nextflow --root . --prompt "Summarize it" \
  --provider openai-codex --model MODEL_ID --pi-test-auth \
  --auth-dir /secure/foundry-eval-auth

# Read a finished conversion run, writing the page beside its artifacts.
foundry-build run-dashboard ./sarek-galaxy --root .

# Read an older run that predates the run record, naming the pipeline by hand.
foundry-build run-dashboard ~/src/foundry-runs/sarek --root . \
  --reconstruct --pipeline nextflow-to-galaxy --out /tmp/sarek-dash
```

## Commands

- `validate` — validate Foundry content frontmatter, cross-file links, Mold references, pipeline phases, Mold source layout, CLI command docs, and pattern evidence metadata.
- `cast` — deterministically assemble a Mold cast bundle and provenance for a target.
- `generate-index` — write or check `content/Index.md`.
- `generate-dashboard` — write or check `content/Dashboard.md` from `dashboard_sections.json`.
- `test-skill` — run one cast skill in a fresh Pi worker and retain its trace and validated artifacts.
- `test-pipeline` — run a prefix of an assembled Pipeline, or a later range of it, with one fresh Pi worker per phase. It resolves a named Pipeline scenario, carries forward only artifact IDs declared by the next skill, supports `--through <phase-or-skill>` and `--trials N`, and writes an aggregate `run.json` beside each phase's worker record and raw trace. The `advance-galaxy-draft-step` loop runs one worker per call: the controller asks `nextDraftStep` before each call, fails a call that leaves the draft unchanged (as `loop_blocked` when the call appended or updated an open or surrendered blocking ledger entry for the picked step, `loop_no_progress` otherwise), escalates a blocked call whose blocker is still open to a `repair-galaxy-draft-topology` worker when the harness casts one (the loop resumes once a repair resolves at least one of the blockers it was given, and stops `loop_blocked` when it resolves none or removes one from the ledger, at `--max-repairs`, or when no call is left under `--max-iterations` to follow a repair; `--max-repairs` defaults to the `topology_repair.cap` of the ledger the loop is handed, else 3, so no call can raise it; a failed repair fails the phase; the run record, not the ledger header, counts escalations), escalates a call that leaves an open `kind: needs_tool` entry for its step to an `author-galaxy-tool-wrapper` worker in the same way (it must resolve the entry and leave the step with an inline `GalaxyUserTool` `run:` and no `tool_id`; a step is authored at most once, and authorings count against `--max-repairs`), stops at `--max-iterations` (default twice the drafty steps at loop entry, plus the terminal call, plus the repair cap when the harness casts an escalation; escalations themselves don't count), and shares one tool cache across a trial's iterations. It needs `gxwf`, which the container image does not ship, so it runs only with `--sandbox local` for now. `--max-cost` and `--max-tokens` cap the run, checked before each worker starts; once spent, the remaining phases and trials do not run. The `test-data-resolution` branch runs one worker per leg: each leg after the first reads the `test-data-refs` the one before wrote, and the chain stops at the first leg that leaves no input unresolved. A leg that writes no refs, drops one, or changes a resolved one fails the phase. Inputs still unresolved when the chain reaches `user-supplied` end the phase, trial and run `blocked`, not failed; the command then exits 2 rather than 1. `--from <phase-or-skill>` starts the run later, from an earlier run of the same pipeline and scenario named by `--seed-run <dir>` (its trial `--seed-trial`, default 1). The latest write of each artifact by a phase that passed there is checked against that run's hashes and copied into `seed/`; a run whose phases read an artifact last produced by a phase that did not pass there is refused. Only the pipeline's first phase is given the scenario fixture. Other branches, and loops with no controller oracle, are rejected during preflight, among the selected phases only.
- `run-dashboard` — read a conversion run's working directory and emit `run-manifest.json` plus a self-contained `dashboard.html` beside it. It resolves the run against the harness `_assembly.json`, each skill's `_provenance.json`, the run's own `foundry-run.yml`, both YAML ledgers, and the checkpoint git history. `--reconstruct` reads a run made before the run record existed, degraded and labelled; `--pipeline` settles a run whose filenames cannot name it; `--offline` drops every link back to the published site. `--out` writes elsewhere, with file links still pointing back into the run. Neither file is overwritten unless an earlier run-dashboard wrote it or `--force` is given; a refusal writes nothing and exits 2, as do contradictory flags such as `--manifest-only --html-only`. Exit 3 means the pipeline could not be determined or the run record is missing. The page works without JavaScript, minus filtering and sorting. There is no `--check` mode because the output is never committed.
- `pi-test-auth` — manage an isolated OpenAI/Codex OAuth credential for local diagnostic test runs. Supports `login`, `status`, and `logout`; `login --method device-code --no-open` works on a headless host. Status output contains metadata only.

`--pi-test-auth` is opt-in and valid only with `--sandbox local`, `--provider openai-codex`. Local mode is not a security boundary: the Pi process keeps the credential on the host while its enabled tools also execute on the host. The container sandbox deliberately does not accept this OAuth store; continue to pass narrowly allowlisted API-key environment variables to container runs until host-side tool sandboxing is implemented.

## License

MIT.
