import { readFileSync } from "node:fs";
import { validateWorkflowBrief } from "../workflow-brief.js";

export const workflowBriefValidator = { validate: validateWorkflowBrief };

export function runValidateWorkflowBrief(path: string): never {
  let markdown: string;
  try {
    markdown = readFileSync(path, "utf8");
  } catch (error) {
    process.stderr.write(
      `error reading ${path}: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
  const result = validateWorkflowBrief(markdown);
  if (result.valid) {
    process.stdout.write(`${path}: valid\n`);
    process.exit(0);
  }
  for (const error of result.errors)
    process.stderr.write(`  ${error.path}: ${error.message} (${error.keyword})\n`);
  process.stderr.write(`${path}: ${result.errors.length} error(s)\n`);
  process.exit(3);
}
