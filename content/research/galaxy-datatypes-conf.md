---
type: research
subtype: component
title: "Galaxy datatypes registry sample"
tags:
  - research/component
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-06
revision: 2
ai_generated: false
related_notes:
  - "[[galaxy-xsd]]"
  - "[[galaxy-collection-semantics]]"
  - "[[nextflow-path-glob-to-galaxy-datatype]]"
  - "[[nextflow-to-galaxy-reference-data-mapping]]"
sources:
  - "https://github.com/galaxyproject/galaxy/blob/7765fae934fbfdee77e3be5f5b235e43735273ae/config/datatypes_conf.xml.sample"
summary: "Vendored Galaxy datatypes registry sample: extension → datatype class mapping, sniff order, converters, and display applications."
---

> **Vendored from upstream**, pinned at SHA `7765fae`. One file lives next to this note:
>
> - `datatypes_conf.xml.sample` — the structured source. **Agents and casting should consume this** when reasoning about the canonical extension set, datatype subclassing, MIME types, auto-decompression (`auto_compressed_types`), per-extension converters, and the global `<sniffer>` order. Sync is manual.
>
> **When to consult:** picking valid `format=` values for tool wrappers (see [[galaxy-xsd]]), choosing output extensions in Molds, mapping Nextflow file types onto Galaxy datatypes, or reasoning about sniff-order ambiguity between related text/tabular formats.
