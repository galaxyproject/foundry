import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assemblyPath, phaseSkills, type AssemblyPhase } from "../src/lib/cast-registry.js";
import { assemblyMatchesCurrent } from "../src/lib/run-record.js";

function branch(chain: string[], cast_present: Array<boolean | null>): AssemblyPhase {
  return { phase: 2, kind: "branch", pattern: "test-data-resolution", chain, cast_present };
}

describe("phaseSkills", () => {
  it("is a Mold phase's own skill", () => {
    const mold: AssemblyPhase = {
      phase: 1,
      kind: "mold",
      skill: "summarize-nextflow",
      cast_present: true,
      loop: false,
    };
    expect(phaseSkills(mold)).toEqual(["summarize-nextflow"]);
  });

  it("drops any chain step the assembler marked as a sentinel, whatever its name", () => {
    expect(phaseSkills(branch(["find-test-data", "ask-the-user"], [true, null]))).toEqual([
      "find-test-data",
    ]);
  });

  it("falls back to the known sentinel names when the chain is not marked step by step", () => {
    expect(phaseSkills(branch(["find-test-data", "user-supplied"], []))).toEqual([
      "find-test-data",
    ]);
  });
});

describe("assemblyMatchesCurrent", () => {
  const repoRoot = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
  const pipeline = "nextflow-to-galaxy";
  const bytes = createHash("sha256")
    .update(readFileSync(assemblyPath(repoRoot, pipeline)))
    .digest("hex");

  it("compares a recorded digest against the assembly's bytes as committed now", () => {
    expect(assemblyMatchesCurrent(repoRoot, pipeline, bytes)).toBe(true);
    expect(assemblyMatchesCurrent(repoRoot, pipeline, `sha256:${bytes.toUpperCase()}`)).toBe(true);
    expect(assemblyMatchesCurrent(repoRoot, pipeline, "f".repeat(64))).toBe(false);
    expect(assemblyMatchesCurrent(repoRoot, pipeline, null)).toBeNull();
  });
});
