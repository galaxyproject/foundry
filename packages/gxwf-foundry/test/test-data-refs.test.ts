import { describe, expect, it } from "vitest";
import {
  galaxyWorkflowTestPlanSchema,
  testDataRefsSchema,
  testDataRefsValidator,
} from "../src/index.js";

const validate = (data: unknown) => testDataRefsValidator.validate(data);

const RESOLVED_FILE = {
  workflow_label: "reference genome",
  collection_shape: null,
  datatype: "fasta",
  resolved: true,
  resolved_by: "nextflow-to-test-data",
  reason: null,
  fixture: {
    storage: "remote-url",
    location: "https://example.org/genome.fa",
    checksum: "SHA-1:0123456789abcdef0123456789abcdef01234567",
    provenance: "test profile `params.fasta`",
  },
};

const RESOLVED_COLLECTION = {
  workflow_label: "reads",
  collection_shape: "list:paired",
  datatype: "fastqsanger.gz",
  resolved: true,
  resolved_by: "find-test-data",
  reason: null,
  fixture: { storage: null, location: null, checksum: null, provenance: "IWC rnaseq-pe tests" },
  elements: [
    {
      identifier: "sample1",
      elements: [
        {
          identifier: "forward",
          fixture: {
            storage: "remote-url",
            location: "https://example.org/s1_1.fq.gz",
            checksum: null,
            provenance: "IWC rnaseq-pe tests",
          },
        },
        {
          identifier: "reverse",
          fixture: {
            storage: "remote-url",
            location: "https://example.org/s1_2.fq.gz",
            checksum: null,
            provenance: "IWC rnaseq-pe tests",
          },
        },
      ],
    },
  ],
  prep: null,
};

const UNRESOLVED = {
  workflow_label: "sample metadata",
  collection_shape: null,
  datatype: "tabular",
  resolved: false,
  resolved_by: null,
  reason: "the pipeline declares no samplesheet fixture with condition columns",
  fixture: {
    storage: "unresolved",
    location: null,
    checksum: null,
    provenance: "no declared fixture",
  },
};

describe("testDataRefsSchema", () => {
  it("is a JSON Schema with $schema", () => {
    expect((testDataRefsSchema as { $schema?: string }).$schema).toMatch(/json-schema\.org/);
  });

  it("shares the test plan's Fixture shape, so a ref's fixture drops into a plan unchanged", () => {
    const defs = (schema: unknown) => (schema as { $defs: Record<string, unknown> }).$defs;
    expect(defs(testDataRefsSchema).Fixture).toEqual(defs(galaxyWorkflowTestPlanSchema).Fixture);
  });
});

describe("testDataRefsValidator", () => {
  it("accepts resolved files, resolved collections and honest gaps together", () => {
    expect(validate({ refs: [RESOLVED_FILE, RESOLVED_COLLECTION, UNRESOLVED] })).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("accepts an empty refs list", () => {
    expect(validate({ refs: [] }).valid).toBe(true);
  });

  it("requires a reason for an unresolved input", () => {
    expect(validate({ refs: [{ ...UNRESOLVED, reason: null }] }).valid).toBe(false);
    expect(validate({ refs: [{ ...UNRESOLVED, reason: "" }] }).valid).toBe(false);
  });

  it("does not let an unresolved input carry data or a resolver", () => {
    const withLocation = {
      ...UNRESOLVED,
      fixture: { ...UNRESOLVED.fixture, storage: "remote-url", location: "https://example.org/x" },
    };
    expect(validate({ refs: [withLocation] }).valid).toBe(false);
    expect(validate({ refs: [{ ...UNRESOLVED, resolved_by: "find-test-data" }] }).valid).toBe(
      false,
    );
  });

  it("requires a resolved input to name its resolver and point at data", () => {
    expect(validate({ refs: [{ ...RESOLVED_FILE, resolved_by: null }] }).valid).toBe(false);
    const noData = {
      ...RESOLVED_FILE,
      fixture: { ...RESOLVED_FILE.fixture, storage: null, location: null },
    };
    expect(validate({ refs: [noData] }).valid).toBe(false);
    expect(validate({ refs: [{ ...RESOLVED_COLLECTION, elements: [] }] }).valid).toBe(false);
  });

  it("requires every element of a resolved collection to reach data", () => {
    const withElements = (elements: unknown[]) => ({
      refs: [{ ...RESOLVED_COLLECTION, elements }],
    });
    const [sample] = RESOLVED_COLLECTION.elements;
    const [forward, reverse] = sample.elements;
    expect(validate(withElements([{ identifier: "sample1" }])).valid).toBe(false);
    expect(validate(withElements([{ identifier: "sample1", elements: [] }])).valid).toBe(false);
    const noLocation = {
      ...forward,
      fixture: { ...forward.fixture, storage: null, location: null },
    };
    expect(
      validate(withElements([{ identifier: "sample1", elements: [noLocation, reverse] }])).valid,
    ).toBe(false);
    const noStorage = { ...forward, fixture: { ...forward.fixture, storage: null } };
    expect(
      validate(withElements([{ identifier: "sample1", elements: [noStorage, reverse] }])).valid,
    ).toBe(false);
  });

  it("requires a storage class alongside a location", () => {
    const noStorage = { ...RESOLVED_FILE, fixture: { ...RESOLVED_FILE.fixture, storage: null } };
    expect(validate({ refs: [noStorage] }).valid).toBe(false);
  });

  it("rejects unknown fields and a missing workflow label", () => {
    expect(validate({ refs: [{ ...RESOLVED_FILE, url: "https://example.org" }] }).valid).toBe(
      false,
    );
    const { workflow_label: _label, ...unlabelled } = RESOLVED_FILE;
    expect(validate({ refs: [unlabelled] }).valid).toBe(false);
    expect(validate([RESOLVED_FILE]).valid).toBe(false);
  });
});
