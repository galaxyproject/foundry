---
type: research
title: "Galaxy collection-operation tools"
tags:
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-09-26
revision: 3
related_notes:
  - "[[galaxy-collection-semantics]]"
  - "[[galaxy-apply-rules-dsl]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
  - "[[nextflow-operators-to-galaxy-collection-recipes]]"
  - "[[iwc-transformations-survey]]"
sources:
  - "https://github.com/galaxyproject/galaxy/tree/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/tools"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/tools/__init__.py"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/tools/model_operation_macros.xml"
  - "https://github.com/galaxyproject/galaxy/blob/a63da1dfd1960360f4aa2fddc6a75396954d750a/lib/galaxy/tools/actions/model_operations.py"
summary: "Catalog of Galaxy collection-operation tools, with versioned inputs, outputs, defaults, mapping behavior, and diagnostic qualifications."
---

Galaxy's built-in collection-operation tools assemble, select, reshape, and annotate collections. Their outputs usually copy history dataset associations while sharing the underlying dataset files. They do not rerun scientific analysis or duplicate those files. Some operations read file contents, including identifier tables, tag tables, null markers, and the emptiness check. Creating a large cross product still creates many history objects.

The catalog describes the wrappers and implementations at Galaxy commit `a63da1dfd1960360f4aa2fddc6a75396954d750a`. Versions below are the newest wrappers present at that commit, not a promise that every Galaxy server exposes them. Older wrappers can have different inputs. A workflow's concrete `tool_version` and parameter schema must match the installed tool, not merely the newest entry in this catalog. [[galaxy-collection-semantics]] describes collection mapping and reduction, and [[galaxy-apply-rules-dsl]] gives the exact rule vocabulary.

## Collection inputs and mapped outputs

An input declared as `data` takes one dataset per execution. Selecting a collection for that input invokes Galaxy's normal mapping behavior. Build List and Zip therefore produce one list or pair per mapped execution, with an outer collection collecting the results. They do not accept arbitrary collections as single dataset values or concatenate them directly.

An input declared as `data_collection` consumes a collection of a compatible type. A deeper collection may be mapped over to supply compatible inner collections. The output types in this catalog describe one execution, except where mapped behavior is stated explicitly. Collection order and identifiers both matter when synchronizing inputs. Equal element counts alone do not establish that two datasets represent the same sample.

## Collection creation

### Build list (`__BUILD_LIST__`, 1.2.0)

Builds `output`, a `list`, from a repeat named `datasets`. Each repeat has optional dataset input `input` and conditional `id_cond`:

| Parameter | Values and behavior |
|---|---|
| `id_cond/id_select` | `idx` by default, `identifier`, or `manual`. |
| `idx` | Uses the repeat's zero-based position as the element identifier. Omitted optional inputs can leave gaps in the numbering. |
| `identifier` | Uses the incoming element identifier when available, otherwise the dataset name. |
| `id_cond/identifier` | Supplies the label for `manual`. |

Individual datasets become elements of one list. Collection inputs to the dataset parameters are mapped, producing lists inside an outer collection. Multiple mapped inputs must be compatible for Galaxy's paired mapping. This is different from Merge Collections, which appends collection elements.

Choose unique labels. The implementation builds an identifier-keyed dictionary, so a repeated label replaces an earlier entry. Wrapper 1.1.0 has the dataset repeat but lacks the label-selection conditional.

### Duplicate file to collection (`__DUPLICATE_FILE_TO_COLLECTION__`, 1.0.0)

Takes dataset `input`, integer `number`, and text `element_identifier`. No numeric default is supplied for `number`. Produces `output`, a `list`, with labels formed from the base identifier, a space, and a one-based number. For base `test` and size 2, the identifiers are `test 1` and `test 2`.

Each element refers to a copy of the input's history association. This can materialize repeated inputs for a test or a synchronized operation, but repeated copies remain the same scientific input.

## Element extraction

### Extract dataset (`__EXTRACT_DATASET__`, 1.0.2)

Consumes `input` with declared types `list`, `paired`, `paired_or_unpaired`, or `record`. Produces dataset `output`, named after the selected element identifier.

| Parameter | Values and behavior |
|---|---|
| `which/which_dataset` | `first` by default, `by_identifier`, or `by_index`. |
| `which/identifier` | Required for `by_identifier`. The wrapper's sanitizer retains ASCII letters, digits, `_`, `-`, and `#`. |
| `which/index` | Zero-based integer, default 0, for `by_index`. |

An empty collection cannot supply the first dataset. Missing identifiers and invalid indices fail. For a nested input, Galaxy can map over compatible inner collections and collect the extracted datasets at the remaining outer levels. Extraction does not flatten every dataset in the hierarchy.

## Filtering

### State, empty-content, and null filters

These tools take collection `input`, declared as `list` or `list:paired`, and produce collection `output` with the input type. Their predicates differ:

| Tool and version | Criterion for retaining a dataset |
|---|---|
| Filter empty datasets, `__FILTER_EMPTY_DATASETS__`, 1.1.0 | Has data and yields at least one byte from Galaxy's file reader, which handles supported compression. A compressed file containing no decompressed content is empty. |
| Filter failed datasets, `__FILTER_FAILED_DATASETS__`, 1.1.0 | `is_ok` is true. The implementation keeps successful datasets, not simply every state other than red/error. |
| Filter null elements, `__FILTER_NULL__`, 1.1.0 | Is not the recognized `expression.json` null marker. This checks the datatype and `peek == "null"`, or the file content read by the implementation. It does not remove every empty file or arbitrary JSON containing null values. |
| Keep success, `__KEEP_SUCCESS_DATASETS__`, 1.1.0 | `is_ok` is true. Paused datasets can reach the filter and are excluded. Other pending datasets cause an input-not-ready result. |

For `list:paired`, both members must pass. If either fails the predicate, the whole pair is removed. Higher collection levels can be mapped over.

All four versions listed expose optional dataset `replacement`. For a simple list, supplying it replaces excluded elements while retaining their identifiers and copying their original tags. Replacement is rejected for `list:paired`. The 1.0.0 wrappers for Empty, Null, and Keep Success do not expose replacement. Filter Failed 1.0.0 does.

Filter Empty and Filter Null require successful inputs before applying their content predicate. They do not repair errored datasets. Filter Failed waits for ready inputs and does not accept paused inputs in the same way as Keep Success. Keep Success also waits on running or queued inputs, despite wrapper help that suggests still-running elements are removed immediately.

Removing elements changes the sample population and can break alignment with another collection. Preserving an identifier with a replacement preserves structural alignment, but does not establish that the replacement is a meaningful scientific result.

### Filter collection (`__FILTER_FROM_FILE__`, 1.1.0)

Takes any collection `input` and a text identifier file in conditional `how`. Matching applies to the collection's top-level element identifiers, with whitespace stripped from file lines.

| Parameter | Contract |
|---|---|
| `how/how_filter` | `remove_if_absent` by default, or `remove_if_present`. |
| `how/filter_source` | Text dataset containing one identifier per line. |

`remove_if_absent` keeps elements named in the file. `remove_if_present` excludes them. File entries absent from the collection have no effect. The tool retains input order, rather than adopting file order.

Outputs `output_filtered` and `output_discarded` partition the input and retain its collection type. Keeping the discarded output makes exclusions inspectable. The 1.0.0 wrapper exposes the same parameter names.

## Structure transformations

### Flatten collection (`__FLATTEN__`, 1.0.0)

Takes collection `input` and produces `output`, a flat `list` of all leaf datasets. `join_identifier` is `_` by default, with `:` and `-` also accepted. Identifiers at each nesting level are joined in traversal order.

For `list:paired`, sample `i1` becomes `i1_forward` and `i1_reverse` with the default separator. A flat input remains a list with its existing identifiers.

Flattening discards the original hierarchy. Choose identifiers and separator so distinct paths produce distinct labels. The implementation stores results by joined identifier, so a collision can overwrite a preceding leaf.

### Nest collection (`__NEST__`, 1.0.0)

Declares collection `input` with types `list` or `paired`, and `output` with type `list:list`. Each top-level element is wrapped in a one-element inner list. The outer and inner labels are the original element identifier. Thus `[A, B]` becomes `[A → [A], B → [B]]`.

This lets a tool that consumes a whole list run once per singleton list when Galaxy maps over the outer level. It does not group multiple samples by a key. Deeper inputs involve mapping, so account for the consumed inner type and remaining outer structure instead of treating the declared output as the final workflow type. The wrapper includes a nested-pair test, whose output collection assertion does not explicitly pin the full effective type.

### Zip collections (`__ZIP_COLLECTION__`, 1.0.0)

Takes dataset parameters `input_forward` and `input_reverse`. Produces `output`, a `paired` collection with member identifiers `forward` and `reverse`.

With individual datasets, it creates one pair. With compatible mapped collections, Galaxy creates pairs per mapped position and assembles the outer collection. It does not perform a keyed join or verify that the two files are biologically matched.

### Unzip collection (`__UNZIP_COLLECTION__`, 1.0.0)

Consumes `input`, a `paired` collection, and produces datasets `forward` and `reverse`. Mapping over `list:paired` produces corresponding output lists. The tool separates associations without changing read contents.

### Split paired and unpaired (`__SPLIT_PAIRED_AND_UNPAIRED__`, 1.0.0)

Consumes `input` of type `list`, `list:paired`, or `list:paired_or_unpaired`. Produces:

- `output_unpaired`, a `list` of singleton datasets.
- `output_paired`, a `list:paired` of pairs.

A plain list sends all elements to the unpaired output. A list of pairs sends all elements to the paired output. For a mixed list, singleton subcollections are unwrapped and two-member subcollections are normalized to `paired`. Top-level identifiers are retained, and either output can be empty. This partitions an existing pairing structure. It does not infer pairs from filenames.

## Combining and synchronizing collections

### Merge collections (`__MERGE_COLLECTION__`, 1.0.0)

Takes repeat `inputs` with at least two entries, each containing collection parameter `input`. Produces `output`, deriving its collection type from the first input. Inputs need compatible structure. The tool appends their top-level elements, leaving inner collections intact.

Conditional `advanced/conflict` controls overlapping identifiers:

| `duplicate_options` | Behavior |
|---|---|
| `keep_first` | Default. Keeps the first element with each identifier. |
| `keep_last` | Keeps the last value for each identifier. Its position follows the identifier's first insertion. |
| `suffix_conflict` | Adds a suffix to every occurrence of an identifier appearing in multiple inputs. |
| `suffix_conflict_rest` | Adds a suffix to conflicting occurrences after the first input containing that identifier. |
| `suffix_every` | Adds a suffix to every element. |
| `fail` | Fails if an identifier occurs more than once. |

For suffix modes, `advanced/conflict/suffix_pattern` defaults to `_#`. Every `#` is replaced by the one-based **input collection number**, not the occurrence number of that identifier. Check that generated suffixes cannot collide with existing labels.

The default can silently discard an overlapping sample. Use an explicit conflict policy when both occurrences matter. Merge is an append operation, not element-wise pairing. Compatible sample-sheet column definitions are retained when all inputs agree.

### Harmonize two collections (`__HARMONIZELISTS__`, 1.1.0)

Takes `input1`, the reference order, and optional `input2`. Both declare `list` or `list:paired`. Outputs `output1` and `output2` preserve their corresponding input types when both are supplied.

With two inputs, both outputs contain only top-level identifiers present in both collections, ordered as in `input1`. No intersection produces two empty collections. This is identifier synchronization, not sorting independently or joining on file contents. Discarded elements are not separate outputs.

With `input2` omitted, `output1` copies `input1` and `output2` mirrors its structure using `expression.json` null datasets. For nested pairs, both members are null markers. This mode creates placeholder files, so the general shared-file behavior has an exception here.

Wrapper 1.0.0 requires both inputs and has no omitted-input mode.

## Cross products

### Flat Cross Product (`__CROSS_PRODUCT_FLAT__`, 1.0.0)

Consumes `input_a` and `input_b`, both `list`, and produces lists `output_a` and `output_b`. For input sizes n and m, each output has n × m elements. A is the outer loop, B the inner loop. Corresponding output elements refer to the A and B datasets for that combination.

`join_identifier` accepts `_` by default, `:`, or `-`. Labels join the A and B identifiers. As with Flatten, ambiguous joined labels can collide.

Normal element-wise mapping over both outputs then runs the downstream tool for every combination. The cross-product tool itself performs no comparison.

### Nested Cross Product (`__CROSS_PRODUCT_NESTED__`, 1.0.0)

Consumes lists `input_a` and `input_b`, producing `output_a` and `output_b` as `list:list`. Both outputs use A identifiers at the outer level and B identifiers at the inner level. Within each A group, `output_a` repeats that A dataset and `output_b` contains the B datasets.

Each output contains n × m leaf associations, organized in n groups of size m. Select the downstream input type and mapping depth to retain that grouping in its results. Large inputs expand job counts as well as collection metadata. [[nextflow-operators-to-galaxy-collection-recipes]] identifies unkeyed Cartesian expansion as a translation decision needing review.

## Identifier and tag operations

### Relabel identifiers (`__RELABEL_FROM_FILE__`, 1.1.0)

Consumes any collection `input` and produces `output` with the same type. It changes top-level identifiers, without sorting elements or changing file contents. Conditional `how` holds these parameters:

| Parameter | Contract |
|---|---|
| `how/how_select` | `txt` by default, `tabular`, or `tabular_extended`. |
| `how/labels` | Text or tabular dataset supplying new names. |
| `how/strict` | Boolean, off by default. Requires matching row count and, for tables, coverage of every original identifier. |
| `how/from`, `how/to` | One-based column numbers for `tabular_extended`, defaults 1 and 2. |

In `txt` mode, line N renames element N. Too few lines fail even with strict mode off. Extra lines are ignored unless strict mode is on.

In `tabular` mode, each row must have exactly two tab-separated columns: old identifier and new identifier. Extended mode selects any two available columns. With strict mode off, identifiers missing from the table retain their original names. Extra source identifiers have no effect. Repeated source identifiers overwrite earlier table rows, so strict mode is not a complete duplicate-row validator.

New labels are stripped and must match Python regex `^[\w\- \.,]+$`: Unicode word characters, hyphen, space, dot, and comma. Empty labels, unsupported characters, and duplicate resulting labels fail. This differs from Extract Dataset's narrower identifier sanitizer.

### Sort collection (`__SORTLIST__`, 1.0.0)

Consumes `input`, declared as `list` or `list:paired`, and produces `output` with the same type. Parameters are in conditional `sort_type`:

| `sort_type/sort_type` | Behavior |
|---|---|
| `alpha` | Default. Sorts identifiers lexicographically, with case significant. |
| `numeric` | Removes every character except ASCII digits, converts the remaining string to an integer, and sorts by that value. |
| `file` | Uses the line order from text dataset `sort_type/sort_file`. |

Numeric mode does not interpret signs or decimal points. `sample-1.2` has key 12. An identifier with no digits fails integer conversion. Equal keys retain their input order.

For file mode, the file's reported data-line count must equal the collection element count and each stripped line must name an existing element. The wrapper asks for every identifier exactly once, but the implementation does not explicitly reject repeated names. Supply a permutation, since repetitions can collapse entries in the output dictionary.

With valid inputs, sorting changes order while preserving sample membership and identity. It cannot establish correct pairing when identifiers disagree.

### Tag elements (`__TAG_FROM_FILE__`, 1.0.0)

Consumes collection `input` and tabular dataset `tags`. Column 1 identifies the element, and later columns contain tags. Produces `output` with the same type, modifying tags on copied dataset associations.

Parameter `how` accepts `add` by default, `set`, or `remove`. They add tags while retaining existing tags, replace tags, or remove named tags, respectively. Ordinary tags are labels. Name tags use `#` or `name:` and participate in Galaxy's name-tag inheritance. `group:` tags can supply grouping metadata to tools that interpret them.

For nested elements, the implementation looks up leaf element identifiers while traversing the copied subcollection. A row naming an outer sample does not necessarily tag all leaves under that sample. Repeated file identifiers keep the last row. Missing rows and empty tag lists should not be treated as a reliable way to clear all tags. The flat-dataset path only updates tags when a nonempty mapping is found.

## Apply Rules (`__APPLY_RULES__`, 1.1.0)

Consumes collection `input` and rule parameter `rules`. Produces `output` with its collection type determined by the rule mapping. The interactive rule builder previews metadata transformations, and workflows can store a fixed rule set.

Rules operate on rows describing leaf datasets and columns holding metadata. They can filter and sort rows, derive columns from identifiers or tags, transform strings using regular expressions, and map columns into identifier levels, paired members, or tags. They can therefore reshape a hierarchy or split identifier components without modifying dataset contents.

This is a defined rule language, not arbitrary computation. Required mapping columns, pairing values, collisions, and resulting nesting determine whether a rule set is valid. [[galaxy-apply-rules-dsl]] documents all supported rule and mapping types, plus regex and column-index pitfalls.

## Tool selection guide

| Goal | Tool | Qualification |
|---|---|---|
| Assemble datasets into a list | Build list | Dataset inputs map when collections are selected. |
| Repeat one dataset | Duplicate file to collection | Repeats associations, not independent observations. |
| Select one dataset per collection | Extract dataset | Nested inputs may map over inner collections. |
| Remove empty content | Filter empty datasets | Requires successful inputs. |
| Continue after unsuccessful or paused samples | Keep success | Pending inputs still wait. |
| Remove unsuccessful completed elements | Filter failed datasets | Uses `is_ok`, not a red-only predicate. |
| Remove skipped/null markers | Filter null elements | Recognizes `expression.json` nulls. |
| Subset by top-level identifiers | Filter collection | Preserves input order and exposes discarded elements. |
| Collapse nesting | Flatten collection | Joined labels must remain unique. |
| Wrap elements in singleton lists | Nest collection | Account for mapped outer levels. |
| Form or separate pairs | Zip / Unzip | Does not infer biological pairing. |
| Separate existing mixed pairs and singletons | Split paired and unpaired | Either output can be empty. |
| Append collections | Merge collections | Default keeps only the first overlapping identifier. |
| Synchronize identifiers and order | Harmonize two collections | Two-input mode keeps only the intersection. |
| Materialize every A/B combination | Flat / Nested Cross Product | Expands to n × m combinations. |
| Change identifiers | Relabel identifiers | Does not synchronize independently ordered inputs. |
| Change order | Sort collection | Numeric mode concatenates digits. |
| Annotate datasets | Tag elements | Nested matching uses leaf identifiers. |
| Reshape using derived metadata | Apply Rules | Requires valid rule and output mappings. |

## Evidence and scope

The wrapper XML supplies parameter names, declared collection types, versions, output names, and examples. `DatabaseOperationTool` and its subclasses in `lib/galaxy/tools/__init__.py` supply readiness checks and operation behavior. The shared macros supply separator choices and quota guidance. Where wrapper help simplifies or contradicts the implementation, the qualifications above follow the implementation.

The wrapper tests include concrete assertions for extraction, filtering, relabeling, sorting, nesting, merging, and cross-product output elements. This reference was checked against source and those test declarations. A live Galaxy server was not used to verify tool availability, mapped workflow output types, or deployment-specific readiness behavior.
