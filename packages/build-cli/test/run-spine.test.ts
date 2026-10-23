import { describe, expect, it } from "vitest";

import type { DeclaredOutput } from "../src/lib/cast-registry.js";
import type { RunArtifact, RunPhase } from "../src/lib/run-model.js";
import type { ScannedEntry } from "../src/lib/run-scan.js";
import {
  phasesTile,
  presenceCounts,
  resolvePresence,
  toRunArtifact,
} from "../src/lib/run-spine.js";
import { NO_LINKS } from "../src/lib/run-links.js";

function output(overrides: Partial<DeclaredOutput> = {}): DeclaredOutput {
  return {
    id: "summary-nextflow",
    kind: "json",
    default_filename: "summary-nextflow.json",
    optional: false,
    description: "",
    producing_phases: [3, 2],
    producing_skills: ["b", "a"],
    consuming_phases: [],
    consuming_skills: [],
    source: "mold",
    ...overrides,
  };
}

const entry: ScannedEntry = {
  basename: "summary-nextflow.json",
  relpath: "summary-nextflow.json",
  type: "file",
  size_bytes: 2,
  mtime: "2026-09-18T10:00:00.000Z",
  sha256: "b".repeat(64),
  hash_skipped_reason: null,
  dir_summary: null,
  text: "{}",
  text_truncated: false,
  text_skip_reason: null,
};

describe("resolvePresence", () => {
  it("is present whenever the file is", () => {
    expect(resolvePresence(output({ optional: true }), entry, 0)).toBe("present");
  });

  it("is missing only once the earliest producing phase has been reached", () => {
    expect(resolvePresence(output(), null, 1)).toBe("not-yet-due");
    expect(resolvePresence(output(), null, 2)).toBe("missing");
    expect(resolvePresence(output({ optional: true }), null, 9)).toBe("optional-absent");
    expect(resolvePresence(output({ producing_phases: [] }), null, 9)).toBe("not-yet-due");
  });
});

describe("toRunArtifact", () => {
  const observed = {
    presence: "missing" as const,
    written_by_phase: null,
    writes: [],
    variants: [],
    validation: null,
  };

  it("takes path and digest from the file unless the reader recorded its own", () => {
    const fromFile = toRunArtifact(output(), NO_LINKS, { ...observed, entry });
    expect(fromFile.path).toBe("summary-nextflow.json");
    expect(fromFile.sha256).toBe("b".repeat(64));
    expect(fromFile.producing_phases).toEqual([2, 3]);

    const recorded = toRunArtifact(output(), NO_LINKS, {
      ...observed,
      entry: null,
      path: "trial-001/workspace/summary-nextflow.json",
      sha256: "a".repeat(64),
    });
    expect(recorded.path).toBe("trial-001/workspace/summary-nextflow.json");
    expect(recorded.sha256).toBe("a".repeat(64));
    expect(recorded.preview).toBeNull();
  });
});

describe("presenceCounts and phasesTile", () => {
  it("counts everything due as expected, present or not", () => {
    const artifacts = ["present", "missing", "failed", "not-yet-due", "optional-absent"].map(
      (presence) => ({ presence }) as RunArtifact,
    );
    expect(presenceCounts(artifacts)).toEqual({ expected: 4, present: 1, missing: 1, failed: 1 });
  });

  it("reads a failed phase as an error and an unfinished roster as a warning", () => {
    const phases = (statuses: string[]) => statuses.map((status) => ({ status }) as RunPhase);
    expect(phasesTile(phases(["done", "done"]), "d")).toMatchObject({ state: "ok", value: "2/2" });
    expect(phasesTile(phases(["done", "pending"]), "d").state).toBe("warn");
    expect(phasesTile(phases(["done", "failed"]), "d").state).toBe("error");
  });
});
