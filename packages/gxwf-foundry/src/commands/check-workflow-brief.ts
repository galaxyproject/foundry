import { checkWorkflowBrief } from "../workflow-brief.js";
import { readMarkdownFile } from "./validate-markdown.js";

export interface WorkflowBriefCheckOptions {
  json?: boolean;
}

export function runCheckWorkflowBrief(path: string, options: WorkflowBriefCheckOptions): never {
  const result = checkWorkflowBrief(readMarkdownFile(path));
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    for (const error of result.errors)
      process.stderr.write(`  ${error.path}: ${error.message} (${error.keyword})\n`);
    for (const blocker of result.blockers)
      process.stderr.write(
        `  line ${blocker.line}: ${blocker.section} blockers\n${blocker.body}\n`,
      );
    const message = `${path}: ${!result.valid ? "invalid" : result.ready ? "ready" : "blocked"}\n`;
    (result.ready ? process.stdout : process.stderr).write(message);
  }
  process.exit(!result.valid ? 3 : result.ready ? 0 : 4);
}
