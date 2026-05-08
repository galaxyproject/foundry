# @galaxy-foundry/summary-nextflow-schema

JSON Schema for the [Foundry's](https://github.com/jmchilton/foundry) `summarize-nextflow` output format, plus an AJV-backed validator and a `validate-summary-nextflow` CLI.

## Source of truth

The schema is authored in this package at `src/summary-nextflow.schema.json` (canonical, hand-edited). `scripts/sync-schema.mjs` regenerates the typed const wrapper at `src/summary-nextflow.schema.generated.ts` from it; this runs as `prebuild`. The Foundry's `content/schemas/` only holds the rendered `summary-nextflow.md` schema note. Mold frontmatter cites schemas via `[[summary-nextflow]]` wiki-links; the cast pipeline reads `package` + `package_export` from the note's frontmatter and imports `summaryNextflowSchema` from this package at build time.

## Install

```sh
npm install @galaxy-foundry/summary-nextflow-schema
```

## Usage

```ts
import { validateSummary, summaryNextflowSchema } from "@galaxy-foundry/summary-nextflow-schema";

const result = validateSummary(myJson);
if (!result.valid) {
  for (const err of result.errors) {
    console.error(err.path, err.message);
  }
}
```

## CLI

```sh
npx --package @galaxy-foundry/summary-nextflow-schema validate-summary-nextflow path/to/summary.json
```

Exit codes: `0` valid, `3` schema-validation failure, `1` input error.

Cast skills should invoke the CLI before returning a summary. Library validation exists for TypeScript consumers, but generated-skill validation should be command-shaped so logs and failure modes are explicit.

## License

MIT.
