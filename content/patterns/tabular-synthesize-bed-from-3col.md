---
type: pattern
pattern_kind: operation
evidence: corpus-and-verified
title: "Tabular: synthesize BED from 3-column input"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-10-04
revision: 3
summary: "Convert one-based inclusive chromosome/start/end rows to six-column BED with awk, after checking the source coordinate convention."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-prepend-header]]"
  - "[[tabular-compute-new-column]]"
  - "[[galaxy-interval-patterns]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/tabular-synthesize-bed-from-3col/synthesize-bed.gxwf-test.yml
iwc_exemplars:
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction
    why: "Converts separate SSU and LSU forward/reverse three-column query results to BED, then concatenates strands per target."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-complete/mgnify-amplicon-pipeline-v5-complete
    why: "Embeds the same rRNA BED-construction steps in the complete pipeline."
    confidence: high
---

# Tabular: synthesize BED from 3-column input

Connect a headerless `chrom<TAB>start<TAB>end` table to `tp_awk_tool` when its coordinates are **one-based and inclusive** and the next tool needs BED intervals. Subtract one from the start and keep the end to make a zero-based, half-open interval. Append name, score, and strand to produce six tab-separated columns. If the input already uses BED coordinates, do not subtract again.

The [MGnify rRNA prediction workflow](https://github.com/galaxyproject/iwc/blob/deafc4876f2c778aaf075e48bd8e95f3604ccc92/workflows/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.ga) supplies four headerless three-column outputs from `query_tabular`: SSU and LSU, each split into forward and reverse intervals. Its SQL selects the lower coordinate before the higher coordinate for both orientations. Four awk steps then make BED rows, and `gops_concat_1` combines the two strands for each target. The workflow demonstrates the construction, but it does not establish that every three-column table uses the same coordinate convention.

## Construct the BED rows

The forward step uses the pinned workflow's `9.5+galaxy0` tool version and Tool Shed changeset. This is a gxformat2 **step excerpt**: connect `infile` to the upstream dataset and declare `outfile` in the complete workflow.

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy0
tool_version: "9.5+galaxy0"
tool_shed_repository:
  changeset_revision: 3dc70b59608c
  name: text_processing
  owner: bgruening
  tool_shed: toolshed.g2.bx.psu.edu
tool_state:
  code: 'BEGIN {OFS="\t"} {print $1, $2 - 1, $3, "forward", "1", "+"}'
  infile: { __class__: ConnectedValue }
  variables: []
out:
  - id: outfile
    change_datatype: bed
    hide: true
```

For a forward input row `seqA<TAB>11<TAB>20`, the result is `seqA<TAB>10<TAB>20<TAB>forward<TAB>1<TAB>+`. The reverse step uses the same expression with `"reverse", "1", "-"`, yielding `seqA<TAB>10<TAB>20<TAB>reverse<TAB>1<TAB>-` for that row. In this workflow the name labels direction and the score is a constant, not a measurement. Change those fields when the downstream BED consumer needs other meanings.

`OFS="\t"` makes awk's comma-separated `print` fields tab-separated. `change_datatype: bed` tells Galaxy to treat the produced text as BED, while `hide: true` keeps these intermediate datasets out of the usual history view. Neither setting validates the coordinates. The checked-in `verification/workflows/tabular-synthesize-bed-from-3col/` fixture contains both strand programs and tests that compare their complete output files.

## Check the coordinate contract

- Confirm that input starts are one-based and ends are inclusive before using `$2 - 1`. A zero-based start would become wrong. For a one-base interval at position 11, expect BED `10<TAB>11`, not `11<TAB>11`.
- Confirm start and end are numeric and form a nonempty interval. Awk will coerce nonnumeric text in `$2 - 1`, which can create a plausible-looking wrong coordinate. The MGnify query supplies sorted coordinate columns, but this awk program does not sort or validate them.
- The program treats every line as data. Remove a header first or add an explicit header rule if the source has one. Otherwise its text fields become a malformed BED row.
- Check both strand values and at least one expected interval in the produced file. A six-column count or `bed` datatype alone can pass with an off-by-one result.

For variant-dependent intervals whose span needs allele-length arithmetic, see [[interval-mask-by-set-algebra]]. For other tabular transformations, see [[galaxy-tabular-patterns]]. The wider IWC evidence is in [[iwc-tabular-operations-survey]].

## Evidence and verification

The pinned MGnify workflow supplies the SQL, awk programs, Tool Shed pin, output datatype action, and strand concatenation described above. The input coordinate convention is a precondition inferred from its `$2 - 1` expression, not a property established for other tables. On 2026-10-04, `gxwf validate` and `gxwf validate-tests` passed for the fixture, and direct execution of both awk programs matched the complete expected BED files. A Galaxy/Planemo run remains unverified.
