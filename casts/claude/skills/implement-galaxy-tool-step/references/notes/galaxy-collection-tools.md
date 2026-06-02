---
type: research
subtype: component
title: "Galaxy collection-operation tools"
tags:
  - research/component
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-05-02
revision: 2
ai_generated: true
related_notes:
  - "[[galaxy-collection-semantics]]"
  - "[[galaxy-apply-rules-dsl]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
  - "[[nextflow-operators-to-galaxy-collection-recipes]]"
  - "[[iwc-transformations-survey]]"
sources:
  - "https://github.com/jmchilton/galaxy-agentic-collection-transform (initial research seed)"
  - "https://github.com/galaxyproject/galaxy/tree/main/lib/galaxy/tools (XML wrappers; source of truth)"
summary: "Catalog of Galaxy's collection-operation tools — purpose, IO, parameters, selection guide. Companion to galaxy-collection-semantics."
---

Catalog of Galaxy's built-in collection-operation tools (the `__BUILD_LIST__`, `__FILTER_FROM_FILE__`, `__APPLY_RULES__`, … family) — what each tool does, its inputs and outputs, and when to reach for it. Source of truth is the Galaxy XML wrappers under `lib/galaxy/tools/`; this is the high-level catalog. Pairs with [[galaxy-collection-semantics]], which describes the underlying mapping and reduction semantics rather than the user-facing tools.

These are **model operations** — they manipulate collection structure without processing file contents, so they're fast and don't grow storage.

## Tool Categories

### 1. Collection Creation Tools

#### Build List (`__BUILD_LIST__`)
**Version:** 1.2.0

**Purpose:** Build a new list collection from individual datasets or collections.

**Inputs:**
- `datasets` (repeat): Input datasets or collections
  - `input`: Data input (optional)
  - `id_cond/id_select`: Label selection method
    - `idx`: Use index (0, 1, 2...)
    - `identifier`: Use dataset's existing identifier
    - `manual`: Specify custom identifier

**Output:** `list` collection

**Use Cases:**
- A: Build collection from individual datasets
- B: Merge collection with individual dataset(s) → nested collection
- C: Merge collections → nested collection (requires equal element counts)

---

#### Duplicate File to Collection (`__DUPLICATE_FILE_TO_COLLECTION__`)
**Version:** 1.0.0

**Purpose:** Create collection of arbitrary size by duplicating an input dataset N times.

**Inputs:**
- `input`: Dataset to duplicate
- `number`: Integer - number of copies
- `element_identifier`: Base name for identifiers (e.g., "test" → "test 1", "test 2", etc.)

**Output:** `list` collection

**Use Case:** Create test collections, broadcasting single dataset to match collection size.

---

### 2. Element Extraction Tools

#### Extract Dataset (`__EXTRACT_DATASET__`)
**Version:** 1.0.2

**Purpose:** Extract a single dataset from a collection.

**Inputs:**
- `input`: Collection (`list`, `paired`, `paired_or_unpaired`, `record`)
- `which`: Selection method
  - `first`: First dataset
  - `by_identifier`: Match element identifier (string)
  - `by_index`: Select by 0-based index (integer)

**Output:** Single dataset

**Note:** For nested collections, collapses inner-most collection into dataset, creating new list at that level.

---

### 3. Filter Tools

#### Filter Empty Datasets (`__FILTER_EMPTY_DATASETS__`)
**Version:** 1.1.0

**Purpose:** Remove empty elements from a collection.

**Inputs:**
- `input`: Collection (`list`, `list:paired`)
- `replacement` (optional): Dataset to replace empty elements instead of removing

**Output:** Filtered collection (same type)

**Use Case:** Continue multi-sample analysis when downstream tools require content.

---

#### Filter Failed Datasets (`__FILTER_FAILED_DATASETS__`)
**Version:** 1.0.0

**Purpose:** Remove datasets in error (red) state from a collection.

**Inputs:**
- `input`: Collection (`list`, `list:paired`)
- `replacement` (optional): Dataset to replace failed elements

**Output:** Filtered collection (same type)

**Use Case:** Continue analysis when some samples fail.

---

#### Filter Null Elements (`__FILTER_NULL__`)
**Version:** 1.1.0

**Purpose:** Remove null elements (from conditional workflow execution) from a collection.

**Inputs:**
- `input`: Collection (`list`, `list:paired`)
- `replacement` (optional): Dataset to replace null elements

**Output:** Filtered collection (same type)

**Use Case:** Clean up collections after conditional workflow branches.

---

#### Keep Success (`__KEEP_SUCCESS_DATASETS__`)
**Version:** 1.1.0

**Purpose:** Keep only datasets in success (green) state.

**Inputs:**
- `input`: Collection (`list`, `list:paired`)
- `replacement` (optional): Dataset to replace unsuccessful elements

**Output:** Filtered collection (same type)

**Use Case:** Similar to Filter Failed but positive selection approach.

---

#### Filter Collection (`__FILTER_FROM_FILE__`)
**Version:** 1.1.0

**Purpose:** Filter elements using identifier list from a file.

**Inputs:**
- `input`: Any collection
- `how/how_filter`: Filter mode
  - `remove_if_absent`: Keep only elements in file
  - `remove_if_present`: Remove elements in file
- `filter_source`: Text file with identifiers (one per line)

**Outputs:**
- `output_filtered`: Elements passing filter
- `output_discarded`: Elements removed by filter

**Use Case:** Subset collections based on sample lists, exclusion lists.

---

### 4. Structure Transformation Tools

#### Flatten Collection (`__FLATTEN__`)
**Version:** 1.0.0

**Purpose:** Convert nested collection to flat list by merging identifiers.

**Inputs:**
- `input`: Any nested collection
- `join_identifier`: Separator for merging identifiers (`_`, `:`, `-`)

**Output:** `list` collection

**Example:** `list:paired` with element `i1` containing `forward`/`reverse` → flat list with `i1_forward`, `i1_reverse`

---

#### Nest Collection (`__NEST__`)
**Version:** 1.0.0

**Purpose:** Add nesting level to a collection.

**Inputs:**
- `input`: Collection (`list`, `paired`)

**Output:** `list:list` collection

**Behavior:** Each element becomes a single-element inner list.

**Use Case:** Enable mapping over elements that are themselves lists (Galaxy maps over outer level).

---

#### Zip Collections (`__ZIP_COLLECTION__`)
**Version:** 1.0.0

**Purpose:** Create paired collection from two inputs.

**Inputs:**
- `input_forward`: Dataset or collection for forward
- `input_reverse`: Dataset or collection for reverse

**Output:** `paired` collection

**Use Case:** Combine separate forward/reverse read files/collections into paired structure.

---

#### Unzip Collection (`__UNZIP_COLLECTION__`)
**Version:** 1.0.0

**Purpose:** Split paired collection into separate datasets.

**Inputs:**
- `input`: `paired` collection

**Outputs:**
- `forward`: Forward dataset
- `reverse`: Reverse dataset

**Use Case:** Separate paired reads for tools requiring individual files.

---

#### Split Paired and Unpaired (`__SPLIT_PAIRED_AND_UNPAIRED__`)
**Version:** 1.0.0

**Purpose:** Separate mixed paired/unpaired collection into two typed collections.

**Inputs:**
- `input`: Collection (`list:paired`, `list`, `list:paired_or_unpaired`)

**Outputs:**
- `output_unpaired`: `list` of unpaired datasets
- `output_paired`: `list:paired` collection

**Use Case:** Handle mixed sequencing outputs, separate for different downstream tools.

---

### 5. Collection Combination Tools

#### Merge Collections (`__MERGE_COLLECTION__`)
**Version:** 1.0.0

**Purpose:** Combine two or more collections into one.

**Inputs:**
- `inputs` (repeat, min 2): Collections to merge
- `advanced/conflict/duplicate_options`: Conflict handling
  - `keep_first` (default): Keep first occurrence
  - `keep_last`: Keep last occurrence
  - `suffix_conflict`: Add suffix to all conflicting identifiers
  - `suffix_conflict_rest`: Add suffix to conflicts after first
  - `suffix_every`: Add suffix to every identifier
  - `fail`: Error on conflict
- `suffix_pattern`: Pattern for suffixes (default `_#`)

**Output:** Merged collection (same type as inputs)

---

#### Harmonize Two Collections (`__HARMONIZELISTS__`)
**Version:** 1.0.0

**Purpose:** Make two collections have same identifiers in same order.

**Inputs:**
- `input1`: Reference collection with desired order
- `input2`: Collection to reorder

**Outputs:**
- `output1`: Filtered/ordered version of input1
- `output2`: Filtered/ordered version of input2

**Behavior:** Keeps only identifiers present in BOTH collections, orders by input1.

**Use Case:** Prepare two collections for element-wise processing.

---

### 6. Cross Product Tools

#### Flat Cross Product (`__CROSS_PRODUCT_FLAT__`)
**Version:** 1.0.0

**Purpose:** Create flat lists enabling all-vs-all comparison between two collections.

**Inputs:**
- `input_a`: List collection A (length n)
- `input_b`: List collection B (length m)
- `join_identifier`: Separator for combined identifiers

**Outputs:**
- `output_a`: Flat list (n*m elements) - A elements repeated
- `output_b`: Flat list (n*m elements) - B elements repeated

**Use Case:** Run comparison tool on every combination of elements. Element-wise processing of outputs produces all pairwise comparisons.

---

#### Nested Cross Product (`__CROSS_PRODUCT_NESTED__`)
**Version:** 1.0.0

**Purpose:** Create nested lists for all-vs-all comparison with hierarchical output.

**Inputs:**
- `input_a`: List collection A
- `input_b`: List collection B

**Outputs:**
- `output_a`: `list:list` - nested structure of A elements
- `output_b`: `list:list` - nested structure of B elements

**Use Case:** All-vs-all comparison preserving hierarchical structure in results (outer list = A elements, inner list = B comparisons).

---

### 7. Metadata Manipulation Tools

#### Relabel Identifiers (`__RELABEL_FROM_FILE__`)
**Version:** 1.1.0

**Purpose:** Change element identifiers using mapping file.

**Inputs:**
- `input`: Any collection
- `how/how_select`: Mapping method
  - `txt`: Simple text file (line N = new name for element N)
  - `tabular`: Two-column mapping (old → new)
  - `tabular_extended`: Any two columns from tabular file
- `labels`: Mapping file
- `strict`: Require exact match count

**Output:** Collection with new identifiers

**Valid Characters:** a-z, A-Z, 0-9, dash, underscore, dot, space, comma

---

#### Sort Collection (`__SORTLIST__`)
**Version:** 1.0.0

**Purpose:** Reorder collection elements.

**Inputs:**
- `input`: Collection (`list`, `list:paired`)
- `sort_type`: Method
  - `alpha`: Alphabetical
  - `numeric`: Numeric (ignores non-numeric chars)
  - `file`: Custom order from text file

**Output:** Sorted collection (same type)

---

#### Tag Elements (`__TAG_FROM_FILE__`)
**Version:** 1.0.0

**Purpose:** Add/modify Galaxy tags on collection elements.

**Inputs:**
- `input`: Any collection
- `tags`: Tabular file (col1: identifier, col2+: tags)
- `how`: Update mode
  - `add`: Add new tags, keep existing
  - `set`: Replace all tags
  - `remove`: Remove specified tags

**Output:** Tagged collection

**Tag Types:**
- Simple tags: Plain labels
- Name tags: Prefix with `#` or `name:` - inherited by derived datasets
- Group tags: Prefix with `group:` - for grouping (e.g., treatment vs control)

---

### 8. Apply Rules Tool (`__APPLY_RULES__`)
**Version:** 1.1.0

**Purpose:** Most powerful/flexible collection manipulation tool. Process collection metadata as tabular data using rule-based transformations.

**Inputs:**
- `input`: Any collection
- `rules`: Rule definition (JSON-based transformation rules)

**Output:** Transformed collection (type determined by rules)

**Capabilities:**
- Filter elements (rows)
- Add/remove/reorder identifier levels (columns)
- Regular expression transformations
- Complex nesting/flattening
- Arbitrary reorganization

**Use Cases:**
- Restructure collections between hierarchies
- Filter based on identifier patterns
- Split/merge identifier components
- Any operation not covered by simpler tools

**Note:** Interactive form provides live preview. Can be used in workflows with static rules.

---

## Tool Selection Guide

| Goal | Recommended Tool |
|------|------------------|
| Build collection from datasets | Build List |
| Extract single element | Extract Dataset |
| Remove empty/failed/null elements | Filter Empty/Failed/Null |
| Subset by identifier list | Filter Collection |
| Convert nested → flat | Flatten Collection |
| Add nesting level | Nest Collection |
| Combine forward/reverse | Zip Collections |
| Separate paired collection | Unzip Collection |
| Concatenate collections | Merge Collections |
| Match two collections | Harmonize Two Collections |
| All-vs-all comparison | Cross Product (Flat or Nested) |
| Rename elements | Relabel Identifiers |
| Reorder elements | Sort Collection |
| Add metadata tags | Tag Elements |
| Complex restructuring | Apply Rules |
| Duplicate single dataset | Duplicate File to Collection |

---
