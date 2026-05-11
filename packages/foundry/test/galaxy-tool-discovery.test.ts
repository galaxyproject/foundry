import { describe, expect, it } from "vitest";
import { galaxyToolDiscoverySchema, galaxyToolDiscoveryValidator } from "../src/index.js";

const validateGalaxyToolDiscovery = (data: unknown) => galaxyToolDiscoveryValidator.validate(data);

const VALID_HIT = {
  status: "hit",
  candidate: {
    tool_shed_url: "https://toolshed.g2.bx.psu.edu",
    owner: "devteam",
    repo: "fastqc",
    tool_id: "fastqc",
    trs_tool_id: "devteam~fastqc~fastqc",
    version: "0.74+galaxy0",
    changeset_revision: "5ec9f6bceaee",
    score: 12.3,
    matched_terms: ["fastqc"],
    match_fields: ["name", "tool_id"],
    rationale: "single dominant Tool Shed hit",
  },
  alternates: [],
  rationale: "single dominant hit on tool name; latest version pinned to newest changeset",
  warnings: [],
};

describe("galaxyToolDiscoverySchema", () => {
  it("is a JSON Schema with $schema", () => {
    expect(galaxyToolDiscoverySchema).toBeDefined();
    expect((galaxyToolDiscoverySchema as { $schema?: string }).$schema).toMatch(/json-schema\.org/);
  });
});

describe("validateGalaxyToolDiscovery", () => {
  it("accepts a valid hit recommendation", () => {
    const result = validateGalaxyToolDiscovery(VALID_HIT);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("accepts a miss recommendation with null candidate", () => {
    const result = validateGalaxyToolDiscovery({
      status: "miss",
      candidate: null,
      alternates: [],
      rationale: "no usable Tool Shed hit after alternate phrasing",
      warnings: [
        {
          code: "stale-index-suspected",
          message: "absence is soft evidence because Tool Shed search indexes lag uploads",
        },
      ],
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("rejects a hit without a candidate", () => {
    const result = validateGalaxyToolDiscovery({ ...VALID_HIT, candidate: null });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects unknown candidate fields", () => {
    const data = structuredClone(VALID_HIT) as typeof VALID_HIT & {
      candidate: typeof VALID_HIT.candidate & { cache_key?: string };
    };
    data.candidate.cache_key = "not-part-of-this-contract";
    const result = validateGalaxyToolDiscovery(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === "additionalProperties")).toBe(true);
  });
});
