import { describe, expect, it } from "vitest";
import { planemoCliMeta, planemoCliMetaProvenance } from "../src/index.js";

describe("planemoCliMeta", () => {
  it("identifies planemo as the program", () => {
    expect(planemoCliMeta.program).toBe("planemo");
  });

  it("exposes the seed commands the Foundry wraps", () => {
    const names = new Set(planemoCliMeta.commands.map((c) => c.name));
    for (const expected of [
      "lint",
      "test",
      "workflow_test_init",
      "workflow_test_on_invocation",
      "cli_metadata",
      "output_schema",
    ]) {
      expect(names, `command list should include ${expected}`).toContain(expected);
    }
  });
});

describe("planemoCliMetaProvenance", () => {
  it("pins to a jmchilton/planemo SHA", () => {
    expect(planemoCliMetaProvenance.source.repo).toBe("jmchilton/planemo");
    expect(planemoCliMetaProvenance.source.sha).toMatch(/^[0-9a-f]{40}$/);
  });
});
