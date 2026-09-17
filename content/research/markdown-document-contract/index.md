---
type: research
title: "Markdown Document Contract"
tags:
  - meta
status: draft
created: 2026-09-17
revised: 2026-09-17
revision: 1
summary: "Declarative Markdown section schemas and a shared parser for Foundry build checks and runtime artifact validation."
---

# Markdown Document Contract

A Markdown document schema declares the sections a document must contain while leaving its prose editable. The same declaration and validator can check authored content during a build and agent-produced artifacts at runtime.

The contract types and parser live in `packages/gxwf-foundry/src/markdown-document.ts`. Built-in schemas live in `markdown-document-schemas.ts` and `workflow-brief.ts`. All are exported by `@galaxy-foundry/gxwf-foundry`.

## Schema declaration

```ts
import {
  validateMarkdownDocument,
  type MarkdownDocumentSchema,
} from "@galaxy-foundry/gxwf-foundry";

const schema: MarkdownDocumentSchema = {
  name: "Analysis brief",
  title: "required",
  sections: [
    {
      heading: "Scope",
      min: 1,
      max: 1,
      content: true,
      sections: [
        { heading: "Included", min: 1, max: 1, content: true },
        { heading: "Excluded", min: 1, max: 1, content: true },
      ],
    },
    { heading: "Decision:", match: "prefix", requireSuffix: true, min: 1 },
    { heading: "Case:", match: "prefix", max: 0 },
  ],
};

const result = validateMarkdownDocument(markdown, schema);
```

Declarations are plain data that can be serialized as JSON. They are section contracts rather than JSON Schema applied to a Markdown string. The library accepts custom declarations; the CLI currently selects built-in schemas by name.

| Field | Meaning |
| --- | --- |
| `name` | Human-readable document kind for diagnostics. |
| `title: "required"` | Exactly one nonempty level-one title, before all other document headings. Omission leaves titles unconstrained. |
| `caseSensitive` | Heading comparisons are case-insensitive by default. Whitespace is normalized. |
| `sections` | Root rules match level-two headings; nested rules match the next heading level inside each matched parent. |
| `heading`, `match` | Exact text by default, a text `prefix`, or a `word-prefix` that stops at a word boundary. |
| `requireSuffix` | A prefix rule needs text after its prefix, such as a scenario name after `Case:`. |
| `min`, `max` | Matching section count within the current parent. Omitted `min` means zero; omitted `max` allows repetition; `max: 0` forbids a heading. |
| `content` | Require content beyond headings, separators, and HTML comments. Descendant section content counts toward the parent. |
| `messages` | Optional `missing` and `excess` diagnostic wording for a document kind. |

Additional headings and arbitrary section order are allowed. Optional sections with `content: true` must contain content if present. Every matched parent is checked independently; a child under a different parent cannot satisfy its requirements. This first declaration format leaves section ordering and rejection of unknown headings open for later design.

## Parser and diagnostics

The parser uses the Markdown syntax tree. Fenced examples, quoted headings, headings in lists, and HTML comments cannot satisfy document section rules. Both ATX and setext document headings count at their actual level.

`parseMarkdownDocument(markdown)` returns a title and sections with heading text, source line numbers, preserved Markdown bodies, and child sections. Section bodies stop at the next document heading of equal or lower depth. Child sections remain inside their parent; rules do not infer missing heading levels.

`validateMarkdownDocument(markdown, schema)` returns `{ valid, errors }`. Each diagnostic includes a document or line path, a message, a keyword identifying the failed rule, and parameters such as the expected heading and section count. The caller decides whether failures are warnings or errors.

## Build and runtime use

Foundry's build validator uses the shared schemas for CLI command sections, eval `Property:`/forbidden `Case:` sections, and named scenario `Case:` sections. Existing section messages and advisory severity are retained. Scenario case extraction uses the same parser. Fixture binding and resolution, eval check modality, frontmatter, and companion layout remain separate domain checks.

```sh
foundry validate-markdown cli-command content/cli/foundry/validate-markdown.md
foundry validate-markdown eval content/molds/implement-galaxy-tool-step/eval.md
foundry validate-markdown workflow-brief workflow-brief.md
```

The [[workflow-brief-design]] contract uses the same engine for required sections, uniqueness, content, and Scope/Environment children. `foundry validate-workflow-brief` is a convenience command using that schema.

Structural validity establishes document shape. It does not establish semantic completeness, expert review, stage readiness, or successful runtime preflight.
