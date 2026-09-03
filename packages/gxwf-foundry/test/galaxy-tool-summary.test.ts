import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { galaxyToolSummarySchema, galaxyToolSummaryValidator } from "../src/index.js";

const validateGalaxyToolSummary = (data: unknown) => galaxyToolSummaryValidator.validate(data);

const FIXTURES = resolve(__dirname, "fixtures", "galaxy-tool-summary");
const MINIMAL = resolve(FIXTURES, "minimal.json");

function loadMinimal(): Record<string, unknown> {
  return JSON.parse(readFileSync(MINIMAL, "utf8")) as Record<string, unknown>;
}

describe("galaxyToolSummarySchema", () => {
  it("is a draft-07 JSON Schema", () => {
    expect(galaxyToolSummarySchema).toBeDefined();
    expect((galaxyToolSummarySchema as { $schema?: string }).$schema).toMatch(/draft-07/);
  });

  it("declares schema_version: 1 const", () => {
    const props = (
      galaxyToolSummarySchema as {
        $defs: { GalaxyToolSummary: { properties: { schema_version: { const: number } } } };
      }
    ).$defs.GalaxyToolSummary.properties.schema_version;
    expect(props.const).toBe(1);
  });
});

describe("validateGalaxyToolSummary", () => {
  it("accepts the minimal fixture", () => {
    const result = validateGalaxyToolSummary(loadMinimal());
    if (!result.valid) console.error("errors:", result.errors);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects schema_version other than 1", () => {
    const data = loadMinimal();
    data.schema_version = 2;
    const result = validateGalaxyToolSummary(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("schema_version"))).toBe(true);
  });

  it("rejects unknown source.kind", () => {
    const data = loadMinimal();
    (data.source as Record<string, unknown>).kind = "tarball";
    const result = validateGalaxyToolSummary(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("source"))).toBe(true);
  });

  it("rejects missing required source field", () => {
    const data = loadMinimal();
    delete (data.source as Record<string, unknown>).cached_at;
    const result = validateGalaxyToolSummary(data);
    expect(result.valid).toBe(false);
  });

  it("validates parsed_tool subtree against upstream parsedToolSchema", () => {
    const data = loadMinimal();
    // Drop a required upstream field — should fail validation through the
    // injected upstream schema, not just the wrapper.
    delete (data.parsed_tool as Record<string, unknown>).citations;
    const result = validateGalaxyToolSummary(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("parsed_tool"))).toBe(true);
  });

  it("accepts null input_schemas entries", () => {
    const data = loadMinimal();
    (data.input_schemas as Record<string, unknown>).workflow_step = null;
    const result = validateGalaxyToolSummary(data);
    if (!result.valid) console.error("errors:", result.errors);
    expect(result.valid).toBe(true);
  });

  it("rejects extra top-level properties", () => {
    const data = loadMinimal();
    data.extra = "should not be here";
    const result = validateGalaxyToolSummary(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === "additionalProperties")).toBe(true);
  });
});
