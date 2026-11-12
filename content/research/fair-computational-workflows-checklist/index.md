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
  - "[[workflow-pr-review-command]]"
summary: "First slice of a FAIR checklist for Galaxy workflows: the item format, the metadata group and the registry items (F4, A1, A2), calibrated on IWC."
---

# FAIR checklist for computational workflows

> First draft, covering only F2, R1, R1.1, I2, I3, F4, A1 and A2. The other 12 principles are open (section 5). Comments and takeovers of any item or principle group are welcome.

This note is task 1 of [#768](https://github.com/galaxyproject/foundry/issues/768) (FAIRness review for Galaxy workflows), tracked in [#805](https://github.com/galaxyproject/foundry/issues/805). It turns the principles of the FAIR principles for computational workflows (Wilkinson et al. 2025, [*Scientific Data* 12, 328](https://doi.org/10.1038/s41597-025-04451-9), Table 1) into checks on a Galaxy workflow, as the reference for the `review-galaxy-workflow-fairness` Mold. **This is a partial draft.** It covers the metadata group (F2, R1, R1.1, I2 and I3) and the registry items that existing assessors speak to (F4, A1 and A2). The other 12 principles are listed in section 5 as open and can be picked up by anyone.

## 1. How to read an item

Each item records, as the [#805](https://github.com/galaxyproject/foundry/issues/805) item format asks:

1. **Stable id and principle(s).** The id (form `fair-<principle>-<name>`) is the heading, and the principle(s) it serves are listed under it.
2. **Source(s)**: a Bioschemas or Workflow RO-Crate property, a FAIR-IMPACT metric, or an IWC or nf-core convention. Sources taken from the planning issue [#768](https://github.com/galaxyproject/foundry/issues/768) have not been checked against the source itself. FAIR-IMPACT mappings (D5.2) were read from the FAIR-IMPACT deliverable D5.2.
3. **Galaxy interpretation and evidence**: what the principle means for a Galaxy workflow, and the field or file the Foundry can read.
4. **Check type**: deterministic or judgement.
5. **Decided by**: the submission, the publication route, or a run.
6. **IWC overlap**: the matching item in the IWC review, if any. The review is the vendored command [[workflow-pr-review-command]], pinned at upstream commit `fa25be5`.
7. **Severity**: required, recommended or informational, anchored in its source and calibrated against IWC practice.

Each item ends with a quoted block that is not part of the item format. It keeps corpus-observed claims separate from design inferences, as the "Done when" list in #805 asks. Items without a corpus count carry only an inference, or no block at all:

- **Corpus-observed**: a number we counted in the IWC corpus, for example "119 of 120 workflows have a licence". The corpus is the 120 IWC workflows at commit `deafc4876f2c778aaf075e48bd8e95f3604ccc92`, as materialized by `make fixtures-iwc fixtures-skeletons`. Counts cover top-level inputs only. The counts come from the script in [the IWC FAIR metadata survey](https://github.com/galaxyproject/foundry/pull/804) (draft PR #804), which gives the counting rules.
- **Design inference**: what we conclude from those counts.

## 2. Items

### fair-r1.1-license
- **Principle:** R1.1.
- **Sources:**
  - Bioschemas ComputationalWorkflow 1.0 lists `license` as a minimum property.
  - Workflow RO-Crate 1.0 says the licence MUST be declared.
  - WorkflowHub asks submitters to check the licence.
  - gxformat2 best-practices rule `WorkflowMissingLicense` and Galaxy's Best Practices panel both check for a licence.
  - FAIR-IMPACT metrics FRSM-15 and FRSM-16 are both mapped to R1.1 (D5.2).
- **Galaxy interpretation and evidence:** the workflow's `license` field holds an SPDX identifier. Evidence: the `license` field of the `.ga` file.
- **Check type:** deterministic.
- **Decided by:** the submission.
- **IWC overlap:** the IWC review checks that the `license` field exists and that the licence permits unrestricted use, both educational and commercial. That is stricter than presence.
- **Severity:** required.

> **Corpus-observed:** 119 of 120 workflows have a licence.
>
> **Design inference:** coverage is near-universal, so requiring it costs IWC authors almost nothing.

### fair-r1-person-creator
- **Principle:** R1.
- **Sources:**
  - Bioschemas lists `creator` as a minimum property.
  - WorkflowHub asks submitters to check the creators.
  - gxformat2 best-practices rule `WorkflowMissingCreator` and Galaxy's Best Practices panel check creator information.
  - No FAIR-IMPACT metric was identified for this item.
- **Galaxy interpretation and evidence:** at least one `creator` entry of class Person. Evidence: the `creator` field.
- **Check type:** deterministic.
- **Decided by:** the submission.
- **IWC overlap:** partial. The IWC review checks that the authors in `.dockstore.yml` match the creator metadata in the `.ga` file, but it does not ask for a Person creator.
- **Severity:** required.

> **Corpus-observed:** 104 of 120 workflows list at least one Person creator.
>
> **Design inference:** the workflows without a Person creator are the gap to close. This survey did not check how many of them list only an Organization.

### fair-f2-creator-orcid
- **Principle:** F2, R1.
- **Sources:**
  - WorkflowHub recommends ORCID identifiers for creators.
  - Galaxy's Best Practices panel does not check creator identifiers.
  - No FAIR-IMPACT metric was identified for this item.
- **Galaxy interpretation and evidence:** every Person creator has an ORCID identifier. Evidence: `creator[].identifier`.
- **Check type:** deterministic (shape only, no ORCID is resolved).
- **Decided by:** the submission.
- **IWC overlap:** the IWC review strongly encourages ORCIDs for authors and treats a missing one as an optional improvement, never as a blocking finding.
- **Severity:** recommended.

> **Corpus-observed:** 93 of 104 workflows with a Person creator have an ORCID on every Person.
>
> **Design inference:** with ORCIDs on every Person in 93 of 104 workflows, a recommendation fits better than a requirement for now.

### fair-i2-orcid-as-uri
- **Principle:** I2.
- **Sources:**
  - gxformat2 best-practices rule `CreatorIdentifierNotURI` flags creator identifiers that are not URIs.
  - FAIR-IMPACT metric FRSM-12 is mapped to I2 (D5.2). Whether it covers creator identifiers was not checked.
- **Galaxy interpretation and evidence:** creator identifiers are ORCID URIs (`https://orcid.org/…`), not bare numbers. Evidence: `creator[].identifier`.
- **Check type:** deterministic.
- **Decided by:** the submission.
- **IWC overlap:** none found.
- **Severity:** recommended.

> **Corpus-observed:** 70 of 104 workflows with a Person creator give every Person's ORCID as an `https://orcid.org/` URI. Of the 183 Person entries, 12 have no identifier and 39 use a bare ORCID iD. All figures are from [the IWC FAIR metadata survey](https://github.com/galaxyproject/foundry/pull/804) (draft PR #804).
>
> **Design inference:** bare iDs are the main reason URI coverage (67%) trails ORCID coverage (89%), and a lint rule would catch them cheaply.

### fair-f2-workflow-annotation
- **Principle:** F2.
- **Sources:**
  - Bioschemas lists `description` as a recommended property.
  - WorkflowHub asks submitters to check the description.
  - gxformat2 best-practices rule `WorkflowMissingAnnotation` and Galaxy's Best Practices panel check for a short description.
  - FAIR-IMPACT metrics FRSM-04 to FRSM-06 are mapped to F2 (D5.2). Which one covers descriptions was not checked.
- **Galaxy interpretation and evidence:** the workflow has a non-empty annotation. Evidence: the `annotation` field.
- **Check type:** deterministic for presence, judgement for quality.
- **Decided by:** the submission.
- **IWC overlap:** the IWC review asks for a short description of what the workflow does and the result it generates or analyzes, starting with wording such as "This workflow performs … to generate …".
- **Severity:** recommended.

### fair-f2-tags
- **Principle:** F2.
- **Sources:**
  - Bioschemas lists `keywords` as a recommended property.
  - gxformat2 and Galaxy's Best Practices panel do not check tags.
  - FAIR-IMPACT metrics FRSM-04 to FRSM-06 are mapped to F2 (D5.2). Which one covers keywords was not checked.
- **Galaxy interpretation and evidence:** the workflow has a non-empty `tags` list. Evidence: the `tags` field.
- **Check type:** deterministic.
- **Decided by:** the submission.
- **IWC overlap:** none found.
- **Severity:** recommended.

> **Corpus-observed:** 82 of 120 workflows have tags.
>
> **Design inference:** tags are the weakest workflow-level field in IWC, and Galaxy's Best Practices panel does not check them.

### fair-f2-input-annotations
- **Principle:** F2.
- **Sources:**
  - Galaxy's Best Practices panel checks that inputs are labelled and annotated.
  - Bioschemas describes `input` as a FormalParameter.
  - gxformat2 rule `StepMissingAnnotation`. Whether it covers input steps was not checked.
- **Galaxy interpretation and evidence:** every data and collection input has a non-empty annotation. Evidence: the `annotation` of each input step.
- **Check type:** deterministic for presence, judgement for quality.
- **Decided by:** the submission.
- **IWC overlap:** partial. The IWC review has no item for input annotations. It asks for human-readable input names and for the README to describe the valid inputs.
- **Severity:** recommended.

> **Corpus-observed:** 245 of 277 top-level inputs have an annotation (88%). Inputs inside embedded subworkflows are annotated less often. With them included, 314 of 432 (73%).
>
> **Design inference:** the headline depends on whether subworkflow inputs count. See the open questions.

### fair-f2-readme
- **Principle:** F2.
- **Sources:**
  - Workflow RO-Crate 1.0 says a `README.md` SHOULD be present.
  - Galaxy's Best Practices panel checks for a readme.
  - The planning issue states that gxformat2 drops the `readme` field on conversion to Format2. This was not verified here.
- **Galaxy interpretation and evidence:** a `README.md` sits next to the workflow, or the workflow's `readme` field is set. Evidence: the file next to the `.ga`, and the `readme` field.
- **Check type:** deterministic for presence, judgement for content.
- **Decided by:** the submission.
- **IWC overlap:** the IWC review requires a README that explains what the workflow does, describes valid inputs (including formats) and expected outputs, and links tutorials or related workflows where they exist.
- **Severity:** recommended.

### fair-i3-input-formats
- **Principle:** I3.
- **Sources:**
  - Bioschemas describes `input` as a FormalParameter.
  - Galaxy's Best Practices panel does not check input formats.
  - No FAIR-IMPACT metric is mapped to I3. Metrics FRSM-10 to FRSM-12 cover I1 and I2 (D5.2).
- **Galaxy interpretation and evidence:** each data input declares the datatype(s) it accepts. Evidence: `format` in the input step's `tool_state`.
- **Check type:** deterministic for presence, judgement for correctness.
- **Decided by:** the submission.
- **IWC overlap:** partial. The IWC review requires the README to describe valid inputs, including formats, in prose. It does not ask for formats to be declared in the input step.
- **Severity:** recommended. An unrestricted `data` input is legitimate Galaxy, so a requirement is not justified yet.

> **Corpus-observed:** 112 of 277 top-level inputs declare a format (single-file 79 of 170, collection 33 of 107). Missing formats concentrate in `VGP-assembly-v2` (34), `microbiome` (26) and `proteomics` (19). In `Assembly-Hifi-HiC-phasing-VGP4.ga` the five data inputs declare no machine-readable format while the `readme` field lists them in prose.
>
> **Design inference:** a checklist could ask for formats to be declared in the input step, not only described in the README. How many gaps are documented in prose only was not measured.

### fair-f4-registered-in-workflowhub
- **Principle:** F4.
- **Sources:**
  - F-UJI 4.0.1 (metrics v0.8) has a test for F4. FAIR-Checker has none ([#783](https://github.com/galaxyproject/foundry/issues/783)). Which F-UJI metric it is was not recorded there.
  - No Bioschemas, Workflow RO-Crate or FAIR-IMPACT source was identified for this item.
- **Galaxy interpretation and evidence:** the workflow is registered in a searchable registry, in practice its WorkflowHub entry. Evidence: the WorkflowHub entry and F-UJI's F4 result on it.
- **Check type:** deterministic once the entry exists, because F-UJI is run on it.
- **Decided by:** the publication route.
- **IWC overlap:** partial. The IWC review requires a `.dockstore.yml` in the workflow folder and a folder name suitable as the repository name in iwc-workflows and as part of the TRS ID. It does not check WorkflowHub registration.
- **Severity:** informational.

> **Design inference:** the item can cite F-UJI on the WorkflowHub entry, as the #783 summary concludes. A submission cannot show registration, so the Mold reports it from the publication route.

### fair-a1-retrievable-by-identifier
- **Principle:** A1.
- **Sources:**
  - F-UJI 4.0.1 (metrics v0.8) has a test for A1. FAIR-Checker has none ([#783](https://github.com/galaxyproject/foundry/issues/783)). Which F-UJI metric it is was not recorded there.
  - No Bioschemas, Workflow RO-Crate or FAIR-IMPACT source was identified for this item.
- **Galaxy interpretation and evidence:** the workflow can be retrieved from its registry by its identifier. Evidence: the WorkflowHub entry with its identifier, and F-UJI's A1 result on it.
- **Check type:** deterministic once the entry exists, because F-UJI is run on it.
- **Decided by:** the publication route.
- **IWC overlap:** partial. The IWC review requires a folder name suitable as part of the TRS ID. It does not check retrieval by identifier.
- **Severity:** informational.

> **Design inference:** like F4, the item can cite F-UJI on the WorkflowHub entry, and the Mold reports it from the publication route.

### fair-a2-metadata-persistence
- **Principle:** A2.
- **Sources:**
  - No assessor tests A2. FAIR-Checker and F-UJI have no test for it, and howfairis does not label its checks with FAIR principles ([#783](https://github.com/galaxyproject/foundry/issues/783)).
- **Galaxy interpretation and evidence:** the registry keeps a workflow's metadata after the workflow is withdrawn. This is a statement about the platform, not a check on the submission. Evidence: the registry's published policy, if it has one.
- **Check type:** judgement.
- **Decided by:** the publication route.
- **IWC overlap:** none found.
- **Severity:** informational.

> **Design inference:** the checklist records A2 as a platform statement. Whether WorkflowHub keeps metadata for withdrawn workflows was not verified here.

## 3. Assessor coverage

The table lists which principles the existing assessors have a test for, from [#783](https://github.com/galaxyproject/foundry/issues/783). It records whether a test exists, not a result. The tools were FAIR-Checker v1.3.5 and F-UJI 4.0.1 (metrics v0.8), run on three IWC workflows (COVID-19-PE-ARTIC-ILLUMINA, metagenomic-assembly and Plot-Nx-Size). This is an observation on three workflows, not on the pinned corpus.

| Principle | FAIR-Checker | F-UJI |
|---|---|---|
| F1: unique, persistent identifier | yes | yes |
| F2: rich descriptive metadata | yes | yes |
| F3: metadata includes the identifier | no | yes |
| F4: indexed or registered | no | yes |
| A1: retrievable by its identifier | no | yes |
| A1.1: open standard protocol | yes | yes |
| A1.2: supports authentication | yes | yes |
| A2: metadata kept when data is gone | no | no |
| I1: formal, machine-readable language | yes | yes |
| I2: shared vocabularies | yes | yes |
| I3: qualified references | yes | yes |
| R1: rich metadata about content | no | yes |
| R1.1: license | yes | yes |
| R1.2: provenance | yes | yes |
| R1.3: community standards | yes | yes |

howfairis is not in the table because its five checks are not labelled with FAIR principles.

## 4. Open questions

- **Subworkflow policy.** Should inputs inside embedded subworkflows count in the headline? The two views differ most for input annotations (88% against 73%).
- **Severity for IWC, IWC Lab and personal workflows.** The corpus only calibrates IWC.
- **Required versus recommended for input formats.** Are undeclared formats something to fix, or only to report?
- **I2 beyond the workflow file.** EDAM topics and operations live in tool metadata and are not covered here.

## 5. Principles not yet drafted

F1, F1.1, F1.2, F3, A1.1, A1.2, I1, I4, R1.2, R1.3, R2 and R3. Several can be marked as satisfied by the platform or the publication route, and the assessor table in section 3 shows which ones F-UJI or FAIR-Checker already test.

The port items (checks that a workflow converted from another system is at least as FAIR as its source) are also open. Galaxy's draft pull request [galaxyproject/galaxy#24839](https://github.com/galaxyproject/galaxy/pull/24839) adds an `is_based_on` workflow field that makes several of them checkable. It is not in a Galaxy release yet, and gxformat2 drops it on conversion to Format2.
