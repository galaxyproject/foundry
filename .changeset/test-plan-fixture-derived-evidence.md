---
"@galaxy-foundry/gxwf-foundry": minor
---

The Galaxy workflow test-plan schema accepts `evidence: fixture-derived` on an
assertion intent, for an expected value measured from upstream fixture bytes
when the source has no assertion to translate. `family` now documents the
output-attribute fields that sit beside `asserts:` (`element_count`, `count`,
`ftype`, `checksum`, `metadata`), and `element_identifier` documents
`/`-joined addresses for nested collections.
