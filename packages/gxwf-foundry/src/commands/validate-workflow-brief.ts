import { validateWorkflowBrief, workflowBriefSchema } from "../workflow-brief.js";
import { runValidateMarkdownFile } from "./validate-markdown.js";

export const workflowBriefValidator = { validate: validateWorkflowBrief };

export function runValidateWorkflowBrief(path: string): never {
  return runValidateMarkdownFile(path, workflowBriefSchema);
}
