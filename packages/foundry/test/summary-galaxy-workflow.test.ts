import { describe, expect, it } from "vitest";
import { summaryGalaxyWorkflowSchema, summaryGalaxyWorkflowValidator } from "../src/index.js";

const validateSummary = (data: unknown) => summaryGalaxyWorkflowValidator.validate(data);

const MINIMAL_SUMMARY = {
  summary_version: "1",
  source: {
    ecosystem: "galaxy",
    workflow: "short-read-quality-control-and-trimming",
    url: "https://github.com/galaxyproject/iwc/blob/main/workflows/short-read-quality-control-and-trimming.ga",
    version: "abc123",
    license: "MIT",
    slug: "short-read-quality-control-and-trimming",
    format: "gxformat2",
    original_format: "gxformat2",
    release: "0.1",
    annotation: "Paired-end short-read QC and trimming.",
  },
  documents: {
    entrypoint: "short-read-quality-control-and-trimming.gxwf.yml",
    converted_path: null,
    validation: { command: "gxwf validate", status: "valid", diagnostics: [] },
  },
  workflow_inputs: [
    {
      id: "Raw reads",
      label: "Raw reads",
      type: "collection",
      collection_type: "list:paired",
      optional: false,
      default: null,
      format: null,
      doc: null,
    },
  ],
  workflow_outputs: [
    {
      id: "MultiQC HTML report",
      label: "MultiQC HTML report",
      source: "MultiQC/html_report",
      type: "html",
      doc: null,
    },
  ],
  steps: [
    {
      id: "fastp",
      label: "fastp",
      type: "tool",
      tool_id: "toolshed.g2.bx.psu.edu/repos/iuc/fastp/fastp/0.23.4+galaxy0",
      tool_version: "0.23.4+galaxy0",
      tool_shed_repository: {
        name: "fastp",
        owner: "iuc",
        changeset_revision: "3b053288d2c6",
        tool_shed: "toolshed.g2.bx.psu.edu",
      },
      tool_state: { qualified_quality_phred: 15, report_html: true },
      in: [
        {
          name: "single_paired|paired_input",
          source: "Raw reads",
          default: null,
          value_from: null,
        },
      ],
      out: ["output_paired_coll", "report_json", "report_html"],
      when: null,
      annotation: null,
    },
    {
      id: "MultiQC",
      label: "MultiQC",
      type: "tool",
      tool_id: "toolshed.g2.bx.psu.edu/repos/iuc/multiqc/multiqc/1.24+galaxy0",
      tool_version: "1.24+galaxy0",
      tool_shed_repository: null,
      tool_state: { results: [{ software_cond: { software: "fastp" } }] },
      in: [
        {
          name: "results_0|software_cond|input",
          source: "fastp/report_json",
          default: null,
          value_from: null,
        },
      ],
      out: ["html_report"],
      when: null,
      annotation: null,
    },
  ],
  graph: {
    nodes: [
      { id: "Raw reads", kind: "workflow-input", label: "Raw reads" },
      { id: "fastp", kind: "step", label: "fastp" },
      { id: "MultiQC", kind: "step", label: "MultiQC" },
      { id: "MultiQC HTML report", kind: "workflow-output", label: "MultiQC HTML report" },
    ],
    edges: [
      { from: "Raw reads", to: "fastp/single_paired|paired_input", via: ["map-over"] },
      { from: "fastp/report_json", to: "MultiQC/results_0|software_cond|input", via: [] },
      { from: "MultiQC/html_report", to: "MultiQC HTML report", via: [] },
    ],
  },
  tests: [],
  warnings: [],
};

describe("summaryGalaxyWorkflowSchema", () => {
  it("is a JSON Schema with $schema", () => {
    expect(summaryGalaxyWorkflowSchema).toBeDefined();
    expect((summaryGalaxyWorkflowSchema as { $schema?: string }).$schema).toMatch(
      /json-schema\.org/,
    );
  });
});

describe("validateSummary", () => {
  it("validates a minimal Galaxy workflow summary", () => {
    const result = validateSummary(MINIMAL_SUMMARY);
    if (!result.valid) {
      console.error("minimal errors:", result.errors);
    }
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects an empty object", () => {
    const result = validateSummary({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects an unknown top-level field", () => {
    const result = validateSummary({ ...MINIMAL_SUMMARY, bogus: true });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === "additionalProperties")).toBe(true);
  });

  it("records a .ga conversion under documents.converted_path", () => {
    const summary = structuredClone(MINIMAL_SUMMARY);
    summary.source.original_format = "ga";
    summary.documents.converted_path = "converted/short-read-quality-control-and-trimming.gxwf.yml";
    expect(validateSummary(summary).valid).toBe(true);
  });

  it("preserves an existing workflow test as a regression baseline", () => {
    const summary = structuredClone(MINIMAL_SUMMARY);
    summary.tests = [
      {
        name: "quality-trimming",
        job_path: "short-read-quality-control-and-trimming-tests.yml",
        expected_outputs: [
          {
            id: "MultiQC HTML report",
            path: null,
            url: null,
            filetype: "html",
            checksum: null,
            assertions: ["has_text: fastp"],
          },
        ],
        provenance: "sibling *-tests.yml",
      },
    ];
    expect(validateSummary(summary).valid).toBe(true);
  });

  it("rejects an unknown workflow input class", () => {
    const summary = structuredClone(MINIMAL_SUMMARY);
    // @ts-expect-error deliberately invalid enum value
    summary.workflow_inputs[0].type = "dataset";
    expect(validateSummary(summary).valid).toBe(false);
  });
});
