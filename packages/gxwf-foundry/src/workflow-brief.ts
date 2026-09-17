import {
  parseMarkdownDocument,
  validateMarkdownDocument,
  type MarkdownDocument,
  type MarkdownSection,
  type MarkdownDocumentSchema,
} from "./markdown-document.js";

export const workflowBriefSchema: MarkdownDocumentSchema = {
  name: "Workflow Brief",
  title: "required",
  sections: [
    { heading: "Objective", min: 1, max: 1, content: true },
    { heading: "Sources", min: 1, max: 1, content: true },
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
    { heading: "Inputs and outputs", min: 1, max: 1, content: true },
    { heading: "Constraints", min: 1, max: 1, content: true },
    {
      heading: "Environment",
      min: 1,
      max: 1,
      content: true,
      sections: [
        { heading: "Authoring", min: 1, max: 1, content: true },
        { heading: "Execution", min: 1, max: 1, content: true },
      ],
    },
    { heading: "Acceptance criteria", min: 1, max: 1, content: true },
    { heading: "Open questions", min: 1, max: 1, content: true },
    { heading: "Decisions and learning", max: 1, content: true },
    { heading: "Related artifacts", max: 1, content: true },
  ],
};

export type WorkflowBriefSection = MarkdownSection;
export type WorkflowBrief = MarkdownDocument;
export const parseWorkflowBrief = parseMarkdownDocument;
export const validateWorkflowBrief = (data: unknown) =>
  validateMarkdownDocument(data, workflowBriefSchema);
