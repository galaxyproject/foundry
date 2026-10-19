import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import type { PiSkillRunRecord, RunPiSkillOptions } from "@galaxy-foundry/gxwf-pi-harness";
import { nextDraftStep } from "@galaxy-tool-util/schema";
import { dump as dumpYaml, load as loadYaml } from "js-yaml";
import { expect, test } from "vitest";

import {
  defaultTestPipelineRunDir,
  parseTestPipelineArgs,
  runLinearPipeline,
} from "../src/commands/test-pipeline.js";
import { foundryHead } from "../src/lib/foundry-head.js";

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeOAuthStore(authDir: string): void {
  writeJson(path.join(authDir, "auth.json"), {
    "openai-codex": {
      type: "oauth",
      access: "access-secret",
      refresh: "refresh-secret",
      expires: Date.now() + 60_000,
    },
  });
}

function writeSkill(
  root: string,
  name: string,
  consumes: string[],
  produces: Array<{ id: string; default_filename: string; optional?: boolean }>,
): void {
  const skillDir = path.join(root, "casts", "claude", "skills", name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(skillDir + "/SKILL.md", `---\nname: ${name}\ndescription: test\n---\n`);
  writeJson(skillDir + "/_provenance.json", {
    artifacts: {
      consumes: consumes.map((id) => ({ id })),
      produces,
    },
  });
}

function fixtureRepo(): string {
  const root = mkdtempSync(path.join(tmpdir(), "foundry-test-pipeline-"));
  const pipelineDir = path.join(root, "content", "pipelines", "demo-pipeline");
  mkdirSync(pipelineDir, { recursive: true });
  writeFileSync(
    path.join(pipelineDir, "scenarios.md"),
    "# Scenarios\n\n##  Case: tiny journey\n\n- fixture: workflow-fixtures/pipelines/tiny\n- expect: success\n",
  );
  mkdirSync(path.join(root, "workflow-fixtures", "pipelines", "tiny"), { recursive: true });
  writeFileSync(
    path.join(root, "workflow-fixtures", "pipelines", "tiny", "main.nf"),
    "nextflow.enable.dsl=2\n",
  );

  writeJson(
    path.join(root, "casts", "claude", "skills", "pipeline-demo-pipeline", "_assembly.json"),
    {
      source_pipeline: "demo-pipeline",
      source_revision: 1,
      harness_name: "pipeline-demo-pipeline",
      phases: [
        { phase: 1, kind: "mold", skill: "summarize", cast_present: true, loop: false },
        { phase: 2, kind: "mold", skill: "design", cast_present: true, loop: false },
        { phase: 3, kind: "branch", pattern: "unsupported", chain: ["finish"] },
      ],
    },
  );
  writeSkill(
    root,
    "summarize",
    [],
    [
      { id: "summary", default_filename: "summary.json" },
      { id: "unused", default_filename: "unused.txt" },
    ],
  );
  writeSkill(
    root,
    "design",
    ["summary", "optional-ledger"],
    [{ id: "design", default_filename: "design.md" }],
  );
  return root;
}

function fakeRecord(options: RunPiSkillOptions, skill: string): PiSkillRunRecord {
  return {
    run_schema_version: 1,
    run_id: `${skill}-run`,
    status: "passed",
    started_at: "2026-09-09T00:00:00.000Z",
    finished_at: "2026-09-09T00:00:01.000Z",
    duration_ms: 1000,
    engine: {
      name: "pi",
      version: "test",
      provider: options.provider,
      requested_model: options.model,
    },
    invocation: {
      skill,
      skill_path: options.skillDir,
      skill_sha256: "skill-hash",
      prompt_sha256: "prompt-hash",
      explicit_activation: `/skill:${skill}`,
      tools: [],
      timeout_ms: options.timeoutMs ?? 600000,
      ambient_discovery_disabled: true,
    },
    sandbox: {
      mode: "local",
      security_boundary: false,
      network_policy: "host",
      credential_policy: "ambient-environment",
      credential_auth_store: options.piTestAuthDir ? "pi-test-auth" : "none",
      workdir: "workspace",
      agent_config_dir: "pi-agent",
    },
    inputs: [],
    artifacts: (options.expectedArtifacts ?? []).map((artifact) => ({
      ...artifact,
      status: "present",
      sha256: createHash("sha256").update(artifact.id).digest("hex"),
    })),
    trace_path: "trace.jsonl",
    stderr_path: "stderr.log",
  };
}

test("test-pipeline defaults to a unique OS-temporary run directory", () => {
  expect(
    defaultTestPipelineRunDir(
      "nextflow-to-galaxy",
      new Date("2026-09-09T12:34:56.789Z"),
      "00000000-0000-4000-8000-000000000000",
    ),
  ).toBe(
    path.join(
      tmpdir(),
      "foundry-pi-pipeline-run-nextflow-to-galaxy-2026-09-09T12-34-56-789Z-00000000-0000-4000-8000-000000000000",
    ),
  );
});

test("runs a linear prefix in fresh workers with declared artifact handoffs", async () => {
  const root = fixtureRepo();
  const runDir = path.join(root, "runs", "linear");
  const authDir = path.join(root, "pi-test-auth");
  writeOAuthStore(authDir);
  const calls: RunPiSkillOptions[] = [];

  const record = await runLinearPipeline(
    {
      repoRoot: root,
      pipeline: "demo-pipeline",
      scenario: "tiny journey",
      through: "2",
      trials: 2,
      runDir,
      provider: "openai-codex",
      model: "test-model",
      sandbox: "local",
      timeoutMs: 1000,
      credentialEnv: [],
      sandboxNetwork: "none",
      piTestAuthDir: authDir,
    },
    {
      runSkill: async (options) => {
        calls.push(options);
        const skill = path.basename(options.skillDir);
        const workspace = path.join(options.runDir, "workspace");
        mkdirSync(workspace, { recursive: true });
        for (const artifact of options.expectedArtifacts ?? []) {
          writeFileSync(path.join(workspace, artifact.path), artifact.id);
        }
        return fakeRecord(options, skill);
      },
      now: () => new Date("2026-09-09T00:00:00.000Z"),
      id: () => "pipeline-run-id",
    },
  );

  expect(record.status).toBe("passed");
  expect(record.trials).toHaveLength(2);
  expect(record.trials[0]?.phases.map((phase) => phase.skill)).toEqual(["summarize", "design"]);
  expect(record.trials[1]?.phases.map((phase) => phase.skill)).toEqual(["summarize", "design"]);
  expect(record.trials[0]?.phases[1]?.missing_input_ids).toEqual(["optional-ledger"]);
  expect(record.trials[0]?.phases[1]?.resolved_inputs).toEqual([
    expect.objectContaining({
      id: "summary",
      path: "trial-001/phase-001-summarize/workspace/summary.json",
      producer_phase: 1,
    }),
  ]);
  expect(calls).toHaveLength(4);
  expect(calls.every((call) => call.piTestAuthDir === authDir)).toBe(true);
  expect(record.sandbox.credential_auth_store).toBe("pi-test-auth");
  expect(calls[0]?.inputPaths).toEqual([path.join(root, "workflow-fixtures", "pipelines", "tiny")]);
  expect(calls[1]?.inputPaths).toEqual([
    path.join(runDir, "trial-001", "phase-001-summarize", "workspace", "summary.json"),
  ]);
  expect(calls[1]?.inputPaths).not.toContain(
    path.join(runDir, "trial-001", "phase-001-summarize", "workspace", "unused.txt"),
  );
  expect(calls[2]?.inputPaths).toEqual([path.join(root, "workflow-fixtures", "pipelines", "tiny")]);
  expect(calls[3]?.inputPaths).toEqual([
    path.join(runDir, "trial-002", "phase-001-summarize", "workspace", "summary.json"),
  ]);

  const written = JSON.parse(readFileSync(path.join(runDir, "run.json"), "utf8"));
  expect(written.run_id).toBe("pipeline-run-id");
  expect(written.through_phase).toBe(2);
  expect(written.foundry_head).toBeNull();
});

test("run.json reads as unfinished until the last trial ends", async () => {
  const root = fixtureRepo();
  const runDir = path.join(root, "runs", "in-progress");
  const midRun: Record<string, unknown>[] = [];

  const record = await runLinearPipeline(
    {
      repoRoot: root,
      pipeline: "demo-pipeline",
      scenario: "tiny journey",
      through: "1",
      trials: 2,
      runDir,
      provider: "test-provider",
      model: "test-model",
      sandbox: "local",
      timeoutMs: 1000,
      credentialEnv: [],
      sandboxNetwork: "none",
    },
    {
      runSkill: async (options) => {
        if (options.runDir.includes("trial-002")) {
          midRun.push(JSON.parse(readFileSync(path.join(runDir, "run.json"), "utf8")));
        }
        const workspace = path.join(options.runDir, "workspace");
        mkdirSync(workspace, { recursive: true });
        for (const artifact of options.expectedArtifacts ?? []) {
          writeFileSync(path.join(workspace, artifact.path), artifact.id);
        }
        return fakeRecord(options, "summarize");
      },
      now: () => new Date("2026-09-09T00:00:00.000Z"),
    },
  );

  expect(midRun).toHaveLength(1);
  expect(midRun[0]).toEqual(
    expect.objectContaining({ status: "running", finished_at: null, trials_requested: 2 }),
  );
  expect(midRun[0]!.trials).toHaveLength(1);

  expect(record.status).toBe("passed");
  expect(record.trials_requested).toBe(2);
  const written = JSON.parse(readFileSync(path.join(runDir, "run.json"), "utf8"));
  expect(written.status).toBe("passed");
  expect(written.finished_at).toBe("2026-09-09T00:00:00.000Z");
  expect(written.trials).toHaveLength(2);
});

test("run.json is on disk, running, before the first trial ends", async () => {
  const root = fixtureRepo();
  const runDir = path.join(root, "runs", "first-trial");
  const midRun: Record<string, unknown>[] = [];

  await runLinearPipeline(
    {
      repoRoot: root,
      pipeline: "demo-pipeline",
      scenario: "tiny journey",
      through: "1",
      trials: 1,
      runDir,
      provider: "test-provider",
      model: "test-model",
      sandbox: "local",
      timeoutMs: 1000,
      credentialEnv: [],
      sandboxNetwork: "none",
    },
    {
      runSkill: async (options) => {
        const file = path.join(runDir, "run.json");
        if (existsSync(file)) midRun.push(JSON.parse(readFileSync(file, "utf8")));
        const workspace = path.join(options.runDir, "workspace");
        mkdirSync(workspace, { recursive: true });
        for (const artifact of options.expectedArtifacts ?? []) {
          writeFileSync(path.join(workspace, artifact.path), artifact.id);
        }
        return fakeRecord(options, "summarize");
      },
      now: () => new Date("2026-09-09T00:00:00.000Z"),
    },
  );

  expect(midRun).toHaveLength(1);
  expect(midRun[0]).toEqual(
    expect.objectContaining({ status: "running", finished_at: null, trials: [] }),
  );
});

test("records the Foundry commit the run read, including from a linked worktree", async () => {
  const root = fixtureRepo();
  // Isolated from the developer's own git config, so their hooks and signing never run here.
  const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
  const git = (cwd: string, ...args: string[]) =>
    execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", env }).trim();
  const identity = ["-c", "user.name=t", "-c", "user.email=t@example.org"];
  git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, ...identity, "-c", "commit.gpgsign=false", "commit", "--no-verify", "-qm", "fixture");
  const worktree = path.join(mkdtempSync(path.join(tmpdir(), "foundry-worktree-")), "tree");
  git(root, "worktree", "add", "-q", "--detach", worktree);

  // A root nested inside some other repository is not that repository's commit.
  expect(foundryHead(path.join(root, "content"))).toBeNull();

  for (const repoRoot of [root, worktree]) {
    const record = await runLinearPipeline(
      {
        repoRoot,
        pipeline: "demo-pipeline",
        scenario: "tiny journey",
        through: "1",
        trials: 1,
        runDir: path.join(mkdtempSync(path.join(tmpdir(), "foundry-run-")), "run"),
        provider: "test-provider",
        model: "test-model",
        sandbox: "local",
        timeoutMs: 1000,
        credentialEnv: [],
        sandboxNetwork: "none",
      },
      {
        runSkill: async (options) => {
          const workspace = path.join(options.runDir, "workspace");
          mkdirSync(workspace, { recursive: true });
          for (const artifact of options.expectedArtifacts ?? []) {
            writeFileSync(path.join(workspace, artifact.path), artifact.id);
          }
          return fakeRecord(options, "summarize");
        },
      },
    );
    expect(record.foundry_head).toBe(git(root, "rev-parse", "HEAD"));
  }
});

test("does not fail promotion when an optional output is absent", async () => {
  const root = fixtureRepo();
  writeSkill(
    root,
    "summarize",
    [],
    [
      { id: "summary", default_filename: "summary.json" },
      { id: "unused", default_filename: "unused.txt", optional: true },
    ],
  );

  const record = await runLinearPipeline(
    {
      repoRoot: root,
      pipeline: "demo-pipeline",
      scenario: "tiny journey",
      through: "1",
      trials: 1,
      runDir: path.join(root, "runs", "optional-output"),
      provider: "test-provider",
      model: "test-model",
      sandbox: "local",
      timeoutMs: 1000,
      credentialEnv: [],
      sandboxNetwork: "none",
    },
    {
      runSkill: async (options) => {
        const workspace = path.join(options.runDir, "workspace");
        mkdirSync(workspace, { recursive: true });
        writeFileSync(path.join(workspace, "summary.json"), "summary");
        const worker = fakeRecord(options, "summarize");
        worker.artifacts = worker.artifacts.map((artifact) =>
          artifact.id === "unused"
            ? { id: artifact.id, path: artifact.path, status: "missing" }
            : artifact,
        );
        return worker;
      },
    },
  );

  expect(record.status).toBe("passed");
  expect(record.trials[0]?.phases[0]?.artifacts).toContainEqual(
    expect.objectContaining({ id: "unused", status: "missing" }),
  );
});

test("preflights unsupported control flow before launching a worker", async () => {
  const root = fixtureRepo();
  let launched = false;

  await expect(
    runLinearPipeline(
      {
        repoRoot: root,
        pipeline: "demo-pipeline",
        scenario: "tiny journey",
        trials: 1,
        runDir: path.join(root, "runs", "unsupported"),
        provider: "test-provider",
        model: "test-model",
        sandbox: "local",
        timeoutMs: 1000,
        credentialEnv: [],
        sandboxNetwork: "none",
      },
      {
        runSkill: async () => {
          launched = true;
          throw new Error("must not launch");
        },
      },
    ),
  ).rejects.toThrow(
    "phase 3 uses unsupported branch control flow; select an earlier --through phase",
  );
  expect(launched).toBe(false);
});

test("selects --through by a unique skill name", async () => {
  const root = fixtureRepo();
  const calls: RunPiSkillOptions[] = [];
  const record = await runLinearPipeline(
    {
      repoRoot: root,
      pipeline: "demo-pipeline",
      scenario: "tiny journey",
      through: "design",
      trials: 1,
      runDir: path.join(root, "runs", "skill-through"),
      provider: "test-provider",
      model: "test-model",
      sandbox: "local",
      timeoutMs: 1000,
      credentialEnv: [],
      sandboxNetwork: "none",
    },
    {
      runSkill: async (options) => {
        calls.push(options);
        const workspace = path.join(options.runDir, "workspace");
        mkdirSync(workspace, { recursive: true });
        for (const artifact of options.expectedArtifacts ?? []) {
          mkdirSync(path.dirname(path.join(workspace, artifact.path)), { recursive: true });
          writeFileSync(path.join(workspace, artifact.path), artifact.id);
        }
        return fakeRecord(options, path.basename(options.skillDir));
      },
    },
  );
  expect(record.through_phase).toBe(2);
  expect(calls).toHaveLength(2);
});

test("rejects an ambiguous --through skill name during preflight", async () => {
  const root = fixtureRepo();
  const assemblyPath = path.join(root, "casts/claude/skills/pipeline-demo-pipeline/_assembly.json");
  const assembly = JSON.parse(readFileSync(assemblyPath, "utf8"));
  assembly.phases[1].skill = "summarize";
  writeJson(assemblyPath, assembly);
  const runDir = path.join(root, "runs", "ambiguous-through");

  await expect(
    runLinearPipeline({
      repoRoot: root,
      pipeline: "demo-pipeline",
      scenario: "tiny journey",
      through: "summarize",
      trials: 1,
      runDir,
      provider: "test-provider",
      model: "test-model",
      sandbox: "local",
      timeoutMs: 1000,
      credentialEnv: [],
      sandboxNetwork: "none",
    }),
  ).rejects.toThrow("--through skill must match one phase: summarize");
  expect(existsSync(runDir)).toBe(false);
});

test("rejects a hash-mismatched promoted artifact distinctly from worker failure", async () => {
  const root = fixtureRepo();
  const record = await runLinearPipeline(
    {
      repoRoot: root,
      pipeline: "demo-pipeline",
      scenario: "tiny journey",
      through: "1",
      trials: 1,
      runDir: path.join(root, "runs", "hash-mismatch"),
      provider: "test-provider",
      model: "test-model",
      sandbox: "local",
      timeoutMs: 1000,
      credentialEnv: [],
      sandboxNetwork: "none",
    },
    {
      runSkill: async (options) => {
        const workspace = path.join(options.runDir, "workspace");
        mkdirSync(workspace, { recursive: true });
        for (const artifact of options.expectedArtifacts ?? []) {
          writeFileSync(path.join(workspace, artifact.path), "does-not-match-recorded-hash");
        }
        return fakeRecord(options, "summarize");
      },
    },
  );
  expect(record.status).toBe("failed");
  expect(record.trials[0]?.phases[0]).toEqual(
    expect.objectContaining({
      status: "failed",
      failure_kind: "artifact_promotion",
      error: "declared artifact was not promotable: summary",
    }),
  );
});

test("keeps the worker's own failure kind, and names the artifact when the worker gives no error", async () => {
  const root = fixtureRepo();
  const record = await runLinearPipeline(
    {
      repoRoot: root,
      pipeline: "demo-pipeline",
      scenario: "tiny journey",
      through: "1",
      trials: 1,
      runDir: path.join(root, "runs", "skill-failure"),
      provider: "test-provider",
      model: "test-model",
      sandbox: "local",
      timeoutMs: 1000,
      credentialEnv: [],
      sandboxNetwork: "none",
    },
    {
      runSkill: async (options) => {
        const passed = fakeRecord(options, "summarize");
        return {
          ...passed,
          status: "failed",
          failure_kind: "skill",
          artifacts: passed.artifacts.map((artifact) =>
            artifact.id === "summary" ? { ...artifact, status: "failed" } : artifact,
          ),
        };
      },
    },
  );
  expect(record.trials[0]?.phases[0]).toEqual(
    expect.objectContaining({
      status: "failed",
      failure_kind: "skill",
      error: "declared artifact did not pass: summary (failed)",
    }),
  );
});

test("preflights missing pi-test-auth and staged basename collisions before creating a run", async () => {
  const root = fixtureRepo();
  const missingAuthRun = path.join(root, "runs", "missing-auth");
  await expect(
    runLinearPipeline({
      repoRoot: root,
      pipeline: "demo-pipeline",
      scenario: "tiny journey",
      through: "1",
      trials: 1,
      runDir: missingAuthRun,
      provider: "openai-codex",
      model: "test-model",
      sandbox: "local",
      timeoutMs: 1000,
      credentialEnv: [],
      sandboxNetwork: "none",
      piTestAuthDir: path.join(root, "missing-auth"),
    }),
  ).rejects.toThrow("pi-test-auth is not configured");
  expect(existsSync(missingAuthRun)).toBe(false);

  writeSkill(
    root,
    "summarize",
    [],
    [
      { id: "summary", default_filename: "one/shared.json" },
      { id: "unused", default_filename: "two/shared.json" },
    ],
  );
  writeSkill(
    root,
    "design",
    ["summary", "unused"],
    [{ id: "design", default_filename: "design.md" }],
  );
  const collisionRun = path.join(root, "runs", "basename-collision");
  await expect(
    runLinearPipeline({
      repoRoot: root,
      pipeline: "demo-pipeline",
      scenario: "tiny journey",
      through: "2",
      trials: 1,
      runDir: collisionRun,
      provider: "test-provider",
      model: "test-model",
      sandbox: "local",
      timeoutMs: 1000,
      credentialEnv: [],
      sandboxNetwork: "none",
    }),
  ).rejects.toThrow("phase 2 declared inputs share staged basename 'shared.json'");
  expect(existsSync(collisionRun)).toBe(false);
});

const DRAFT_FILE = "galaxy-workflow-draft.gxwf.yml";

function draftFixtureRepo(): string {
  const root = fixtureRepo();
  writeJson(
    path.join(root, "casts", "claude", "skills", "pipeline-demo-pipeline", "_assembly.json"),
    {
      source_pipeline: "demo-pipeline",
      source_revision: 1,
      harness_name: "pipeline-demo-pipeline",
      phases: [
        { phase: 1, kind: "mold", skill: "template", cast_present: true, loop: false },
        {
          phase: 2,
          kind: "mold",
          skill: "advance-galaxy-draft-step",
          cast_present: true,
          loop: true,
        },
        { phase: 3, kind: "mold", skill: "check", cast_present: true, loop: false },
      ],
    },
  );
  writeSkill(root, "template", [], [{ id: "galaxy-workflow-draft", default_filename: DRAFT_FILE }]);
  writeSkill(
    root,
    "advance-galaxy-draft-step",
    ["galaxy-workflow-draft", "open-requirements-ledger"],
    [
      { id: "galaxy-workflow-draft", default_filename: DRAFT_FILE },
      { id: "galaxy-workflow", default_filename: "galaxy-workflow.gxwf.yml" },
      { id: "open-requirements-ledger", default_filename: "open-requirements.ledger.yml" },
    ],
  );
  writeSkill(root, "check", ["galaxy-workflow"], [{ id: "report", default_filename: "report.md" }]);
  return root;
}

function todoStep(source: string) {
  return { tool_id: "TODO", tool_version: "TODO", in: { input: source } };
}

/** A worker record judged on what the fake worker actually wrote. */
function workspaceRecord(options: RunPiSkillOptions, skill: string): PiSkillRunRecord {
  const workspace = path.join(options.runDir, "workspace");
  const record = fakeRecord(options, skill);
  const artifacts = (options.expectedArtifacts ?? []).map((artifact) => {
    const file = path.join(workspace, artifact.path);
    return existsSync(file)
      ? {
          id: artifact.id,
          path: artifact.path,
          status: "present" as const,
          sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
        }
      : { id: artifact.id, path: artifact.path, status: "missing" as const };
  });
  const failed = artifacts.some(
    (artifact, index) =>
      artifact.status === "missing" && !options.expectedArtifacts?.[index]?.optional,
  );
  return {
    ...record,
    status: failed ? "failed" : "passed",
    failure_kind: failed ? "skill" : undefined,
    artifacts,
    usage: {
      input_tokens: 10,
      output_tokens: 10,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      total_tokens: 20,
      cost: 0.01,
      turns: 1,
      tool_calls: 1,
    },
  };
}

type Draft = { steps: Record<string, Record<string, unknown>> };

/**
 * Concretizes the step the oracle picks, as advance-galaxy-draft-step does, or extracts at the end.
 * `advance` may return the ledger entries the call writes.
 */
function draftWorker(
  calls: RunPiSkillOptions[],
  advance: (draft: Draft, step: string) => unknown[] | void = (draft, step) => {
    draft.steps[step].tool_id = "cat1";
    draft.steps[step].tool_version = "1.0";
  },
) {
  return async (options: RunPiSkillOptions) => {
    calls.push(options);
    const skill = path.basename(options.skillDir);
    const workspace = path.join(options.runDir, "workspace");
    mkdirSync(workspace, { recursive: true });
    const write = (file: string, value: unknown) =>
      writeFileSync(path.join(workspace, file), dumpYaml(value));
    if (skill === "template") {
      write(DRAFT_FILE, {
        class: "GalaxyWorkflowDraft",
        inputs: { reads: "data" },
        outputs: {},
        steps: { a: todoStep("reads"), b: todoStep("a/out") },
      });
    } else if (skill === "advance-galaxy-draft-step") {
      const staged = options.inputPaths!.find((input) => path.basename(input) === DRAFT_FILE)!;
      const draft = loadYaml(readFileSync(staged, "utf8")) as Draft;
      const next = nextDraftStep(draft);
      if (next.draft) {
        const entries = advance(draft, next.step.at(-1)!) ?? [];
        write(DRAFT_FILE, draft);
        write("open-requirements.ledger.yml", { entries });
      } else {
        write("galaxy-workflow.gxwf.yml", { ...draft, class: "GalaxyWorkflow" });
      }
    } else {
      writeFileSync(path.join(workspace, "report.md"), "ok\n");
    }
    return workspaceRecord(options, skill);
  };
}

function draftRunOptions(root: string, name: string) {
  return {
    repoRoot: root,
    pipeline: "demo-pipeline",
    scenario: "tiny journey",
    trials: 1,
    runDir: path.join(root, "runs", name),
    provider: "test-provider",
    model: "test-model",
    sandbox: "local" as const,
    timeoutMs: 1000,
    credentialEnv: [],
    sandboxNetwork: "none" as const,
  };
}

test("drives the draft loop with one worker per drafty step, then the terminal call", async () => {
  const root = draftFixtureRepo();
  const calls: RunPiSkillOptions[] = [];
  const record = await runLinearPipeline(draftRunOptions(root, "draft-loop"), {
    runSkill: draftWorker(calls),
  });

  expect(record.status).toBe("passed");
  expect(calls.map((call) => path.basename(call.skillDir))).toEqual([
    "template",
    "advance-galaxy-draft-step",
    "advance-galaxy-draft-step",
    "advance-galaxy-draft-step",
    "check",
  ]);
  const loop = record.trials[0]!.phases[1]!;
  expect(loop).toEqual(
    expect.objectContaining({ phase: 2, skill: "advance-galaxy-draft-step", status: "passed" }),
  );
  expect(loop.iterations?.map((iteration) => [iteration.iteration, iteration.next_step])).toEqual([
    [1, ["a"]],
    [2, ["b"]],
    [3, null],
  ]);
  expect(loop.iterations?.[0]?.run_dir).toBe(
    "trial-001/phase-002-advance-galaxy-draft-step/iteration-001",
  );
  expect(loop.usage?.turns).toBe(3);
  expect(record.usage.turns).toBe(5);

  // Each iteration reads the draft the one before it wrote.
  const [first, second, terminal] = calls.slice(1, 4);
  expect(first!.inputPaths).toContain(
    path.join(root, "runs", "draft-loop", "trial-001/phase-001-template/workspace", DRAFT_FILE),
  );
  expect(second!.inputPaths).toContain(
    path.join(root, "runs", "draft-loop", loop.iterations![0]!.run_dir, "workspace", DRAFT_FILE),
  );
  expect(loop.iterations?.[0]?.missing_input_ids).toEqual(["open-requirements-ledger"]);
  expect(loop.iterations?.[1]?.missing_input_ids).toEqual([]);

  // The terminal call need not rewrite the draft or the ledger.
  const optional = (call: RunPiSkillOptions) =>
    Object.fromEntries((call.expectedArtifacts ?? []).map((a) => [a.id, a.optional === true]));
  // A call before the terminal one is not asked for the extracted workflow, so a partial one it
  // writes anyway is never promoted.
  expect(optional(first!)).toEqual({
    "galaxy-workflow-draft": false,
    "open-requirements-ledger": false,
  });
  expect(optional(terminal!)).toEqual({
    "galaxy-workflow-draft": true,
    "galaxy-workflow": false,
    "open-requirements-ledger": true,
  });

  // Every iteration shares one run-scoped tool cache.
  const cacheDirs = new Set(calls.slice(1, 4).map((call) => call.cacheDir));
  expect(cacheDirs.size).toBe(1);
  expect(existsSync([...cacheDirs][0]!)).toBe(true);
  expect(calls[0]!.cacheDir).toBeUndefined();

  expect(record.trials[0]!.phases[2]!.resolved_inputs).toEqual([
    expect.objectContaining({
      id: "galaxy-workflow",
      path: `${loop.iterations![2]!.run_dir}/workspace/galaxy-workflow.gxwf.yml`,
      producer_phase: 2,
    }),
  ]);
});

test("fails a draft-loop iteration that leaves the draft unchanged", async () => {
  const root = draftFixtureRepo();
  const calls: RunPiSkillOptions[] = [];
  const record = await runLinearPipeline(draftRunOptions(root, "no-progress"), {
    runSkill: draftWorker(calls, () => undefined),
  });

  expect(record.status).toBe("failed");
  const loop = record.trials[0]!.phases[1]!;
  expect(loop).toEqual(
    expect.objectContaining({
      status: "failed",
      failure_kind: "loop_no_progress",
      error: "iteration 1 left galaxy-workflow-draft unchanged; step a is still drafty",
    }),
  );
  expect(loop.iterations).toHaveLength(1);
  expect(calls).toHaveLength(2);
});

function ledgerEntry(id: string, step: string, status: string, blocking: boolean) {
  return { id, status, blocking, raised_by: "advance-galaxy-draft-step", step };
}

test.each(["open", "surrendered"])(
  "reports a draft-loop iteration as blocked when a blocking entry for its unchanged step is %s",
  async (status) => {
    const root = draftFixtureRepo();
    const calls: RunPiSkillOptions[] = [];
    const record = await runLinearPipeline(draftRunOptions(root, `blocked-${status}`), {
      runSkill: draftWorker(calls, () => [
        ledgerEntry("a-uncomputable", "a", status, true),
        ledgerEntry("a-also-uncomputable", "a", status, true),
      ]),
    });

    expect(record.status).toBe("failed");
    const loop = record.trials[0]!.phases[1]!;
    expect(loop).toEqual(
      expect.objectContaining({
        status: "failed",
        failure_kind: "loop_blocked",
        error:
          "iteration 1 left galaxy-workflow-draft unchanged; step a is blocked by " +
          "open-requirements-ledger entries a-uncomputable, a-also-uncomputable",
      }),
    );
    expect(calls).toHaveLength(2);
  },
);

test("reports a stalled draft-loop iteration as no progress when no blocking entry names its step", async () => {
  const root = draftFixtureRepo();
  const record = await runLinearPipeline(draftRunOptions(root, "not-blocked"), {
    runSkill: draftWorker([], () => [
      ledgerEntry("a-gap", "a", "open", false),
      ledgerEntry("a-repaired", "a", "resolved", true),
      ledgerEntry("b-uncomputable", "b", "open", true),
    ]),
  });

  expect(record.trials[0]!.phases[1]).toEqual(
    expect.objectContaining({
      status: "failed",
      failure_kind: "loop_no_progress",
      error: "iteration 1 left galaxy-workflow-draft unchanged; step a is still drafty",
    }),
  );
});

test("caps draft-loop iterations, by default at twice the drafty steps plus the terminal call", async () => {
  const root = draftFixtureRepo();
  let added = 0;
  const calls: RunPiSkillOptions[] = [];
  // Each iteration concretizes its step but inserts another drafty one, so the draft never ends.
  const record = await runLinearPipeline(draftRunOptions(root, "default-cap"), {
    runSkill: draftWorker(calls, (draft, step) => {
      draft.steps[step].tool_id = "cat1";
      draft.steps[step].tool_version = "1.0";
      draft.steps[`z${added++}`] = todoStep("reads");
    }),
  });
  const loop = record.trials[0]!.phases[1]!;
  expect(loop).toEqual(
    expect.objectContaining({
      status: "failed",
      failure_kind: "loop_cap",
      error: "draft loop reached 5 iterations without finishing",
    }),
  );
  expect(loop.iterations).toHaveLength(5);

  const capped = await runLinearPipeline(
    { ...draftRunOptions(root, "explicit-cap"), maxIterations: 1 },
    { runSkill: draftWorker([]) },
  );
  expect(capped.trials[0]!.phases[1]).toEqual(
    expect.objectContaining({
      failure_kind: "loop_cap",
      error: "draft loop reached 1 iteration without finishing",
    }),
  );
});

test("stops before the next worker once the run budget is spent", async () => {
  const root = draftFixtureRepo();
  const calls: RunPiSkillOptions[] = [];
  const record = await runLinearPipeline(
    { ...draftRunOptions(root, "budget"), trials: 2, maxCost: 0.015 },
    { runSkill: draftWorker(calls) },
  );

  expect(calls).toHaveLength(2);
  expect(record.status).toBe("cancelled");
  expect(record.trials).toHaveLength(1);
  const loop = record.trials[0]!.phases[1]!;
  expect(loop).toEqual(
    expect.objectContaining({
      status: "cancelled",
      failure_kind: "budget",
      error: "run budget spent before iteration 2: cost 0.02 of --max-cost 0.015",
    }),
  );
  expect(loop.iterations).toHaveLength(1);

  const tokenCalls: RunPiSkillOptions[] = [];
  const tokens = await runLinearPipeline(
    { ...draftRunOptions(root, "token-budget"), maxTokens: 20 },
    { runSkill: draftWorker(tokenCalls) },
  );
  expect(tokenCalls).toHaveLength(1);
  expect(tokens.trials[0]!.phases[1]).toEqual(
    expect.objectContaining({
      status: "cancelled",
      failure_kind: "budget",
      error: "run budget spent before phase 2: 20 tokens of --max-tokens 20",
      artifacts: [],
    }),
  );
});

test("still rejects a loop phase with no controller oracle", async () => {
  const root = draftFixtureRepo();
  const assemblyPath = path.join(root, "casts/claude/skills/pipeline-demo-pipeline/_assembly.json");
  const assembly = JSON.parse(readFileSync(assemblyPath, "utf8"));
  assembly.phases[1].skill = "implement-cwl-tool-step";
  writeJson(assemblyPath, assembly);
  writeSkill(root, "implement-cwl-tool-step", [], []);
  await expect(
    runLinearPipeline(draftRunOptions(root, "no-oracle"), { runSkill: draftWorker([]) }),
  ).rejects.toThrow(
    "phase 2 loops over implement-cwl-tool-step, which has no controller loop oracle; select an earlier --through phase",
  );
});

test("parses the loop cap and run budget", () => {
  const base = ["nextflow-to-galaxy", "--scenario", "demo", "--provider", "p", "--model", "m"];
  expect(
    parseTestPipelineArgs([
      ...base,
      "--max-iterations",
      "4",
      "--max-cost=2.5",
      "--max-tokens",
      "1000000",
    ]),
  ).toEqual(expect.objectContaining({ maxIterations: 4, maxCost: 2.5, maxTokens: 1_000_000 }));
  expect(() => parseTestPipelineArgs([...base, "--max-iterations", "0"])).toThrow(
    "--max-iterations must be a positive integer",
  );
  expect(() => parseTestPipelineArgs([...base, "--max-cost", "free"])).toThrow(
    "--max-cost must be a positive number",
  );
});

test("records a draft the loop oracle cannot read as the loop's error, not a crashed run", async () => {
  const root = draftFixtureRepo();
  const calls: RunPiSkillOptions[] = [];
  const worker = draftWorker(calls);
  const record = await runLinearPipeline(draftRunOptions(root, "unreadable-draft"), {
    runSkill: async (options) => {
      if (path.basename(options.skillDir) !== "template") return worker(options);
      calls.push(options);
      const workspace = path.join(options.runDir, "workspace");
      mkdirSync(workspace, { recursive: true });
      writeFileSync(path.join(workspace, DRAFT_FILE), "steps: [unclosed\n");
      return workspaceRecord(options, "template");
    },
  });
  expect(calls).toHaveLength(1);
  expect(record.status).toBe("error");
  expect(record.trials[0]!.phases[1]).toEqual(
    expect.objectContaining({
      status: "error",
      error: expect.stringMatching(/^loop oracle could not read galaxy-workflow-draft: /),
      iterations: [],
    }),
  );
});

test("preflights a loop oracle whose artifacts the loop Mold does not declare", async () => {
  const root = draftFixtureRepo();
  writeSkill(
    root,
    "advance-galaxy-draft-step",
    ["galaxy-workflow-draft"],
    [{ id: "galaxy-workflow-draft", default_filename: DRAFT_FILE }],
  );
  let launched = false;
  await expect(
    runLinearPipeline(draftRunOptions(root, "oracle-contract"), {
      runSkill: async () => {
        launched = true;
        throw new Error("must not launch");
      },
    }),
  ).rejects.toThrow(
    "phase 2 (advance-galaxy-draft-step) does not produce galaxy-workflow, which its loop oracle expects",
  );
  expect(launched).toBe(false);
});

test("preflights the draft loop out of the container sandbox, whose image has no gxwf", async () => {
  const root = draftFixtureRepo();
  await expect(
    runLinearPipeline(
      { ...draftRunOptions(root, "container-loop"), sandbox: "container" },
      { runSkill: draftWorker([]) },
    ),
  ).rejects.toThrow(
    "phase 2 (advance-galaxy-draft-step) needs gxwf, which the container image does not ship; use --sandbox local",
  );
  expect(existsSync(path.join(root, "runs", "container-loop"))).toBe(false);
});
