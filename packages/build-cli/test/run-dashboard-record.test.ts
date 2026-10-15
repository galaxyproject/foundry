import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import {
  requireRuntimeArtifactRegistry,
  type RuntimeArtifactRegistry,
} from "@galaxy-foundry/gxwf-foundry-note-schema";

import { assemblyPath, type AssemblyManifest } from "../src/lib/cast-registry.js";
import {
  buildRunModel,
  RunRecordMissingError,
  RunRecordUnreadableError,
} from "../src/lib/run-manifest.js";
import {
  buildPipelineIndex,
  PipelineUndeterminedError,
  type PipelineIndex,
} from "../src/lib/run-reconstruct.js";
import { parseRunRecord } from "../src/lib/run-record.js";
import type { RunModel } from "../src/lib/run-model.js";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const PIPELINE = "nextflow-to-galaxy";
const FIXED_CLOCK = () => new Date("2026-09-18T12:00:00.000Z");

let registry: RuntimeArtifactRegistry;
let index: PipelineIndex;
let assembly: AssemblyManifest;
let currentSha: string;
beforeAll(() => {
  registry = requireRuntimeArtifactRegistry(path.join(REPO_ROOT, "runtime_artifacts.yml"));
  index = buildPipelineIndex(REPO_ROOT, registry);
  assembly = index.assemblies.get(PIPELINE)!;
  currentSha = createHash("sha256")
    .update(readFileSync(assemblyPath(REPO_ROOT, PIPELINE)))
    .digest("hex");
});

function skillOf(n: number): string {
  return assembly.phases.find((phase) => phase.phase === n)!.skill!;
}

function runDir(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "foundry-run-record-"));
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(dir, name), text);
  return dir;
}

function record(lines: string[], header: string[] = [`pipeline: ${PIPELINE}`]): string {
  return ["run_record_version: 1", ...header, "status: running", ...lines, ""].join("\n");
}

function build(
  dir: string,
  overrides: Partial<Parameters<typeof buildRunModel>[0]> = {},
): RunModel {
  return buildRunModel({
    runDir: dir,
    repoRoot: REPO_ROOT,
    pipelineIndex: index,
    runtimeArtifacts: registry,
    now: FIXED_CLOCK,
    ...overrides,
  });
}

function codes(model: RunModel): string[] {
  return model.warnings.map((warning) => warning.code);
}

describe("parseRunRecord", () => {
  it("reads a roster keyed `phase:` as `_assembly.json` keys it", () => {
    const load = parseRunRecord(
      record(["phases:", "  - { phase: 1, kind: mold, skill: summarize-nextflow, status: done }"]),
      "foundry-run.yml",
    );
    expect(load.record!.phases.map((phase) => phase.n)).toEqual([1]);
    expect(load.warnings).toEqual([]);
  });

  it("reads a phase number that arrived as a string", () => {
    const load = parseRunRecord(record(["phases:", "  - { n: '2', status: done }"]), "x.yml");
    expect(load.record!.phases.map((phase) => phase.n)).toEqual([2]);
  });

  it("reports a phase recorded twice", () => {
    const load = parseRunRecord(
      record(["phases:", "  - { n: 1, status: done }", "  - { n: 1, status: running }"]),
      "x.yml",
    );
    expect(load.warnings.map((warning) => warning.code)).toContain("run-record-phase-duplicate");
  });

  it("warns when a sha arrived as a YAML number, since digits may be gone", () => {
    const load = parseRunRecord(record(["phases: []"], ["foundry_head: 1234567"]), "x.yml");
    expect(load.warnings.map((warning) => warning.code)).toContain("run-record-token-not-quoted");
  });
});

describe("buildRunModel reading a run record", () => {
  it("keeps every phase of a roster copied from `_assembly.json` with `phase:` keys", () => {
    const rows = assembly.phases.map(
      (phase) => `  - { phase: ${phase.phase}, kind: ${phase.kind}, status: pending }`,
    );
    const model = build(runDir({ "foundry-run.yml": record(["phases:", ...rows]) }));
    expect(model.phases.every((phase) => phase.status_source === "run-record")).toBe(true);
  });

  it("refuses a half-written record instead of calling it absent", () => {
    const dir = runDir({ "foundry-run.yml": "run_record_version: 1\nphases: [ {n: 1" });
    expect(() => build(dir)).toThrow(RunRecordUnreadableError);
    try {
      build(dir);
    } catch (error) {
      expect(error).toBeInstanceOf(RunRecordMissingError);
      expect((error as Error).message).not.toContain("predates");
      expect((error as Error).message).toContain("not valid YAML");
    }
  });

  it("carries the unreadable-record warning into a degraded read", () => {
    const dir = runDir({
      "foundry-run.yml": "run_record_version: 1\nphases: [ {n: 1",
      "summary-nextflow.json": "{}\n",
      "nextflow-galaxy-interface.md": "# interface\n",
    });
    const model = build(dir, { reconstruct: true, pipeline: PIPELINE });
    expect(model.run.provenance).toBe("reconstructed");
    expect(codes(model)).toContain("run-record-unparseable");
  });

  it("does not let nested files a deep scan lists pick the pipeline", () => {
    const dir = runDir({ "notes.txt": "nothing declared at the top\n" });
    const archived = path.join(dir, "archive");
    mkdirSync(archived);
    for (const name of ["summary-nextflow.json", "nextflow-galaxy-interface.md"]) {
      writeFileSync(path.join(archived, name), "{}\n");
    }
    expect(() => build(dir, { reconstruct: true })).toThrow(PipelineUndeterminedError);
    expect(() => build(dir, { reconstruct: true, scan: { deepDirs: true } })).toThrow(
      PipelineUndeterminedError,
    );
  });

  it("refuses a recorded pipeline that has no assembled harness here", () => {
    const dir = runDir({
      "foundry-run.yml": record(["phases: []"], ["pipeline: no-such-pipeline"]),
      "summary-nextflow.json": "{}\n",
      "nextflow-galaxy-interface.md": "# interface\n",
    });
    expect(() => build(dir)).toThrow(PipelineUndeterminedError);
  });

  it("lets an explicit flag override an unknown recorded pipeline, and says so", () => {
    const dir = runDir({
      "foundry-run.yml": record(["phases: []"], ["pipeline: no-such-pipeline"]),
    });
    const model = build(dir, { pipeline: PIPELINE });
    expect(model.run.pipeline).toBe(PIPELINE);
    expect(codes(model)).toContain("pipeline-sources-disagree");
  });

  it("refuses an unknown --pipeline rather than ignoring it", () => {
    const dir = runDir({ "foundry-run.yml": record(["phases: []"]) });
    expect(() => build(dir, { pipeline: "no-such-pipeline" })).toThrow(PipelineUndeterminedError);
  });

  it("warns when the flag and the record name different pipelines", () => {
    const dir = runDir({ "foundry-run.yml": record(["phases: []"], ["pipeline: cwl-to-galaxy"]) });
    const model = build(dir, { pipeline: PIPELINE });
    expect(model.run.pipeline).toBe(PIPELINE);
    expect(codes(model)).toContain("pipeline-sources-disagree");
  });

  it("warns when the record and the feedback ledger name different pipelines", () => {
    const dir = runDir({
      "foundry-run.yml": record(["phases: []"]),
      "foundry-feedback.ledger.yml": "run:\n  pipeline: cwl-to-galaxy\nentries: []\n",
    });
    const model = build(dir);
    expect(model.run.pipeline).toBe(PIPELINE);
    expect(codes(model)).toContain("pipeline-sources-disagree");
  });

  it("warns when a record names no pipeline at all", () => {
    const dir = runDir({
      "foundry-run.yml": record(["phases: []"], []),
      "summary-nextflow.json": "{}\n",
      "nextflow-galaxy-interface.md": "# interface\n",
    });
    expect(codes(build(dir))).toContain("run-record-no-pipeline");
  });

  it("reports a record and a ledger that disagree on a phase's status", () => {
    const dir = runDir({
      "foundry-run.yml": record(["phases:", "  - { n: 1, status: done }"]),
      "foundry-feedback.ledger.yml": `run:\n  pipeline: ${PIPELINE}\n  phases:\n    - { n: 1, status: running }\nentries: []\n`,
    });
    const model = build(dir);
    expect(model.phases[0]!.status).toBe("done");
    expect(codes(model)).toContain("phase-status-sources-disagree");
  });

  it("reports a recorded phase the roster does not have", () => {
    const dir = runDir({ "foundry-run.yml": record(["phases:", "  - { n: 99, status: done }"]) });
    expect(codes(build(dir))).toContain("run-record-phase-not-in-roster");
  });

  it("reports a recorded skill that differs from the assembly's", () => {
    const dir = runDir({
      "foundry-run.yml": record(["phases:", "  - { n: 1, skill: some-other-mold, status: done }"]),
    });
    expect(codes(build(dir))).toContain("run-record-skill-mismatch");
  });

  it("does not warn when the recorded skill matches", () => {
    const dir = runDir({
      "foundry-run.yml": record(["phases:", `  - { n: 1, skill: ${skillOf(1)}, status: done }`]),
    });
    expect(codes(build(dir))).not.toContain("run-record-skill-mismatch");
  });

  it("reports a phase left pending that the checkpoint history shows committed", () => {
    const dir = runDir({ "foundry-run.yml": record(["phases:", "  - { n: 1, status: pending }"]) });
    const log = `${String.fromCharCode(30)}aaaa111${String.fromCharCode(31)}2026-09-18T10:00:00Z${String.fromCharCode(31)}phase 1: ${skillOf(1)}\n`;
    const model = build(dir, {
      gitExec: (args) => {
        if (args[0] === "log") return log;
        throw new Error("no object");
      },
    });
    expect(codes(model)).toContain("phase-status-disagreement");
  });

  it("keeps an unfinished record unfinished instead of borrowing a file time", () => {
    const dir = runDir({
      "foundry-run.yml": record(["finished_at: null", "phases: []"]),
      "summary-nextflow.json": "{}\n",
    });
    expect(build(dir).run.finished_at).toBeNull();
  });

  it("does not count a phase of unknown status towards how far the run got", () => {
    const dir = runDir({
      "foundry-run.yml": record([
        "phases:",
        "  - { n: 1, status: done }",
        "  - { n: 12, status: half-done }",
      ]),
    });
    const model = build(dir);
    expect(model.phases.find((phase) => phase.n === 12)!.status).toBe("unknown");
    expect(model.health.furthest_phase).toBe(1);
  });

  it("reports a recorded artifact id no Mold declares", () => {
    const dir = runDir({
      "foundry-run.yml": record([
        "phases:",
        "  - n: 1",
        "    status: done",
        "    artifacts:",
        "      - { id: no-such-artifact, file: x.json }",
      ]),
    });
    expect(codes(build(dir))).toContain("run-record-artifact-undeclared");
  });

  it("reads the record under the filename the registry declares", () => {
    const renamed: RuntimeArtifactRegistry = {
      version: 1,
      artifacts: new Map(
        [...registry.artifacts].map(([id, artifact]) => [
          id,
          id === "foundry-run-manifest"
            ? { ...artifact, default_filename: "renamed-run.yml" }
            : artifact,
        ]),
      ),
    };
    const dir = runDir({ "renamed-run.yml": record(["phases:", "  - { n: 1, status: done }"]) });
    const model = build(dir, { runtimeArtifacts: renamed });
    expect(model.run.provenance).toBe("recorded");
  });
});

describe("the assembly a record pins", () => {
  function withSha(sha: string): RunModel {
    return build(
      runDir({ "foundry-run.yml": record(["phases: []"], [`pipeline: ${PIPELINE}`, sha]) }),
    );
  }

  it("calls a missing sha unknown rather than a match, and shows no sha as recorded", () => {
    const model = build(runDir({ "foundry-run.yml": record(["phases: []"]) }));
    expect(model.run.assembly_matches_checkout).toBeNull();
    expect(model.run.assembly_sha256).toBeNull();
  });

  it("matches the checkout's own sha", () => {
    // Computed here rather than committed into a fixture: `_assembly.json` rolls up every Mold's
    // required tools, so a committed sha would break on unrelated Mold edits.
    const model = withSha(`assembly_sha256: "${currentSha}"`);
    expect(model.run.assembly_matches_checkout).toBe(true);
    expect(codes(model)).not.toContain("assembly-drifted");
  });

  it("matches regardless of case and a `sha256:` prefix", () => {
    const model = withSha(`assembly_sha256: "sha256:${currentSha.toUpperCase()}"`);
    expect(model.run.assembly_matches_checkout).toBe(true);
  });

  it("treats a sha that YAML turned into a number as unknown, not drifted", () => {
    const model = withSha("assembly_sha256: 1234567");
    expect(model.run.assembly_matches_checkout).toBeNull();
    expect(codes(model)).not.toContain("assembly-drifted");
    expect(codes(model)).toContain("run-record-token-not-quoted");
  });
});

describe("ledgers that cannot be read", () => {
  const BROKEN = "entries: [ {id: a";

  it("marks an unreadable feedback ledger rather than reporting feedback off", () => {
    const dir = runDir({
      "foundry-run.yml": record(["phases: []"]),
      "foundry-feedback.ledger.yml": BROKEN,
    });
    const model = build(dir);
    expect(model.feedback?.unreadable).toMatch(/not valid YAML/);
    expect(codes(model)).toContain("ledger-unparseable");
    const tile = model.health.tiles.find((t) => t.label === "feedback")!;
    expect(tile.value).toBe("unreadable");
    expect(tile.state).not.toBe("ok");
  });

  it("marks an unreadable obligations ledger rather than reporting none", () => {
    const dir = runDir({
      "foundry-run.yml": record(["phases: []"]),
      "open-requirements.ledger.yml": BROKEN,
    });
    const model = build(dir);
    expect(model.open_requirements?.unreadable).toMatch(/not valid YAML/);
    expect(codes(model)).toContain("ledger-unparseable");
    const tile = model.health.tiles.find((t) => t.label === "obligations")!;
    expect(tile.value).toBe("unreadable");
    expect(tile.state).not.toBe("ok");
  });
});
