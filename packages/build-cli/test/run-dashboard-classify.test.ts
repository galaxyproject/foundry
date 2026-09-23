import { describe, expect, it } from "vitest";

import { classifyEntries, variantParent } from "../src/lib/run-classify.js";
import type { DeclaredOutput } from "../src/lib/cast-registry.js";
import type { ScannedEntry } from "../src/lib/run-scan.js";

function declared(id: string, filename: string, phases: number[] = [1]): DeclaredOutput {
  return {
    id,
    kind: filename.endsWith(".json") ? "json" : filename.endsWith(".md") ? "markdown" : "yaml",
    default_filename: filename,
    optional: false,
    description: "a declared artifact",
    producing_phases: phases,
    producing_skills: ["some-mold"],
    consuming_phases: [],
    consuming_skills: [],
    source: "mold",
  };
}

function file(basename: string): ScannedEntry {
  return {
    basename,
    relpath: basename,
    type: "file",
    size_bytes: 10,
    mtime: "2026-09-18T10:00:00.000Z",
    sha256: "0".repeat(64),
    hash_skipped_reason: null,
    dir_summary: null,
    text: null,
    text_truncated: false,
    text_skip_reason: "not a text format",
  };
}

function dir(basename: string): ScannedEntry {
  return {
    ...file(basename),
    type: "dir",
    dir_summary: { entry_count: 12, total_bytes: 99, sample: [] },
  };
}

const DECLARED = [
  declared("galaxy-workflow", "galaxy-workflow.gxwf.yml", [7]),
  declared("galaxy-workflow-validation-result", "galaxy-workflow-validation-result.json", [11]),
  declared("summary-nextflow", "summary-nextflow.json", [1]),
];

describe("variantParent", () => {
  const names = new Set(DECLARED.map((output) => output.default_filename));

  it("matches a simple kept-aside copy", () => {
    expect(variantParent("galaxy-workflow.gxwf.yml.prepin.bak", names)).toBe(
      "galaxy-workflow.gxwf.yml",
    );
  });

  it("matches across a multi-segment interposed version", () => {
    // This one is real: a tool version with two dots sits between the filename and the suffix.
    expect(variantParent("galaxy-workflow-validation-result.json.gxwf-1.10.1.bak", names)).toBe(
      "galaxy-workflow-validation-result.json",
    );
  });

  it("does not invent a parent for an unrelated backup", () => {
    expect(variantParent("notes.bak", names)).toBeNull();
  });

  it("ignores a file with no variant suffix", () => {
    expect(variantParent("galaxy-workflow.gxwf.yml", names)).toBeNull();
  });
});

describe("classifyEntries", () => {
  const owners = new Map<string, string[]>([["summary-cwl.json", ["cwl-to-galaxy"]]]);
  const skills = new Map<string, string[]>([["galaxy-tool-pin.json", ["discover-shed-tool"]]]);

  it("matches a declared artifact by its basename", () => {
    const result = classifyEntries([file("summary-nextflow.json")], DECLARED, owners, skills);
    expect(result.declared.get("summary-nextflow")?.basename).toBe("summary-nextflow.json");
    expect(result.unmapped).toHaveLength(0);
  });

  it("folds kept-aside copies into their parent instead of listing them as strays", () => {
    const result = classifyEntries(
      [
        file("galaxy-workflow.gxwf.yml"),
        file("galaxy-workflow.gxwf.yml.prepin.bak"),
        file("galaxy-workflow-validation-result.json.gxwf-1.10.1.bak"),
      ],
      DECLARED,
      owners,
      skills,
    );
    expect(result.variants.map((variant) => variant.parentArtifactId).sort()).toEqual([
      "galaxy-workflow",
      "galaxy-workflow-validation-result",
    ]);
    expect(result.unmapped).toHaveLength(0);
  });

  it("names a file another pipeline declares", () => {
    const result = classifyEntries([file("summary-cwl.json")], DECLARED, owners, skills);
    expect(result.unmapped[0]!.cls).toBe("cross-pipeline");
    expect(result.unmapped[0]!.declaredByPipelines).toEqual(["cwl-to-galaxy"]);
  });

  it("attributes an artifact a phase's inner Mold wrote", () => {
    const result = classifyEntries([file("galaxy-tool-pin.json")], DECLARED, owners, skills);
    expect(result.unmapped[0]!.cls).toBe("sub-mold");
    expect(result.unmapped[0]!.declaredBySkills).toEqual(["discover-shed-tool"]);
  });

  it("keeps a generic readme narrative even though another pipeline declares one", () => {
    // `mature-galaxy-workflow-for-iwc` emits a `README.md`. A README beside an interview run is
    // still a README, and calling it a cross-pipeline stray fires a warning on an ordinary run.
    const readmeOwners = new Map<string, string[]>([["README.md", ["galaxy-workflow-maturation"]]]);
    const result = classifyEntries([file("README.md")], DECLARED, readmeOwners, skills);
    expect(result.unmapped[0]!.cls).toBe("narrative");
  });

  it("separates tool output, narrative, directories and genuine strays", () => {
    const result = classifyEntries(
      [
        file("planemo-smoke.html"),
        file("tool_test_output_patched.json"),
        file("planemo-run.log"),
        file("transcript.md"),
        file("LICENSE"),
        dir("test-data"),
        file("extract.mjs"),
      ],
      DECLARED,
      owners,
      skills,
    );
    const byName = new Map(result.unmapped.map((item) => [item.entry.basename, item.cls]));
    expect(byName.get("planemo-smoke.html")).toBe("tool-output");
    expect(byName.get("tool_test_output_patched.json")).toBe("tool-output");
    expect(byName.get("planemo-run.log")).toBe("tool-output");
    expect(byName.get("transcript.md")).toBe("narrative");
    expect(byName.get("LICENSE")).toBe("narrative");
    expect(byName.get("test-data")).toBe("directory");
    expect(byName.get("extract.mjs")).toBe("undeclared");
  });
});
