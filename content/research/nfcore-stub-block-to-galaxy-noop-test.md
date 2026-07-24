---
type: research
title: "nf-core stub: block → Galaxy (intentional drop)"
tags:
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-10
revised: 2026-06-10
revision: 3
ai_generated: true
summary: "nf-core's stub: block has no Galaxy analog; the convert Mold drops it intentionally and records the drop in _provenance.yml."
related_molds:
  - "[[convert-nfcore-module-to-galaxy-tool]]"
sources:
  - "https://github.com/nf-core/modules/tree/9b261a459473bc8e2d830bfc626f480c0733f4fe"
---

# nf-core `stub:` block → Galaxy (intentional drop)

Cited modules pinned to `nf-core/modules@9b261a459473bc8e2d830bfc626f480c0733f4fe`.

## What the `stub:` block does in nf-core

Most nf-core modules ship a `stub:` block alongside `script:`. It fakes the outputs cheaply so `nextflow run -stub-run` exercises the DAG (channels, joins, output discovery, naming) without invoking the upstream tool.

`modules/nf-core/samtools/index/main.nf`:

```nextflow
script:
def args = task.ext.args ?: ''
"""
samtools index -@ ${task.cpus} ${args} ${input}
"""

stub:
def args = task.ext.args ?: ''
def extension = file(input).getExtension() == 'cram'
    ? "crai"
    : args.contains("-c") ? "csi" : "bai"
"""
touch ${input}.${extension}
"""
```

`modules/nf-core/fastp/main.nf` has a more elaborate `stub:` block that produces every conditional output the script can emit (paired/single, merged, fail FASTQs, JSON, HTML, log).

## Why Galaxy doesn't need an analog

Galaxy's tool-execution model has no DAG-level dry-run. The Galaxy/IUC equivalent of "did the wrapper plumb correctly" is `planemo lint` (XML-shape correctness) followed by `planemo test` (real CLI invocation against a fixture). Together they cover the same ground:

| nf-core | Galaxy |
|---|---|
| `nextflow run -stub-run` (DAG resolves, channels join) | `planemo lint` (XML valid, params bind, output discovery rules are well-formed) |
| `nextflow run` (real fixture) | `planemo test` (real fixture via `<test>` blocks) |

There's no Galaxy XML element that means "fake the outputs without running the tool." There's no need for one — `planemo test` runs fast against small fixtures, so the cost gap nf-core is closing with `-stub-run` doesn't apply at the per-tool granularity.

## The convert Mold's posture

**Intentionally drop the `stub:` block.** Nothing in `tool.xml` references it. Two minor obligations:

1. **Record the drop in `_provenance.yml`** under `overrides[]`:
   ```yaml
   overrides:
     - reason: "Dropped stub: block per nfcore-stub-block-to-galaxy-noop-test pattern."
       files: ["main.nf:stub"]
   ```
   This makes the drop visible to the reviewer and to a future refresh-from-upstream pass.

2. **Make sure at least one `<test>` block exists** with a real fixture (typically a remote `location` URL pinned to `nf-core/test-datasets`). The `stub:` block's role — exercise the wrapper without paying for the upstream tool — is filled by the runtime test against a small fixture.

When `tests/main.nf.test` has *only* stub-mode coverage (rare), the convert Mold cannot synthesize a Galaxy `<test>` from the stub block. Surface the gap in `_provenance.yml.overrides` and let the harness decide whether to author a `<test>` by hand.

## Cited cases

- `modules/nf-core/samtools/index/main.nf` — short `stub:` (one `touch`); cleanly dropped, `<test>` covers the contract.
- `modules/nf-core/fastp/main.nf` — elaborate `stub:` mirroring the conditional output set; still cleanly dropped because Galaxy's per-conditional outputs declare format/discovery rules in `<outputs>` that `planemo lint` validates structurally.
- `modules/nf-core/samtools/sort/main.nf` — `stub:` repeats the index-format introspection; still dropped.

In all three the convert Mold's deliverable is identical: tool.xml + macros.xml + at least one `<test>` block with a real fixture, plus a one-line override entry.

## Pitfalls

- **Don't try to reconstruct outputs from the stub block.** The `stub:` block's `touch` lines are deliberately minimal; using them as a guide for `<discover_datasets>` patterns is misleading. Read the `output:` channel declarations directly.
- **Don't surface the drop as a warning.** It's an *intentional* drop, not a deficiency — recording it as an override is enough.
- **Stub-only test coverage is the real risk.** When the only fixture in `tests/main.nf.test` is `-stub-run`, the convert Mold lacks the input/output values it would need to write a Galaxy `<test>`. That's the case worth surfacing for human review.

## See also

- `[[convert-nfcore-module-to-galaxy-tool]]` — Mold that consumes this note.
- `planemo test` — the runtime sink that makes the drop safe.
- `planemo lint` — the XML-shape gate that fills in for the DAG-resolution part of `-stub-run`.
