import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
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

/** A `test-pipeline` run directory, laid out the way that command writes one. */
function evaluationRun(): string {
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
              {
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
                  },
                ],
              },
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

  it("reports a declared input no earlier phase promoted", () => {
    const model = runModelFromTestPipeline({
      runDir: evaluationRun(),
      repoRoot: REPO_ROOT,
      pipelineIndex: index,
      now: FIXED_CLOCK,
    });
    expect(model.warnings.map((warning) => warning.code)).toContain("missing-declared-input");
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
