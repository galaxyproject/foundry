# UC3 Next Steps — emit the filtered + ranked differential-peaks tables

**Issue:** `UC3_ATAC_issue.md` (originally galaxy-brain issue #14).
**For:** the agent that built the clean UC3 history. Handoff to push the
differential-ATAC analysis from "great paper figures" to "complete *workflow*."

## Why this handoff

You optimized UC3 for the Galaxy Notebooks paper: a clean 5-step spine
(counts collection + sample sheet → DESeq2 → `tp_awk` NA-filter → volcanoplot)
that extracts with all rows seeded and forced the PDF-renderer contributions.
That goal was met.

But at the *workflow* level the headline scientific deliverable is missing. The
issue (steps 7 and 9) calls for **filtering significant peaks** and **ranking
top gained/lost** — and the current workflow does neither as data:

- The lone `tp_awk` step is `$6!="NA" && $7!="NA"{print}` — an **NA-row strip**,
  a prerequisite for volcanoplot, *not* the significance filter.
- The significance thresholds (`padj < 0.05`, `|log2FC| >= 1`) are applied only
  **inside the volcanoplot's coloring** (`signif_thresh`, `lfc_thresh`). So the
  45,620 significant peaks exist as colored dots in a PDF, but **no workflow
  output is the filtered table**, and nothing ranks top B-cell-gained vs
  Eryth-gained. The actual answer to "which peaks changed" can't be sorted,
  counted, or fed onward — only looked at.

No new tools needed: `bgruening/text_processing` (`tp_awk`, sort) is already
installed and in the spine. This is additive — don't disturb the existing
DESeq2 / NA-filter / volcano path.

## Step A — significance filter → significant-peaks table

- Tool: `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool/9.5+galaxy3`.
- Input: the **NA-stripped** DESeq2 table (the output of the existing `tp_awk`
  step). Branch off it **in parallel with volcanoplot** — do *not* replace the
  volcano's input, or you starve the volcano of the non-significant cloud and
  it stops being a volcano.
- Columns (headerless DESeq2 result): 1=peak_id, 2=baseMean, 3=log2FC, 4=lfcSE,
  5=stat, 6=pvalue, **7=padj**.
- awk (`padj < 0.05` AND `|log2FC| >= 1`):
  ```awk
  $7+0 < 0.05 && ($3+0 >= 1 || $3+0 <= -1) { print }
  ```
- Output to expose: **"Significant differential peaks"** — expected **45,620**
  rows.

## Step B — rank top gained / top lost

Direction reminder (reference_level = Erythroblast): **LFC > 0 = B-cell-gained,
LFC < 0 = Erythroblast-gained.** Confirm with a marker (MS4A1/CD20 chr11 is LFC>0).

- Sort the significant table by `log2FC` (col 3) numerically. Use the Sort tool
  (`tp_sort_header_tool`) or `tp_awk` piped through `sort -k3,3g`.
- Emit two ranked tables (e.g. top 50 each):
  - **Top B-cell-gained** — largest positive LFC (expect EBF1 +8.0, MS4A1 +7.3,
    PAX5 +6.8, CD19 +4.0 near the top).
  - **Top Eryth-gained** — most negative LFC (expect HBB ≈ −6.6, GATA1 ≈ −5.5
    near the top).
- Expose both as workflow outputs (issue step 9).

## Step C — nearest-gene annotation (optional / stretch)

Nearest-gene annotation is a possible "next." Keep it **light** per the issue's
scope note (peak-to-gene assignment is not trivial):

- Convert the top-peaks `peak_id` back to intervals (the Corces peak IDs encode
  hg19 coordinates; or join against the union-peaks BED if available).
- `bedtools closest` against an hg19 gene/TSS BED to attach a nearest-gene column.
- Optional; do not block Steps A/B on it.

## Verification (what "done" looks like)

| Check | Expected |
|---|---|
| Workflow step count | grows from 5 → ~7–8 (filter + sort, plus optional annotate) |
| Significant-peaks table | exposed output, **45,620** rows (padj<0.05, \|LFC\|≥1) |
| Direction split | 34,873 B-cell-gained (LFC>0) / 10,747 Eryth-gained (LFC<0) |
| Top-gained table markers | EBF1/MS4A1/PAX5/CD19 among top LFC>0 |
| Top-lost table markers | HBB/GATA1 among top LFC<0 |
| Volcano | unchanged — still fed the full non-NA table, not the filtered subset |
| Re-extraction | new outputs exposed, **zero dangling**, report clean (hold to the same clean re-extraction standard) |

## Scope / risks

- **Preserve the volcano input.** Step A must branch off the NA-stripped table in
  parallel; the volcano needs the full cloud to render correctly.
- Verify column indices on your server (`output_selector`/version can shift cols
  — confirm 3=log2FC, 6=pvalue, 7=padj from the result header).
- Keep nearest-gene (Step C) optional and light; don't let it expand into a
  pangenomic annotation project.
