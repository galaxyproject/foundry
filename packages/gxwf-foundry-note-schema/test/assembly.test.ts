import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ASSEMBLY_FILE, loadAssemblyManifest } from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const skillsRoot = path.join(repoRoot, "casts", "claude", "skills");

function writeAssembly(body: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "assembly-"));
  const file = path.join(dir, ASSEMBLY_FILE);
  writeFileSync(file, JSON.stringify(body));
  return file;
}

const valid = {
  source_pipeline: "demo",
  source_revision: 2,
  harness_name: "pipeline-demo",
  phases: [
    { phase: 1, kind: "mold", skill: "summarize-nextflow", cast_present: true, loop: false },
    {
      phase: 2,
      kind: "branch",
      pattern: "test-data-resolution",
      chain: ["find-test-data", "user-supplied"],
      cast_present: [true, null],
    },
  ],
};

describe("pipeline assembly manifest", () => {
  it("loads every committed assembly under its own pipeline slug", () => {
    const slugs = readdirSync(skillsRoot)
      .filter((name) => name.startsWith("pipeline-"))
      .map((name) => name.slice("pipeline-".length));
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      const manifest = loadAssemblyManifest(
        path.join(skillsRoot, `pipeline-${slug}`, ASSEMBLY_FILE),
        slug,
      );
      expect(manifest.source_pipeline).toBe(slug);
      for (const phase of manifest.phases) {
        expect(["mold", "branch"]).toContain(phase.kind);
      }
    }
  });

  it("reads both phase kinds without narrowing", () => {
    const manifest = loadAssemblyManifest(writeAssembly(valid), "demo");
    expect(manifest.phases.map((phase) => phase.skill ?? phase.pattern)).toEqual([
      "summarize-nextflow",
      "test-data-resolution",
    ]);
  });

  it("refuses a missing file, another pipeline's assembly, and a malformed one", () => {
    expect(() =>
      loadAssemblyManifest(path.join(tmpdir(), "absent", ASSEMBLY_FILE), "demo"),
    ).toThrow(/pipeline assembly not found/);
    expect(() => loadAssemblyManifest(writeAssembly(valid), "other")).toThrow(
      /invalid pipeline assembly/,
    );
    expect(() =>
      loadAssemblyManifest(writeAssembly({ ...valid, phases: undefined }), "demo"),
    ).toThrow(/invalid pipeline assembly/);
  });
});
