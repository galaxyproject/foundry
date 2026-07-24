---
type: research
title: "Galaxy tool XML schema"
tags:
  - research/component
  - target/galaxy
status: draft
created: 2026-05-03
revised: 2026-05-05
revision: 1
ai_generated: false
related_notes:
  - "[[galaxy-collection-semantics]]"
sources:
  - "https://github.com/galaxyproject/galaxy/blob/7765fae934fbfdee77e3be5f5b235e43735273ae/lib/galaxy/tool_util/xsd/galaxy.xsd"
summary: "Vendored Galaxy tool XML schema for wrapper structure, parameters, outputs, tests, and assertion syntax."
---

> **Vendored from upstream**, pinned at SHA `7765fae`. One file lives next to this note:
>
> - `galaxy.xsd` — the structured source. **Agents and casting should consume this** when authoring or validating Galaxy tool wrapper XML, tool tests, output assertions, macros, inputs, outputs, help, citations, and configfile blocks. Sync is manual.
>
> **When to consult:** authoring or validating `tool.xml` wrappers, translating tool parameters into Galaxy XML, defining outputs or discovered datasets, writing wrapper tests, or choosing valid Galaxy assertion elements and attributes. Do not use this for [[author-galaxy-tool-wrapper]], which emits UDT YAML.
