import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runProcessValidation } from "../packages/build-cli/src/commands/validate-artifact.js";
import type { VerifyManifest } from "../packages/build-cli/src/commands/cast-mold.js";

const root = path.resolve(__dirname, "..");
const bin = path.join(root, "packages/gxwf-foundry/src/bin/foundry.ts");
const clear = path.join(
  root,
  "content/molds/freeform-summary-to-workflow-brief/examples/interview/workflow-brief.md",
);
const blocked = path.join(
  root,
  "content/molds/freeform-summary-to-workflow-brief/examples/blocked/workflow-brief.md",
);

function briefValidator(mold: string, direction: "input" | "output") {
  const manifest = JSON.parse(
    readFileSync(path.join(root, "casts/claude/skills", mold, "_verify.json"), "utf8"),
  ) as VerifyManifest;
  const entry = manifest.entries.find(
    (entry) => entry.artifact_id === "workflow-brief" && entry.direction === direction,
  );
  if (!entry) throw new Error(`${mold}: no Workflow Brief ${direction} validator`);
  expect(entry.validator_bin).toBe("foundry");
  return {
    ...entry,
    validator_bin: process.execPath,
    args: ["--import", "tsx", bin, ...entry.args],
  };
}

describe("Workflow Brief pipeline artifact validation", () => {
  it.each(["freeform-summary-to-workflow-brief", "nextflow-summary-to-workflow-brief"])(
    "validates a blocked brief as a reviewable output of %s",
    (mold) => {
      const before = readFileSync(blocked);
      const result = runProcessValidation(briefValidator(mold, "output"), blocked, root);
      expect(result.status).toBe("passed");
      expect(result.exit_code).toBe(0);
      expect(result.artifact_hash).toBe(createHash("sha256").update(before).digest("hex"));
      expect(readFileSync(blocked)).toEqual(before);
    },
  );

  it("separates input structure from the implementation blocker gate", () => {
    const entry = briefValidator("workflow-brief-to-galaxy-interface", "input");
    expect(runProcessValidation(entry, blocked, root).status).toBe("passed");
    const gate = {
      ...entry,
      args: ["--import", "tsx", bin, "check-workflow-brief", "{artifact_path}", "--json"],
    };
    const before = readFileSync(blocked);
    const result = runProcessValidation(gate, blocked, root);
    expect(result.status).toBe("failed");
    expect(result.exit_code).toBe(4);
    expect(
      JSON.parse(result.stdout).blockers.map((blocker: { section: string }) => blocker.section),
    ).toEqual(["Workflow", "Agent Environment"]);
    expect(readFileSync(blocked)).toEqual(before);
    const clearResult = runProcessValidation(gate, clear, root);
    expect(clearResult.status).toBe("passed");
    expect(JSON.parse(clearResult.stdout).ready).toBe(true);
  });

  it("rejects an incomplete artifact through the generated validator contract", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "brief-pipeline-"));
    const file = path.join(dir, "workflow-brief.md");
    try {
      writeFileSync(
        file,
        "# Brief\n\n## Workflow\n\nScope without an objective.\n\n## Agent Environment\n\nPreflight required.\n",
      );
      const result = runProcessValidation(
        briefValidator("freeform-summary-to-workflow-brief", "output"),
        file,
        root,
      );
      expect(result.status).toBe("failed");
      expect(result.exit_code).toBe(3);
      expect(result.stderr).toContain("Missing ### Objective");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
