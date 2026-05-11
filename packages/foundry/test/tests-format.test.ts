import { describe, expect, it } from "vitest";
import { testsFormatSchema, validateTestsFormat } from "../src/index.js";

describe("testsFormatSchema", () => {
  it("is the Galaxy workflow tests JSON Schema", () => {
    expect(testsFormatSchema).toBeDefined();
    expect((testsFormatSchema as { type?: string }).type).toBe("array");
    expect((testsFormatSchema as { $defs?: Record<string, unknown> }).$defs).toHaveProperty(
      "TestJob",
    );
  });
});

describe("validateTestsFormat", () => {
  it("accepts a minimal workflow tests document", () => {
    const result = validateTestsFormat([{ job: {}, outputs: {} }]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects a non-array tests document", () => {
    const result = validateTestsFormat({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
