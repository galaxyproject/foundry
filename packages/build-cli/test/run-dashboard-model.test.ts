import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import {
  requireRuntimeArtifactRegistry,
  type RuntimeArtifactRegistry,
} from "@galaxy-foundry/gxwf-foundry-note-schema";

import type { AssemblyManifest } from "../src/lib/cast-registry.js";
import {
  buildRunModel,
  RunRecordMissingError,
  serializeRunManifest,
} from "../src/lib/run-manifest.js";
import { buildPipelineIndex, type PipelineIndex } from "../src/lib/run-reconstruct.js";
import { createSiteLinker } from "../src/lib/run-links.js";
import { renderRunDashboard, GENERATOR_MARKER } from "../src/render/run-dashboard-html.js";
import type { RunModel } from "../src/lib/run-model.js";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const FIXTURES = path.join(REPO_ROOT, "packages/build-cli/test/fixtures/runs");
const TINY = path.join(FIXTURES, "tiny-nextflow-run");

/**
 * The fixture's checkpoint history, newest first, as `git log` would print it.
 *
 * Built here from readable rows rather than committed as a transcript, because the transcript's
 * record and field separators are control characters no editor shows.
 */
const GIT_ROWS: Array<{ sha: string; date: string; subject: string; files: string[][] }> = [
  {
    sha: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345671",
    date: "2026-09-18T10:07:32Z",
    subject: "phase 12: run-workflow-test (1 of 2 cases FAILED)",
    files: [
      ["1", "0", "workflow-test-result.json"],
      ["118", "0", "planemo-run.log"],
    ],
  },
  {
    sha: "b2c3d4e5f60718293a4b5c6d7e8f90123456712a",
    date: "2026-09-18T10:03:10Z",
    subject: "phase 7 step 4: advance-galaxy-draft-step (featureCounts endpoint)",
    files: [
      ["12", "3", "galaxy-workflow-draft.gxwf.yml"],
      ["20", "0", "galaxy-workflow.gxwf.yml"],
    ],
  },
  {
    sha: "c3d4e5f60718293a4b5c6d7e8f90123456712ab3",
    date: "2026-09-18T10:02:40Z",
    subject: "drop a stray editor swap file",
    files: [["0", "4", ".trim.swp"]],
  },
  {
    sha: "d4e5f60718293a4b5c6d7e8f90123456712ab3c4",
    date: "2026-09-18T10:02:00Z",
    subject: "phase 6: nextflow-summary-to-galaxy-template",
    files: [["18", "0", "galaxy-workflow-draft.gxwf.yml"]],
  },
  {
    sha: "e5f60718293a4b5c6d7e8f90123456712ab3c4d5",
    date: "2026-09-18T10:00:30Z",
    subject: "phase 1: summarize-nextflow",
    files: [["5", "0", "summary-nextflow.json"]],
  },
];
const GIT_LOG = GIT_ROWS.map(
  (row) =>
    `${String.fromCharCode(30)}${row.sha}${String.fromCharCode(31)}${row.date}${String.fromCharCode(31)}${row.subject}\n${row.files.map((f) => f.join("\t")).join("\n")}\n`,
).join("");

const FIXED_CLOCK = () => new Date("2026-09-18T12:00:00.000Z");
const SITE_BASE = "https://galaxyproject.github.io/foundry";

let registry: RuntimeArtifactRegistry;
let index: PipelineIndex;
let assembly: AssemblyManifest;
beforeAll(() => {
  // The same registry the CLI passes, so runtime artifacts are declared exactly as they are there.
  registry = requireRuntimeArtifactRegistry(path.join(REPO_ROOT, "runtime_artifacts.yml"));
  index = buildPipelineIndex(REPO_ROOT, registry);
  assembly = index.assemblies.get("nextflow-to-galaxy")!;
});

/** The phase number today's assembly gives a skill, so these tests follow a renumbering. */
function phaseOf(skill: string): number {
  const phase = assembly.phases.find((candidate) => candidate.skill === skill);
  if (!phase) throw new Error(`no phase runs ${skill}`);
  return phase.phase;
}

/** The fixture is read with the captured log rather than a committed nested `.git`. */
function tinyModel(overrides: Partial<Parameters<typeof buildRunModel>[0]> = {}): RunModel {
  return buildRunModel({
    runDir: TINY,
    repoRoot: REPO_ROOT,
    pipelineIndex: index,
    runtimeArtifacts: registry,
    now: FIXED_CLOCK,
    gitExec: (args) => {
      if (args[0] === "log") return GIT_LOG;
      throw new Error("no object");
    },
    linker: createSiteLinker({ repoRoot: REPO_ROOT, base: SITE_BASE }),
    ...overrides,
  });
}

describe("buildRunModel on a recorded run", () => {
  it("trusts the run record for identity and phase order", () => {
    const model = tinyModel();
    expect(model.run.provenance).toBe("recorded");
    expect(model.run.pipeline).toBe("nextflow-to-galaxy");
    expect(model.run.slug).toBe("tiny-nextflow-run");
    expect(model.run.status).toBe("failed");
    expect(model.run.foundry_head).toBe("beef0001beef0001beef0001beef0001beef0001");
    expect(model.phases).toHaveLength(assembly.phases.length);
    expect(model.phases.every((phase) => phase.status_source === "run-record")).toBe(true);
  });

  it("agrees with today's assembly, so the fixture cannot silently go stale", () => {
    const model = tinyModel();
    expect(model.warnings.filter((warning) => warning.code.startsWith("run-record-"))).toEqual([]);
    // The fixture pins no sha, so whether it matches the checkout is unknown, not assumed.
    expect(model.run.assembly_matches_checkout).toBeNull();
    expect(model.run.assembly_sha256).toBeNull();
  });

  it("declares the run record itself as a runtime artifact, not a stray", () => {
    const model = tinyModel();
    const record = model.artifacts.find((artifact) => artifact.id === "foundry-run-manifest");
    expect(record?.presence).toBe("present");
    expect(record?.source).toBe("runtime");
    expect(model.unmapped.map((file) => file.relpath)).not.toContain("foundry-run.yml");
  });

  it("carries loop iterations and the branch decision, which no file records", () => {
    const model = tinyModel();
    const loop = model.phases.find((phase) => phase.skill === "advance-galaxy-draft-step")!;
    expect(loop.loop).toBe(true);
    expect(loop.iterations).toBe(4);
    const branch = model.phases.find((phase) => phase.kind === "branch")!;
    expect(branch.selected).toBe("nextflow-to-test-data");
  });

  it("says which phase wrote each artifact", () => {
    const model = tinyModel();
    const draft = model.artifacts.find((artifact) => artifact.id === "galaxy-workflow-draft")!;
    expect(draft.presence).toBe("present");
    const template = phaseOf("nextflow-summary-to-galaxy-template");
    const loop = phaseOf("advance-galaxy-draft-step");
    expect(draft.written_by_phase).toBe(loop);
    expect(draft.writes.map((write) => write.phase)).toEqual([template, loop]);
    expect(draft.writes[1]!.iteration).toBe(4);
  });

  it("separates an artifact that is due and absent from one that is not due yet", () => {
    const model = tinyModel();
    const byId = new Map(model.artifacts.map((artifact) => [artifact.id, artifact]));
    // The validation phase ran, so its result should exist.
    const validation = byId.get("galaxy-workflow-validation-result")!;
    expect(Math.min(...validation.producing_phases)).toBe(phaseOf("validate-galaxy-workflow"));
    expect(validation.presence).toBe("missing");
    // The debug phase never started, so its report is not a defect.
    const debug = byId.get("workflow-debug-report")!;
    expect(Math.min(...debug.producing_phases)).toBe(phaseOf("debug-galaxy-workflow-output"));
    expect(debug.presence).toBe("not-yet-due");
  });

  it("reads the obligations ledger with its statuses and repair budget", () => {
    const ledger = tinyModel().open_requirements!;
    expect(ledger.counts).toMatchObject({
      open: 1,
      resolved: 1,
      surrendered: 1,
      blocking_open: 1,
      dropped: 1,
    });
    expect(ledger.topology_repair).toEqual({ escalations: 1, cap: 5, open_history: [3, 2] });
    const resolved = ledger.entries.find((entry) => entry.status === "resolved")!;
    expect(resolved.raised_by_phase).toBe(phaseOf("nextflow-summary-to-galaxy-interface"));
    expect(resolved.resolved_by_phase).toBe(phaseOf("nextflow-summary-to-galaxy-reference-data"));
  });

  it("reads the feedback ledger and links entries back to the notes they blame", () => {
    const feedback = tinyModel().feedback!;
    expect(feedback.counts.total).toBe(3);
    expect(feedback.counts.by_severity).toMatchObject({ blocker: 1, major: 1, minor: 1 });
    const blocker = feedback.entries.find((entry) => entry.severity === "blocker")!;
    expect(blocker.subject_href).toBe(`${SITE_BASE}/molds/nextflow-summary-to-galaxy-template/`);
  });

  it("reads the checkpoint history, keeping the commit that matches no grammar", () => {
    const timeline = tinyModel().timeline!;
    expect(timeline.commit_count).toBe(5);
    expect(timeline.commits.some((commit) => commit.kind === "ad-hoc")).toBe(true);
    expect(
      timeline.commits.find((commit) => commit.phase === phaseOf("run-workflow-test"))!.failed,
    ).toBe(true);
  });

  it("derives a step table from the draft, marking what is still unresolved", () => {
    const model = tinyModel();
    const draft = model.artifacts.find((artifact) => artifact.id === "galaxy-workflow-draft")!;
    const derived = draft.preview?.derived;
    expect(derived?.kind).toBe("gxwf-steps");
    if (derived?.kind !== "gxwf-steps") throw new Error("expected a step table");
    expect(derived.steps).toHaveLength(2);
    const count = derived.steps.find((step) => step.id === "count")!;
    expect(count.drafty).toBe(true);
    expect(count.todos).toEqual(["_plan_tool"]);
    expect(derived.steps.find((step) => step.id === "trim")!.drafty).toBe(false);
  });

  it("summarizes a test result rather than only dumping it", () => {
    const model = tinyModel();
    const result = model.artifacts.find((artifact) => artifact.id === "workflow-test-result")!;
    const derived = result.preview?.derived;
    expect(derived?.kind).toBe("test-result");
    if (derived?.kind !== "test-result") throw new Error("expected a test summary");
    expect(derived.result).toBe("red");
    expect(derived.cases).toEqual([
      { name: "case-one", status: "success" },
      { name: "case-two", status: "failure" },
    ]);
  });

  it("rolls the run up to an error when a phase failed", () => {
    const model = tinyModel();
    expect(model.health.overall).toBe("error");
    expect(model.health.total_phases).toBe(assembly.phases.length);
  });

  it("never writes an absolute path into the manifest's relative fields", () => {
    const model = tinyModel();
    for (const artifact of model.artifacts) {
      if (artifact.path) expect(path.isAbsolute(artifact.path)).toBe(false);
    }
    for (const file of model.unmapped) {
      expect(path.isAbsolute(file.relpath)).toBe(false);
    }
  });

  it("leaves artifact bodies out of the serialized manifest", () => {
    const model = tinyModel();
    const manifest = JSON.parse(serializeRunManifest(model)) as RunModel;
    expect(manifest.run_manifest_schema_version).toBe(1);
    for (const artifact of manifest.artifacts) {
      expect(artifact.preview?.body ?? null).toBeNull();
    }
    // The in-memory model still carries them, which is what the page renders from.
    expect(model.artifacts.find((a) => a.id === "summary-nextflow")!.preview!.body).toBeTruthy();
  });
});

describe("serializeRunManifest", () => {
  it("abbreviates a run directory under home, keeping the model's own path absolute", () => {
    const model = tinyModel();
    const manifest = JSON.parse(serializeRunManifest(model, path.dirname(TINY))) as RunModel;
    expect(manifest.run.dir).toBe("~/tiny-nextflow-run");
    expect(model.run.dir).toBe(TINY);
  });

  it("leaves a run directory outside home as it is", () => {
    const model = tinyModel();
    const manifest = JSON.parse(serializeRunManifest(model, "/nowhere/else")) as RunModel;
    expect(manifest.run.dir).toBe(TINY);
  });
});

describe("buildRunModel without a run record", () => {
  it("refuses rather than guessing", () => {
    const empty = mkdtempSync(path.join(tmpdir(), "foundry-run-test-"));
    writeFileSync(path.join(empty, "summary-nextflow.json"), "{}\n");
    expect(() =>
      buildRunModel({ runDir: empty, repoRoot: REPO_ROOT, pipelineIndex: index, now: FIXED_CLOCK }),
    ).toThrow(RunRecordMissingError);
  });

  it("reads one degraded and labelled when asked to", () => {
    const model = buildRunModel({
      runDir: path.join(REPO_ROOT, "casts/claude/_emulated-runs/nf-core-demo"),
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      reconstruct: true,
      now: FIXED_CLOCK,
    });
    expect(model.run.provenance).toBe("reconstructed");
    expect(model.run.pipeline).toBe("nextflow-to-galaxy");
    // Nothing recorded which phase wrote what, and the model says so rather than inventing it.
    expect(model.artifacts.every((artifact) => artifact.written_by_phase === null)).toBe(true);
    expect(model.timeline).toBeNull();
  });
});

describe("a run record that no longer matches the checkout", () => {
  it("says the harness changed instead of quietly describing the wrong pipeline", () => {
    const stale = mkdtempSync(path.join(tmpdir(), "foundry-run-stale-"));
    writeFileSync(
      path.join(stale, "foundry-run.yml"),
      [
        "run_record_version: 1",
        "pipeline: nextflow-to-galaxy",
        "run_slug: stale-run",
        "harness_name: pipeline-nextflow-to-galaxy",
        "assembly_sha256: " + "dead".repeat(16),
        "status: complete",
        "phases:",
        "  - { n: 1, kind: mold, skill: summarize-nextflow, status: done }",
        "",
      ].join("\n"),
    );
    const model = buildRunModel({
      runDir: stale,
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    expect(model.run.assembly_matches_checkout).toBe(false);
    expect(model.warnings.map((warning) => warning.code)).toContain("assembly-drifted");
  });
});

describe("renderRunDashboard", () => {
  function render(model: RunModel, base = SITE_BASE): string {
    return renderRunDashboard(model, {
      siteBase: base,
      manifestJson: serializeRunManifest(model),
      commandLine: "foundry-build run-dashboard tiny-nextflow-run",
    });
  }

  it("loads nothing over a network", () => {
    const html = render(tinyModel());
    expect(html).toContain("Content-Security-Policy");
    expect(html).not.toContain("<script src=");
    expect(html).not.toContain('<link rel="stylesheet"');
    expect(html).not.toContain("@import");
    expect(html).not.toContain("url(http");
  });

  it("emits no external link at all when told to stay offline", () => {
    const offline = tinyModel({ linker: createSiteLinker({ repoRoot: REPO_ROOT, base: "" }) });
    const html = render(offline, "");
    expect(html).not.toContain('href="http');
    expect(html).not.toContain('src="http');
  });

  it("stays readable with scripting off", () => {
    const html = render(tinyModel());
    const details = html.match(/<details/g)?.length ?? 0;
    const summaries = html.match(/<summary/g)?.length ?? 0;
    expect(details).toBeGreaterThan(0);
    expect(details).toBe(summaries);
    expect(html).not.toContain('class="hidden-row"');
  });

  it("shows every artifact the run declared", () => {
    const model = tinyModel();
    // Only the rendered page counts: the inlined manifest below it names every id regardless.
    const html = render(model);
    const page = html.slice(0, html.indexOf('id="run-manifest"'));
    expect(page.length).toBeGreaterThan(0);
    for (const artifact of model.artifacts) expect(page).toContain(artifact.id);
  });

  it("escapes content that would otherwise break the page", () => {
    const model = tinyModel();
    model.open_requirements!.entries[0]!.note =
      "</script><script>alert(1)</script> and ]]> for good measure";
    const html = render(model);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    // The inlined manifest must survive it too.
    const body = html.slice(html.indexOf('id="run-manifest"'));
    expect(body).toContain("\\u003c/script\\u003e");
  });

  it("is byte-identical across renders of the same model", () => {
    expect(render(tinyModel())).toBe(render(tinyModel()));
  });

  it("carries the marker that stops it overwriting someone else's file", () => {
    expect(render(tinyModel())).toContain(GENERATOR_MARKER);
  });
});
