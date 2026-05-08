import { describe, expect, it } from "vitest";
import { galaxyWorkflowTestPlanSchema, validateGalaxyWorkflowTestPlan } from "../src/index.js";

const VALID_PLAN = {
  schema_version: "1",
  source: {
    kind: "nextflow",
    summary_artifact: "summary-nextflow.json",
    source_test_id: "default-profile",
    provenance: [{ kind: "summary-field", ref: "nf_tests[0]" }],
  },
  workflow: {
    workflow_path: "workflow.gxwf.yml",
    known_input_labels: ["reads"],
    known_output_labels: ["multiqc_html"],
  },
  tests: [
    {
      id: "default",
      name: "default profile",
      profile: "test",
      job: [
        {
          label: "reads",
          value: "reads.fastq.gz",
          datatype: "fastqsanger.gz",
          class: "File",
          fixture: { path: "test-data/reads.fastq.gz", source: "nf-test fixture" },
        },
      ],
      expected_outputs: [
        {
          label: "multiqc_html",
          datatype: "html",
          assertions: [
            {
              intent: "report contains MultiQC title",
              tests_format_assertion: "has_text",
              params: { text: "MultiQC" },
              evidence: [{ kind: "snapshot", ref: "tests/default.snap" }],
            },
          ],
          snapshot_evidence: [{ kind: "stable-name", value: "multiqc_report.html" }],
        },
      ],
    },
  ],
};

describe("galaxyWorkflowTestPlanSchema", () => {
  it("is a JSON Schema with $schema", () => {
    expect(galaxyWorkflowTestPlanSchema).toBeDefined();
    expect((galaxyWorkflowTestPlanSchema as { $schema?: string }).$schema).toMatch(
      /json-schema\.org/,
    );
  });
});

describe("validateGalaxyWorkflowTestPlan", () => {
  it("accepts a valid translated Galaxy workflow test plan", () => {
    const result = validateGalaxyWorkflowTestPlan(VALID_PLAN);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("rejects a plan with no test cases", () => {
    const result = validateGalaxyWorkflowTestPlan({ ...VALID_PLAN, tests: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "/tests" && e.keyword === "minItems")).toBe(true);
  });

  it("rejects unknown fields", () => {
    const result = validateGalaxyWorkflowTestPlan({ ...VALID_PLAN, final_tests_format: {} });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === "additionalProperties")).toBe(true);
  });

  it("rejects expected outputs without assertion intent", () => {
    const data = structuredClone(VALID_PLAN);
    data.tests[0]!.expected_outputs[0]!.assertions = [];
    const result = validateGalaxyWorkflowTestPlan(data);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.path.endsWith("/assertions") && e.keyword === "minItems"),
    ).toBe(true);
  });
});
