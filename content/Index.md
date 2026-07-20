# Index

Generated from content frontmatter. Do not edit by hand.

## Pipelines

- [[cwl-to-galaxy]] — Path from a CWL Workflow to a Galaxy gxformat2 workflow. Lighter upstream extraction.
- [[interview-to-galaxy]] — Interview-driven path to a Galaxy gxformat2 workflow through the shared freeform-summary handoff.
- [[nextflow-to-cwl]] — Direct path from a Nextflow pipeline to a CWL Workflow + CommandLineTool set.
- [[nextflow-to-galaxy]] — Direct path from a Nextflow pipeline to a Galaxy gxformat2 workflow.
- [[paper-to-cwl]] — Direct path from a paper to a CWL Workflow + CommandLineTool set.
- [[paper-to-galaxy]] — Direct path from a paper to a Galaxy gxformat2 workflow. No CWL intermediate.
- [[update-interview-to-galaxy]] — Interview-driven, edit-in-place modification of an existing Galaxy gxformat2 workflow via a reviewable change-set, reusing the per-step draft loop.

## Molds

- [[advance-galaxy-draft-step]] — Advance the gxformat2 draft by one step: pick the next drafty step, resolve a wrapper, implement the step, and validate.
- [[apply-galaxy-workflow-changeset]] — Apply a reviewed change-set to a concrete Galaxy workflow: untouched regions preserved, tool-introducing edits injected as drafty steps.
- [[author-galaxy-tool-wrapper]] — Author a new Galaxy user-defined tool YAML definition when discovery yields nothing acceptable.
- [[changeset-to-galaxy-test-plan]] — Carry an existing Galaxy workflow's tests forward as a regression baseline and augment them for a change-set's deltas, emitting a Galaxy test plan.
- [[compare-against-iwc-exemplar]] — Find nearest IWC exemplar(s) and surface a structural diff against the upstream Galaxy design briefs to guide template authoring.
- [[convert-nfcore-module-to-galaxy-tool]] — Convert one nf-core module dir into a Galaxy tool wrapper (tool.xml + macros.xml + _provenance.yml + remote-URL <test> blocks).
- [[cwl-summary-to-galaxy-data-flow]] — Translate a CWL summary into a Galaxy data-flow design brief.
- [[cwl-summary-to-galaxy-interface]] — Map a CWL summary into a Galaxy workflow interface design brief.
- [[cwl-summary-to-galaxy-template]] — gxformat2 skeleton with per-step TODOs from a CWL summary and prior Galaxy design briefs.
- [[cwl-test-to-galaxy-test-plan]] — Translate CWL test fixtures into a Galaxy workflow test plan.
- [[cwl-to-test-data]] — Resolve a CWL workflow's own declared test cases into Galaxy workflow test-data refs.
- [[debug-cwl-workflow-output]] — Triage failing CWL run outputs; classify failure modes; propose fixes.
- [[debug-galaxy-workflow-output]] — Triage failing Galaxy run outputs; classify the failure surface and capture evidence before recommending repairs.
- [[discover-shed-tool]] — Search the Tool Shed for an existing wrapper, drill from hit to a pinnable changeset, classify candidates, and recommend or fall through.
- [[find-test-data]] — Search IWC fixtures and public sources for test data matching a data-flow shape.
- [[freeform-summary-to-cwl-design]] — Translate a free-form source summary into a CWL workflow design brief.
- [[freeform-summary-to-galaxy-data-flow]] — Translate a free-form source summary into a Galaxy data-flow design brief.
- [[freeform-summary-to-galaxy-interface]] — Map a free-form source summary into a Galaxy workflow interface design brief.
- [[freeform-summary-to-galaxy-template]] — gxformat2 skeleton with per-step TODOs from a free-form summary and Galaxy design brief.
- [[freeform-summary-to-galaxy-test-plan]] — Synthesize a Galaxy workflow test plan from a free-form summary and the Galaxy design briefs.
- [[implement-cwl-tool-step]] — Convert an abstract step into a concrete CWL CommandLineTool + step.
- [[implement-cwl-workflow-test]] — Assemble CWL job file(s) and expected-output assertions.
- [[implement-galaxy-tool-step]] — Convert an abstract step into a concrete gxformat2 step using a tool summary.
- [[implement-galaxy-workflow-test]] — Assemble Galaxy workflow test fixtures and assertions.
- [[interview-to-freeform-summary]] — Normalize a free-form user interview into the shared freeform-summary workflow handoff.
- [[interview-to-galaxy-workflow-changeset]] — Interview a user against an existing Galaxy workflow summary and emit a reviewable, step-anchored change-set.
- [[nextflow-summary-to-cwl-data-flow]] — Translate a Nextflow summary into a CWL data-flow design brief.
- [[nextflow-summary-to-cwl-interface]] — Map a Nextflow summary into a CWL Workflow interface design brief.
- [[nextflow-summary-to-galaxy-data-flow]] — Translate a Nextflow summary into a Galaxy data-flow design brief.
- [[nextflow-summary-to-galaxy-interface]] — Map a Nextflow summary into a Galaxy workflow interface design brief.
- [[nextflow-summary-to-galaxy-reference-data]] — Decide the Galaxy-side shape of external reference data declared by a Nextflow pipeline.
- [[nextflow-summary-to-galaxy-template]] — gxformat2 skeleton with per-step TODOs from a Nextflow summary and prior Galaxy design briefs.
- [[nextflow-test-to-cwl-test-plan]] — Translate Nextflow test evidence into a CWL workflow test plan.
- [[nextflow-test-to-galaxy-test-plan]] — Translate Nextflow test evidence into a Galaxy workflow test plan.
- [[nextflow-to-test-data]] — Resolve a Nextflow pipeline's own declared test fixtures into Galaxy workflow test-data refs.
- [[paper-to-test-data]] — Derive workflow test inputs and expected outputs from a paper.
- [[repair-galaxy-draft-topology]] — Re-wire a Galaxy draft region when a step's declared output can't be computed from its wired inputs.
- [[run-workflow-test]] — Execute a workflow's tests via Planemo; emit structured pass/fail and outputs.
- [[summarize-cwl]] — Validate and normalize a CWL Workflow tree, then emit a lightweight structured summary for downstream Galaxy translation.
- [[summarize-cwl-tool]] — Derive a CommandLineTool description (container, baseCommand, IO) for a CWL target.
- [[summarize-galaxy-tool]] — Pull JSON schema, container, source, inputs/outputs for a Galaxy tool.
- [[summarize-galaxy-workflow]] — Read an existing Galaxy gxformat2 (or .ga) workflow and emit a structured summary for interview and change-set steps.
- [[summarize-nextflow]] — Read a Nextflow pipeline source tree (nf-core or ad-hoc DSL2) and emit a structured JSON summary for downstream translation Molds.
- [[summarize-paper]] — Extract methods, tools, sample data, and references from a paper.
- [[summary-to-cwl-template]] — CWL Workflow skeleton with per-step TODOs from source and design handoffs.
- [[validate-cwl]] — Run cwltool --validate / schema lint, classify failures, recommend fixes.
- [[validate-galaxy-workflow]] — Run terminal gxwf validation on an assembled Galaxy workflow and classify workflow-level failures.

## Patterns

- [[cleanup-sync-and-publish-nonempty-results]] — Clean sparse mapped outputs, keep sibling collections aligned, then gate report publishing on non-empty results.
- [[collection-build-list-paired-with-apply-rules]] — Use Apply Rules to promote identifier columns into a list:paired collection, with optional cleanup first.
- [[collection-build-named-bundle]] — Use BUILD_LIST to assemble named outputs into a collection bundle for publishing or downstream fan-in.
- [[collection-cleanup-after-mapover-failure]] — Use FILTER_EMPTY or FILTER_FAILED after map-over when bad elements would break downstream collection steps.
- [[collection-flatten-after-fanout]] — Use FLATTEN to collapse nested collection outputs to a flat list once the outer axis no longer matters.
- [[harmonize-by-sortlist-from-identifiers]] — Use SORTLIST with sort_type:file to reorder one collection by another collection's identifiers.
- [[regex-relabel-via-tabular]] — Derive collection element identifiers in a tabular mapping, then apply them with RELABEL_FROM_FILE.
- [[relabel-via-rules-and-find-replace]] — Use Apply Rules, identifier extraction, find/replace, and relabeling for structural fan-out cleanup.
- [[collection-split-identifier-via-rules]] — Use Apply Rules regex columns to split one collection identifier into nested list identifiers.
- [[collection-swap-nesting-with-apply-rules]] — Use Apply Rules to regroup a list:list collection by swapping outer and inner identifier columns.
- [[sync-collections-by-identifier]] — Use collection_element_identifiers with FILTER_FROM_FILE or RELABEL_FROM_FILE to align sibling collections.
- [[collection-unbox-singleton]] — Use __EXTRACT_DATASET__ with which: first when a one-element collection must become a dataset.
- [[conditional-gate-on-nonempty-result]] — Derive a boolean from empty or non-empty data, then use when to skip reporting or export steps.
- [[conditional-route-between-alternative-outputs]] — Use when-gated alternatives plus pick_value to merge binary or one-of-N routes into one downstream value.
- [[conditional-run-optional-step]] — Use a workflow boolean connected as inputs.when to skip an optional Galaxy step or branch.
- [[conditional-transform-or-pass-through]] — Gate an optional transform, then use pick_value to pass transformed data when present or original data otherwise.
- [[fan-in-bundle-consume-and-flatten]] — Bundle parallel outputs into a collection consumer, then flatten nested results for pooled downstream processing.
- [[galaxy-collection-patterns]] — Use this MOC to choose corpus-grounded Galaxy collection transformation patterns.
- [[galaxy-conditionals-patterns]] — Use this MOC to choose corpus-grounded Galaxy when and pick_value conditional patterns.
- [[galaxy-interval-patterns]] — Use this MOC to choose corpus-grounded Galaxy genomic interval operations and recipes on coordinate features.
- [[galaxy-sequence-patterns]] — Use this MOC to choose corpus-grounded Galaxy operations on sequence records (FASTA) — interconvert, reformat, merge, length, extract/mask by region.
- [[galaxy-tabular-patterns]] — Use this MOC to choose corpus-grounded Galaxy tabular transformation patterns.
- [[interval-mask-by-set-algebra]] — Compute regions from regions: concatenate candidate intervals, merge into non-overlapping spans, then subtract the set to keep. The gops_* set-algebra recipe.
- [[interval-coverage]] — Two coverage modes: genome-wide depth as a bedgraph (genomecoveragebed) and reads counted in given regions (coveragebed). Same family, different question.
- [[interval-consensus-by-multi-intersect]] — Find features reproducible across replicates: multi-intersect per-replicate sets, threshold by replicate count, then intersect back against the merged call.
- [[interval-overlap-filter]] — Keep, drop, or annotate coordinate features by overlap with a second feature set; bedtools intersect (BED) or vcfvcfintersect (VCF), mapped over a collection.
- [[interval-merge-overlapping]] — Collapse overlapping or book-ended intervals within one set into single spans; bedtools mergebed or the gops_merge Operate-on-Genomic-Intervals tool.
- [[interval-window-flank]] — Extend features by a fixed or fractional amount to build neighborhood windows, clamped to chromosome ends; bedtools slopbed with a genome file.
- [[interval-windowed-coverage]] — Quantify signal in fixed neighborhoods around point features: window the features (slop), collapse overlaps (merge), then count reads in each window (coverage).
- [[manifest-to-mapped-collection-lifecycle]] — Use a manifest or table to build a collection, map a tool per row, then relabel or reshape outputs.
- [[compose-runtime-text-parameter]] — Use compose_text_param to build connected text expressions from constants plus runtime scalar values.
- [[derive-parameter-from-file]] — Read a one-value dataset with param_value_from_file, including count recipes that feed typed parameters.
- [[map-workflow-enum-to-tool-parameter]] — Use map_param_value to translate workflow enum values into downstream tool codes, flags, or snippets.
- [[reshape-relabel-remap-by-collection-axis]] — Use Apply Rules and deterministic relabeling when domain fan-out creates the wrong map-over axis.
- [[sequence-compute-length]] — Emit a (id, length) table from a FASTA so downstream tabular steps can filter, sort, or threshold records by length; fasta_compute_length.
- [[sequence-extract-by-region]] — Turn coordinates into sequence: extract FASTA at BED intervals (getfasta), mask regions by BED (maskfasta), or extract transcripts from a GFF (gffread).
- [[sequence-fasta-tabular-interconvert]] — Move sequence records between FASTA and a (header, sequence) table so tabular tools can edit them; fasta2tab one way, tab2fasta back.
- [[sequence-merge-and-dedup]] — Concatenate several FASTA files into one and drop duplicate records by sequence identity in a single step; fasta_merge_files_and_filter_unique_sequences.
- [[sequence-reformat-line-width]] — Rewrap FASTA records to a fixed sequence-line width so downstream tools and viewers get canonical 60/70/80-column output; cshl_fasta_formatter.
- [[relabel-fasta-headers-via-tabular]] — Edit FASTA headers you cannot easily regex in place: fasta2tab, rewrite column 1 with find/replace, then tab2fasta back. The high-value sequence recipe.
- [[tabular-compute-new-column]] — Use column_maker (Add_a_column1) with strict error_handling to insert/replace a computed column. Per-expression-kind auto_col_types rule.
- [[tabular-concatenate-collection-to-table]] — Use collapse_dataset to row-bind a collection of tabulars into one table, with optional element IDs and header dedupe.
- [[tabular-cut-and-reorder-columns]] — Use Cut1 with a comma-separated cN list to project — and reorder — columns. Listing out of order is the canonical reorder idiom.
- [[tabular-filter-by-column-value]] — Use Filter1 with a Python expression over cN columns to drop rows. Highest-frequency tabular row filter in IWC.
- [[tabular-filter-by-regex]] — Use tp_grep_tool for whole-line regex row filters on tabular input. Grep1 is the legacy alternative.
- [[tabular-group-and-aggregate-with-datamash]] — Use datamash_ops for grouped tabular aggregation: multi-column grouping, collapse, countunique, min/max, and reductions.
- [[tabular-join-on-key]] — Use tp_easyjoin_tool for two-tabular key joins; use tp_multijoin_tool for many files and query_tabular for SQL joins.
- [[tabular-pivot-collection-to-wide]] — Use collection_column_join to outer-join a collection of 2-column id/value tables into one wide table.
- [[tabular-prepend-header]] — Use tp_awk_tool to prepend a constant header line, optionally skipping or reformatting an existing first row.
- [[tabular-relabel-by-row-counter]] — Use tp_awk_tool to replace each row or label with deterministic sample_N values from awk NR.
- [[tabular-split-taxonomy-string]] — Use tp_awk_tool to split semicolon-delimited taxonomy strings into explicit rank columns with missing-rank handling.
- [[tabular-sql-query]] — Use query_tabular when SQL semantics justify it: windows, joins, anti-joins, or fused project+compute over tabulars.
- [[tabular-synthesize-bed-from-3col]] — Use tp_awk_tool to convert chrom/start/end rows into 6-column BED, subtracting 1 from start and setting constants.
- [[tabular-to-collection-by-row]] — Use split_file_to_collection split_by:col to fan a tabular into collection elements by row/key.

## Source Patterns

- [[branch-filter-ifempty-to-galaxy-filters-gates]] — Route Nextflow branch, filter, and ifEmpty channel idioms to Galaxy collection cleanup, identifier filters, when gates, or review.
- [[grouped-channel-to-regrouped-collection]] — Route Nextflow groupTuple, transpose, and grouped tuple payloads to Galaxy collection reshape patterns when the key is a real axis.
- [[keyed-join-to-identifier-synchronized-mapover]] — Route Nextflow keyed joins and combine(by:) pairings to Galaxy collection identifier sync, ordering, relabeling, or table joins.
- [[mapped-output-cleanup-and-publishing]] — Route Nextflow mapped-output cleanup and publishDir-style intent to Galaxy filtering, relabeling, gating, bundling, and reports.
- [[mix-collect-to-report-aggregation]] — Route Nextflow mix, collect, toList, and collectFile report fan-in idioms to Galaxy aggregation and bundle patterns.
- [[samplesheet-rows-to-galaxy-collections]] — Route Nextflow samplesheet row streams and repeated tuple inputs to Galaxy list, paired, or list:paired collections.
- [[nextflow-patterns]] — Use this source-pattern map to route recurring Nextflow channel and operator idioms to Galaxy implementation patterns.

## CLI Commands

- [[add]] — Fetch a tool from the Tool Shed (shed-path or bare/stock id) and cache its ParsedTool locally for later summarize/schema.
- [[convert]] — Convert a Galaxy workflow between native (.ga) and format2 (.gxwf.yml) representations.
- [[draft-extract]] — Extract the concrete subset of a draft workflow: trim drafty steps, strip `_plan_*`, promote class when fully resolved.
- [[draft-next-step]] — Pick the next drafty step a harness should work on, or report no remaining work; deterministic topological + alphabetical tiebreak.
- [[draft-validate]] — Validate a `class: GalaxyWorkflowDraft` workflow against draft-contract rules; with --concrete, also validate the extracted concrete subset.
- [[list]] — Enumerate the tools in a cache directory with their resolved versions; the surface for confirming which stock/shed pin got cached.
- [[planemo-cli_metadata]] — Export structured metadata for Planemo CLI commands.
- [[planemo-lint]] — Check for common errors and best practices.
- [[planemo-output_schema]] — Export JSON Schemas for Planemo machine-readable outputs.
- [[planemo-test]] — Run specified tool or workflow tests within Galaxy.
- [[planemo-workflow_test_init]] — Initialize a Galaxy workflow test description for supplied workflow.
- [[planemo-workflow_test_on_invocation]] — Run defined tests against existing workflow invocation.
- [[summarize]] — Emit a deterministic galaxy-tool-summary manifest (cache provenance + embedded ParsedTool + generated input JSON Schemas) for a cached tool.
- [[summarize-nextflow]] — Statically introspect a Nextflow / nf-core pipeline tree and emit a validated JSON summary.
- [[tool-revisions]] — Resolve a Tool Shed tool to changeset revisions for reproducible workflow pinning. Final step in discover-and-pin.
- [[tool-search]] — Free-text Tool Shed search returning candidate tools as JSON; first step in the discover-and-pin sequence.
- [[tool-versions]] — List TRS-published versions of a Tool Shed tool, oldest→newest. Second step in the discover-and-pin sequence.
- [[validate]] — Validate Galaxy workflow structure, tool state, and optional connection compatibility before runtime execution.
- [[validate-galaxy-tool-discovery]] — AJV gate for discover-shed-tool recommendation documents.
- [[validate-galaxy-tool-summary]] — AJV gate for galaxy-tool-cache summarize manifests, including the nested parsed_tool subtree.
- [[validate-galaxy-workflow-test-plan]] — AJV gate for Galaxy workflow test-plan YAML documents.
- [[validate-summary-cwl]] — AJV gate for summarize-cwl JSON documents.
- [[validate-summary-galaxy-workflow]] — AJV gate for summarize-galaxy-workflow JSON documents.
- [[validate-summary-nextflow]] — AJV gate for summarize-nextflow JSON documents.
- [[validate-tests]] — Validate Galaxy workflow test files and optionally cross-check labels against their workflow.
- [[validate-tests-format]] — AJV gate for Galaxy workflow tests YAML, with optional workflow cross-check.

## Schemas

- [[cast-provenance]] — _provenance.json contract beside every cast: Mold revision, per-ref deterministic-vs-LLM origin, src/dst hashes, artifact handoff. Schema v2.
- [[summary-cwl]] — JSON Schema for the structured summary emitted by the summarize-cwl Mold.
- [[parsed-tool]] — JSON Schema for the upstream Galaxy `ParsedTool` model, vendored from `@galaxy-tool-util/schema`.
- [[galaxy-tool-discovery]] — JSON Schema for Tool Shed discovery hit, weak, and miss recommendations.
- [[galaxy-tool-summary]] — JSON Schema for the deterministic per-tool manifest emitted by `galaxy-tool-cache summarize`.
- [[galaxy-workflow-draft]] — JSON Schema for `class: GalaxyWorkflowDraft` — gxformat2 with `TODO_*` sentinels and `_plan_*` planning fields per draft step.
- [[summary-galaxy-workflow]] — JSON Schema for the structured summary emitted by the summarize-galaxy-workflow Mold.
- [[tests-format]] — JSON Schema for the planemo workflow test format (`<workflow>-tests.yml`), vendored from `@galaxy-tool-util/schema`.
- [[galaxy-workflow-test-plan]] — JSON Schema for the intermediate Galaxy workflow test-plan handoff produced by the test-plan Molds and consumed by implement-galaxy-workflow-test.
- [[nextflow-parameters-meta]] — JSON Schema (Draft 2020-12) meta-schema validating per-pipeline nextflow_schema.json files. Upstream from nextflow-io/nf-schema.
- [[summary-nextflow]] — JSON Schema for the structured summary emitted by the summarize-nextflow Mold.
- [[nf-core-module-meta]] — JSON Schema (Draft-07) validating nf-core module meta.yml — channel IO, tools, containers, conda lockfiles. Upstream from nf-core/modules.
- [[nf-core-subworkflow-meta]] — JSON Schema (Draft-07) validating nf-core subworkflow meta.yml — channel IO, components dependencies, authors. Upstream from nf-core/modules.
- [[planemo-test-report]] — JSON Schema for the report emitted by `planemo test --test_output_json` (and friends), vendored from upstream planemo.

## Component Research

- [[component-archon]] — Archon remains a heavy-harness candidate; HITL gates are stronger, but per-step sub-DAG looping is still the main gap.
- [[component-claude-dynamic-workflows]] — Dynamic workflows natively solve the per-step sub-DAG loop Archon couldn't, with schema-typed step handoffs; cost is in-session-only resume and no mid-run gate.
- [[component-nextflow-channel-operators]] — Structured digest of Nextflow channel operators (47 entries) with cardinality and shape semantics; backs summarize-nextflow §6 edge reconciliation.
- [[component-nextflow-containers-and-envs]] — Container URL grammar (depot, BioContainers, mulled-v2, Wave, ORAS) and conda directive resolution rules backing summarize-nextflow §5.
- [[component-nextflow-inspect]] — White paper on Nextflow's native introspection subcommands — `nextflow inspect`, `nextflow config`, and adjacent tooling. Survey, not decision.
- [[component-nextflow-pipeline-anatomy]] — Stub. DSL2 layout, channel idioms, operator-chain reading rules. Grows from cast contact with rnaseq/sarek/ad-hoc — see issue #17.
- [[component-nextflow-testing]] — nf-test patterns mapped to Galaxy planemo asserts and CWL test equivalents — backs nextflow-test-to-target-tests Mold and summarize-nextflow §7.
- [[component-nf-core-module-conventions]] — RFC 2119 conventions enforced by nf-core/tools module lint, with lint-check pointers. Backs summarize-nextflow + author-galaxy-tool-wrapper.
- [[component-nf-core-tools]] — White paper on nf-core/tools — conventions, CLI surface, schema universe, container resolution. Survey, not decision.
- [[component-tool-shed-search]] — Tool Shed's Whoosh repo/tool search and partial GA4GH TRS v2, indexed from hg-walked metadata with no auto-refresh on upload
- [[cwl-pickvalue-to-galaxy]] — CWL `pickValue` (first_non_null / the_only_non_null / all_non_null) → Galaxy's native `pick_value` workflow step added by galaxyproject/galaxy#22222.
- [[cwl-v1.2-schemas]] — Vendored official CWL v1.2.1 JSON/SALAD schema documents used as source-structure reference for CWL summarization.
- [[component-cwl-workflow-anatomy]] — CWL structure relevant to summarize-cwl: normalized documents, steps, scatter, conditionals, requirements, and dependency handling.
- [[galaxy-discover-datasets]] — Reference for the <discover_datasets> Galaxy XML element — attributes, named/regex patterns, <data> vs <collection> contexts, test assertions.
- [[galaxy-apply-rules-dsl]] — Reference for Galaxy's Apply Rules DSL: rule operations, mapping operations, composition patterns, pitfalls.
- [[galaxy-collection-semantics]] — Vendored formal spec of Galaxy dataset-collection mapping/reduction semantics, with labeled examples and pinned test references.
- [[galaxy-collection-tools]] — Catalog of Galaxy's collection-operation tools — purpose, IO, parameters, selection guide. Companion to galaxy-collection-semantics.
- [[galaxy-datatypes-conf]] — Vendored Galaxy datatypes registry sample: extension → datatype class mapping, sniff order, converters, and display applications.
- [[galaxy-native-workflow-schema]] — Vendored structural JSON Schema for Galaxy native workflow (.ga) format: vocabulary for the JSON shape Galaxy emits and consumes.
- [[galaxy-paired-or-unpaired-collections]] — Galaxy's `paired_or_unpaired` collection type: discriminated-union shape for paired-or-single reads, no workflow-level mode switch needed. Galaxy PR #19377.
- [[galaxy-sample-sheet-collections]] — Galaxy's sample_sheet collection family: typed column metadata, four variants, mapping rules, validator allowlist.
- [[galaxy-tool-job-failure-reference]] — Reference for Galaxy tool stdio rules, job failure detection, job states, and job API failure surfaces.
- [[galaxy-xsd]] — Vendored Galaxy tool XML schema for wrapper structure, parameters, outputs, tests, and assertion syntax.
- [[galaxy-workflow-comments]] — How to annotate a gxformat2 workflow with editor comments: one titled frame per analysis stage, populate contains_steps, color decorative.
- [[galaxy-workflow-invocation-failure-reference]] — Reference for Galaxy workflow invocation states, messages, failure reasons, and invocation API surfaces.
- [[galaxy-workflow-testability-design]] — Design guidance for Galaxy workflow inputs, outputs, and checkpoints that make IWC-style workflow tests possible.
- [[gxformat2-schema]] — Vendored structural JSON Schema for gxformat2 workflows: vocabulary for inputs, outputs, steps, and step subtypes.
- [[gxformat2-workflow-inputs]] — Conceptual model, current aliases, and schema gaps for gxformat2 workflow inputs.
- [[iwc-comments-survey]] — How IWC uses the gxformat2 `comments:` array: titled stage frames dominate, color is decorative, frames travel with template forks. An authoring convention.
- [[iwc-conditionals-survey]] — Corpus survey of Galaxy conditional step usage in IWC, covering when-gates, boolean shims, and routed output selection.
- [[iwc-interval-operations-survey]] — IWC corpus survey of coordinate-aware genomic interval operations; sizing and candidate boundaries for a galaxy-interval-patterns MOC, with hold-if-thin gate.
- [[iwc-map-over-lifecycle-survey]] — Survey of IWC map-over lifecycle recipes, with a Nextflow-to-Galaxy crosswalk for collection construction, cleanup, reshape, reduce, and publish phases.
- [[iwc-parameter-derivation-survey]] — Corpus survey of Galaxy workflow recipes that turn upstream data, metadata, or small files into runtime parameters.
- [[iwc-runtime-parameter-shims-survey]] — Focused survey of tiny IWC runtime parameter shims for flags, enums, counts, booleans, and composed text.
- [[iwc-sequence-operations-survey]] — IWC survey of record-level FASTA manipulation (interconversion, reformat, merge/dedup, subset, extract-at-intervals); sizes a galaxy-sequence-patterns MOC.
- [[iwc-shortcuts-anti-patterns]] — What IWC test suites cut corners on (accepted) vs what's a code smell — existence-only probes, sim_size deltas, image dim checks, label coupling.
- [[iwc-tabular-operations-survey]] — Corpus survey of tabular tools and operations across IWC workflows; map for the operation pattern hierarchy on row/column data manipulation.
- [[iwc-test-data-conventions]] — How IWC workflows organize and reference test data — Zenodo-first, SHA-1 integrity, collection shapes, CVMFS gotchas.
- [[iwc-transformations-survey]] — Corpus survey of collection-shape transformations across IWC: built-in collection ops, toolshed transformers, and the multi-step recipes that bracket map-over.
- [[iwc-workflow-testability-survey]] — IWC evidence survey for Galaxy workflow structures that make workflow tests meaningful.
- [[nextflow-conditional-to-galaxy-subworkflow-when]] — Stub. Translate Nextflow conditionals into Galaxy `when:` (single-workflow v1). Subworkflow vs inline is an aesthetic call, not a rule.
- [[nextflow-snapshot-to-galaxy-assertions]] — Translates nf-test snapshot assertions into Galaxy workflow test-format assertions, broken out by module-level vs pipeline-level test shape.
- [[nextflow-operators-to-galaxy-collection-recipes]] — Classifies common Nextflow operators as Galaxy wiring, collection semantics, explicit steps, or review triggers.
- [[nextflow-params-to-galaxy-inputs]] — Rules for translating Nextflow params, sample sheets, channels, and control flags into gxformat2 inputs.
- [[nextflow-path-glob-to-galaxy-datatype]] — Rules for mapping Nextflow path, glob, sample-sheet, and output filename evidence to Galaxy datatype extensions.
- [[nextflow-reference-data-classification]] — Source-side taxonomy of how Nextflow pipelines use reference data — eight classifications detectable from a summary-nextflow artifact.
- [[nextflow-to-galaxy-reference-data-mapping]] — Galaxy-side translation of Nextflow reference-data classifications: idioms available, the v1 posture, datatype defaults, and the in-tool rebuild trade-off.
- [[nextflow-workflow-io-semantics]] — Defines Nextflow workflow inputs and outputs from docs plus observed fixture pipeline structures.
- [[nextflow-to-galaxy-channel-shape-mapping]] — Maps common Nextflow channel, tuple, and path shapes to Galaxy dataset and collection shapes.
- [[nf-schema-samplesheet-galaxy-gaps]] — nf-schema validation mapped to Galaxy column_definitions: what survives, degrades, or is lost; Galaxy work items + cast loss-recording vocabulary.
- [[planemo-asserts-idioms]] — Decision and idiom guide for picking planemo workflow-test assertions: which family per output type, how to size tolerances, when to validate.
- [[planemo-workflow-test-architecture]] — Reference for Planemo workflow test/run architecture, Galaxy modes, API polling, and noisy failure boundaries.

## Design Problems

- [[nfcore-channel-input-to-galaxy-collection]] — Map an nf-core process's tuple(meta, path) input channel to a Galaxy <param type="data"> or paired/list collection input.
- [[nfcore-meta-map-to-galaxy-params]] — Promote nf-core meta-map keys to Galaxy <param>s only when they drive script behavior; drop identity-only keys; pull naming from $input.element_identifier.
- [[nfcore-stub-block-to-galaxy-noop-test]] — nf-core's stub: block has no Galaxy analog; the convert Mold drops it intentionally and records the drop in _provenance.yml.
- [[nfcore-task-ext-args-to-galaxy-additional-options]] — Map nf-core's task.ext.args escape hatch to a single Galaxy text param surfacing extra command-line arguments.
- [[nfcore-versions-emit-to-galaxy-version-command]] — Translate nf-core's versions emit (heredoc or topic: versions) into Galaxy's <version_command>, dropping the versions output channel.

## Design Specs

- [[gxy-sketches-alignment]] — Where the Foundry's per-source summary Molds align with gxy-sketches on field names and source/test-fixture vocabulary, and where they intentionally do not.
- [[cwl-when-pickvalue-to-galaxy-branching]] — CWL `when:`/`pickValue` → Galaxy. Three honest translations (paired_or_unpaired input, native pick_value step, sibling workflows) plus how to pick among them.
- [[galaxy-data-flow-draft-contract]] — Defines the proposed boundary between Galaxy data-flow drafts, gxformat2 templates, and concrete step implementation.
- [[galaxy-tool-summary-input-source]] — Decides that summarize-galaxy-tool reads cached ParsedTool JSON as its v1 input source.
- [[galaxy-workflow-draft-format]] — gxformat2 draft superset: wrapper-tier TODOs (tool_id, tool_state, port names) plus _plan_state / _plan_context / _plan_in / _plan_out per tool step.
- [[open-requirements-ledger]] — Carried unresolved-requirements artifact the source→Galaxy pipeline discharges or explicitly surrenders, autonomously.

## Cli Tool

- [[cwl-utils]] — CWL document utilities. summarize-cwl uses cwl-normalizer to gather references and upgrade to v1.2 JSON.
- [[cwltool]] — Reference CWL runner and validator. Used by summarize-cwl for entrypoint validation.
- [[foundry]] — Foundry CLI: bundles all Mold IO validators and a summarize-nextflow subcommand.
- [[galaxy-tool-cache]] — Cache and inspect Galaxy tool metadata (fetch from ToolShed, summarize ParsedTool, export input JSON Schema).
- [[gxwf]] — Galaxy workflow design-time CLI (validate, convert, lint, roundtrip, tool-cache discovery).
- [[planemo]] — Galaxy tool/workflow runtime testing CLI; used by run-workflow-test and friends.

## Prompt

- [[custom-tool-critic]] — Vendored Galaxy internal prompt for critiquing generated custom tool definitions.
- [[custom-tool-structured]] — Vendored Galaxy internal prompt for generating structured custom tool definitions.
