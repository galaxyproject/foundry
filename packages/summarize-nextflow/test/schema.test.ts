import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { summaryNextflowSchema, validateSummary } from "../src/index.js";

const FOUNDRY_ROOT = resolve(__dirname, "..", "..", "..");
const DEMO_SUMMARY = resolve(
  FOUNDRY_ROOT,
  "casts/claude/skills/summarize-nextflow/runs/nf-core__demo/summary.json",
);
const BACASS_SUMMARY = resolve(
  FOUNDRY_ROOT,
  "casts/claude/skills/summarize-nextflow/runs/nf-core__bacass/summary.json",
);

describe("summaryNextflowSchema", () => {
  it("is a JSON Schema with $schema", () => {
    expect(summaryNextflowSchema).toBeDefined();
    expect((summaryNextflowSchema as { $schema?: string }).$schema).toMatch(/json-schema\.org/);
  });
});

describe("validateSummary", () => {
  it("validates the nf-core/demo cast artifact", () => {
    const data = JSON.parse(readFileSync(DEMO_SUMMARY, "utf8"));
    const result = validateSummary(data);
    if (!result.valid) {
      console.error("demo errors:", result.errors);
    }
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("validates the nf-core/bacass cast artifact", () => {
    const data = JSON.parse(readFileSync(BACASS_SUMMARY, "utf8"));
    const result = validateSummary(data);
    if (!result.valid) {
      console.error("bacass errors:", result.errors);
    }
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects an empty object", () => {
    const result = validateSummary({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects a summary with an unknown top-level field", () => {
    const data = JSON.parse(readFileSync(DEMO_SUMMARY, "utf8"));
    data.bogusFieldThatShouldNotExist = true;
    const result = validateSummary(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === "additionalProperties")).toBe(true);
  });

  it("requires reference_assets and reference_rebuilds top-level arrays", () => {
    const data = JSON.parse(readFileSync(DEMO_SUMMARY, "utf8"));
    delete data.reference_assets;
    delete data.reference_rebuilds;
    const result = validateSummary(data);
    expect(result.valid).toBe(false);
    const missing = result.errors
      .filter((e) => e.keyword === "required")
      .map((e) => (e.params as { missingProperty?: string }).missingProperty);
    expect(missing).toContain("reference_assets");
    expect(missing).toContain("reference_rebuilds");
  });

  it("accepts a populated ReferenceAsset and ReferenceRebuildRule", () => {
    const data = JSON.parse(readFileSync(DEMO_SUMMARY, "utf8"));
    data.reference_assets = [
      {
        param: "fasta_fai",
        asset_kind: "fasta_index",
        format_hint: "fai",
        required: false,
        source_kind: "getGenomeAttribute",
        source_expression: "getGenomeAttribute('fasta_fai')",
        schema_group: "Reference genome options",
        used_by: ["PREPARE_GENOME"],
        evidence: {
          source_path: "conf/igenomes.config",
          confidence: "high",
          evidence: ["fasta_fai = getGenomeAttribute('fasta_fai')"],
        },
      },
    ];
    data.reference_rebuilds = [
      {
        asset_param: "fasta_fai",
        guard: "!fasta_fai_in",
        guard_params: ["fasta_fai_in"],
        builder: "SAMTOOLS_FAIDX",
        builder_outputs: ["fai"],
        fallback_for: "fasta_fai_in",
        evidence: {
          source_path: "subworkflows/local/prepare_genome/main.nf",
          confidence: "high",
          evidence: ["if (!fasta_fai_in) { SAMTOOLS_FAIDX(...) }"],
        },
      },
    ];
    const result = validateSummary(data);
    if (!result.valid) console.error("populated errors:", result.errors);
    expect(result.valid).toBe(true);
  });

  it("rejects ReferenceAsset with an unknown field", () => {
    const data = JSON.parse(readFileSync(DEMO_SUMMARY, "utf8"));
    data.reference_assets = [
      {
        param: "fasta",
        asset_kind: "fasta",
        required: true,
        used_by: [],
        evidence: { source_path: null, confidence: "high", evidence: [] },
        bogus_field: 1,
      },
    ];
    const result = validateSummary(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === "additionalProperties")).toBe(true);
  });
});
