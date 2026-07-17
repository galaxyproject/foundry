import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildNoteSchema,
  loadLicensePolicy,
  loadReferenceContract,
  loadTags,
} from "../src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

function realSchema() {
  return buildNoteSchema({
    tags: loadTags(path.join(repoRoot, "meta_tags.yml")),
    contract: loadReferenceContract(path.join(repoRoot, "reference_contract.yml")),
    licensePolicy: loadLicensePolicy(repoRoot),
  });
}

const base = (overrides: Record<string, unknown> = {}) => ({
  status: "draft",
  created: "2026-04-30",
  revised: "2026-04-30",
  revision: 1,
  ai_generated: false,
  summary: "A short summary that meets the minimum length requirement.",
  ...overrides,
});

describe("buildNoteSchema", () => {
  const schema = realSchema();

  it("accepts a minimal pattern", () => {
    const r = schema.safeParse(
      base({
        type: "pattern",
        tags: ["pattern"],
        title: "Test Pattern",
        pattern_kind: "operation",
        evidence: "corpus-observed",
      }),
    );
    expect(r.success).toBe(true);
  });

  it("accepts a prompt note (regression: prompt was absent from the site zod)", () => {
    const r = schema.safeParse(
      base({
        type: "prompt",
        tags: ["prompt"],
        title: "Galaxy custom tool critic",
        prompt_file: "custom-tool-critic.upstream.prompt",
        license: "MIT",
        license_file: "LICENSES/galaxy.LICENSE",
      }),
    );
    expect(r.success).toBe(true);
  });

  it("rejects an unregistered tag", () => {
    const r = schema.safeParse(
      base({
        type: "pattern",
        tags: ["pattern", "totally-bogus-tag"],
        title: "T",
        pattern_kind: "operation",
        evidence: "corpus-observed",
      }),
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => /totally-bogus-tag/.test(i.message))).toBe(true);
    }
  });

  it("rejects a cross-type field via .strict()", () => {
    const r = schema.safeParse(
      base({
        type: "pattern",
        tags: ["pattern"],
        title: "T",
        pattern_kind: "operation",
        evidence: "corpus-observed",
        command: "not-allowed-on-pattern",
      }),
    );
    expect(r.success).toBe(false);
  });

  it("requires source on a source-specific mold", () => {
    const r = schema.safeParse(
      base({
        type: "mold",
        tags: ["mold"],
        name: "x",
        axis: "source-specific",
      }),
    );
    expect(r.success).toBe(false);
  });
});
