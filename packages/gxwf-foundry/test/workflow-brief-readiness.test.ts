import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkWorkflowBrief, validateWorkflowBrief } from "../src/workflow-brief.js";

const minimal =
  "# Brief\n\n## Workflow\n\n### Objective\n\nPreserve sample identity.\n\n## Agent Environment\n\nProbe before implementation.\n";

describe("Workflow Brief readiness", () => {
  it("permits omitted details and empty or comment-only blockers", () => {
    expect(checkWorkflowBrief(minimal)).toEqual({
      valid: true,
      ready: true,
      errors: [],
      blockers: [],
    });
    expect(
      checkWorkflowBrief(minimal + "\n### Blockers\n\n<!-- no blockers -->\n\n---\n").ready,
    ).toBe(true);
  });

  it("reports nonempty blockers independently under both parent sections", () => {
    const blocked =
      minimal.replace(
        "## Agent Environment",
        "### Blockers\n\n- Select the analysis.\n\n## Agent Environment",
      ) + "\n### Blockers\n\n- Docker is unavailable.\n";
    expect(validateWorkflowBrief(blocked).valid).toBe(true);
    const result = checkWorkflowBrief(blocked);
    expect(result.ready).toBe(false);
    expect(result.blockers.map((blocker) => blocker.section)).toEqual([
      "Workflow",
      "Agent Environment",
    ]);
    expect(result.blockers[0]).toEqual(
      expect.objectContaining({ body: "- Select the analysis.", line: expect.any(Number) }),
    );
  });

  it("treats all text in Blockers as blocking, including 'none', and permits ordinary open questions", () => {
    expect(checkWorkflowBrief(minimal + "\n### Blockers\n\nNone.\n").ready).toBe(false);
    expect(
      checkWorkflowBrief(
        minimal.replace(
          "## Agent Environment",
          "### Open questions\n\nAn optional report style.\n\n## Agent Environment",
        ),
      ).ready,
    ).toBe(true);
  });

  it("ignores example headings and does not borrow a blocker body from a later section", () => {
    expect(
      checkWorkflowBrief(
        minimal + "\n```md\n### Blockers\n\nStop.\n```\n\n> ### Blockers\n> Stop.\n",
      ).ready,
    ).toBe(true);
    expect(
      checkWorkflowBrief(minimal + "\n### Blockers\n\n### Tooling\n\nFoundry available.\n").ready,
    ).toBe(true);
    expect(checkWorkflowBrief(minimal + "\n### BLOCKERS\n\n- Cannot continue.\n").ready).toBe(
      false,
    );
  });

  it("requires valid structure before readiness and does not modify its input", () => {
    expect(checkWorkflowBrief("# Incomplete\n").ready).toBe(false);
    expect(checkWorkflowBrief({})).toEqual(
      expect.objectContaining({ valid: false, ready: false, blockers: [] }),
    );
  });

  it("checks the file through the CLI, produces JSON, and preserves input bytes", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "brief-check-"));
    const file = resolve(dir, "brief.md");
    const run = (...args: string[]) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          resolve(__dirname, "../src/bin/foundry.ts"),
          "check-workflow-brief",
          ...args,
        ],
        { encoding: "utf8" },
      );
    try {
      writeFileSync(file, minimal);
      expect(run(file).status).toBe(0);
      expect(JSON.parse(run(file, "--json").stdout)).toEqual(checkWorkflowBrief(minimal));
      const blocked = minimal + "\n### Blockers\n\n- Missing planemo.\n";
      writeFileSync(file, blocked);
      const result = run(file, "--json");
      expect(result.status).toBe(4);
      expect(JSON.parse(result.stdout)).toEqual(checkWorkflowBrief(blocked));
      expect(run(file).stderr).toContain("Agent Environment");
      expect(readFileSync(file, "utf8")).toBe(blocked);
      writeFileSync(file, "# Incomplete\n");
      expect(run(file, "--json").status).toBe(3);
      expect(run(resolve(dir, "missing.md")).status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
