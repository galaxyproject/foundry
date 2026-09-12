# Changelog

## [0.1] - 2026-09-12

### Added

- First release. Runs FastQC on one short-read sequencing dataset and aggregates the
  result into a single MultiQC report, promoted as the `MultiQC Report` output.
- Workflow test asserting the report's General Statistics table, with its input staged
  from a durable Zenodo record rather than a local copy.
