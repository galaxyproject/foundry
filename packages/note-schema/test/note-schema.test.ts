import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { bundledPolicy } from "@galaxy-foundry/license-policy";
import { buildNoteSchema, loadReferenceContract } from "../src/index.js";
import { loadTagRegistry } from "@galaxy-foundry/tag-registry";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

function realSchema() {
  return buildNoteSchema({
    tags: loadTagRegistry(path.join(repoRoot, "meta_tags.yml")),
    contract: loadReferenceContract(path.join(repoRoot, "reference_contract.yml")),
    licensePolicy: bundledPolicy(),
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
        tags: ["target/galaxy"],
        title: "Test Pattern",
        pattern_kind: "operation",
        evidence: "corpus-observed",
      }),
    );
    expect(r.success).toBe(true);
  });

  it("accepts a prompt note", () => {
    const r = schema.safeParse(
      base({
        type: "prompt",
        tags: ["prompt/galaxy-internal"],
        title: "Galaxy custom tool critic",
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
        tags: ["target/galaxy", "totally-bogus-tag"],
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
        tags: ["target/galaxy"],
        title: "T",
        pattern_kind: "operation",
        evidence: "corpus-observed",
        command: "not-allowed-on-pattern",
      }),
    );
    expect(r.success).toBe(false);
  });

  const moldWithRef = (ref: Record<string, unknown>) =>
    base({
      type: "mold",
      tags: ["target/galaxy"],
      name: "x",
      axis: "generic",
      references: [
        {
          kind: "pattern",
          ref: "[[some-pattern]]",
          used_at: "cast-time",
          load: "upfront",
          mode: "condense",
          evidence: "corpus-observed",
          ...ref,
        },
      ],
    });

  it("requires a trigger on an on-demand reference", () => {
    const r = schema.safeParse(moldWithRef({ load: "on-demand" }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => /requires a trigger/.test(i.message))).toBe(true);
    }
  });

  it("accepts an on-demand reference that names its trigger", () => {
    const r = schema.safeParse(
      moldWithRef({ load: "on-demand", trigger: "When emitting the tool XML." }),
    );
    expect(r.success).toBe(true);
  });

  it("requires a verification on a hypothesis reference", () => {
    const r = schema.safeParse(moldWithRef({ evidence: "hypothesis" }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => /requires a verification/.test(i.message))).toBe(true);
    }
  });

  it("requires source on a source-specific mold", () => {
    const r = schema.safeParse(
      base({
        type: "mold",
        tags: ["target/galaxy"],
        name: "x",
        axis: "source-specific",
      }),
    );
    expect(r.success).toBe(false);
  });
});
