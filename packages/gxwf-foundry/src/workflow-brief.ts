import {
  hasMarkdownContent,
  parseMarkdownDocument,
  validateMarkdownDocument,
  type MarkdownDocument,
  type MarkdownSection,
  type MarkdownDocumentSchema,
} from "./markdown-document.js";
import type { SchemaValidationResult } from "./lib/validator.js";

export const workflowBriefSchema: MarkdownDocumentSchema = {
  name: "Workflow Brief",
  title: "required",
  sections: [
    {
      heading: "Workflow",
      min: 1,
      max: 1,
      content: true,
      sections: [
        { heading: "Objective", min: 1, max: 1, content: true },
        { heading: "Sources", max: 1, content: true },
        {
          heading: "Scope",
          max: 1,
          content: true,
          sections: [
            { heading: "Included", max: 1, content: true },
            { heading: "Excluded", max: 1, content: true },
          ],
        },
        { heading: "Inputs and outputs", max: 1, content: true },
        { heading: "Requirements and preferences", max: 1, content: true },
        { heading: "Acceptance criteria", max: 1, content: true },
        { heading: "Open questions", max: 1, content: true },
        { heading: "Decisions", max: 1, content: true },
        { heading: "Related artifacts", max: 1, content: true },
        { heading: "Blockers", max: 1 },
      ],
    },
    {
      heading: "Agent Environment",
      min: 1,
      max: 1,
      content: true,
      sections: [
        { heading: "Tooling", max: 1, content: true },
        { heading: "Constraints", max: 1, content: true },
        { heading: "Containerization", max: 1, content: true },
        { heading: "Blockers", max: 1 },
      ],
    },
  ],
};

export type WorkflowBriefSection = MarkdownSection;
export type WorkflowBrief = MarkdownDocument;
export interface WorkflowBriefBlocker {
  section: "Workflow" | "Agent Environment";
  line: number;
  body: string;
}
export interface WorkflowBriefReadinessResult extends SchemaValidationResult {
  ready: boolean;
  blockers: WorkflowBriefBlocker[];
}

export const parseWorkflowBrief = parseMarkdownDocument;
export const validateWorkflowBrief = (data: unknown) =>
  validateMarkdownDocument(data, workflowBriefSchema);

export function checkWorkflowBrief(data: unknown): WorkflowBriefReadinessResult {
  const validation = validateWorkflowBrief(data);
  const blockers: WorkflowBriefBlocker[] = [];
  if (typeof data === "string") {
    for (const section of parseWorkflowBrief(data).sections) {
      const name = section.heading.trim().replace(/\s+/g, " ").toLowerCase();
      if (name !== "workflow" && name !== "agent environment") continue;
      for (const child of section.sections) {
        if (child.heading.trim().toLowerCase() === "blockers" && hasMarkdownContent(child.body)) {
          blockers.push({
            section: name === "workflow" ? "Workflow" : "Agent Environment",
            line: child.line,
            body: child.body,
          });
        }
      }
    }
  }
  return { ...validation, ready: validation.valid && blockers.length === 0, blockers };
}
