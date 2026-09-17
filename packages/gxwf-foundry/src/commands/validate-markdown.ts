import { readFileSync } from "node:fs";
import { validateMarkdownDocument, type MarkdownDocumentSchema } from "../markdown-document.js";
import { markdownDocumentSchemas } from "../markdown-document-schemas.js";

export function runValidateMarkdown(name: string, path: string): never {
  const entry = Object.entries(markdownDocumentSchemas).find(([key]) => key === name);
  if (!entry) {
    process.stderr.write(
      `unknown Markdown schema: ${name}; choose ${Object.keys(markdownDocumentSchemas).join(", ")}\n`,
    );
    process.exit(1);
  }
  return runValidateMarkdownFile(path, entry[1]);
}

export function runValidateMarkdownFile(path: string, schema: MarkdownDocumentSchema): never {
  let markdown: string;
  try {
    markdown = readFileSync(path, "utf8");
  } catch (error) {
    process.stderr.write(
      `error reading ${path}: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
  const result = validateMarkdownDocument(markdown, schema);
  if (result.valid) {
    process.stdout.write(`${path}: valid\n`);
    process.exit(0);
  }
  for (const error of result.errors)
    process.stderr.write(`  ${error.path}: ${error.message} (${error.keyword})\n`);
  process.stderr.write(`${path}: ${result.errors.length} error(s)\n`);
  process.exit(3);
}
