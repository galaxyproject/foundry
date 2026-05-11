# @galaxy-foundry/planemo-test-report-schema

JSON Schema for the JSON report emitted by `planemo test --test_output_json` (and friends), plus an AJV-backed validator and a `validate-planemo-test-report` CLI.

The schema is vendored from upstream planemo's `output_schema --schema test-report` command. The canonical artifact is `src/test-report.schema.json`; `src/test-report.provenance.json` records the planemo version and source SHA. Both ship in `dist/`.

```sh
npx --package @galaxy-foundry/planemo-test-report-schema validate-planemo-test-report path/to/test-report.json
```

## Sync

Two-step regeneration:

```sh
# 1. Pull schema + provenance from planemo (requires planemo on PATH).
pnpm sync:from-planemo

# 2. Regenerate the TS mirror from the JSON (no planemo needed).
pnpm sync
```

Contributor laptops only need step 2 — step 1 reruns when a new planemo pin lands.
