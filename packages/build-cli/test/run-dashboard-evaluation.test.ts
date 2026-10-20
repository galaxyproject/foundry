import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import {
  isTestPipelineRunDir,
  runModelFromTestPipeline,
} from "../src/lib/run-adapter-test-pipeline.js";
import { buildPipelineIndex, type PipelineIndex } from "../src/lib/run-reconstruct.js";
import { renderRunDashboard } from "../src/render/run-dashboard-html.js";
import { serializeRunManifest } from "../src/lib/run-manifest.js";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const FIXED_CLOCK = () => new Date("2026-09-18T12:00:00.000Z");

let index: PipelineIndex;
beforeAll(() => {
  index = buildPipelineIndex(REPO_ROOT);
});

/** Phase 1 of a trial, having written and validated its one declared artifact. */
function summarizePhase(artifact: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    phase: 1,
    skill: "summarize-nextflow",
    status: "passed",
    run_dir: "trial-001/phase-001-summarize-nextflow",
    declared_input_ids: [],
    missing_input_ids: [],
    artifacts: [
      {
        id: "summary-nextflow",
        path: "summary-nextflow.json",
        status: "passed",
        sha256: "a".repeat(64),
        validator: {
          bin: "foundry",
          args: ["validate-artifact"],
          exit_code: 0,
          stdout_path: "validation/summary-nextflow.stdout",
          stderr_path: "validation/summary-nextflow.stderr",
        },
        ...artifact,
      },
    ],
  };
}

/** A `test-pipeline` run directory, laid out the way that command writes one. */
function evaluationRun(record: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(path.join(tmpdir(), "foundry-pi-pipeline-run-"));
  const phaseOne = path.join(dir, "trial-001", "phase-001-summarize-nextflow", "workspace");
  mkdirSync(phaseOne, { recursive: true });
  writeFileSync(
    path.join(phaseOne, "summary-nextflow.json"),
    JSON.stringify({ pipeline: "demo", processes: 2 }, null, 2),
  );

  writeFileSync(
    path.join(dir, "run.json"),
    JSON.stringify(
      {
        pipeline_run_schema_version: 1,
        run_id: "run-abc",
        status: "failed",
        started_at: "2026-09-18T10:00:00.000Z",
        finished_at: "2026-09-18T10:12:00.000Z",
        duration_ms: 720_000,
        pipeline: "nextflow-to-galaxy",
        source_revision: 4,
        harness_name: "pipeline-nextflow-to-galaxy",
        assembly_sha256: "f".repeat(64),
        through_phase: 2,
        scenario: { name: "nf-core/demo end to end" },
        engine: { name: "pi", provider: "anthropic", model: "a-model", thinking: "medium" },
        sandbox: { mode: "container", network_policy: "none" },
        usage: { total_tokens: 91_000, cost: 1.25, turns: 42, tool_calls: 18 },
        trials: [
          {
            trial: 1,
            status: "failed",
            phases: [
              summarizePhase(),
              {
                phase: 2,
                skill: "nextflow-summary-to-galaxy-reference-data",
                status: "failed",
                failure_kind: "worker",
                error: "the worker timed out",
                run_dir: "trial-001/phase-002-nextflow-summary-to-galaxy-reference-data",
                declared_input_ids: ["summary-nextflow", "open-requirements-ledger"],
                missing_input_ids: ["open-requirements-ledger"],
                artifacts: [],
              },
            ],
          },
        ],
        ...record,
      },
      null,
      2,
    ),
  );
  return dir;
}

describe("the evaluation run shape", () => {
  it("is told apart from a harness run without ambiguity", () => {
    expect(isTestPipelineRunDir(evaluationRun())).toBe(true);
    expect(
      isTestPipelineRunDir(path.join(REPO_ROOT, "casts/claude/_emulated-runs/nf-core-demo")),
    ).toBe(false);
  });

  it("reads into the same model, with the evaluation half filled in", () => {
    const model = runModelFromTestPipeline({
      runDir: evaluationRun(),
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });

    expect(model.run.shape).toBe("test-pipeline");
    expect(model.run.provenance).toBe("recorded");
    expect(model.run.pipeline).toBe("nextflow-to-galaxy");
    expect(model.run.status).toBe("failed");
    expect(model.evaluation?.usage.cost).toBe(1.25);
    expect(model.evaluation?.selected_trial).toBe(1);
    // The harness-only halves stay empty rather than being faked.
    expect(model.timeline).toBeNull();
    expect(model.feedback).toBeNull();
    expect(model.open_requirements).toBeNull();
  });

  it("carries a phase's validator verdict, which a harness run cannot have", () => {
    const model = runModelFromTestPipeline({
      runDir: evaluationRun(),
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    const summary = model.artifacts.find((artifact) => artifact.id === "summary-nextflow")!;
    expect(summary.presence).toBe("present");
    expect(summary.written_by_phase).toBe(1);
    expect(summary.validation?.exit_code).toBe(0);
    expect(summary.path).toContain("trial-001/phase-001-summarize-nextflow/workspace");
  });

  it("reads a record whose run has not finished as running, not complete", () => {
    const options = { repoRoot: REPO_ROOT, pipelineIndex: index, now: FIXED_CLOCK };
    const passedTrial = { trial: 1, status: "passed", phases: [summarizePhase()] };

    // Died during trial 2 of 3: the last write was after trial 1.
    const interrupted = runModelFromTestPipeline({
      ...options,
      runDir: evaluationRun({
        status: "running",
        finished_at: null,
        trials_requested: 3,
        trials: [passedTrial],
      }),
    });
    expect(interrupted.run.status).toBe("running");
    expect(interrupted.run.finished_at).toBeNull();
    expect(interrupted.health.tiles.find((tile) => tile.label === "run")).toEqual(
      expect.objectContaining({ state: "warn", detail: "trial 1 of 3" }),
    );
    expect(interrupted.warnings.map((warning) => warning.code)).toContain("run-unfinished");

    // A terminal status with trials still owed is not a finished run either.
    const shortOfTrials = runModelFromTestPipeline({
      ...options,
      runDir: evaluationRun({ status: "passed", trials_requested: 3, trials: [passedTrial] }),
    });
    expect(shortOfTrials.run.status).toBe("running");

    // Records written before `trials_requested` existed read as they always did.
    const legacy = runModelFromTestPipeline({
      ...options,
      runDir: evaluationRun({ status: "passed", trials: [passedTrial] }),
    });
    expect(legacy.run.status).toBe("complete");
    expect(legacy.warnings.map((warning) => warning.code)).not.toContain("run-unfinished");

    // Still in, or killed during, its first trial: nothing has been recorded yet.
    const firstTrial = runModelFromTestPipeline({
      ...options,
      runDir: evaluationRun({
        status: "running",
        finished_at: null,
        trials_requested: 1,
        trials: [],
      }),
    });
    expect(firstTrial.run.status).toBe("running");
    expect(firstTrial.evaluation?.selected_trial).toBeNull();
    expect(firstTrial.phases.every((phase) => phase.status !== "done")).toBe(true);
    expect(firstTrial.warnings.map((warning) => warning.code)).toContain("run-unfinished");
  });

  it("surfaces why a phase failed", () => {
    const model = runModelFromTestPipeline({
      runDir: evaluationRun(),
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    const failed = model.warnings.filter((warning) => warning.code === "phase-failed");
    expect(failed).toEqual([
      {
        code: "phase-failed",
        message:
          "phase 2 (nextflow-summary-to-galaxy-reference-data) failed (worker): the worker timed out",
        subject: "nextflow-summary-to-galaxy-reference-data",
      },
    ]);
  });

  it("points validator output at the phase that ran it", () => {
    const model = runModelFromTestPipeline({
      runDir: evaluationRun(),
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    const summary = model.artifacts.find((artifact) => artifact.id === "summary-nextflow")!;
    expect(summary.validation).toEqual({
      validator: "foundry",
      status: "passed",
      exit_code: 0,
      stdout: "trial-001/phase-001-summarize-nextflow/validation/summary-nextflow.stdout",
      stderr: "trial-001/phase-001-summarize-nextflow/validation/summary-nextflow.stderr",
    });
  });

  it("does not call an artifact that failed validation present", () => {
    const model = runModelFromTestPipeline({
      runDir: evaluationRun({
        trials: [
          {
            trial: 1,
            status: "failed",
            phases: [
              summarizePhase({
                status: "failed",
                validator: {
                  bin: "foundry",
                  args: ["validate-artifact"],
                  exit_code: 1,
                  stdout_path: "validation/summary-nextflow.stdout",
                  stderr_path: "validation/summary-nextflow.stderr",
                },
              }),
            ],
          },
        ],
      }),
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    const summary = model.artifacts.find((artifact) => artifact.id === "summary-nextflow")!;
    expect(summary.presence).toBe("failed");
    expect(summary.size_bytes).toBeGreaterThan(0);
    expect(summary.validation).toEqual(expect.objectContaining({ status: "failed", exit_code: 1 }));
    expect(model.warnings).toContainEqual({
      code: "artifact-failed",
      message:
        "summary-nextflow from phase 1 failed (validator exit 1); see trial-001/phase-001-summarize-nextflow/validation/summary-nextflow.stderr",
      subject: "summary-nextflow",
    });
    expect(model.health.artifacts_present).toBe(0);
    expect(model.health.tiles.find((tile) => tile.label === "artifacts")?.state).toBe("error");
  });

  it("reports a declared input no earlier phase promoted", () => {
    const model = runModelFromTestPipeline({
      runDir: evaluationRun(),
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    expect(model.warnings.map((warning) => warning.code)).toContain("missing-declared-input");
  });

  it("does not report a carried input the phase starts and writes itself", () => {
    const ledger = {
      id: "open-requirements-ledger",
      path: "open-requirements.ledger.yml",
      status: "present",
      sha256: "b".repeat(64),
    };
    const model = runModelFromTestPipeline({
      runDir: evaluationRun({
        status: "passed",
        trials: [
          {
            trial: 1,
            status: "passed",
            phases: [
              summarizePhase(),
              {
                phase: 2,
                skill: "nextflow-summary-to-galaxy-reference-data",
                status: "passed",
                run_dir: "trial-001/phase-002-nextflow-summary-to-galaxy-reference-data",
                declared_input_ids: ["summary-nextflow", "open-requirements-ledger"],
                missing_input_ids: ["open-requirements-ledger"],
                artifacts: [ledger],
              },
            ],
          },
        ],
      }),
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    expect(model.warnings.map((warning) => warning.code)).not.toContain("missing-declared-input");
  });

  it("keeps a loop phase to one row and finds each artifact in the iteration that wrote it", () => {
    const loopDir = "trial-001/phase-007-advance-galaxy-draft-step";
    const draft = {
      id: "galaxy-workflow-draft",
      path: "galaxy-workflow-draft.gxwf.yml",
      status: "passed",
      sha256: "d".repeat(64),
    };
    const workflow = {
      id: "galaxy-workflow",
      path: "galaxy-workflow.gxwf.yml",
      status: "present",
      sha256: "e".repeat(64),
    };
    const iteration = (n: number, artifacts: Record<string, unknown>[]) => ({
      iteration: n,
      next_step: n === 1 ? ["trim reads"] : null,
      status: "passed",
      run_dir: `${loopDir}/iteration-00${n}`,
      resolved_inputs: [],
      missing_input_ids: [],
      artifacts,
    });
    const runDir = evaluationRun({
      status: "passed",
      through_phase: 7,
      trials: [
        {
          trial: 1,
          status: "passed",
          phases: [
            summarizePhase(),
            {
              phase: 7,
              skill: "advance-galaxy-draft-step",
              status: "passed",
              run_dir: loopDir,
              declared_input_ids: ["galaxy-workflow-draft", "open-requirements-ledger"],
              missing_input_ids: [],
              artifacts: [draft, workflow],
              iterations: [
                iteration(1, [draft, { ...workflow, status: "missing", sha256: undefined }]),
                iteration(2, [{ ...draft, status: "missing", sha256: undefined }, workflow]),
              ],
            },
          ],
        },
      ],
    });
    for (const [n, file] of [
      [1, "galaxy-workflow-draft.gxwf.yml"],
      [2, "galaxy-workflow.gxwf.yml"],
    ] as const) {
      const workspace = path.join(runDir, loopDir, `iteration-00${n}`, "workspace");
      mkdirSync(workspace, { recursive: true });
      writeFileSync(path.join(workspace, file), "class: GalaxyWorkflow\n");
    }

    const model = runModelFromTestPipeline({
      runDir,
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    const loop = model.phases.find((phase) => phase.n === 7)!;
    expect(loop).toEqual(expect.objectContaining({ loop: true, iterations: 2, status: "done" }));
    const byId = (id: string) => model.artifacts.find((artifact) => artifact.id === id)!;
    expect(byId("galaxy-workflow")).toEqual(
      expect.objectContaining({
        path: `${loopDir}/iteration-002/workspace/galaxy-workflow.gxwf.yml`,
        written_by_phase: 7,
        writes: [{ at: null, phase: 7, iteration: 2 }],
      }),
    );
    expect(byId("galaxy-workflow").size_bytes).toBeGreaterThan(0);
    expect(byId("galaxy-workflow-draft")).toEqual(
      expect.objectContaining({
        path: `${loopDir}/iteration-001/workspace/galaxy-workflow-draft.gxwf.yml`,
        writes: [{ at: null, phase: 7, iteration: 1 }],
      }),
    );
  });

  it("keeps a branch phase to one row, reads it as blocked, and finds artifacts in their leg", () => {
    const branchDir = "trial-001/phase-008-test-data-resolution";
    const refs = (sha: string) => ({
      id: "test-data-refs",
      path: "test-data-refs.json",
      status: "passed",
      sha256: sha.repeat(64),
    });
    const leg = (n: number, skill: string, unresolved: string[]) => ({
      leg: n,
      skill,
      unresolved,
      status: "passed",
      run_dir: `${branchDir}/leg-${n}-${skill}`,
      resolved_inputs: [],
      missing_input_ids: [],
      artifacts: [refs(String(n))],
    });
    const runDir = evaluationRun({
      status: "blocked",
      through_phase: 8,
      trials: [
        {
          trial: 1,
          status: "blocked",
          phases: [
            summarizePhase(),
            {
              phase: 8,
              skill: "test-data-resolution",
              status: "blocked",
              error:
                "test-data-resolution left 1 input unresolved after find-test-data: reads; the next step, user-supplied, needs a person",
              run_dir: branchDir,
              declared_input_ids: ["summary-nextflow", "nextflow-galaxy-interface"],
              missing_input_ids: [],
              artifacts: [refs("2")],
              legs: [
                leg(1, "nextflow-to-test-data", ["reads"]),
                leg(2, "find-test-data", ["reads"]),
              ],
            },
          ],
        },
      ],
    });
    for (const [n, skill] of [
      [1, "nextflow-to-test-data"],
      [2, "find-test-data"],
    ] as const) {
      const workspace = path.join(runDir, branchDir, `leg-${n}-${skill}`, "workspace");
      mkdirSync(workspace, { recursive: true });
      writeFileSync(path.join(workspace, "test-data-refs.json"), '{"refs": []}\n');
    }

    const model = runModelFromTestPipeline({
      runDir,
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    expect(model.run.status).toBe("blocked");
    const branch = model.phases.find((phase) => phase.n === 8)!;
    expect(branch).toEqual(
      expect.objectContaining({
        kind: "branch",
        status: "blocked",
        selected: "find-test-data",
        iterations: null,
      }),
    );
    expect(model.artifacts.find((artifact) => artifact.id === "test-data-refs")).toEqual(
      expect.objectContaining({
        path: `${branchDir}/leg-2-find-test-data/workspace/test-data-refs.json`,
        written_by_phase: 8,
        writes: [
          { at: null, phase: 8, iteration: null, leg: 1 },
          { at: null, phase: 8, iteration: null, leg: 2 },
        ],
      }),
    );
    expect(model.warnings).toContainEqual(
      expect.objectContaining({
        code: "phase-blocked",
        message:
          "phase 8 (test-data-resolution) blocked: test-data-resolution left 1 input unresolved after find-test-data: reads; the next step, user-supplied, needs a person",
      }),
    );
    expect(model.health.tiles.find((tile) => tile.label === "run")?.state).toBe("warn");
    const html = renderRunDashboard(model, {
      siteBase: "",
      manifestJson: serializeRunManifest(model),
      commandLine: "foundry-build run-dashboard run-abc",
    });
    expect(html).toContain('data-status="blocked"');
  });

  it("names the branch leg whose artifact failed validation", () => {
    const branchDir = "trial-001/phase-008-test-data-resolution";
    const runDir = evaluationRun({
      status: "failed",
      through_phase: 8,
      trials: [
        {
          trial: 1,
          status: "failed",
          phases: [
            summarizePhase(),
            {
              phase: 8,
              skill: "test-data-resolution",
              status: "failed",
              failure_kind: "skill",
              error:
                "leg 1 (nextflow-to-test-data): declared artifact did not pass: test-data-refs (failed)",
              run_dir: branchDir,
              declared_input_ids: ["summary-nextflow", "nextflow-galaxy-interface"],
              missing_input_ids: [],
              artifacts: [],
              legs: [
                {
                  leg: 1,
                  skill: "nextflow-to-test-data",
                  unresolved: null,
                  status: "failed",
                  failure_kind: "skill",
                  run_dir: `${branchDir}/leg-1-nextflow-to-test-data`,
                  resolved_inputs: [],
                  missing_input_ids: [],
                  artifacts: [
                    {
                      id: "test-data-refs",
                      path: "test-data-refs.json",
                      status: "failed",
                      sha256: "1".repeat(64),
                      validator: {
                        bin: "foundry",
                        exit_code: 1,
                        stdout_path: "validation/test-data-refs.stdout",
                        stderr_path: "validation/test-data-refs.stderr",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const model = runModelFromTestPipeline({
      runDir,
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    expect(model.warnings).toContainEqual(
      expect.objectContaining({
        code: "artifact-failed",
        message: `test-data-refs from phase 8 leg 1 (nextflow-to-test-data) failed (validator exit 1); see ${branchDir}/leg-1-nextflow-to-test-data/validation/test-data-refs.stderr`,
      }),
    );
  });

  it("reads a run the budget stopped as cancelled, not running, and names the phase it stopped", () => {
    const runDir = evaluationRun({
      status: "cancelled",
      trials_requested: 2,
      trials: [
        {
          trial: 1,
          status: "cancelled",
          phases: [
            summarizePhase(),
            {
              phase: 2,
              skill: "nextflow-summary-to-galaxy-reference-data",
              status: "cancelled",
              failure_kind: "budget",
              error: "run budget spent before phase 2: cost 1.25 of --max-cost 1",
              run_dir: "trial-001/phase-002-nextflow-summary-to-galaxy-reference-data",
              declared_input_ids: ["summary-nextflow"],
              missing_input_ids: [],
              artifacts: [],
            },
          ],
        },
      ],
    });
    const model = runModelFromTestPipeline({
      runDir,
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    expect(model.run.status).toBe("cancelled");
    const codes = model.warnings.map((warning) => warning.code);
    expect(codes).not.toContain("run-unfinished");
    expect(model.warnings).toContainEqual(
      expect.objectContaining({
        code: "trials-skipped",
        message: "stopped after 1 of 2 trial(s)",
      }),
    );
    expect(model.phases.find((phase) => phase.n === 2)?.status).toBe("failed");
  });

  it("names the loop iteration whose artifact failed validation", () => {
    const loopDir = "trial-001/phase-007-advance-galaxy-draft-step";
    const failedWorkflow = {
      id: "galaxy-workflow",
      path: "galaxy-workflow.gxwf.yml",
      status: "failed",
      sha256: "e".repeat(64),
      validator: {
        bin: "gxwf",
        args: ["validate"],
        exit_code: 1,
        stdout_path: "validation/galaxy-workflow.stdout",
        stderr_path: "validation/galaxy-workflow.stderr",
      },
    };
    const model = runModelFromTestPipeline({
      runDir: evaluationRun({
        through_phase: 7,
        trials: [
          {
            trial: 1,
            status: "failed",
            phases: [
              summarizePhase(),
              {
                phase: 7,
                skill: "advance-galaxy-draft-step",
                status: "failed",
                run_dir: loopDir,
                declared_input_ids: [],
                missing_input_ids: [],
                artifacts: [failedWorkflow],
                iterations: [
                  {
                    iteration: 3,
                    next_step: null,
                    status: "failed",
                    run_dir: `${loopDir}/iteration-003`,
                    resolved_inputs: [],
                    missing_input_ids: [],
                    artifacts: [failedWorkflow],
                  },
                ],
              },
            ],
          },
        ],
      }),
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    expect(model.warnings).toContainEqual({
      code: "artifact-failed",
      message: `galaxy-workflow from phase 7 iteration 3 failed (validator exit 1); see ${loopDir}/iteration-003/validation/galaxy-workflow.stderr`,
      subject: "galaxy-workflow",
    });
  });

  it("judges assembly drift the way a harness run's record is judged", () => {
    const options = { repoRoot: REPO_ROOT, pipelineIndex: index, now: FIXED_CLOCK };
    const current = createHash("sha256")
      .update(
        readFileSync(
          path.join(REPO_ROOT, "casts/claude/skills/pipeline-nextflow-to-galaxy/_assembly.json"),
        ),
      )
      .digest("hex");
    const drift = (record: Record<string, unknown>) => {
      const model = runModelFromTestPipeline({ ...options, runDir: evaluationRun(record) });
      return {
        matches: model.run.assembly_matches_checkout,
        warned: model.warnings.some((warning) => warning.code === "assembly-drifted"),
      };
    };

    expect(drift({ assembly_sha256: `sha256:${current.toUpperCase()}` })).toEqual({
      matches: true,
      warned: false,
    });
    expect(drift({ assembly_sha256: "f".repeat(64) })).toEqual({ matches: false, warned: true });
    expect(drift({ assembly_sha256: null })).toEqual({ matches: null, warned: false });
  });

  it("pins the run to the Foundry commit it recorded, not the one rendering it", () => {
    const options = { repoRoot: REPO_ROOT, pipelineIndex: index, now: FIXED_CLOCK };
    const recorded = runModelFromTestPipeline({
      ...options,
      runDir: evaluationRun({ foundry_head: "1".repeat(40) }),
      foundryHead: "2".repeat(40),
    });
    expect(recorded.run.foundry_head).toBe("1".repeat(40));
    expect(recorded.generator.foundry_head).toBe("2".repeat(40));

    const unrecorded = runModelFromTestPipeline({
      ...options,
      runDir: evaluationRun(),
      foundryHead: "2".repeat(40),
    });
    expect(unrecorded.run.foundry_head).toBeNull();
  });

  it("marks phases past the evaluated prefix as skipped, not pending", () => {
    const model = runModelFromTestPipeline({
      runDir: evaluationRun(),
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    const byNumber = new Map(model.phases.map((phase) => [phase.n, phase]));
    expect(byNumber.get(1)!.status).toBe("done");
    expect(byNumber.get(2)!.status).toBe("failed");
    expect(byNumber.get(5)!.status).toBe("skipped");
  });

  it("renders with an evaluation section in place of a timeline", () => {
    const model = runModelFromTestPipeline({
      runDir: evaluationRun(),
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    const html = renderRunDashboard(model, {
      siteBase: "",
      manifestJson: serializeRunManifest(model),
      commandLine: "foundry-build run-dashboard run-abc",
    });
    expect(html).toContain('id="evaluation"');
    expect(html).not.toContain('id="timeline"');
    expect(html).toContain("nf-core/demo end to end");
  });
});
