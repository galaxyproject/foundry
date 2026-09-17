import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { validateMarkdownDocument, type MarkdownDocumentSchema } from "../src/markdown-document.js";
import { markdownDocumentSchemas } from "../src/markdown-document-schemas.js";

describe("declarative Markdown document schemas", () => {
  const schema: MarkdownDocumentSchema = {
    name: "Example",
    title: "required",
    sections: [
      {
        heading: "Scope",
        min: 1,
        max: 1,
        content: true,
        sections: [{ heading: "Included", min: 1, max: 1, content: true }],
      },
    ],
  };

  it("supports serialized declarations and scopes children to each matching parent", () => {
    const serialized = JSON.parse(JSON.stringify(schema)) as MarkdownDocumentSchema;
    expect(
      validateMarkdownDocument("# Example\n\n## Scope\n\n### Included\n\nA.\n", serialized).valid,
    ).toBe(true);
    const result = validateMarkdownDocument(
      "# Example\n\n## Scope\n\nA.\n\n## Other\n\n### Included\n\nB.\n",
      schema,
    );
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "required-section", message: "Missing ### Included" }),
      ]),
    );
  });

  it("requires children in every repeated section and reports excess sections", () => {
    const result = validateMarkdownDocument(
      "# Example\n\n## Scope\n\n### Included\n\nA.\n\n## Scope\n\nB.\n",
      schema,
    );
    expect(result.errors.map((error) => error.keyword)).toEqual([
      "duplicate-section",
      "required-section",
    ]);
    expect(result.errors[1].path).toMatch(/^line \d+$/);
  });

  it("accepts repeatable properties and forbids concrete eval cases", () => {
    expect(
      validateMarkdownDocument(
        "## Property: one\n\nA.\n\n## Property: two\n\nB.\n",
        markdownDocumentSchemas.eval,
      ).valid,
    ).toBe(true);
    const result = validateMarkdownDocument(
      "## Property: one\n\nA.\n\n## Case: concrete\n\nB.\n",
      markdownDocumentSchemas.eval,
    );
    expect(result.errors).toEqual([
      expect.objectContaining({ keyword: "forbidden-section", path: "line 5" }),
    ]);
  });

  it.each([
    "```md\n## Case: fake\n```",
    "> ## Case: fake",
    "<!--\n## Case: fake\n-->",
    "## Case:\n\nNo name.",
    "### Case: wrong level\n\nA.",
  ])("does not accept a scenario section from %s", (markdown) => {
    expect(validateMarkdownDocument(markdown, markdownDocumentSchemas.scenarios).valid).toBe(false);
  });

  it("preserves CLI heading prefix and case rules without accepting unrelated words", () => {
    expect(
      validateMarkdownDocument(
        "## Output details\n\n## Examples\n\n## Gotchas\n",
        markdownDocumentSchemas["cli-command"],
      ).valid,
    ).toBe(true);
    expect(
      validateMarkdownDocument(
        "## Outputs\n\n## examples\n\n## Gotchas\n",
        markdownDocumentSchemas["cli-command"],
      ).errors,
    ).toHaveLength(2);
  });
});

it("validates named schemas at runtime and reports schema, document, and input errors", () => {
  const dir = mkdtempSync(resolve(tmpdir(), "markdown-schema-cli-"));
  const run = (schema: string, file: string) =>
    spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        resolve(__dirname, "../src/bin/foundry.ts"),
        "validate-markdown",
        schema,
        file,
      ],
      { encoding: "utf8" },
    );
  try {
    const file = resolve(dir, "eval.md");
    writeFileSync(file, "# Eval\n\n## Property: sample identity\n\nMust preserve IDs.\n");
    expect(run("eval", file).status).toBe(0);
    const invalid = run("scenarios", file);
    expect(invalid.status).toBe(3);
    expect(invalid.stderr).toContain("required-section");
    const unknown = run("absent-schema", file);
    expect(unknown.status).toBe(1);
    expect(unknown.stderr).toContain("unknown Markdown schema");
    expect(run("eval", resolve(dir, "absent.md")).status).toBe(1);
    expect(
      run("workflow-brief", resolve(__dirname, "fixtures/workflow-brief/read-alignment.md")).status,
    ).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 30_000);
