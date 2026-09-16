---
mold: author-galaxy-tool-wrapper
date: 2026-09-16
intent: Remove the required whole-pipeline Nextflow dependency from generic UDT authoring.
decision: reference-change
---

## Contract checks

The committed-cast regression failed before the change because `summary-nextflow`
was required. After regenerating with the newly built tooling, the regression
passes: provenance marks the input optional, Nextflow references load on demand,
and the cast freshness and internal verification checks pass.

## Manual scenarios

Followed the cast as Codex for the two concrete counting cases in `scenarios.md`:
first a source-independent executable brief with no Nextflow artifacts, then
standalone Nextflow process evidence without a parent summary. Both yield the
counting UDT retained in `examples/galaxy-user-tool.yml`. For the latter case,
`tool_id: PYTHON` remains unresolved provenance; the explicitly supplied image
and command suffice for authoring, and no tools-registry entry is invented.

`gxwf validate-tool-source examples/galaxy-user-tool.yml --json` passes both
structural and semantic checks. The subsequent mandatory critic review found no
clarity or idiomaticity edits: labels describe the input and output, the command
quotes the dataset path, and output capture matches `count.txt`.

Locally executed the emitted shell command after substituting the input path,
including a path containing spaces. The two-line fixture and the variant without
a final newline both produce `2\n`; an empty file produces `0\n`. These are local
command checks, not a Galaxy-server or container execution claim.

The added nf-core channel/meta guidance remains hypothesis-level: this change
checks conditional dispatch, not full paired-module conversion coverage. XML
conversion and its Planemo loop remain separate.

## Repository gates

Tooling was installed from the frozen lockfile and every package rebuilt in a
separate worktree from current `origin/main`. Content validation, generated-file
checks, and the Planemo pin check pass. The full `make check` stops on existing
vendored drift against local Galaxy and galaxy-tool-util-ts checkouts (seven
files), unrelated to this Mold change. Remaining gates are run separately.

All remaining gates pass: cast freshness, internal cast verification, pipeline
assembly drift, and 11 committed artifact fixtures. The full root suite passes
388 tests across 26 files, including the new cast-contract regression and a
420-page site build. Pre-commit formatting, lint, YAML, and whitespace hooks pass.
