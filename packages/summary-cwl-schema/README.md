# @galaxy-foundry/summary-cwl-schema

JSON Schema for the Foundry's `summarize-cwl` output format, plus an AJV-backed validator and a `validate-summary-cwl` CLI.

The schema is intentionally smaller than `summary-nextflow`: CWL already carries typed workflow and tool structure, so this package records that structure after validation/packing rather than inferring a custom pipeline model.

```sh
npx --package @galaxy-foundry/summary-cwl-schema validate-summary-cwl path/to/summary-cwl.json
```
