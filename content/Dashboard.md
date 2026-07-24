# Dashboard

Generated from `dashboard_sections.json` and content frontmatter. Do not edit by hand.

## Pipelines

| Name | Summary | Status | Revised | Rev |
| --- | --- | --- | --- | --- |
| [[interview-to-galaxy]] | Interview-driven path to a Galaxy gxformat2 workflow through the shared freeform-summary handoff. | reviewed | 2026-07-24 | 2 |
| [[nextflow-to-galaxy]] | Direct path from a Nextflow pipeline to a Galaxy gxformat2 workflow. | reviewed | 2026-07-24 | 4 |
| [[update-interview-to-galaxy]] | Interview-driven, edit-in-place modification of an existing Galaxy gxformat2 workflow via a reviewable change-set, reusing the per-step draft loop. | reviewed | 2026-07-24 | 2 |
| [[cwl-to-galaxy]] | Path from a CWL Workflow to a Galaxy gxformat2 workflow. Lighter upstream extraction. | draft | 2026-04-30 | 2 |
| [[nextflow-to-cwl]] | Direct path from a Nextflow pipeline to a CWL Workflow + CommandLineTool set. | draft | 2026-04-30 | 2 |
| [[paper-to-cwl]] | Direct path from a paper to a CWL Workflow + CommandLineTool set. | draft | 2026-04-30 | 2 |
| [[paper-to-galaxy]] | Direct path from a paper to a Galaxy gxformat2 workflow. No CWL intermediate. | draft | 2026-04-30 | 2 |

## Molds

| Name | Summary | Status | Revised | Rev |
| --- | --- | --- | --- | --- |
| [[advance-galaxy-draft-step]] | Advance the gxformat2 draft by one step: pick the next drafty step, resolve a wrapper, implement the step, and validate. | reviewed | 2026-07-24 | 3 |
| [[apply-galaxy-workflow-changeset]] | Apply a reviewed change-set to a concrete Galaxy workflow: untouched regions preserved, tool-introducing edits injected as drafty steps. | reviewed | 2026-07-24 | 2 |
| [[author-galaxy-tool-wrapper]] | Author a new Galaxy user-defined tool YAML definition when discovery yields nothing acceptable. | reviewed | 2026-07-24 | 4 |
| [[changeset-to-galaxy-test-plan]] | Carry an existing Galaxy workflow's tests forward as a regression baseline and augment them for a change-set's deltas, emitting a Galaxy test plan. | reviewed | 2026-07-24 | 2 |
| [[compare-against-iwc-exemplar]] | Find nearest IWC exemplar(s) and surface a structural diff against the upstream Galaxy design briefs to guide template authoring. | reviewed | 2026-07-24 | 8 |
| [[debug-galaxy-workflow-output]] | Triage failing Galaxy run outputs; classify the failure surface and capture evidence before recommending repairs. | reviewed | 2026-07-24 | 5 |
| [[discover-shed-tool]] | Search the Tool Shed for an existing wrapper, drill from hit to a pinnable changeset, classify candidates, and recommend or fall through. | reviewed | 2026-07-24 | 5 |
| [[find-test-data]] | Search IWC fixtures and public sources for test data matching a data-flow shape. | reviewed | 2026-07-24 | 3 |
| [[freeform-summary-to-galaxy-data-flow]] | Translate a free-form source summary into a Galaxy data-flow design brief. | reviewed | 2026-07-24 | 2 |
| [[freeform-summary-to-galaxy-interface]] | Map a free-form source summary into a Galaxy workflow interface design brief. | reviewed | 2026-07-24 | 2 |
| [[freeform-summary-to-galaxy-template]] | gxformat2 skeleton with per-step TODOs from a free-form summary and Galaxy design brief. | reviewed | 2026-07-24 | 5 |
| [[freeform-summary-to-galaxy-test-plan]] | Synthesize a Galaxy workflow test plan from a free-form summary and the Galaxy design briefs. | reviewed | 2026-07-24 | 2 |
| [[implement-galaxy-tool-step]] | Convert an abstract step into a concrete gxformat2 step using a tool summary. | reviewed | 2026-07-24 | 8 |
| [[implement-galaxy-workflow-test]] | Assemble Galaxy workflow test fixtures and assertions. | reviewed | 2026-07-24 | 8 |
| [[interview-to-freeform-summary]] | Normalize a free-form user interview into the shared freeform-summary workflow handoff. | reviewed | 2026-07-24 | 3 |
| [[interview-to-galaxy-workflow-changeset]] | Interview a user against an existing Galaxy workflow summary and emit a reviewable, step-anchored change-set. | reviewed | 2026-07-24 | 2 |
| [[nextflow-summary-to-galaxy-data-flow]] | Translate a Nextflow summary into a Galaxy data-flow design brief. | reviewed | 2026-07-24 | 5 |
| [[nextflow-summary-to-galaxy-interface]] | Map a Nextflow summary into a Galaxy workflow interface design brief. | reviewed | 2026-07-24 | 5 |
| [[nextflow-summary-to-galaxy-reference-data]] | Decide the Galaxy-side shape of external reference data declared by a Nextflow pipeline. | reviewed | 2026-07-24 | 4 |
| [[nextflow-summary-to-galaxy-template]] | gxformat2 skeleton with per-step TODOs from a Nextflow summary and prior Galaxy design briefs. | reviewed | 2026-07-24 | 8 |
| [[nextflow-test-to-galaxy-test-plan]] | Translate Nextflow test evidence into a Galaxy workflow test plan. | reviewed | 2026-07-24 | 5 |
| [[nextflow-to-test-data]] | Resolve a Nextflow pipeline's own declared test fixtures into Galaxy workflow test-data refs. | reviewed | 2026-07-24 | 2 |
| [[run-workflow-test]] | Execute a workflow's tests via Planemo; emit structured pass/fail and outputs. | reviewed | 2026-07-24 | 6 |
| [[summarize-galaxy-tool]] | Pull JSON schema, container, source, inputs/outputs for a Galaxy tool. | reviewed | 2026-07-24 | 8 |
| [[summarize-galaxy-workflow]] | Read an existing Galaxy gxformat2 (or .ga) workflow and emit a structured summary for interview and change-set steps. | reviewed | 2026-07-24 | 2 |
| [[summarize-nextflow]] | Read a Nextflow pipeline source tree (nf-core or ad-hoc DSL2) and emit a structured JSON summary for downstream translation Molds. | reviewed | 2026-07-24 | 14 |
| [[validate-galaxy-workflow]] | Run terminal gxwf validation on an assembled Galaxy workflow and classify workflow-level failures. | reviewed | 2026-07-24 | 4 |
| [[cwl-to-test-data]] | Resolve a CWL workflow's own declared test cases into Galaxy workflow test-data refs. | draft | 2026-07-17 | 1 |
| [[convert-nfcore-module-to-galaxy-tool]] | Convert one nf-core module dir into a Galaxy tool wrapper (tool.xml + macros.xml + _provenance.yml + remote-URL <test> blocks). | draft | 2026-06-19 | 4 |
| [[repair-galaxy-draft-topology]] | Re-wire a Galaxy draft region when a step's declared output can't be computed from its wired inputs. | draft | 2026-06-16 | 1 |
| [[cwl-summary-to-galaxy-template]] | gxformat2 skeleton with per-step TODOs from a CWL summary and prior Galaxy design briefs. | draft | 2026-06-11 | 4 |
| [[cwl-summary-to-galaxy-data-flow]] | Translate a CWL summary into a Galaxy data-flow design brief. | draft | 2026-05-10 | 2 |
| [[cwl-summary-to-galaxy-interface]] | Map a CWL summary into a Galaxy workflow interface design brief. | draft | 2026-05-10 | 2 |
| [[summarize-cwl]] | Validate and normalize a CWL Workflow tree, then emit a lightweight structured summary for downstream Galaxy translation. | draft | 2026-05-10 | 2 |
| [[freeform-summary-to-cwl-design]] | Translate a free-form source summary into a CWL workflow design brief. | draft | 2026-05-05 | 1 |
| [[nextflow-summary-to-cwl-data-flow]] | Translate a Nextflow summary into a CWL data-flow design brief. | draft | 2026-05-05 | 1 |
| [[nextflow-summary-to-cwl-interface]] | Map a Nextflow summary into a CWL Workflow interface design brief. | draft | 2026-05-05 | 1 |
| [[summary-to-cwl-template]] | CWL Workflow skeleton with per-step TODOs from source and design handoffs. | draft | 2026-05-05 | 2 |
| [[cwl-test-to-galaxy-test-plan]] | Translate CWL test fixtures into a Galaxy workflow test plan. | draft | 2026-05-03 | 2 |
| [[nextflow-test-to-cwl-test-plan]] | Translate Nextflow test evidence into a CWL workflow test plan. | draft | 2026-05-03 | 1 |
| [[debug-cwl-workflow-output]] | Triage failing CWL run outputs; classify failure modes; propose fixes. | draft | 2026-04-30 | 1 |
| [[implement-cwl-tool-step]] | Convert an abstract step into a concrete CWL CommandLineTool + step. | draft | 2026-04-30 | 1 |
| [[implement-cwl-workflow-test]] | Assemble CWL job file(s) and expected-output assertions. | draft | 2026-04-30 | 1 |
| [[paper-to-test-data]] | Derive workflow test inputs and expected outputs from a paper. | draft | 2026-04-30 | 1 |
| [[summarize-cwl-tool]] | Derive a CommandLineTool description (container, baseCommand, IO) for a CWL target. | draft | 2026-04-30 | 1 |
| [[summarize-paper]] | Extract methods, tools, sample data, and references from a paper. | draft | 2026-04-30 | 1 |
| [[validate-cwl]] | Run cwltool --validate / schema lint, classify failures, recommend fixes. | draft | 2026-04-30 | 1 |

## Patterns

| Name | Summary | Status | Revised | Rev |
| --- | --- | --- | --- | --- |
| [[galaxy-interval-patterns]] | Use this MOC to choose corpus-grounded Galaxy genomic interval operations and recipes on coordinate features. | draft | 2026-06-10 | 1 |
| [[galaxy-sequence-patterns]] | Use this MOC to choose corpus-grounded Galaxy operations on sequence records (FASTA) — interconvert, reformat, merge, length, extract/mask by region. | draft | 2026-06-10 | 1 |
| [[interval-consensus-by-multi-intersect]] | Find features reproducible across replicates: multi-intersect per-replicate sets, threshold by replicate count, then intersect back against the merged call. | draft | 2026-06-10 | 1 |
| [[interval-coverage]] | Two coverage modes: genome-wide depth as a bedgraph (genomecoveragebed) and reads counted in given regions (coveragebed). Same family, different question. | draft | 2026-06-10 | 1 |
| [[interval-mask-by-set-algebra]] | Compute regions from regions: concatenate candidate intervals, merge into non-overlapping spans, then subtract the set to keep. The gops_* set-algebra recipe. | draft | 2026-06-10 | 1 |
| [[interval-merge-overlapping]] | Collapse overlapping or book-ended intervals within one set into single spans; bedtools mergebed or the gops_merge Operate-on-Genomic-Intervals tool. | draft | 2026-06-10 | 1 |
| [[interval-overlap-filter]] | Keep, drop, or annotate coordinate features by overlap with a second feature set; bedtools intersect (BED) or vcfvcfintersect (VCF), mapped over a collection. | draft | 2026-06-10 | 1 |
| [[interval-window-flank]] | Extend features by a fixed or fractional amount to build neighborhood windows, clamped to chromosome ends; bedtools slopbed with a genome file. | draft | 2026-06-10 | 1 |
| [[interval-windowed-coverage]] | Quantify signal in fixed neighborhoods around point features: window the features (slop), collapse overlaps (merge), then count reads in each window (coverage). | draft | 2026-06-10 | 1 |
| [[relabel-fasta-headers-via-tabular]] | Edit FASTA headers you cannot easily regex in place: fasta2tab, rewrite column 1 with find/replace, then tab2fasta back. The high-value sequence recipe. | draft | 2026-06-10 | 1 |
| [[sequence-compute-length]] | Emit a (id, length) table from a FASTA so downstream tabular steps can filter, sort, or threshold records by length; fasta_compute_length. | draft | 2026-06-10 | 1 |
| [[sequence-extract-by-region]] | Turn coordinates into sequence: extract FASTA at BED intervals (getfasta), mask regions by BED (maskfasta), or extract transcripts from a GFF (gffread). | draft | 2026-06-10 | 1 |
| [[sequence-fasta-tabular-interconvert]] | Move sequence records between FASTA and a (header, sequence) table so tabular tools can edit them; fasta2tab one way, tab2fasta back. | draft | 2026-06-10 | 1 |
| [[sequence-merge-and-dedup]] | Concatenate several FASTA files into one and drop duplicate records by sequence identity in a single step; fasta_merge_files_and_filter_unique_sequences. | draft | 2026-06-10 | 1 |
| [[sequence-reformat-line-width]] | Rewrap FASTA records to a fixed sequence-line width so downstream tools and viewers get canonical 60/70/80-column output; cshl_fasta_formatter. | draft | 2026-06-10 | 1 |
| [[cleanup-sync-and-publish-nonempty-results]] | Clean sparse mapped outputs, keep sibling collections aligned, then gate report publishing on non-empty results. | draft | 2026-05-04 | 1 |
| [[fan-in-bundle-consume-and-flatten]] | Bundle parallel outputs into a collection consumer, then flatten nested results for pooled downstream processing. | draft | 2026-05-04 | 1 |
| [[manifest-to-mapped-collection-lifecycle]] | Use a manifest or table to build a collection, map a tool per row, then relabel or reshape outputs. | draft | 2026-05-04 | 1 |
| [[reshape-relabel-remap-by-collection-axis]] | Use Apply Rules and deterministic relabeling when domain fan-out creates the wrong map-over axis. | draft | 2026-05-04 | 1 |
| [[collection-build-list-paired-with-apply-rules]] | Use Apply Rules to promote identifier columns into a list:paired collection, with optional cleanup first. | draft | 2026-05-03 | 2 |
| [[collection-build-named-bundle]] | Use BUILD_LIST to assemble named outputs into a collection bundle for publishing or downstream fan-in. | draft | 2026-05-03 | 2 |
| [[collection-cleanup-after-mapover-failure]] | Use FILTER_EMPTY or FILTER_FAILED after map-over when bad elements would break downstream collection steps. | draft | 2026-05-03 | 2 |
| [[collection-flatten-after-fanout]] | Use FLATTEN to collapse nested collection outputs to a flat list once the outer axis no longer matters. | draft | 2026-05-03 | 2 |
| [[collection-split-identifier-via-rules]] | Use Apply Rules regex columns to split one collection identifier into nested list identifiers. | draft | 2026-05-03 | 2 |
| [[collection-swap-nesting-with-apply-rules]] | Use Apply Rules to regroup a list:list collection by swapping outer and inner identifier columns. | draft | 2026-05-03 | 2 |
| [[collection-unbox-singleton]] | Use __EXTRACT_DATASET__ with which: first when a one-element collection must become a dataset. | draft | 2026-05-03 | 2 |
| [[compose-runtime-text-parameter]] | Use compose_text_param to build connected text expressions from constants plus runtime scalar values. | draft | 2026-05-03 | 3 |
| [[conditional-gate-on-nonempty-result]] | Derive a boolean from empty or non-empty data, then use when to skip reporting or export steps. | draft | 2026-05-03 | 3 |
| [[conditional-route-between-alternative-outputs]] | Use when-gated alternatives plus pick_value to merge binary or one-of-N routes into one downstream value. | draft | 2026-05-03 | 3 |
| [[conditional-run-optional-step]] | Use a workflow boolean connected as inputs.when to skip an optional Galaxy step or branch. | draft | 2026-05-03 | 4 |
| [[conditional-transform-or-pass-through]] | Gate an optional transform, then use pick_value to pass transformed data when present or original data otherwise. | draft | 2026-05-03 | 2 |
| [[derive-parameter-from-file]] | Read a one-value dataset with param_value_from_file, including count recipes that feed typed parameters. | draft | 2026-05-03 | 3 |
| [[harmonize-by-sortlist-from-identifiers]] | Use SORTLIST with sort_type:file to reorder one collection by another collection's identifiers. | draft | 2026-05-03 | 2 |
| [[map-workflow-enum-to-tool-parameter]] | Use map_param_value to translate workflow enum values into downstream tool codes, flags, or snippets. | draft | 2026-05-03 | 3 |
| [[regex-relabel-via-tabular]] | Derive collection element identifiers in a tabular mapping, then apply them with RELABEL_FROM_FILE. | draft | 2026-05-03 | 2 |
| [[relabel-via-rules-and-find-replace]] | Use Apply Rules, identifier extraction, find/replace, and relabeling for structural fan-out cleanup. | draft | 2026-05-03 | 2 |
| [[sync-collections-by-identifier]] | Use collection_element_identifiers with FILTER_FROM_FILE or RELABEL_FROM_FILE to align sibling collections. | draft | 2026-05-03 | 2 |
| [[tabular-compute-new-column]] | Use column_maker (Add_a_column1) with strict error_handling to insert/replace a computed column. Per-expression-kind auto_col_types rule. | draft | 2026-05-03 | 3 |
| [[tabular-concatenate-collection-to-table]] | Use collapse_dataset to row-bind a collection of tabulars into one table, with optional element IDs and header dedupe. | draft | 2026-05-03 | 2 |
| [[tabular-cut-and-reorder-columns]] | Use Cut1 with a comma-separated cN list to project — and reorder — columns. Listing out of order is the canonical reorder idiom. | draft | 2026-05-03 | 2 |
| [[tabular-filter-by-column-value]] | Use Filter1 with a Python expression over cN columns to drop rows. Highest-frequency tabular row filter in IWC. | draft | 2026-05-03 | 2 |
| [[tabular-filter-by-regex]] | Use tp_grep_tool for whole-line regex row filters on tabular input. Grep1 is the legacy alternative. | draft | 2026-05-03 | 2 |
| [[tabular-group-and-aggregate-with-datamash]] | Use datamash_ops for grouped tabular aggregation: multi-column grouping, collapse, countunique, min/max, and reductions. | draft | 2026-05-03 | 2 |
| [[tabular-join-on-key]] | Use tp_easyjoin_tool for two-tabular key joins; use tp_multijoin_tool for many files and query_tabular for SQL joins. | draft | 2026-05-03 | 2 |
| [[tabular-pivot-collection-to-wide]] | Use collection_column_join to outer-join a collection of 2-column id/value tables into one wide table. | draft | 2026-05-03 | 2 |
| [[tabular-prepend-header]] | Use tp_awk_tool to prepend a constant header line, optionally skipping or reformatting an existing first row. | draft | 2026-05-03 | 2 |
| [[tabular-relabel-by-row-counter]] | Use tp_awk_tool to replace each row or label with deterministic sample_N values from awk NR. | draft | 2026-05-03 | 2 |
| [[tabular-split-taxonomy-string]] | Use tp_awk_tool to split semicolon-delimited taxonomy strings into explicit rank columns with missing-rank handling. | draft | 2026-05-03 | 2 |
| [[tabular-sql-query]] | Use query_tabular when SQL semantics justify it: windows, joins, anti-joins, or fused project+compute over tabulars. | draft | 2026-05-03 | 2 |
| [[tabular-synthesize-bed-from-3col]] | Use tp_awk_tool to convert chrom/start/end rows into 6-column BED, subtracting 1 from start and setting constants. | draft | 2026-05-03 | 2 |
| [[tabular-to-collection-by-row]] | Use split_file_to_collection split_by:col to fan a tabular into collection elements by row/key. | draft | 2026-05-03 | 2 |
| [[galaxy-collection-patterns]] | Use this MOC to choose corpus-grounded Galaxy collection transformation patterns. | draft | 2026-05-02 | 1 |
| [[galaxy-conditionals-patterns]] | Use this MOC to choose corpus-grounded Galaxy when and pick_value conditional patterns. | draft | 2026-05-02 | 1 |
| [[galaxy-tabular-patterns]] | Use this MOC to choose corpus-grounded Galaxy tabular transformation patterns. | draft | 2026-05-02 | 1 |

## Source Patterns

| Name | Summary | Status | Revised | Rev |
| --- | --- | --- | --- | --- |
| [[branch-filter-ifempty-to-galaxy-filters-gates]] | Route Nextflow branch, filter, and ifEmpty channel idioms to Galaxy collection cleanup, identifier filters, when gates, or review. | draft | 2026-05-04 | 1 |
| [[grouped-channel-to-regrouped-collection]] | Route Nextflow groupTuple, transpose, and grouped tuple payloads to Galaxy collection reshape patterns when the key is a real axis. | draft | 2026-05-04 | 1 |
| [[keyed-join-to-identifier-synchronized-mapover]] | Route Nextflow keyed joins and combine(by:) pairings to Galaxy collection identifier sync, ordering, relabeling, or table joins. | draft | 2026-05-04 | 1 |
| [[mapped-output-cleanup-and-publishing]] | Route Nextflow mapped-output cleanup and publishDir-style intent to Galaxy filtering, relabeling, gating, bundling, and reports. | draft | 2026-05-04 | 1 |
| [[mix-collect-to-report-aggregation]] | Route Nextflow mix, collect, toList, and collectFile report fan-in idioms to Galaxy aggregation and bundle patterns. | draft | 2026-05-04 | 1 |
| [[samplesheet-rows-to-galaxy-collections]] | Route Nextflow samplesheet row streams and repeated tuple inputs to Galaxy list, paired, or list:paired collections. | draft | 2026-05-04 | 1 |
| [[nextflow-patterns]] | Use this source-pattern map to route recurring Nextflow channel and operator idioms to Galaxy implementation patterns. | draft | 2026-05-03 | 1 |

## CLI Commands

| Name | Summary | Status | Revised | Rev |
| --- | --- | --- | --- | --- |
| [[validate-summary-galaxy-workflow]] | AJV gate for summarize-galaxy-workflow JSON documents. | draft | 2026-07-01 | 1 |
| [[add]] | Fetch a tool from the Tool Shed (shed-path or bare/stock id) and cache its ParsedTool locally for later summarize/schema. | draft | 2026-06-18 | 2 |
| [[list]] | Enumerate the tools in a cache directory with their resolved versions; the surface for confirming which stock/shed pin got cached. | draft | 2026-06-18 | 1 |
| [[summarize]] | Emit a deterministic galaxy-tool-summary manifest (cache provenance + embedded ParsedTool + generated input JSON Schemas) for a cached tool. | draft | 2026-06-18 | 2 |
| [[validate-galaxy-workflow-test-plan]] | AJV gate for Galaxy workflow test-plan YAML documents. | draft | 2026-06-16 | 1 |
| [[draft-extract]] | Extract the concrete subset of a draft workflow: trim drafty steps, strip `_plan_*`, promote class when fully resolved. | draft | 2026-05-27 | 1 |
| [[draft-next-step]] | Pick the next drafty step a harness should work on, or report no remaining work; deterministic topological + alphabetical tiebreak. | draft | 2026-05-27 | 1 |
| [[draft-validate]] | Validate a `class: GalaxyWorkflowDraft` workflow against draft-contract rules; with --concrete, also validate the extracted concrete subset. | draft | 2026-05-27 | 1 |
| [[planemo-cli_metadata]] | Export structured metadata for Planemo CLI commands. | draft | 2026-05-11 | 1 |
| [[planemo-lint]] | Check for common errors and best practices. | draft | 2026-05-11 | 1 |
| [[planemo-output_schema]] | Export JSON Schemas for Planemo machine-readable outputs. | draft | 2026-05-11 | 1 |
| [[planemo-test]] | Run specified tool or workflow tests within Galaxy. | draft | 2026-05-11 | 1 |
| [[planemo-workflow_test_init]] | Initialize a Galaxy workflow test description for supplied workflow. | draft | 2026-05-11 | 1 |
| [[planemo-workflow_test_on_invocation]] | Run defined tests against existing workflow invocation. | draft | 2026-05-11 | 1 |
| [[summarize-nextflow]] | Statically introspect a Nextflow / nf-core pipeline tree and emit a validated JSON summary. | draft | 2026-05-11 | 1 |
| [[validate-galaxy-tool-discovery]] | AJV gate for discover-shed-tool recommendation documents. | draft | 2026-05-11 | 1 |
| [[validate-galaxy-tool-summary]] | AJV gate for galaxy-tool-cache summarize manifests, including the nested parsed_tool subtree. | draft | 2026-05-11 | 1 |
| [[validate-summary-cwl]] | AJV gate for summarize-cwl JSON documents. | draft | 2026-05-11 | 1 |
| [[validate-summary-nextflow]] | AJV gate for summarize-nextflow JSON documents. | draft | 2026-05-11 | 1 |
| [[validate-tests-format]] | AJV gate for Galaxy workflow tests YAML, with optional workflow cross-check. | draft | 2026-05-11 | 1 |
| [[convert]] | Convert a Galaxy workflow between native (.ga) and format2 (.gxwf.yml) representations. | draft | 2026-05-06 | 2 |
| [[tool-revisions]] | Resolve a Tool Shed tool to changeset revisions for reproducible workflow pinning. Final step in discover-and-pin. | draft | 2026-05-06 | 2 |
| [[tool-search]] | Free-text Tool Shed search returning candidate tools as JSON; first step in the discover-and-pin sequence. | draft | 2026-05-06 | 2 |
| [[tool-versions]] | List TRS-published versions of a Tool Shed tool, oldest→newest. Second step in the discover-and-pin sequence. | draft | 2026-05-06 | 2 |
| [[validate]] | Validate Galaxy workflow structure, tool state, and optional connection compatibility before runtime execution. | draft | 2026-05-06 | 3 |
| [[validate-tests]] | Validate Galaxy workflow test files and optionally cross-check labels against their workflow. | draft | 2026-05-06 | 3 |

## Schemas

| Name | Summary | Status | Revised | Rev |
| --- | --- | --- | --- | --- |
| [[planemo-test-report]] | JSON Schema for the report emitted by `planemo test --test_output_json` (and friends), vendored from upstream planemo. | draft | 2026-07-20 | 3 |
| [[summary-galaxy-workflow]] | JSON Schema for the structured summary emitted by the summarize-galaxy-workflow Mold. | draft | 2026-07-01 | 1 |
| [[galaxy-workflow-test-plan]] | JSON Schema for the intermediate Galaxy workflow test-plan handoff produced by the test-plan Molds and consumed by implement-galaxy-workflow-test. | draft | 2026-06-16 | 1 |
| [[galaxy-workflow-draft]] | JSON Schema for `class: GalaxyWorkflowDraft` — gxformat2 with `TODO_*` sentinels and `_plan_*` planning fields per draft step. | draft | 2026-05-27 | 1 |
| [[cast-provenance]] | _provenance.json contract beside every cast: Mold revision, per-ref deterministic-vs-LLM origin, src/dst hashes, artifact handoff. Schema v2. | draft | 2026-05-17 | 1 |
| [[summary-cwl]] | JSON Schema for the structured summary emitted by the summarize-cwl Mold. | draft | 2026-05-10 | 1 |
| [[summary-nextflow]] | JSON Schema for the structured summary emitted by the summarize-nextflow Mold. | draft | 2026-05-06 | 10 |
| [[galaxy-tool-summary]] | JSON Schema for the deterministic per-tool manifest emitted by `galaxy-tool-cache summarize`. | draft | 2026-05-05 | 1 |
| [[nextflow-parameters-meta]] | JSON Schema (Draft 2020-12) meta-schema validating per-pipeline nextflow_schema.json files. Upstream from nextflow-io/nf-schema. | draft | 2026-05-05 | 1 |
| [[nf-core-module-meta]] | JSON Schema (Draft-07) validating nf-core module meta.yml — channel IO, tools, containers, conda lockfiles. Upstream from nf-core/modules. | draft | 2026-05-05 | 1 |
| [[nf-core-subworkflow-meta]] | JSON Schema (Draft-07) validating nf-core subworkflow meta.yml — channel IO, components dependencies, authors. Upstream from nf-core/modules. | draft | 2026-05-05 | 1 |
| [[parsed-tool]] | JSON Schema for the upstream Galaxy `ParsedTool` model, vendored from `@galaxy-tool-util/schema`. | draft | 2026-05-05 | 1 |
| [[tests-format]] | JSON Schema for the planemo workflow test format (`<workflow>-tests.yml`), vendored from `@galaxy-tool-util/schema`. | draft | 2026-05-05 | 4 |
| [[galaxy-tool-discovery]] | JSON Schema for Tool Shed discovery hit, weak, and miss recommendations. | draft | 2026-05-04 | 1 |

## Component Research

| Name | Summary | Status | Revised | Rev |
| --- | --- | --- | --- | --- |
| [[component-claude-dynamic-workflows]] | Dynamic workflows natively solve the per-step sub-DAG loop Archon couldn't, with schema-typed step handoffs; cost is in-session-only resume and no mid-run gate. | draft | 2026-06-15 | 1 |
| [[galaxy-workflow-comments]] | How to annotate a gxformat2 workflow with editor comments: one titled frame per analysis stage, populate contains_steps, color decorative. | draft | 2026-06-12 | 1 |
| [[iwc-comments-survey]] | How IWC uses the gxformat2 `comments:` array: titled stage frames dominate, color is decorative, frames travel with template forks. An authoring convention. | draft | 2026-06-12 | 1 |
| [[galaxy-discover-datasets]] | Reference for the <discover_datasets> Galaxy XML element — attributes, named/regex patterns, <data> vs <collection> contexts, test assertions. | draft | 2026-06-10 | 2 |
| [[iwc-interval-operations-survey]] | IWC corpus survey of coordinate-aware genomic interval operations; sizing and candidate boundaries for a galaxy-interval-patterns MOC, with hold-if-thin gate. | draft | 2026-06-10 | 1 |
| [[iwc-sequence-operations-survey]] | IWC survey of record-level FASTA manipulation (interconversion, reformat, merge/dedup, subset, extract-at-intervals); sizes a galaxy-sequence-patterns MOC. | draft | 2026-06-10 | 1 |
| [[component-archon]] | Archon remains a heavy-harness candidate; HITL gates are stronger, but per-step sub-DAG looping is still the main gap. | draft | 2026-05-22 | 3 |
| [[cwl-pickvalue-to-galaxy]] | CWL `pickValue` (first_non_null / the_only_non_null / all_non_null) → Galaxy's native `pick_value` workflow step added by galaxyproject/galaxy#22222. | draft | 2026-05-11 | 1 |
| [[galaxy-paired-or-unpaired-collections]] | Galaxy's `paired_or_unpaired` collection type: discriminated-union shape for paired-or-single reads, no workflow-level mode switch needed. Galaxy PR #19377. | draft | 2026-05-11 | 1 |
| [[planemo-asserts-idioms]] | Decision and idiom guide for picking planemo workflow-test assertions: which family per output type, how to size tolerances, when to validate. | draft | 2026-05-11 | 6 |
| [[planemo-workflow-test-architecture]] | Reference for Planemo workflow test/run architecture, Galaxy modes, API polling, and noisy failure boundaries. | draft | 2026-05-11 | 3 |
| [[component-cwl-workflow-anatomy]] | CWL structure relevant to summarize-cwl: normalized documents, steps, scatter, conditionals, requirements, and dependency handling. | draft | 2026-05-10 | 1 |
| [[cwl-v1.2-schemas]] | Vendored official CWL v1.2.1 JSON/SALAD schema documents used as source-structure reference for CWL summarization. | draft | 2026-05-10 | 1 |
| [[nextflow-reference-data-classification]] | Source-side taxonomy of how Nextflow pipelines use reference data — eight classifications detectable from a summary-nextflow artifact. | draft | 2026-05-10 | 3 |
| [[nextflow-to-galaxy-reference-data-mapping]] | Galaxy-side translation of Nextflow reference-data classifications: idioms available, the v1 posture, datatype defaults, and the in-tool rebuild trade-off. | draft | 2026-05-10 | 5 |
| [[nextflow-conditional-to-galaxy-subworkflow-when]] | Stub. Translate Nextflow conditionals into Galaxy `when:` (single-workflow v1). Subworkflow vs inline is an aesthetic call, not a rule. | draft | 2026-05-08 | 1 |
| [[nextflow-params-to-galaxy-inputs]] | Rules for translating Nextflow params, sample sheets, channels, and control flags into gxformat2 inputs. | draft | 2026-05-08 | 4 |
| [[nextflow-workflow-io-semantics]] | Defines Nextflow workflow inputs and outputs from docs plus observed fixture pipeline structures. | draft | 2026-05-08 | 4 |
| [[galaxy-datatypes-conf]] | Vendored Galaxy datatypes registry sample: extension → datatype class mapping, sniff order, converters, and display applications. | draft | 2026-05-06 | 2 |
| [[galaxy-sample-sheet-collections]] | Galaxy's sample_sheet collection family: typed column metadata, four variants, mapping rules, validator allowlist. | draft | 2026-05-06 | 2 |
| [[galaxy-workflow-testability-design]] | Design guidance for Galaxy workflow inputs, outputs, and checkpoints that make IWC-style workflow tests possible. | draft | 2026-05-06 | 2 |
| [[gxformat2-schema]] | Vendored structural JSON Schema for gxformat2 workflows: vocabulary for inputs, outputs, steps, and step subtypes. | draft | 2026-05-06 | 2 |
| [[gxformat2-workflow-inputs]] | Conceptual model, current aliases, and schema gaps for gxformat2 workflow inputs. | draft | 2026-05-06 | 2 |
| [[nextflow-path-glob-to-galaxy-datatype]] | Rules for mapping Nextflow path, glob, sample-sheet, and output filename evidence to Galaxy datatype extensions. | draft | 2026-05-06 | 1 |
| [[nextflow-to-galaxy-channel-shape-mapping]] | Maps common Nextflow channel, tuple, and path shapes to Galaxy dataset and collection shapes. | draft | 2026-05-06 | 2 |
| [[nf-schema-samplesheet-galaxy-gaps]] | nf-schema validation mapped to Galaxy column_definitions: what survives, degrades, or is lost; Galaxy work items + cast loss-recording vocabulary. | draft | 2026-05-06 | 1 |
| [[component-nextflow-channel-operators]] | Structured digest of Nextflow channel operators (47 entries) with cardinality and shape semantics; backs summarize-nextflow §6 edge reconciliation. | draft | 2026-05-05 | 1 |
| [[component-nextflow-containers-and-envs]] | Container URL grammar (depot, BioContainers, mulled-v2, Wave, ORAS) and conda directive resolution rules backing summarize-nextflow §5. | draft | 2026-05-05 | 3 |
| [[component-nextflow-testing]] | nf-test patterns mapped to Galaxy planemo asserts and CWL test equivalents — backs nextflow-test-to-target-tests Mold and summarize-nextflow §7. | draft | 2026-05-05 | 2 |
| [[component-nf-core-module-conventions]] | RFC 2119 conventions enforced by nf-core/tools module lint, with lint-check pointers. Backs summarize-nextflow + author-galaxy-tool-wrapper. | draft | 2026-05-05 | 1 |
| [[galaxy-collection-semantics]] | Vendored formal spec of Galaxy dataset-collection mapping/reduction semantics, with labeled examples and pinned test references. | draft | 2026-05-05 | 3 |
| [[galaxy-native-workflow-schema]] | Vendored structural JSON Schema for Galaxy native workflow (.ga) format: vocabulary for the JSON shape Galaxy emits and consumes. | draft | 2026-05-05 | 1 |
| [[galaxy-xsd]] | Vendored Galaxy tool XML schema for wrapper structure, parameters, outputs, tests, and assertion syntax. | draft | 2026-05-05 | 1 |
| [[nextflow-snapshot-to-galaxy-assertions]] | Translates nf-test snapshot assertions into Galaxy workflow test-format assertions, broken out by module-level vs pipeline-level test shape. | draft | 2026-05-05 | 2 |
| [[iwc-runtime-parameter-shims-survey]] | Focused survey of tiny IWC runtime parameter shims for flags, enums, counts, booleans, and composed text. | draft | 2026-05-04 | 1 |
| [[component-tool-shed-search]] | Tool Shed's Whoosh repo/tool search and partial GA4GH TRS v2, indexed from hg-walked metadata with no auto-refresh on upload | draft | 2026-05-03 | 2 |
| [[iwc-map-over-lifecycle-survey]] | Survey of IWC map-over lifecycle recipes, with a Nextflow-to-Galaxy crosswalk for collection construction, cleanup, reshape, reduce, and publish phases. | draft | 2026-05-03 | 1 |
| [[iwc-shortcuts-anti-patterns]] | What IWC test suites cut corners on (accepted) vs what's a code smell — existence-only probes, sim_size deltas, image dim checks, label coupling. | draft | 2026-05-03 | 2 |
| [[iwc-test-data-conventions]] | How IWC workflows organize and reference test data — Zenodo-first, SHA-1 integrity, collection shapes, CVMFS gotchas. | draft | 2026-05-03 | 3 |
| [[iwc-workflow-testability-survey]] | IWC evidence survey for Galaxy workflow structures that make workflow tests meaningful. | draft | 2026-05-03 | 2 |
| [[galaxy-apply-rules-dsl]] | Reference for Galaxy's Apply Rules DSL: rule operations, mapping operations, composition patterns, pitfalls. | draft | 2026-05-02 | 2 |
| [[galaxy-collection-tools]] | Catalog of Galaxy's collection-operation tools — purpose, IO, parameters, selection guide. Companion to galaxy-collection-semantics. | draft | 2026-05-02 | 2 |
| [[galaxy-tool-job-failure-reference]] | Reference for Galaxy tool stdio rules, job failure detection, job states, and job API failure surfaces. | draft | 2026-05-02 | 1 |
| [[galaxy-workflow-invocation-failure-reference]] | Reference for Galaxy workflow invocation states, messages, failure reasons, and invocation API surfaces. | draft | 2026-05-02 | 1 |
| [[iwc-conditionals-survey]] | Corpus survey of Galaxy conditional step usage in IWC, covering when-gates, boolean shims, and routed output selection. | draft | 2026-05-02 | 2 |
| [[iwc-parameter-derivation-survey]] | Corpus survey of Galaxy workflow recipes that turn upstream data, metadata, or small files into runtime parameters. | draft | 2026-05-02 | 1 |
| [[iwc-tabular-operations-survey]] | Corpus survey of tabular tools and operations across IWC workflows; map for the operation pattern hierarchy on row/column data manipulation. | draft | 2026-05-02 | 2 |
| [[iwc-transformations-survey]] | Corpus survey of collection-shape transformations across IWC: built-in collection ops, toolshed transformers, and the multi-step recipes that bracket map-over. | draft | 2026-05-02 | 2 |
| [[nextflow-operators-to-galaxy-collection-recipes]] | Classifies common Nextflow operators as Galaxy wiring, collection semantics, explicit steps, or review triggers. | draft | 2026-05-02 | 1 |
| [[component-nextflow-inspect]] | White paper on Nextflow's native introspection subcommands — `nextflow inspect`, `nextflow config`, and adjacent tooling. Survey, not decision. | draft | 2026-05-01 | 1 |
| [[component-nextflow-pipeline-anatomy]] | Stub. DSL2 layout, channel idioms, operator-chain reading rules. Grows from cast contact with rnaseq/sarek/ad-hoc — see issue #17. | draft | 2026-05-01 | 1 |
| [[component-nf-core-tools]] | White paper on nf-core/tools — conventions, CLI surface, schema universe, container resolution. Survey, not decision. | draft | 2026-05-01 | 1 |

## Design Problems

| Name | Summary | Status | Revised | Rev |
| --- | --- | --- | --- | --- |
| [[nfcore-channel-input-to-galaxy-collection]] | Map an nf-core process's tuple(meta, path) input channel to a Galaxy <param type="data"> or paired/list collection input. | draft | 2026-06-10 | 3 |
| [[nfcore-meta-map-to-galaxy-params]] | Promote nf-core meta-map keys to Galaxy <param>s only when they drive script behavior; drop identity-only keys; pull naming from $input.element_identifier. | draft | 2026-06-10 | 3 |
| [[nfcore-stub-block-to-galaxy-noop-test]] | nf-core's stub: block has no Galaxy analog; the convert Mold drops it intentionally and records the drop in _provenance.yml. | draft | 2026-06-10 | 3 |
| [[nfcore-task-ext-args-to-galaxy-additional-options]] | Map nf-core's task.ext.args escape hatch to a single Galaxy text param surfacing extra command-line arguments. | draft | 2026-06-10 | 3 |
| [[nfcore-versions-emit-to-galaxy-version-command]] | Translate nf-core's versions emit (heredoc or topic: versions) into Galaxy's <version_command>, dropping the versions output channel. | draft | 2026-06-10 | 3 |
