# nextflow-test-to-cwl-test-plan eval

This file is the **abstract oracle** for `nextflow-test-to-cwl-test-plan`:
properties any run must satisfy, independent of fixture. Concrete fixtures and
their expected values live in `scenarios.md`; the oracle here is applied to
whatever a scenario produces.

## Property: output is a plan, not final test artifacts, with provenance per description

- bucket: utility
- check: llm-judged
- assertion: the output describes a CWL workflow test plan, not concrete CWL job
  files or final assertion artifacts. Every test description carries provenance
  and evidence for its inputs, expected outputs, assertion intent, tolerances,
  and omissions.
