import { describe, expect, it } from "vitest";
import {
  planemoTestReportProvenance,
  planemoTestReportSchema,
  validatePlanemoTestReport,
} from "../src/index.js";

const MINIMAL_REPORT = {
  tests: [
    {
      id: "wf-0",
      has_data: true,
      data: {
        status: "success",
        tool_id: null,
        tool_version: null,
      },
    },
  ],
  version: "0.1",
};

describe("planemoTestReportSchema", () => {
  it("is a JSON Schema with $defs for the PlanemoTestCase model", () => {
    expect(planemoTestReportSchema).toBeDefined();
    expect((planemoTestReportSchema as { $defs?: Record<string, unknown> }).$defs).toHaveProperty(
      "PlanemoTestCase",
    );
  });
});

describe("planemoTestReportProvenance", () => {
  it("records the upstream planemo source pin", () => {
    expect(planemoTestReportProvenance.schema_name).toBe("test-report");
    expect(planemoTestReportProvenance.source.repo).toBe("jmchilton/planemo");
    expect(planemoTestReportProvenance.source.sha).toMatch(/^[0-9a-f]{7,40}$/);
  });
});

describe("validatePlanemoTestReport", () => {
  it("accepts a minimal planemo test report", () => {
    const result = validatePlanemoTestReport(MINIMAL_REPORT);
    if (!result.valid) {
      console.error("minimal errors:", result.errors);
    }
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects a non-object document", () => {
    const result = validatePlanemoTestReport("not a report");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects a tests entry missing has_data", () => {
    const result = validatePlanemoTestReport({
      tests: [{ id: "wf-0" }],
      version: "0.1",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === "required")).toBe(true);
  });
});
