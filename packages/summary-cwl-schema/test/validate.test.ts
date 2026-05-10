import { describe, expect, it } from "vitest";
import { summaryCwlSchema, validateSummary } from "../src/index.js";

const MINIMAL_SUMMARY = {
  summary_version: "1",
  source: {
    ecosystem: "cwl",
    workflow: "align",
    url: "https://example.org/workflows/align.cwl",
    version: "abc123",
    license: null,
    slug: "align",
    cwl_version: "v1.2",
    entrypoint: "align.cwl#main",
  },
  documents: {
    entrypoint: "align.cwl",
    normalized_path: "normalized/align.cwl.json",
    validation: { command: "cwltool --validate align.cwl", status: "valid", diagnostics: [] },
  },
  workflow_inputs: [
    {
      id: "reads",
      label: "reads",
      type: "File[]",
      optional: false,
      default: null,
      doc: "Input reads.",
      format: "edam:format_1930",
      secondary_files: [],
    },
  ],
  workflow_outputs: [
    {
      id: "bam",
      label: "bam",
      type: "File",
      output_source: "align/bam",
      doc: null,
      format: null,
      secondary_files: [".bai"],
    },
  ],
  steps: [
    {
      id: "align",
      run: "#bwa_mem",
      run_class: "CommandLineTool",
      label: "align",
      doc: null,
      in: [
        {
          id: "reads",
          source: ["reads"],
          default: null,
          value_from: null,
          link_merge: null,
          pick_value: null,
        },
      ],
      out: ["bam"],
      scatter: ["reads"],
      scatter_method: "dotproduct",
      when: null,
      requirements: [],
      hints: [],
    },
  ],
  tools: [
    {
      id: "bwa_mem",
      label: "bwa mem",
      base_command: ["bwa", "mem"],
      arguments: [],
      inputs: [],
      outputs: [],
      requirements: [
        {
          class: "DockerRequirement",
          docker_pull: "quay.io/biocontainers/bwa:0.7.17--hed695b0_7",
          docker_image_id: null,
          packages: [],
          raw: {},
        },
      ],
      hints: [],
    },
  ],
  graph: {
    nodes: [{ id: "align", kind: "step", label: "align" }],
    edges: [
      { from: "reads", to: "align/reads", via: [] },
      { from: "align/bam", to: "bam", via: [] },
    ],
  },
  tests: [],
  warnings: [],
};

describe("summaryCwlSchema", () => {
  it("is a JSON Schema with $schema", () => {
    expect(summaryCwlSchema).toBeDefined();
    expect((summaryCwlSchema as { $schema?: string }).$schema).toMatch(/json-schema\.org/);
  });
});

describe("validateSummary", () => {
  it("validates a minimal CWL summary", () => {
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

  it("allows CWL step inputs without a source when a default drives the binding", () => {
    const summary = structuredClone(MINIMAL_SUMMARY);
    summary.steps[0].in = [
      {
        id: "threads",
        source: null,
        default: 4,
        value_from: null,
        link_merge: null,
        pick_value: null,
      },
    ];

    expect(validateSummary(summary).valid).toBe(true);
  });

  it("records linkMerge, pickValue, and valueFrom on step inputs", () => {
    const summary = structuredClone(MINIMAL_SUMMARY);
    summary.steps[0].in = [
      {
        id: "reads",
        source: ["reads_1", "reads_2"],
        default: null,
        value_from: "$(self[0])",
        link_merge: "merge_flattened",
        pick_value: "first_non_null",
      },
    ];

    expect(validateSummary(summary).valid).toBe(true);
  });
});
