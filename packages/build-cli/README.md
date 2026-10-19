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
- `test-pipeline` — run a prefix of an assembled Pipeline with one fresh Pi worker per phase. It resolves a named Pipeline scenario, carries forward only artifact IDs declared by the next skill, supports `--through <phase-or-skill>` and `--trials N`, and writes an aggregate `run.json` beside each phase's worker record and raw trace. The `advance-galaxy-draft-step` loop runs one worker per call: the controller asks `nextDraftStep` before each call, fails a call that leaves the draft unchanged (as `loop_blocked` when an open or surrendered blocking ledger entry names the picked step, `loop_no_progress` otherwise), stops at `--max-iterations` (default twice the drafty steps at loop entry, plus the terminal call), and shares one tool cache across a trial's iterations. It needs `gxwf`, which the container image does not ship, so it runs only with `--sandbox local` for now. `--max-cost` and `--max-tokens` cap the run, checked before each worker starts; once spent, the remaining phases and trials do not run. Branches, and loops with no controller oracle, are rejected during preflight.
- `run-dashboard` — read a conversion run's working directory and emit `run-manifest.json` plus a self-contained `dashboard.html` beside it. It resolves the run against the harness `_assembly.json`, each skill's `_provenance.json`, the run's own `foundry-run.yml`, both YAML ledgers, and the checkpoint git history. `--reconstruct` reads a run made before the run record existed, degraded and labelled; `--pipeline` settles a run whose filenames cannot name it; `--offline` drops every link back to the published site. `--out` writes elsewhere, with file links still pointing back into the run. Neither file is overwritten unless an earlier run-dashboard wrote it or `--force` is given; a refusal writes nothing and exits 2, as do contradictory flags such as `--manifest-only --html-only`. Exit 3 means the pipeline could not be determined or the run record is missing. The page works without JavaScript, minus filtering and sorting. There is no `--check` mode because the output is never committed.
- `pi-test-auth` — manage an isolated OpenAI/Codex OAuth credential for local diagnostic test runs. Supports `login`, `status`, and `logout`; `login --method device-code --no-open` works on a headless host. Status output contains metadata only.

`--pi-test-auth` is opt-in and valid only with `--sandbox local`, `--provider openai-codex`. Local mode is not a security boundary: the Pi process keeps the credential on the host while its enabled tools also execute on the host. The container sandbox deliberately does not accept this OAuth store; continue to pass narrowly allowlisted API-key environment variables to container runs until host-side tool sandboxing is implemented.

## License

MIT.
