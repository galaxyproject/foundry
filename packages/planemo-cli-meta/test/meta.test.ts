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
  // `source` names where the metadata came from; the version is whatever planemo reported
  // when the sync ran. Agreement with the intended pin is checked by `make check-planemo-pin`,
  // which can see the note this package cannot.
  it("records the planemo it was generated from", () => {
    expect(planemoCliMetaProvenance.source.repo).toBe("galaxyproject/planemo");
    expect(planemoCliMetaProvenance.planemo_version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
