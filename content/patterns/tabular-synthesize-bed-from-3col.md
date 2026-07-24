---
type: pattern
pattern_kind: operation
evidence: corpus-observed
title: "Tabular: synthesize BED from 3-column input"
tags:
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Use tp_awk_tool to convert chrom/start/end rows into 6-column BED, subtracting 1 from start and setting constants."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
related_patterns:
  - "[[tabular-prepend-header]]"
  - "[[tabular-compute-new-column]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
iwc_exemplars:
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction
    why: "Synthesizes SSU and LSU forward/reverse BED files from three-column interval outputs."
    confidence: high
  - workflow: amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-complete/mgnify-amplicon-pipeline-v5-complete
    why: "Uses the same BED synthesis idiom embedded in the complete workflow with an older text-processing pin."
    confidence: high
---

# Tabular: synthesize BED from 3-column input

## Tool

`toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool`. This is one of the operation-named awk recipe pages from [[iwc-tabular-operations-survey]] §7.

## When to reach for it

Use this when a three-column interval-like table needs to become BED-like six-column rows:

```text
chrom_or_seqid<TAB>start<TAB>end
```

to:

```text
chrom_or_seqid<TAB>start0<TAB>end<TAB>name<TAB>score<TAB>strand
```

The corpus-attested use is MGnify rRNA prediction: separate SSU/LSU forward/reverse interval outputs become hidden BED datasets, then forward and reverse files are concatenated per target. This is not a general tabular format-conversion page.

## Parameters

- `code`: awk program. Corpus uses a quoted one-liner.
- `infile`: connected three-column input.
- Output metadata: corpus examples set `change_datatype: bed` and `hide: true` on the output.

Version pins differ (`9.5+galaxy0` and `9.3+galaxy1`) with stable parameter shape. Prefer the newest/current pin already used in the workflow.

## Idiomatic shapes

Forward-strand BED:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy0
tool_state:
  code: 'BEGIN {OFS="\t"} {print $1, $2 - 1, $3, "forward", "1", "+"}'
  infile: { __class__: ConnectedValue }
out:
  - id: outfile
    change_datatype: bed
    hide: true
```

Reverse-strand BED:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy0
tool_state:
  code: 'BEGIN {OFS="\t"} {print $1, $2 - 1, $3, "reverse", "1", "-"}'
  infile: { __class__: ConnectedValue }
out:
  - id: outfile
    change_datatype: bed
    hide: true
```

## Pitfalls

- **Start coordinate off-by-one.** BED start is 0-based; corpus subtracts 1 from `$2`.
- **Do not subtract from end.** BED end stays `$3` in the corpus shape.
- **Set `OFS="\t"`.** Without it, `print $1, ...` emits spaces.
- **No header handling is shown.** Corpus inputs are treated as data-only. If input has a header, add `NR > 1` deliberately.
- **BED datatype matters.** Corpus sets `change_datatype: bed`; do not leave the output as generic tabular if downstream expects BED.
- **Name and score are constants.** This pattern does not derive BED name or score from input columns.
- **Forward and reverse are separate steps.** Do not emit both strands from one row unless downstream expects duplicate intervals in one file.

## See also

- [[iwc-tabular-operations-survey]] — §2g and §7 awk split decision.
- [[tabular-prepend-header]] — another operation-named awk recipe.
- [[tabular-compute-new-column]] — simple per-row arithmetic when the output remains tabular, not BED.
