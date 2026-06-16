import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { galaxyWorkflowTestPlanSchema } from "../src/schemas/galaxy-workflow-test-plan/galaxy-workflow-test-plan.schema.generated.js";
import { galaxyWorkflowTestPlanValidator } from "../src/commands/validate-galaxy-workflow-test-plan.js";

const FIXTURES = resolve(__dirname, "fixtures", "galaxy-workflow-test-plan");

function loadPlan(name: string): unknown {
  return YAML.parse(readFileSync(resolve(FIXTURES, `${name}.yml`), "utf8"));
}

describe("galaxyWorkflowTestPlanSchema", () => {
  it("is a JSON Schema with $schema", () => {
    expect(galaxyWorkflowTestPlanSchema).toBeDefined();
    expect((galaxyWorkflowTestPlanSchema as { $schema?: string }).$schema).toMatch(
      /json-schema\.org/,
    );
  });
});

describe("galaxyWorkflowTestPlanValidator", () => {
  it("accepts a maximally-unknown freeform-synthesized plan (expresses unknowns)", () => {
    const result = galaxyWorkflowTestPlanValidator.validate(loadPlan("freeform-synthesized"));
    if (!result.valid) console.error("freeform errors:", result.errors);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts a fully-resolved nextflow-translated plan (concrete values, tolerance, element assertion)", () => {
    const result = galaxyWorkflowTestPlanValidator.validate(loadPlan("nextflow-translated"));
    if (!result.valid) console.error("nextflow errors:", result.errors);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects an empty object", () => {
    const result = galaxyWorkflowTestPlanValidator.validate({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects an unknown top-level field", () => {
    const plan = loadPlan("freeform-synthesized") as Record<string, unknown>;
    plan.bogusFieldThatShouldNotExist = true;
    const result = galaxyWorkflowTestPlanValidator.validate(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === "additionalProperties")).toBe(true);
  });

  it("rejects an unknown assertion-family object field (additionalProperties guard reaches deep)", () => {
    const plan = loadPlan("nextflow-translated") as {
      test_cases: { expected_outputs: { assertion_intent: Record<string, unknown>[] }[] }[];
    };
    plan.test_cases[0].expected_outputs[0].assertion_intent[0].bogus = 1;
    const result = galaxyWorkflowTestPlanValidator.validate(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === "additionalProperties")).toBe(true);
  });

  it("rejects an invalid label_status enum value", () => {
    const plan = loadPlan("nextflow-translated") as {
      test_cases: { job_inputs: { label_status: string }[] }[];
    };
    plan.test_cases[0].job_inputs[0].label_status = "maybe";
    const result = galaxyWorkflowTestPlanValidator.validate(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === "enum")).toBe(true);
  });
});
