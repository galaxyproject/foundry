# Changes

## Revision 6 — 2026-09-16

Make the whole-pipeline Nextflow summary optional and load its schema only when
that artifact is supplied. Accept executable briefs from other sources and
standalone process evidence without imposing the whole-summary envelope.

Conditionally reuse existing nf-core channel, meta-map, datatype, and container
notes for source interpretation. Keep UDT emission/validation separate from the
XML-specific module conversion Mold, and report unsupported shapes rather than
copying XML examples into YAML.

Add source-independent and standalone-evidence evaluation properties, concrete
scenario inputs, and a regression check on the generated cast contract.
