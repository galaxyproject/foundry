import { readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { workflowBriefValidator } from "../src/commands/validate-workflow-brief.js";
import type { WorkflowBrief } from "../src/schemas/workflow-brief/workflow-brief.types.generated.js";

const fixture = resolve(__dirname, "fixtures/workflow-brief/read-alignment.yml");
const loadBrief = (): WorkflowBrief => YAML.parse(readFileSync(fixture, "utf8"));

describe("workflow brief validation", () => {
  it("keeps generated declarations and the runtime wrapper in sync with the canonical schema", async () => {
    expect(() =>
      execFileSync(process.execPath, [
        resolve(__dirname, "../scripts/generate-workflow-brief-types.mjs"),
        "--check",
      ]),
    ).not.toThrow();
    const { workflowBriefSchema } =
      await import("../src/schemas/workflow-brief/workflow-brief.schema.generated.js");
    expect(workflowBriefSchema).toEqual(
      JSON.parse(
        readFileSync(
          resolve(__dirname, "../src/schemas/workflow-brief/workflow-brief.schema.json"),
          "utf8",
        ),
      ),
    );
  });
  it("accepts a draft with explicit unknowns and unresolved execution questions", () => {
    expect(workflowBriefValidator.validate(loadBrief())).toEqual({ valid: true, errors: [] });
  });

  it("requires scope and rejects an unknown nested constraint field", () => {
    const missing = loadBrief() as Partial<WorkflowBrief>;
    delete missing.scope;
    expect(workflowBriefValidator.validate(missing).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "required", params: { missingProperty: "scope" } }),
      ]),
    );
    const brief = loadBrief();
    Object.assign(brief.constraints[0]!, { silently_optional: true });
    expect(workflowBriefValidator.validate(brief).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/constraints/0", keyword: "additionalProperties" }),
      ]),
    );
  });

  it("rejects invalid execution policy, empty acceptance, and numeric schema versions", () => {
    const brief = loadBrief();
    Object.assign(brief.environment.execution, { container_policy: "maybe" });
    brief.acceptance = [];
    Object.assign(brief, { brief_version: 1 });
    const result = workflowBriefValidator.validate(brief);
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining([
        "/environment/execution/container_policy",
        "/acceptance",
        "/brief_version",
      ]),
    );
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

  it("validates YAML and JSON and reports schema/parse/input failures", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "workflow-brief-cli-"));
    try {
      const valid = run(fixture);
      expect(valid.status).toBe(0);
      expect(valid.stdout).toContain(": valid");
      expect(valid.stderr).toBe("");
      const json = resolve(dir, "brief.json");
      writeFileSync(json, JSON.stringify(loadBrief()));
      expect(run(json).status).toBe(0);
      const invalid = resolve(dir, "invalid.yml");
      writeFileSync(invalid, "scope: {}\n");
      const failed = run(invalid);
      expect(failed.status).toBe(3);
      expect(failed.stdout).toBe("");
      expect(failed.stderr).toContain("required");
      writeFileSync(invalid, "scope: [\n");
      expect(run(invalid).status).toBe(1);
      expect(run(resolve(dir, "absent.yml")).status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
