# refinement — implement-galaxy-workflow-test

## Tooling to wire in when this Mold de-stubs

- **Test-format JSON Schema** — `@galaxy-tool-util/schema` exports `tests.schema.json` (auto-generated from `galaxy.tool_util_models.Tests`). Cast skill should ship the schema verbatim under `references/schemas/tests.schema.json` and validate every authored `-tests.yml` against it before any planemo invocation. See `content/meta/casting.md` § *Schema artifacts in casts*.
- **`validateTestsFile(yaml)`** — pure-JS schema validator from the same package. First gate in the inner authoring loop.
- **`checkTestsAgainstWorkflow(workflow, tests)`** — pure-JS cross-checker that reports missing input/output labels and type mismatches between a `.ga` (or format2) workflow and its tests file. Catches the most common authoring failure (renamed output → broken test) without a full planemo run. Second gate in the inner loop. See [[planemo-asserts-idioms]] §6.
- **`gxwf validate-tests <tests.yml> --workflow <workflow> --json`** — CLI form of the same static gates for cast skills that operate through subprocesses. See [[validate-tests]].
