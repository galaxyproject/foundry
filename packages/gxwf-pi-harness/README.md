# @galaxy-foundry/gxwf-pi-harness

Pi-backed worker isolation for evaluating published Galaxy Workflow Foundry skills.

The package has two surfaces:

- `runPiSkill()` starts one ephemeral Pi RPC worker with one explicitly loaded skill, a fresh configuration directory, staged declared inputs, and ambient resource discovery disabled.
- `@galaxy-foundry/gxwf-pi-harness/extension` registers the constrained `foundry_subagent` tool used by a top-level Pipeline skill.

The extension derives the worker's expected artifacts exclusively from the selected published cast's `_provenance.json`. The parent agent can choose the skill, task, and declared inputs, but cannot replace or suppress that artifact contract.

Local mode is process and context isolation, not a security boundary. The trace CLI defaults each local run to a unique directory under the operating system's temporary directory, and both local and container workers load a dereferenced staged copy of the selected skill rather than its checkout path. An explicit `--run-dir` still overrides that diagnostic default.

OpenAI subscription-backed diagnostics can opt into the Foundry-specific `pi-test-auth` store. Login, refresh, and logout use Pi's public authentication API; Foundry does not interpret or copy tokens. For each local run, the fresh Pi configuration temporarily links to the store's `auth.json`, then removes that link before retaining the run directory. Run records contain only the label `pi-test-auth`, never the store path or credential values.

Container mode runs the whole Pi RPC worker inside a disposable Docker container. It mounts the staged skill bundle and copied declared inputs read-only, mounts only the run's output directory read-write, and uses tmpfs for Pi configuration and temporary files. The checkout itself is never mounted.

Build the default image from the repository root:

```sh
npm run gxwf-pi-harness:container-build
```

The image pins Pi 0.84.4 and the `@galaxy-foundry/gxwf-foundry` CLI 0.1.0 required by the pilot `summarize-nextflow` skill. It carries compatibility labels for both runtimes that are checked before every run. A caller may use `--sandbox-image <ref>` for another locally available image with the same labels. The runner resolves the ref to an immutable image ID before launch and records that ID, any repository digests, every mount, the network policy, and the names—not values—of forwarded credential variables.

Container provider access is explicit. Use `--sandbox-network bridge` and repeat `--credential-env <NAME>` for only the variables the provider needs. Use `--sandbox-network none` for credential-free probes. Run the Docker boundary test with `npm run gxwf-pi-harness:container-test`.

The OAuth store is intentionally rejected in container mode. A whole-process container would require putting the refresh credential inside that worker boundary; use an allowlisted API-key environment variable there until the planned host-agent/tool-sandbox split is available.

## Extension configuration

- `FOUNDRY_SKILLS_DIR` — required path to the installed Foundry skills root.
- `FOUNDRY_RUNS_DIR` — directory for child run records; defaults to a temporary directory.
- `FOUNDRY_WORKER_TIMEOUT_MS` — child wall timeout; defaults to ten minutes.
- `FOUNDRY_SANDBOX` — `local` (default) or `container`.
- `FOUNDRY_SANDBOX_IMAGE` — optional compatible container image ref.
- `FOUNDRY_SANDBOX_NETWORK` — `bridge` (default) or `none`.
- `FOUNDRY_SANDBOX_CREDENTIAL_ENV` — comma-separated environment-variable allowlist.

The trace-mode CLI also accepts `--thinking <level>` when an evaluation should pin Pi's
reasoning level rather than use the model default.

The extension accepts skill names, never arbitrary skill paths. It resolves each name as one direct child of `FOUNDRY_SKILLS_DIR` and starts the child through the same runner used by trace-mode callers.

## License

MIT.
