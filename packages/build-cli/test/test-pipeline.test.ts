import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import type { PiSkillRunRecord, RunPiSkillOptions } from "@galaxy-foundry/gxwf-pi-harness";
import { nextDraftStep } from "@galaxy-tool-util/schema";
import { dump as dumpYaml, load as loadYaml } from "js-yaml";
import { expect, test } from "vitest";

import {
  defaultTestPipelineRunDir,
  parseTestPipelineArgs,
  runLinearPipeline,
  selectPhases,
  testPipelineExitCode,
  type PipelineRunRecord,
} from "../src/commands/test-pipeline.js";
import { loadAssembly } from "../src/lib/cast-registry.js";
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
 * `advance` may return the ledger entries the call writes; `ledger` lays them out.
 */
function draftWorker(
  calls: RunPiSkillOptions[],
  advance: (draft: Draft, step: string) => unknown[] | void = (draft, step) => {
    draft.steps[step].tool_id = "cat1";
    draft.steps[step].tool_version = "1.0";
  },
  ledger: (entries: unknown[]) => unknown = (entries) => ({ entries }),
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
        write("open-requirements.ledger.yml", ledger(entries));
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

test("reads a blocking entry from a ledger written as a bare list", async () => {
  const root = draftFixtureRepo();
  const record = await runLinearPipeline(draftRunOptions(root, "blocked-bare-list"), {
    runSkill: draftWorker(
      [],
      () => [ledgerEntry("a-uncomputable", "a", "open", true)],
      (entries) => entries,
    ),
  });

  expect(record.trials[0]!.phases[1]).toEqual(
    expect.objectContaining({ failure_kind: "loop_blocked" }),
  );
});

test("does not read a blocking entry the stalled call left untouched as its exit", async () => {
  const root = draftFixtureRepo();
  // The first call concretizes a and records a blocker for b; the second leaves both alone.
  const blocker = ledgerEntry("b-uncomputable", "b", "open", true);
  const record = await runLinearPipeline(draftRunOptions(root, "blocked-earlier"), {
    runSkill: draftWorker([], (draft, step) => {
      if (step === "a") {
        draft.steps.a.tool_id = "cat1";
        draft.steps.a.tool_version = "1.0";
      }
      return [blocker];
    }),
  });

  expect(record.trials[0]!.phases[1]).toEqual(
    expect.objectContaining({
      failure_kind: "loop_no_progress",
      error: "iteration 2 left galaxy-workflow-draft unchanged; step b is still drafty",
    }),
  );
});

test("reports a stalled draft-loop iteration as no progress when its ledger cannot be read", async () => {
  const root = draftFixtureRepo();
  const record = await runLinearPipeline(draftRunOptions(root, "blocked-unreadable"), {
    runSkill: draftWorker(
      [],
      () => undefined,
      () => "not a ledger",
    ),
  });

  expect(record.trials[0]!.phases[1]).toEqual(
    expect.objectContaining({
      failure_kind: "loop_no_progress",
      error: expect.stringMatching(
        /^iteration 1 left galaxy-workflow-draft unchanged; step a is still drafty, and open-requirements-ledger could not be read: /,
      ),
    }),
  );
});

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

test("preflights a loop Mold that does not write the ledger its oracle reads blockers from", async () => {
  const root = draftFixtureRepo();
  writeSkill(
    root,
    "advance-galaxy-draft-step",
    ["galaxy-workflow-draft"],
    [
      { id: "galaxy-workflow-draft", default_filename: DRAFT_FILE },
      { id: "galaxy-workflow", default_filename: "galaxy-workflow.gxwf.yml" },
    ],
  );
  await expect(
    runLinearPipeline(draftRunOptions(root, "oracle-ledger"), { runSkill: draftWorker([]) }),
  ).rejects.toThrow(
    "phase 2 (advance-galaxy-draft-step) does not produce open-requirements-ledger, which its loop oracle expects",
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

const REFS_FILE = "test-data-refs.json";

function branchFixtureRepo(legs = { second: ["galaxy-interface", "test-data-refs"] }): string {
  const root = fixtureRepo();
  writeJson(
    path.join(root, "casts", "claude", "skills", "pipeline-demo-pipeline", "_assembly.json"),
    {
      source_pipeline: "demo-pipeline",
      source_revision: 1,
      harness_name: "pipeline-demo-pipeline",
      phases: [
        { phase: 1, kind: "mold", skill: "interface", cast_present: true, loop: false },
        {
          phase: 2,
          kind: "branch",
          pattern: "test-data-resolution",
          chain: ["source-to-test-data", "find-test-data", "user-supplied"],
          cast_present: [true, true, null],
        },
        { phase: 3, kind: "mold", skill: "test-plan", cast_present: true, loop: false },
      ],
    },
  );
  const refs = { id: "test-data-refs", default_filename: REFS_FILE };
  writeSkill(root, "interface", [], [{ id: "galaxy-interface", default_filename: "iface.json" }]);
  writeSkill(root, "source-to-test-data", ["galaxy-interface"], [refs]);
  writeSkill(root, "find-test-data", legs.second, [refs]);
  writeSkill(root, "test-plan", ["test-data-refs"], [{ id: "plan", default_filename: "plan.md" }]);
  return root;
}

function testDataRef(label: string, resolved: boolean, by = "source-to-test-data") {
  return {
    workflow_label: label,
    collection_shape: null,
    datatype: "fasta",
    resolved,
    resolved_by: resolved ? by : null,
    reason: resolved ? null : "no data found",
    fixture: resolved
      ? { storage: "url", location: `https://example.org/${label}.fa` }
      : { storage: "unresolved", location: null },
  };
}

type Refs = { refs: ReturnType<typeof testDataRef>[] };

/** Runs each branch leg as the given function of the refs staged for it; other skills write stubs. */
function branchWorker(
  calls: RunPiSkillOptions[],
  legs: Record<string, ((earlier: Refs | null) => unknown) | undefined>,
) {
  return async (options: RunPiSkillOptions) => {
    calls.push(options);
    const skill = path.basename(options.skillDir);
    const workspace = path.join(options.runDir, "workspace");
    mkdirSync(workspace, { recursive: true });
    if (skill in legs) {
      const staged = options.inputPaths?.find((input) => path.basename(input) === REFS_FILE);
      const earlier = staged ? (JSON.parse(readFileSync(staged, "utf8")) as Refs) : null;
      const refs = legs[skill]?.(earlier);
      if (typeof refs === "string") writeFileSync(path.join(workspace, REFS_FILE), refs);
      else if (refs !== undefined) writeJson(path.join(workspace, REFS_FILE), refs);
    } else {
      for (const artifact of options.expectedArtifacts ?? []) {
        writeFileSync(path.join(workspace, artifact.path), `${artifact.id}\n`);
      }
    }
    return workspaceRecord(options, skill);
  };
}

/** A later leg as find-test-data runs it: every earlier ref kept, the unresolved ones filled. */
function fillGaps(earlier: Refs | null): Refs {
  return {
    refs: earlier!.refs.map((ref) =>
      ref.resolved ? ref : testDataRef(ref.workflow_label, true, "find-test-data"),
    ),
  };
}

const halfResolved = () => ({ refs: [testDataRef("a", true), testDataRef("b", false)] });

test("ends the test-data branch at the first leg that resolves every input", async () => {
  const root = branchFixtureRepo();
  const calls: RunPiSkillOptions[] = [];
  const record = await runLinearPipeline(draftRunOptions(root, "branch-first-leg"), {
    runSkill: branchWorker(calls, {
      "source-to-test-data": () => ({ refs: [testDataRef("a", true), testDataRef("b", true)] }),
      "find-test-data": fillGaps,
    }),
  });

  expect(record.status).toBe("passed");
  expect(calls.map((call) => path.basename(call.skillDir))).toEqual([
    "interface",
    "source-to-test-data",
    "test-plan",
  ]);
  const branch = record.trials[0]!.phases[1]!;
  expect(branch).toEqual(
    expect.objectContaining({
      phase: 2,
      skill: "test-data-resolution",
      status: "passed",
      run_dir: "trial-001/phase-002-test-data-resolution",
      declared_input_ids: ["galaxy-interface"],
    }),
  );
  expect(branch.legs?.map((leg) => [leg.leg, leg.skill, leg.run_dir, leg.unresolved])).toEqual([
    [
      1,
      "source-to-test-data",
      "trial-001/phase-002-test-data-resolution/leg-1-source-to-test-data",
      [],
    ],
  ]);
  expect(branch.usage?.turns).toBe(1);
  expect(record.trials[0]!.phases[2]!.resolved_inputs).toEqual([
    expect.objectContaining({
      id: "test-data-refs",
      path: `${branch.legs![0]!.run_dir}/workspace/${REFS_FILE}`,
      producer_phase: 2,
    }),
  ]);
});

test("runs the next test-data leg on what the earlier one left unresolved", async () => {
  const root = branchFixtureRepo();
  const calls: RunPiSkillOptions[] = [];
  const record = await runLinearPipeline(draftRunOptions(root, "branch-fill"), {
    runSkill: branchWorker(calls, {
      "source-to-test-data": halfResolved,
      "find-test-data": fillGaps,
    }),
  });

  expect(record.status).toBe("passed");
  const branch = record.trials[0]!.phases[1]!;
  expect(branch.legs?.map((leg) => [leg.skill, leg.unresolved])).toEqual([
    ["source-to-test-data", ["b"]],
    ["find-test-data", []],
  ]);
  expect(branch.usage?.turns).toBe(2);
  const find = calls[2]!;
  expect(find.inputPaths).toContain(
    path.join(root, "runs", "branch-fill", branch.legs![0]!.run_dir, "workspace", REFS_FILE),
  );
  expect(find.prompt).toContain("leaves these inputs unresolved: b");
  expect(record.trials[0]!.phases[2]!.resolved_inputs[0]!.path).toBe(
    `${branch.legs![1]!.run_dir}/workspace/${REFS_FILE}`,
  );
});

test("blocks the test-data branch when inputs are still unresolved at user-supplied", async () => {
  const root = branchFixtureRepo();
  const calls: RunPiSkillOptions[] = [];
  const record = await runLinearPipeline(draftRunOptions(root, "branch-blocked"), {
    runSkill: branchWorker(calls, {
      "source-to-test-data": halfResolved,
      "find-test-data": (earlier) => earlier,
    }),
  });

  expect(record.status).toBe("blocked");
  expect(record.trials[0]!.status).toBe("blocked");
  expect(record.trials[0]!.phases[1]).toEqual(
    expect.objectContaining({
      status: "blocked",
      error:
        "test-data-resolution left 1 input unresolved after find-test-data: b; the next step, user-supplied, needs a person",
    }),
  );
  expect(record.trials[0]!.phases).toHaveLength(2);
  expect(calls).toHaveLength(3);
});

test.each([
  ["writes no refs", () => ({ refs: [] }), fillGaps, "leg 1 (source-to-test-data) wrote no refs"],
  [
    "drops an earlier ref",
    halfResolved,
    () => ({ refs: [testDataRef("b", true, "find-test-data")] }),
    "leg 2 (find-test-data) dropped ref a, which an earlier leg wrote",
  ],
  [
    "changes a resolved ref",
    halfResolved,
    () => ({ refs: [testDataRef("a", true, "find-test-data"), testDataRef("b", true)] }),
    "leg 2 (find-test-data) changed ref a, which an earlier leg resolved",
  ],
])("fails a test-data leg that %s", async (_name, first, second, error) => {
  const root = branchFixtureRepo();
  const record = await runLinearPipeline(draftRunOptions(root, "branch-contract"), {
    runSkill: branchWorker([], { "source-to-test-data": first, "find-test-data": second }),
  });

  expect(record.trials[0]!.phases[1]).toEqual(
    expect.objectContaining({ status: "failed", failure_kind: "branch_contract", error }),
  );
  expect(record.trials[0]!.phases).toHaveLength(2);
});

test("fails the test-data branch when a leg's worker fails, without trying the next leg", async () => {
  const root = branchFixtureRepo();
  const calls: RunPiSkillOptions[] = [];
  const record = await runLinearPipeline(
    { ...draftRunOptions(root, "branch-leg-failed"), through: "test-data-resolution" },
    {
      runSkill: branchWorker(calls, {
        "source-to-test-data": () => undefined,
        "find-test-data": fillGaps,
      }),
    },
  );

  expect(record.through_phase).toBe(2);
  expect(record.trials[0]!.phases[1]).toEqual(
    expect.objectContaining({
      status: "failed",
      failure_kind: "skill",
      error:
        "leg 1 (source-to-test-data): declared artifact did not pass: test-data-refs (missing)",
    }),
  );
  expect(calls).toHaveLength(2);
});

test("stops the test-data branch before a leg once the run budget is spent", async () => {
  const root = branchFixtureRepo();
  const record = await runLinearPipeline(
    { ...draftRunOptions(root, "branch-budget"), maxTokens: 30 },
    {
      runSkill: branchWorker([], {
        "source-to-test-data": halfResolved,
        "find-test-data": fillGaps,
      }),
    },
  );

  expect(record.trials[0]!.phases[1]).toEqual(
    expect.objectContaining({
      status: "cancelled",
      failure_kind: "budget",
      error: "run budget spent before leg 2: 40 tokens of --max-tokens 30",
    }),
  );
  expect(record.trials[0]!.phases[1]!.legs).toHaveLength(1);
});

test.each([
  [
    "a leg that does not produce the refs",
    { second: ["galaxy-interface", "test-data-refs"] },
    (root: string) =>
      writeSkill(
        root,
        "find-test-data",
        ["test-data-refs"],
        [{ id: "other", default_filename: "o" }],
      ),
    "phase 2 (test-data-resolution) leg find-test-data does not produce test-data-refs, which the branch carries",
  ],
  [
    "a later leg that does not read the refs",
    { second: ["galaxy-interface"] },
    () => undefined,
    "phase 2 (test-data-resolution) leg find-test-data does not consume test-data-refs, which the branch carries",
  ],
])("preflights a test-data branch with %s", async (_name, legs, change, error) => {
  const root = branchFixtureRepo(legs);
  change(root);
  await expect(
    runLinearPipeline(draftRunOptions(root, "branch-preflight"), {
      runSkill: branchWorker([], {}),
    }),
  ).rejects.toThrow(error);
  expect(existsSync(path.join(root, "runs", "branch-preflight"))).toBe(false);
});

test.each([
  [[true, false, null], "phase 2 leg find-test-data does not have a cast skill"],
  [[null, true, null], "phase 2 chain has a sentinel before its last skill"],
])("preflights a test-data branch chain marked %j", async (castPresent, error) => {
  const root = branchFixtureRepo();
  const assemblyFile = path.join(
    root,
    "casts",
    "claude",
    "skills",
    "pipeline-demo-pipeline",
    "_assembly.json",
  );
  const assembly = JSON.parse(readFileSync(assemblyFile, "utf8"));
  assembly.phases[1].cast_present = castPresent;
  writeJson(assemblyFile, assembly);
  await expect(
    runLinearPipeline(draftRunOptions(root, "branch-chain"), { runSkill: branchWorker([], {}) }),
  ).rejects.toThrow(error);
});

test("reports refs the branch oracle cannot read as a controller error, not the leg's", async () => {
  const root = branchFixtureRepo();
  const record = await runLinearPipeline(draftRunOptions(root, "branch-unreadable"), {
    runSkill: branchWorker([], { "source-to-test-data": () => "not json" }),
  });

  expect(record.trials[0]!.phases[1]).toEqual(
    expect.objectContaining({
      status: "error",
      error: expect.stringMatching(
        /^branch oracle could not read test-data-refs from leg 1 \(source-to-test-data\): /,
      ),
    }),
  );
});

test("runs a test-data chain whose first leg is find-test-data, with no refs staged", async () => {
  const root = branchFixtureRepo();
  const assemblyFile = path.join(
    root,
    "casts",
    "claude",
    "skills",
    "pipeline-demo-pipeline",
    "_assembly.json",
  );
  const assembly = JSON.parse(readFileSync(assemblyFile, "utf8"));
  assembly.phases[1].chain = ["find-test-data", "user-supplied"];
  assembly.phases[1].cast_present = [true, null];
  writeJson(assemblyFile, assembly);
  const record = await runLinearPipeline(draftRunOptions(root, "branch-find-only"), {
    runSkill: branchWorker([], {
      "find-test-data": (earlier) => {
        expect(earlier).toBeNull();
        return { refs: [testDataRef("a", true, "find-test-data")] };
      },
    }),
  });

  expect(record.status).toBe("passed");
  expect(record.trials[0]!.phases[1]).toEqual(
    expect.objectContaining({
      declared_input_ids: ["galaxy-interface", "test-data-refs"],
      missing_input_ids: ["test-data-refs"],
    }),
  );
});

test("preflights a test-data chain that ends on more than one sentinel", async () => {
  const root = branchFixtureRepo();
  const assemblyFile = path.join(
    root,
    "casts",
    "claude",
    "skills",
    "pipeline-demo-pipeline",
    "_assembly.json",
  );
  const assembly = JSON.parse(readFileSync(assemblyFile, "utf8"));
  assembly.phases[1].chain.push("ask-again");
  assembly.phases[1].cast_present.push(null);
  writeJson(assemblyFile, assembly);
  await expect(
    runLinearPipeline(draftRunOptions(root, "branch-sentinels"), {
      runSkill: branchWorker([], {}),
    }),
  ).rejects.toThrow("phase 2 chain ends on more than one sentinel");
});

test("reads a run as blocked when one trial blocks and another passes", async () => {
  const root = branchFixtureRepo();
  let trial = 0;
  const record = await runLinearPipeline(
    { ...draftRunOptions(root, "branch-trials"), trials: 2 },
    {
      runSkill: branchWorker([], {
        "source-to-test-data": () => {
          trial++;
          return trial === 1 ? halfResolved() : { refs: [testDataRef("a", true)] };
        },
        "find-test-data": (earlier) => earlier,
      }),
    },
  );

  expect(record.trials.map((t) => t.status)).toEqual(["blocked", "passed"]);
  expect(record.status).toBe("blocked");
});

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

test.each([
  "cwl-to-galaxy",
  "interview-to-galaxy",
  "nextflow-to-galaxy",
  "paper-to-galaxy",
  "workflow-brief-to-galaxy",
])("accepts the committed %s assembly through its test-data branch", (pipeline) => {
  const assembly = loadAssembly(REPO_ROOT, pipeline);
  expect(selectPhases(assembly, "test-data-resolution").at(-1)).toEqual(
    expect.objectContaining({ kind: "branch", pattern: "test-data-resolution" }),
  );
});

test("still stops paper-to-cwl at its CWL loop, ahead of the test-data branch", () => {
  expect(() =>
    selectPhases(loadAssembly(REPO_ROOT, "paper-to-cwl"), "test-data-resolution"),
  ).toThrow("loops over summarize-cwl-tool, which has no controller loop oracle");
});

test("exits 2 for a blocked run, apart from other runs that did not pass", () => {
  expect(
    ["passed", "blocked", "failed", "cancelled"].map((status) =>
      testPipelineExitCode(status as "passed"),
    ),
  ).toEqual([0, 2, 1, 1]);
});

/** A finished run of the branch fixture's first phase, to seed later runs from. */
async function seedRun(root: string, name = "earlier") {
  const options = { ...draftRunOptions(root, name), through: "1" };
  const record = await runLinearPipeline(options, {
    runSkill: branchWorker([], {}),
    id: () => `${name}-run`,
  });
  return { dir: options.runDir, record };
}

test("starts at --from on a seed run's artifacts, copied into the new run", async () => {
  const root = branchFixtureRepo();
  const earlier = await seedRun(root);
  const calls: RunPiSkillOptions[] = [];
  const runDir = path.join(root, "runs", "seeded");
  const record = await runLinearPipeline(
    { ...draftRunOptions(root, "seeded"), from: "test-data-resolution", seedRun: earlier.dir },
    {
      runSkill: branchWorker(calls, {
        "source-to-test-data": () => ({ refs: [testDataRef("a", true)] }),
        "find-test-data": fillGaps,
      }),
    },
  );

  expect(record.status).toBe("passed");
  expect(calls.map((call) => path.basename(call.skillDir))).toEqual([
    "source-to-test-data",
    "test-plan",
  ]);
  const seeded = path.join(runDir, "seed", "phase-001-interface", "iface.json");
  // The scenario fixture is phase 1's input, not the input of whichever phase runs first.
  expect(calls[0]!.inputPaths).toEqual([seeded]);
  expect(calls[0]!.prompt).not.toContain("scenario fixture");
  expect(readFileSync(seeded, "utf8")).toBe("galaxy-interface\n");
  const seededArtifact = {
    id: "galaxy-interface",
    path: "seed/phase-001-interface/iface.json",
    sha256: earlier.record.trials[0]!.phases[0]!.artifacts[0]!.sha256,
    producer_phase: 1,
  };
  expect(record.seed).toEqual({
    run_dir: earlier.dir,
    run_id: "earlier-run",
    trial: 1,
    assembly_sha256: earlier.record.assembly_sha256,
    from_phase: 2,
    phases: [{ phase: 1, skill: "interface", status: "passed" }],
    artifacts: [seededArtifact],
  });
  expect(record.trials[0]!.phases.map((phase) => phase.phase)).toEqual([2, 3]);
  expect(record.trials[0]!.phases[0]!.resolved_inputs).toEqual([seededArtifact]);
});

test("does not seed from a phase that did not pass in the seed run", async () => {
  const root = branchFixtureRepo();
  const earlier = path.join(root, "runs", "earlier");
  const failed = await runLinearPipeline(draftRunOptions(root, "earlier"), {
    runSkill: branchWorker([], { "source-to-test-data": () => ({ refs: [] }) }),
  });
  expect(failed.trials[0]!.phases[1]!.failure_kind).toBe("branch_contract");

  const runDir = path.join(root, "runs", "seeded");
  await expect(
    runLinearPipeline(
      { ...draftRunOptions(root, "seeded"), from: "test-plan", seedRun: earlier },
      { runSkill: branchWorker([], {}) },
    ),
  ).rejects.toThrow(
    "phase 3 (test-plan) consumes test-data-refs, which phase 2 (test-data-resolution) produces, but the seed run's phase 2 did not pass",
  );
  expect(existsSync(runDir)).toBe(false);
});

test("refuses a seed artifact that no longer matches the seed run's record", async () => {
  const root = branchFixtureRepo();
  const earlier = await seedRun(root);
  writeFileSync(
    path.join(earlier.dir, "trial-001", "phase-001-interface", "workspace", "iface.json"),
    "edited\n",
  );
  await expect(
    runLinearPipeline(
      { ...draftRunOptions(root, "seeded"), from: "2", seedRun: earlier.dir },
      { runSkill: branchWorker([], {}) },
    ),
  ).rejects.toThrow(
    "seed run's galaxy-interface from phase 1 no longer matches its recorded sha256",
  );
});

test("refuses a seed run of another scenario, fixture or trial", async () => {
  const root = branchFixtureRepo();
  const earlier = await seedRun(root);
  const recordFile = path.join(earlier.dir, "run.json");
  const original = readFileSync(recordFile, "utf8");
  const seeded = (name: string, extra = {}) =>
    runLinearPipeline(
      { ...draftRunOptions(root, name), from: "2", seedRun: earlier.dir, ...extra },
      { runSkill: branchWorker([], {}) },
    );
  const rewrite = (edit: (record: PipelineRunRecord) => void) => {
    const record = JSON.parse(original);
    edit(record);
    writeJson(recordFile, record);
  };

  rewrite((record) => (record.scenario.name = "another journey"));
  await expect(seeded("scenario")).rejects.toThrow(
    "seed run is of scenario 'another journey', not 'tiny journey'",
  );
  rewrite((record) => (record.scenario.fixture_sha256 = "0".repeat(64)));
  await expect(seeded("fixture")).rejects.toThrow(
    "seed run's scenario fixture has changed since it ran",
  );
  rewrite(() => {});
  await expect(seeded("trial", { seedTrial: 2 })).rejects.toThrow("seed run has no trial 2");
});

test("needs --seed-run to start past phase 1, and --from to use one", async () => {
  const root = branchFixtureRepo();
  await expect(
    runLinearPipeline(
      { ...draftRunOptions(root, "unseeded"), from: "2" },
      { runSkill: branchWorker([], {}) },
    ),
  ).rejects.toThrow("--from phase 2 needs --seed-run for the artifacts of phases before it");
  await expect(
    runLinearPipeline(
      { ...draftRunOptions(root, "unstarted"), seedRun: root },
      { runSkill: branchWorker([], {}) },
    ),
  ).rejects.toThrow("--seed-run needs --from");
});

test("selects phases from --from through --through, checking only those", () => {
  const root = branchFixtureRepo();
  const assembly = loadAssembly(root, "demo-pipeline");
  expect(selectPhases(assembly, "3", "test-data-resolution").map((phase) => phase.phase)).toEqual([
    2, 3,
  ]);
  expect(() => selectPhases(assembly, "1", "2")).toThrow(
    "--from phase 2 comes after --through phase 1",
  );
  expect(
    selectPhases(
      loadAssembly(REPO_ROOT, "paper-to-cwl"),
      "test-data-resolution",
      "test-data-resolution",
    ),
  ).toEqual([expect.objectContaining({ kind: "branch", pattern: "test-data-resolution" })]);
});

test("parses --from, --seed-run and --seed-trial", () => {
  const args = parseTestPipelineArgs([
    "nextflow-to-galaxy",
    "--scenario",
    "demo",
    "--provider",
    "p",
    "--model",
    "m",
    "--from",
    "test-data-resolution",
    "--seed-run",
    "/runs/earlier",
    "--seed-trial",
    "2",
  ]);
  expect(args).toEqual(
    expect.objectContaining({
      from: "test-data-resolution",
      seedRun: "/runs/earlier",
      seedTrial: 2,
    }),
  );
  expect(() => parseTestPipelineArgs(["p", "--scenario", "s", "--seed-trial", "0"])).toThrow(
    "--seed-trial must be a positive integer",
  );
});

test("seeds from a run that was itself seeded, carrying its seed forward", async () => {
  const root = branchFixtureRepo();
  writeSkill(
    root,
    "test-plan",
    ["galaxy-interface", "test-data-refs"],
    [{ id: "plan", default_filename: "plan.md" }],
  );
  const first = await seedRun(root);
  const middle = path.join(root, "runs", "middle");
  await runLinearPipeline(
    {
      ...draftRunOptions(root, "middle"),
      from: "2",
      through: "2",
      seedRun: first.dir,
    },
    {
      runSkill: branchWorker([], {
        "source-to-test-data": () => ({ refs: [testDataRef("a", true)] }),
      }),
    },
  );

  const calls: RunPiSkillOptions[] = [];
  const runDir = path.join(root, "runs", "last");
  const record = await runLinearPipeline(
    { ...draftRunOptions(root, "last"), from: "3", seedRun: middle },
    { runSkill: branchWorker(calls, {}) },
  );

  expect(record.status).toBe("passed");
  expect(record.seed?.phases).toEqual([
    { phase: 1, skill: "interface", status: "passed" },
    { phase: 2, skill: "test-data-resolution", status: "passed" },
  ]);
  expect(record.seed?.artifacts.map((artifact) => [artifact.id, artifact.path])).toEqual([
    ["galaxy-interface", "seed/phase-001-interface/iface.json"],
    ["test-data-refs", `seed/phase-002-test-data-resolution/${REFS_FILE}`],
  ]);
  expect(calls[0]!.inputPaths).toEqual([
    path.join(runDir, "seed", "phase-001-interface", "iface.json"),
    path.join(runDir, "seed", "phase-002-test-data-resolution", REFS_FILE),
  ]);
});

test("refuses a seed run whose phase ran a different skill than this pipeline's phase", async () => {
  const root = branchFixtureRepo();
  const earlier = await seedRun(root);
  const assemblyFile = path.join(
    root,
    "casts",
    "claude",
    "skills",
    "pipeline-demo-pipeline",
    "_assembly.json",
  );
  const assembly = JSON.parse(readFileSync(assemblyFile, "utf8"));
  assembly.phases[0].skill = "renamed-interface";
  writeJson(assemblyFile, assembly);
  writeSkill(
    root,
    "renamed-interface",
    [],
    [{ id: "galaxy-interface", default_filename: "iface.json" }],
  );
  await expect(
    runLinearPipeline(
      { ...draftRunOptions(root, "renumbered"), from: "2", seedRun: earlier.dir },
      { runSkill: branchWorker([], {}) },
    ),
  ).rejects.toThrow(
    "seed run's phase 1 ran interface, but this pipeline's phase 1 is renamed-interface",
  );
});

test("refuses a seed that carried no copy of an input its producing phase passed with", async () => {
  // pb rewrites what pa wrote, so a run seeded at pc keeps only pb's copy.
  const root = fixtureRepo();
  writeJson(
    path.join(root, "casts", "claude", "skills", "pipeline-demo-pipeline", "_assembly.json"),
    {
      source_pipeline: "demo-pipeline",
      source_revision: 1,
      harness_name: "pipeline-demo-pipeline",
      phases: ["pa", "pb", "pc"].map((skill, i) => ({
        phase: i + 1,
        kind: "mold",
        skill,
        cast_present: true,
        loop: false,
      })),
    },
  );
  const x = { id: "x", default_filename: "x.txt" };
  writeSkill(root, "pa", [], [x]);
  writeSkill(root, "pb", ["x"], [x]);
  writeSkill(root, "pc", ["x"], [{ id: "y", default_filename: "y.txt" }]);
  const run = (name: string, extra = {}) =>
    runLinearPipeline(
      { ...draftRunOptions(root, name), ...extra },
      { runSkill: branchWorker([], {}) },
    );

  await run("s0", { through: "2" });
  await run("s1", { from: "3", seedRun: path.join(root, "runs", "s0") });
  await expect(run("s2", { from: "2", seedRun: path.join(root, "runs", "s1") })).rejects.toThrow(
    "phase 2 (pb) consumes x, which phase 1 (pa) produces; it passed in the seed run, but the seed run carried no copy of it",
  );
});

test("refuses --seed-run when --from is the first phase, which needs no seed", async () => {
  const root = branchFixtureRepo();
  const earlier = await seedRun(root);
  await expect(
    runLinearPipeline(
      { ...draftRunOptions(root, "first"), from: "1", seedRun: earlier.dir },
      { runSkill: branchWorker([], {}) },
    ),
  ).rejects.toThrow("--seed-run needs --from to name a phase after phase 1");
});

test("seeds from a loop phase the latest write of each artifact, in every trial", async () => {
  const root = draftFixtureRepo();
  const loopRun = path.join(root, "runs", "loop");
  const loop = await runLinearPipeline(
    { ...draftRunOptions(root, "loop"), through: "2" },
    { runSkill: draftWorker([]) },
  );
  const iterations = loop.trials[0]!.phases[1]!.iterations!;
  expect(iterations).toHaveLength(3);

  const calls: RunPiSkillOptions[] = [];
  const runDir = path.join(root, "runs", "after-loop");
  const record = await runLinearPipeline(
    { ...draftRunOptions(root, "after-loop"), from: "3", seedRun: loopRun, trials: 2 },
    { runSkill: draftWorker(calls) },
  );

  expect(record.status).toBe("passed");
  const shaOf = (iteration: number, id: string) =>
    iterations[iteration]!.artifacts.find((artifact) => artifact.id === id)!.sha256;
  expect(
    Object.fromEntries(record.seed!.artifacts.map((artifact) => [artifact.id, artifact.sha256])),
  ).toEqual({
    // The terminal call wrote only the workflow; the draft and ledger are the last call's before it.
    "galaxy-workflow-draft": shaOf(1, "galaxy-workflow-draft"),
    "open-requirements-ledger": shaOf(1, "open-requirements-ledger"),
    "galaxy-workflow": shaOf(2, "galaxy-workflow"),
  });
  const workflow = path.join(
    runDir,
    "seed",
    "phase-002-advance-galaxy-draft-step",
    "galaxy-workflow.gxwf.yml",
  );
  expect(calls.map((call) => call.inputPaths)).toEqual([[workflow], [workflow]]);
});
