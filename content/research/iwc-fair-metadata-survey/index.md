---
type: research
tags:
  - target/galaxy
status: draft
created: 2026-11-11
revised: 2026-11-11
revision: 1
related_notes:
  - "[[iwc-workflow-testability-survey]]"
  - "[[iwc-test-data-conventions]]"
summary: "IWC corpus survey of workflow-level FAIR metadata: license, creators and ORCIDs, tags, and input annotations and file formats."
---

# IWC FAIR metadata survey

Source corpus: 120 IWC workflows (`*.ga`) under `workflows/` as materialized in `workflow-fixtures/iwc-src/workflows/` at the commit pinned in `workflow-fixtures/fixtures.yaml` (`deafc487`). The Foundry cites this corpus rather than mirroring it, so no per-workflow data is committed. The survey asks how much of the metadata a FAIR checklist would look for is already present in the workflow files themselves.

## 1. Scope

Topic type: **metadata coverage**. The question is which workflow-level metadata fields IWC authors already fill in, and where a checklist or review Mold would find the most to fix. Platform-level items (for example the Bioschemas metadata that WorkflowHub generates) are out of scope; the existing FAIR assessors mostly measure those: F-UJI (4.0.1, metrics v0.8), FAIR-Checker (v1.3.5) and howfairis.

Counting rules:

- **Unit.** One workflow is one `.ga` file under `workflows/`.
- **Subworkflows.** Embedded subworkflows are not counted as separate workflows. Their inner inputs are **not** included in the headline counts; they are reported separately in section 3. 31 of the 120 workflows embed at least one subworkflow (83 subworkflow steps in total).
- **Creator.** Entries of the workflow's `creator` field with class `Person`. Organization entries are ignored.
- **ORCID.** A Person identifier that contains four groups of four characters (digits, the last character may be `X`), either as a bare ID or inside an `orcid.org` URL. This is a syntactic check only; no ORCID was resolved.
- **Tags.** A non-empty `tags` list.
- **Inputs.** Top-level steps of type `data_input` or `data_collection_input`. `parameter_input` steps are not counted.
- **Annotation.** A non-empty annotation after stripping whitespace.
- **Format.** A non-empty `format` in the input step's `tool_state`. For collection inputs this is a list of formats.

Evidence quality: every count below is corpus-observed. The interpretation column is inference.

## 2. Corpus counts

| Measure | Count | Interpretation |
|---|---:|---|
| Workflows | 120 | Total workflows surveyed. |
| License present | 119 / 120 (99%) | License is effectively solved in IWC; a checklist can require it. |
| At least one Person creator | 104 / 120 (87%) | The remaining 16 workflows have no Person creator entry. |
| Every Person creator has an ORCID | 93 / 104 (89%) | ORCIDs are the norm but not universal; a checklist should recommend them rather than block on them. |
| Non-empty workflow tags | 82 / 120 (68%) | About a third of workflows carry no tags, so discoverability metadata is the weakest workflow-level field. |
| Data and collection inputs | 277 | Top-level inputs only. |
| Inputs with an annotation | 245 / 277 (88%) | Input descriptions are mostly present. |
| Inputs with a file format | 112 / 277 (40%) | Most inputs declare no format. |
| Single-file inputs with a format | 79 / 170 (46%) | |
| Collection inputs with a format | 33 / 107 (31%) | Collections declare formats least often. |

A missing `format` means the input step declares no machine-readable datatype, so Galaxy accepts any dataset there. Some workflows state formats only in prose. Example, found by manually opening `Assembly-Hifi-HiC-phasing-VGP4.ga`: its five data inputs declare no machine-readable `format`, but the `readme` field inside the same `.ga` file lists them as "[fastq]", "[txt]", "[meryldb]" and "[tabular]". The counts cover machine-readable formats declared in the input step only; how many gaps are documented in the `readme` alone was not measured. This survey does not decide whether a missing format is a defect; section 4 raises it as an open question.

## 3. Missing input formats

By workflow category (first folder under `workflows/`), the nine categories with the most inputs lacking a format:

| Category | Workflows | Inputs | With format | Missing format |
|---|---:|---:|---:|---:|
| `VGP-assembly-v2` | 13 | 47 | 13 | 34 |
| `microbiome` | 13 | 27 | 1 | 26 |
| `proteomics` | 6 | 21 | 2 | 19 |
| `amplicon` | 17 | 34 | 20 | 14 |
| `virology` | 3 | 10 | 0 | 10 |
| `computational-chemistry` | 4 | 10 | 1 | 9 |
| `epigenetics` | 12 | 12 | 3 | 9 |
| `scRNAseq` | 8 | 20 | 11 | 9 |
| `transcriptomics` | 5 | 14 | 5 | 9 |

These nine categories account for 139 of the 165 inputs without a format. The other 11 categories have at most 5 each; `bacterial_genomics` and `comparative_genomics` have none.

By input type: 91 of 170 single-file inputs and 74 of 107 collection inputs have no format.

Inputs inside embedded subworkflows are reported separately: 155 inputs (136 one level down, 19 two levels down), of which 38 have a format (25%). They show the same pattern as the top level. Folding them into the headline (`--include-subworkflows`) gives 432 inputs, 314 annotated (73%) and 150 with a format (35%). Inner inputs are annotated noticeably less often than top-level ones.

## 4. Open questions

- **Subworkflow policy.** The headline counts top-level inputs, which is what a user sees when running a workflow. Should inner subworkflow inputs be folded into the headline instead?
- **Is a missing format a defect?** An unrestricted `data` input is legitimate Galaxy. The checklist needs to decide whether to require, recommend, or only report declared formats.
- **Formats documented only in prose.** How many of the inputs without a machine-readable format are described only in the workflow's `readme` field (as in `Assembly-Hifi-HiC-phasing-VGP4.ga`)? A checklist could ask for formats to be declared in the input step, not only described.
- **ORCID validity.** Only the identifier's shape was checked.
- **Checklist severities.** License is near-universal and could be a hard requirement. ORCID, tags, and input formats have real gaps and fit better as recommendations until the corpus improves.

## 5. Reproduction

From the repository root, with `workflow-fixtures/iwc-src/` checked out at the pinned commit:

```
python3 -I scripts/one-time/iwc-fair-metadata-survey.py workflow-fixtures/iwc-src
python3 -I scripts/one-time/iwc-fair-metadata-survey.py workflow-fixtures/iwc-src --include-subworkflows
```

Add `--csv out.csv` for a per-workflow table; it is not committed. The same script run on an earlier 133-workflow IWC clone reproduces the figures posted on the issue (license 132, Person creator 117, ORCID 105 of 117, tags 89, annotations 285 of 320, formats 135 of 320).
