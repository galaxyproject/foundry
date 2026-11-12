# implement-galaxy-tool-step scenarios

## Case: concrete step preserves failure evidence

- fixture: abstract step plus Galaxy tool summary where the wrapper defines exit-code, stdio regex, strict-shell, or dynamic output behavior.
- expect: implements the step without erasing failure evidence needed later, including tool id, input labels, output labels, collection shape, and any wrapper failure semantics relevant to runtime debugging.

## Case: runtime failure ownership hint

- fixture: concrete step implementation with a plausible mismatch between expected source behavior and Galaxy wrapper inputs, outputs, datatype, or collection support.
- expect: records whether a later failure should be investigated as tool/job failure, data-flow mistake, template wiring mistake, wrapper mismatch, or test/assertion issue.

## Case: wrapper runs the work but has no index output

- fixture: a draft whose Deferred `STAR genome index` step feeds an index to two STAR alignment steps, and the [[galaxy-tool-summary]] for `iuc/rgrnastar/rna_star` `2.7.11b+galaxy1`. That wrapper has no index output: with `geneSource: history` it builds a temporary index inside the alignment job.
- expect: no index port is bound. One open blocking entry with `step` set to the index step names `rna_star` `2.7.11b+galaxy1` in `missing` and quotes its outputs and the `geneSource` option. Nothing asks for a new STAR wrapper.

## Case: `samtools view` flags from bamtofastq's config

- fixture: a draft whose Identity-pinned step translates nf-core/bamtofastq's `SAMTOOLS_VIEW_MAP_MAP` (pinned at `869832186b25d2ccbcd31d5f69edacc1ba32b718`). Its `_plan_state.resolved_args` has `args: '-b -f1 -F12'` and `prefix: { "${meta.id}.map_map" }` from `withName:SAMTOOLS_VIEW_MAP_MAP` in `conf/modules.config`, and its `intent` says only to keep mapped reads. Add the [[galaxy-tool-summary]] for the pinned Tool Shed `samtools_view` wrapper.
- expect: `state` sets BAM output, requires flag 1, and excludes flags 4 and 8, following the flags rather than `intent`. The ledger gains `carried` decisions covering `-b`, `-f1`, and `-F12` once each, and a `not_applicable` decision for `prefix`, each with `source_arg.step` set to the step. No flag record has a top-level `step`.

## Case: an alias selector overrides the process name's

- fixture: the `SAMTOOLS_VIEW_MAP_MAP` case above, with one more synthetic `resolved_args` entry: `args: '-h'` from `withName:SAMTOOLS_VIEW` in a module `nextflow.config`.
- expect: `state` does not set header output for `-h`. The `withName:SAMTOOLS_VIEW` entry gets one `not_applicable` decision whose `rationale` names `withName:SAMTOOLS_VIEW_MAP_MAP` as the selector that wins, and the alias entry's flags are recorded as in the case above.

## Case: two configs tie on one selector

- fixture: the `SAMTOOLS_VIEW_MAP_MAP` case above, with one more synthetic `resolved_args` entry: `args: '-b -f1 -F4'` from the same `withName:SAMTOOLS_VIEW_MAP_MAP` in `conf/extra.config`.
- expect: `state` sets BAM output and requires flag 1, and sets no exclude filter. Each entry's `-b` and `-f1` are `carried` once. Its `-F12` or `-F4` is an open gap with no `kind`, naming both entries' `selector` and `config` in `missing`. No record has a top-level `step`.

## Case: step bound to an authored user-defined tool

- fixture: a draft with one Deferred step (`tool_id: TODO`, `TODO_*` ports, `_plan_*` fields) whose Tool Shed discovery missed, plus the `galaxy-user-tool.yml` [[author-galaxy-tool-wrapper]] emitted for it. The definition embedded in Galaxy's `$GALAXY/lib/galaxy_test/workflow/inline_user_defined_tool.gxwf.yml` can stand in for the authored file once its data input's `format` is written as a list (`[txt]`), as [[author-galaxy-tool-wrapper]] emits it.
- expect: the implemented step carries that definition under `run:`, unchanged from the authored file, has no `tool_id`, `tool_version`, `tool_shed_repository`, or `tool_uuid`, keys `in:` by the definition's input names, and lists under `out:` every output a downstream step or workflow output uses. `gxwf draft-validate` without `--concrete` exits 0, and the workflow `gxwf draft-extract` writes keeps every workflow output and downstream connection of the implemented step. With a gxwf that still crashes on embedded steps, the run records in the ledger that `--concrete` validation did not run, rather than reporting the crash as a step failure. With a fixed gxwf pinned, `--concrete` exits 0 instead.
