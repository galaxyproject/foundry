import type { MarkdownDocumentSchema } from "./markdown-document.js";
import { workflowBriefSchema } from "./workflow-brief.js";

export const cliCommandMarkdownSchema: MarkdownDocumentSchema = {
  name: "CLI command",
  caseSensitive: true,
  sections: ["Output", "Examples", "Gotchas"].map((heading) => ({
    heading,
    match: "word-prefix",
    min: 1,
    messages: { missing: `cli-command should include ## ${heading}` },
  })),
};

export const evalMarkdownSchema: MarkdownDocumentSchema = {
  name: "Eval",
  caseSensitive: true,
  sections: [
    {
      heading: "Property:",
      match: "prefix",
      min: 1,
      messages: { missing: "eval.md should declare at least one '## Property:' section" },
    },
    {
      heading: "Case:",
      match: "prefix",
      max: 0,
      messages: {
        excess:
          "eval.md should not use '## Case:' sections — concrete cases belong in scenarios.md",
      },
    },
  ],
};

export const scenariosMarkdownSchema: MarkdownDocumentSchema = {
  name: "Scenarios",
  caseSensitive: true,
  sections: [
    {
      heading: "Case:",
      match: "prefix",
      requireSuffix: true,
      min: 1,
      messages: { missing: "scenarios.md should declare at least one '## Case:' section" },
    },
  ],
};

export const markdownDocumentSchemas = {
  "cli-command": cliCommandMarkdownSchema,
  eval: evalMarkdownSchema,
  scenarios: scenariosMarkdownSchema,
  "workflow-brief": workflowBriefSchema,
} as const;

export type MarkdownDocumentSchemaName = keyof typeof markdownDocumentSchemas;
