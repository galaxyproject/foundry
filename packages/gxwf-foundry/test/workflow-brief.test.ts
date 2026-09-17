import { readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { workflowBriefValidator } from "../src/commands/validate-workflow-brief.js";
import { parseWorkflowBrief, workflowBriefSchema } from "../src/workflow-brief.js";

const fixture = resolve(__dirname, "fixtures/workflow-brief/read-alignment.md");
const loadBrief = () => readFileSync(fixture, "utf8");

describe("Markdown Workflow Brief", () => {
  it("accepts a prose brief with explicit unknowns and parses sections without losing their text", () => {
    const markdown = loadBrief();
    expect(workflowBriefValidator.validate(markdown)).toEqual({ valid: true, errors: [] });
    const parsed = parseWorkflowBrief(markdown);
    expect(parsed.title).toBe("Workflow Brief: Read alignment subset");
    expect(
      parsed.sections
        .find((section) => section.heading === "Workflow")
        ?.sections.find((section) => section.heading === "Requirements and preferences")?.body,
    ).toContain("Preserve sample identifiers");
    expect(
      parsed.sections
        .find((section) => section.heading === "Agent Environment")
        ?.sections.map((section) => section.heading),
    ).toEqual(["Tooling", "Constraints", "Containerization", "Blockers"]);
  });

  it.each(workflowBriefSchema.sections.filter((section) => (section.min ?? 0) > 0))(
    "requires $heading",
    ({ heading }) => {
      const markdown = loadBrief().replace(`## ${heading}\n`, `## Other ${heading}\n`);
      expect(workflowBriefValidator.validate(markdown).errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            keyword: "required-section",
            message: expect.stringContaining(heading),
          }),
        ]),
      );
    },
  );

  it("requires the objective and content in recognized optional subsections", () => {
    const markdown = loadBrief()
      .replace("### Objective", "### Other objective")
      .replace(
        /### Requirements and preferences[\s\S]*?(?=### Acceptance criteria)/,
        "### Requirements and preferences\n\n<!-- fill later -->\n\n",
      );
    expect(workflowBriefValidator.validate(markdown).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "required-section",
          message: expect.stringContaining("Objective"),
        }),
        expect.objectContaining({
          keyword: "section-content",
          message: expect.stringContaining("Requirements and preferences"),
        }),
      ]),
    );
  });

  it.each(
    workflowBriefSchema.sections.flatMap(
      (parent) =>
        parent.sections
          ?.filter((section) => !section.min)
          .map((section) => ({ parent: parent.heading, heading: section.heading })) ?? [],
    ),
  )("permits omitted $parent/$heading", ({ heading }) => {
    expect(
      workflowBriefValidator.validate(
        loadBrief().replace(`### ${heading}\n`, `### Other ${heading}\n`),
      ).valid,
    ).toBe(true);
  });

  it("rejects duplicate sections and reports their line numbers", () => {
    const result = workflowBriefValidator.validate(
      loadBrief().replace("### Scope", "### Scope\n\nRepeated scope.\n\n### Scope"),
    );
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "duplicate-section",
          path: expect.stringMatching(/^line \d+/),
        }),
      ]),
    );
  });

  it("keeps the final subsection inside its parent and detects empty optional content", () => {
    const parsed = parseWorkflowBrief(loadBrief());
    const requirements = parsed.sections
      .find((section) => section.heading === "Workflow")
      ?.sections.find((section) => section.heading === "Requirements and preferences");
    expect(requirements?.body).not.toContain("Acceptance criteria");
    const markdown = loadBrief().replace(
      /### Containerization[\s\S]*?(?=### Blockers)/,
      "### Containerization\n\n",
    );
    expect(workflowBriefValidator.validate(markdown).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "section-content",
          message: expect.stringContaining("Containerization"),
        }),
      ]),
    );
  });

  it("does not mistake fenced, quoted, or commented headings for document sections", () => {
    const markdown =
      loadBrief().replace("### Objective\n", "### Other objective\n") +
      "\n```markdown\n### Objective\nExample only.\n```\n\n> ### Objective\n> Quoted only.\n\n<!--\n### Objective\nComment only.\n-->\n";
    expect(workflowBriefValidator.validate(markdown).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "required-section",
          message: expect.stringContaining("Objective"),
        }),
      ]),
    );
  });

  it("allows extra sections, arbitrary prose and tables, reordered sections, and case variation", () => {
    const markdown =
      loadBrief().replace("### Objective", "### OBJECTIVE") +
      "\n## Additional context\n\n| Detail | Value |\n| --- | --- |\n| Note | More context |\n";
    expect(workflowBriefValidator.validate(markdown).valid).toBe(true);
    const parsed = parseWorkflowBrief(markdown);
    const reordered =
      `# ${parsed.title}\n\n` +
      parsed.sections
        .slice()
        .reverse()
        .map((section) => `## ${section.heading}\n\n${section.body}`)
        .join("\n\n");
    expect(workflowBriefValidator.validate(reordered).valid).toBe(true);
  });

  it("requires one document title, rejects non-text input, and permits omitted optional sections", () => {
    expect(workflowBriefValidator.validate(loadBrief().replace(/^# .*\n/, "")).valid).toBe(false);
    expect(workflowBriefValidator.validate(loadBrief() + "\n# Another title\n").valid).toBe(false);
    expect(workflowBriefValidator.validate({ scope: {} }).valid).toBe(false);
    expect(
      workflowBriefValidator.validate(
        "# Brief\n\n## Workflow\n\n### Objective\n\nAnalyze the data.\n\n## Agent Environment\n\nPreflight pending.\n",
      ).valid,
    ).toBe(true);
  });
});

describe("validate-workflow-brief CLI", () => {
  const run = (path: string) =>
    spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        resolve(__dirname, "../src/bin/foundry.ts"),
        "validate-workflow-brief",
        path,
      ],
      { encoding: "utf8" },
    );
  it("validates Markdown and reports section and input failures", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "workflow-brief-cli-"));
    try {
      const valid = run(fixture);
      expect(valid.status).toBe(0);
      expect(valid.stdout).toContain(": valid");
      expect(valid.stderr).toBe("");
      const invalid = resolve(dir, "invalid.md");
      writeFileSync(invalid, "# Brief\n\n## Scope\n\nSome scope.\n");
      const failed = run(invalid);
      expect(failed.status).toBe(3);
      expect(failed.stdout).toBe("");
      expect(failed.stderr).toContain("required-section");
      expect(run(resolve(dir, "absent.md")).status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
