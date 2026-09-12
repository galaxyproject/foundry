import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { RpcClientOptions } from "@earendil-works/pi-coding-agent";
import { describe, expect, test } from "vitest";

import {
  expectedArtifactsFromSkill,
  runPiSkill,
  sha256Path,
  type PiRunnerDependencies,
} from "../src/index.js";

function fixtureRoot(): string {
  return mkdtempSync(path.join(tmpdir(), "foundry-pi-runner-test-"));
}

function makeSkill(root: string): string {
  const skillDir = path.join(root, "skills", "example-skill");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    path.join(skillDir, "SKILL.md"),
    "---\nname: example-skill\ndescription: Example.\n---\n\n# Example\n",
  );
  writeFileSync(
    path.join(skillDir, "_provenance.json"),
    JSON.stringify({
      artifacts: { produces: [{ id: "example-output", default_filename: "output.json" }] },
    }),
  );
  writeFileSync(
    path.join(skillDir, "_verify.json"),
    JSON.stringify({
      verify_schema_version: 1,
      entries: [
        {
          artifact_id: "example-output",
          validator_bin: process.execPath,
          args: [
            "-e",
            "const fs=require('node:fs'); JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));",
            "{artifact_path}",
          ],
        },
      ],
    }),
  );
  return skillDir;
}

function fakeDependencies(
  onPrompt: (prompt: string, options: RpcClientOptions) => void | Promise<void>,
  capture: { options?: RpcClientOptions; prompt?: string; aborted?: boolean } = {},
): PiRunnerDependencies {
  return {
    id: () => "00000000-0000-4000-8000-000000000000",
    createClient: (options) => {
      capture.options = options;
      let listener: (event: never) => void = () => undefined;
      return {
        async start() {},
        async stop() {},
        async abort() {
          capture.aborted = true;
        },
        onEvent: (nextListener) => {
          listener = nextListener;
          return () => undefined;
        },
        async promptAndWait(prompt) {
          capture.prompt = prompt;
          listener({ type: "agent_start" } as never);
          await onPrompt(prompt, options);
          return [];
        },
        getStderr: () => "diagnostic stderr",
        async getState() {
          return {
            model: { provider: "test-provider", id: "resolved-model" },
            thinkingLevel: "medium",
            isStreaming: false,
            isCompacting: false,
            steeringMode: "one-at-a-time",
            followUpMode: "one-at-a-time",
            sessionId: "ephemeral",
            autoCompactionEnabled: false,
            messageCount: 2,
            pendingMessageCount: 0,
          } as never;
        },
        async getSessionStats() {
          return {
            sessionFile: undefined,
            sessionId: "ephemeral",
            userMessages: 1,
            assistantMessages: 1,
            toolCalls: 2,
            toolResults: 2,
            totalMessages: 4,
            tokens: {
              input: 10,
              output: 20,
              cacheRead: 3,
              cacheWrite: 4,
              total: 37,
            },
            cost: 0.01,
          };
        },
        async getLastAssistantText() {
          return "done";
        },
      };
    },
  };
}

describe("runPiSkill", () => {
  test("runs one explicitly loaded skill with ambient discovery disabled", async () => {
    const root = fixtureRoot();
    const skillDir = makeSkill(root);
    const inputDir = path.join(root, "source-pipeline");
    mkdirSync(inputDir);
    writeFileSync(path.join(inputDir, "main.nf"), "workflow { }\n");
    const runDir = path.join(root, "runs", "run-1");
    const capture: { options?: RpcClientOptions; prompt?: string } = {};
    const eventTypes: string[] = [];
    const dependencies = fakeDependencies((_prompt, options) => {
      writeFileSync(path.join(options.cwd!, "output.json"), '{"ok":true}\n');
    }, capture);

    const record = await runPiSkill(
      {
        skillDir,
        prompt: "Summarize the declared pipeline.",
        inputPaths: [inputDir],
        runDir,
        provider: "test-provider",
        model: "requested-model",
        thinking: "high",
        onEvent: (event) => eventTypes.push(event.type),
      },
      dependencies,
    );

    expect(record.status).toBe("passed");
    expect(record.engine.resolved_model).toBe("test-provider/resolved-model");
    expect(record.engine.requested_thinking).toBe("high");
    expect(record.artifacts).toEqual([
      expect.objectContaining({ id: "example-output", path: "output.json", status: "passed" }),
    ]);
    expect(record.inputs).toEqual([
      expect.objectContaining({ staged_path: "inputs/source-pipeline" }),
    ]);
    expect(capture.prompt).toContain("/skill:example-skill");
    expect(capture.prompt).toContain("inputs/source-pipeline");
    expect(capture.options?.args).toEqual([
      "--no-session",
      "--no-context-files",
      "--no-extensions",
      "--no-prompt-templates",
      "--no-skills",
      "--skill",
      path.join(runDir, "skill"),
      "--tools",
      "read,write,edit,bash,grep,find,ls",
      "--thinking",
      "high",
    ]);
    expect(capture.options?.env?.PI_CODING_AGENT_DIR).toBe(path.join(runDir, "pi-agent"));
    expect(eventTypes).toEqual(["agent_start"]);
    expect(readFileSync(path.join(runDir, "trace.jsonl"), "utf8")).toContain("agent_start");
    expect(statSync(path.join(runDir, "workspace", "inputs", "source-pipeline")).mode & 0o777).toBe(
      0o555,
    );
    expect(statSync(path.join(runDir, "skill")).mode & 0o777).toBe(0o555);
    expect(readFileSync(path.join(runDir, "skill", "SKILL.md"), "utf8")).toContain(
      "name: example-skill",
    );
    expect(JSON.parse(readFileSync(path.join(runDir, "run.json"), "utf8"))).toEqual(record);
    expect(readFileSync(path.join(runDir, "stderr.log"), "utf8")).toBe("diagnostic stderr");
  });

  test("runs the bundled Foundry validator without relying on ambient PATH", async () => {
    const root = fixtureRoot();
    const skillDir = makeSkill(root);
    writeFileSync(
      path.join(skillDir, "_verify.json"),
      JSON.stringify({
        verify_schema_version: 1,
        entries: [
          {
            artifact_id: "example-output",
            validator_bin: "foundry",
            args: ["--help"],
          },
        ],
      }),
    );
    const originalPath = process.env.PATH;
    process.env.PATH = "";
    try {
      const record = await runPiSkill(
        {
          skillDir,
          prompt: "Do the work.",
          runDir: path.join(root, "run"),
          provider: "test-provider",
          model: "test-model",
        },
        fakeDependencies((_prompt, options) => {
          writeFileSync(path.join(options.cwd!, "output.json"), '{"ok":true}\n');
        }),
      );

      expect(record.status).toBe("passed");
      expect(record.artifacts[0]).toEqual(
        expect.objectContaining({
          status: "passed",
          validator: expect.objectContaining({ bin: "foundry", exit_code: 0 }),
        }),
      );
    } finally {
      if (originalPath === undefined) delete process.env.PATH;
      else process.env.PATH = originalPath;
    }
  });

  test("classifies a missing declared artifact as a skill failure", async () => {
    const root = fixtureRoot();
    const record = await runPiSkill(
      {
        skillDir: makeSkill(root),
        prompt: "Do the work.",
        runDir: path.join(root, "run"),
        provider: "test-provider",
        model: "test-model",
      },
      fakeDependencies(() => undefined),
    );

    expect(record.status).toBe("failed");
    expect(record.failure_kind).toBe("skill");
    expect(record.artifacts[0]?.status).toBe("missing");
  });

  test("permits a declared optional artifact to be absent", async () => {
    const root = fixtureRoot();
    const record = await runPiSkill(
      {
        skillDir: makeSkill(root),
        prompt: "Do the work.",
        expectedArtifacts: [{ id: "optional-output", path: "optional.json", optional: true }],
        runDir: path.join(root, "run"),
        provider: "test-provider",
        model: "test-model",
      },
      fakeDependencies(() => undefined),
    );

    expect(record.status).toBe("passed");
    expect(record.artifacts[0]).toEqual(
      expect.objectContaining({ id: "optional-output", status: "missing" }),
    );
  });

  test("reads optionality from a cast skill's provenance", () => {
    const root = fixtureRoot();
    const skillDir = makeSkill(root);
    writeFileSync(
      path.join(skillDir, "_provenance.json"),
      JSON.stringify({
        artifacts: {
          produces: [
            { id: "required-output", default_filename: "required.json" },
            { id: "optional-output", default_filename: "optional.json", optional: true },
          ],
        },
      }),
    );

    expect(expectedArtifactsFromSkill(skillDir)).toEqual([
      { id: "required-output", path: "required.json" },
      { id: "optional-output", path: "optional.json", optional: true },
    ]);
  });

  test("links an explicit pi-test-auth store only for the lifetime of a local worker", async () => {
    const root = fixtureRoot();
    const authDir = path.join(root, "pi-test-auth");
    mkdirSync(authDir, { mode: 0o700 });
    writeFileSync(
      path.join(authDir, "auth.json"),
      JSON.stringify({
        "openai-codex": {
          type: "oauth",
          access: "access-secret",
          refresh: "refresh-secret",
          expires: Date.now() + 60_000,
          accountId: "account-123",
        },
      }),
      { mode: 0o600 },
    );
    const runDir = path.join(root, "run");
    let linkedDuringRun = false;

    const record = await runPiSkill(
      {
        skillDir: makeSkill(root),
        prompt: "Do the work.",
        expectedArtifacts: [],
        runDir,
        provider: "openai-codex",
        model: "gpt-test",
        piTestAuthDir: authDir,
      },
      fakeDependencies((_prompt, options) => {
        const authPath = path.join(options.env?.PI_CODING_AGENT_DIR ?? "", "auth.json");
        linkedDuringRun = existsSync(authPath);
        expect(readFileSync(authPath, "utf8")).toContain("access-secret");
      }),
    );

    expect(record.status).toBe("passed");
    expect(linkedDuringRun).toBe(true);
    expect(record.sandbox).toEqual(
      expect.objectContaining({ credential_auth_store: "pi-test-auth" }),
    );
    expect(existsSync(path.join(runDir, "pi-agent", "auth.json"))).toBe(false);
    expect(JSON.stringify(record)).not.toContain(authDir);
    expect(JSON.stringify(record)).not.toContain("access-secret");
  });

  test("rejects pi-test-auth in the whole-process container sandbox", async () => {
    const root = fixtureRoot();
    await expect(
      runPiSkill({
        skillDir: makeSkill(root),
        prompt: "Do the work.",
        expectedArtifacts: [],
        runDir: path.join(root, "run"),
        provider: "openai-codex",
        model: "gpt-test",
        sandbox: "container",
        piTestAuthDir: path.join(root, "pi-test-auth"),
      }),
    ).rejects.toThrow("pi-test-auth requires the local sandbox");
  });

  test("removes the worker auth link even if its target disappears during the run", async () => {
    const root = fixtureRoot();
    const authDir = path.join(root, "pi-test-auth");
    mkdirSync(authDir, { mode: 0o700 });
    const sourceAuthPath = path.join(authDir, "auth.json");
    writeFileSync(
      sourceAuthPath,
      JSON.stringify({
        "openai-codex": {
          type: "oauth",
          access: "access-secret",
          refresh: "refresh-secret",
          expires: Date.now() + 60_000,
        },
      }),
      { mode: 0o600 },
    );
    const runDir = path.join(root, "run");

    const record = await runPiSkill(
      {
        skillDir: makeSkill(root),
        prompt: "Do the work.",
        expectedArtifacts: [],
        runDir,
        provider: "openai-codex",
        model: "gpt-test",
        piTestAuthDir: authDir,
      },
      fakeDependencies(() => unlinkSync(sourceAuthPath)),
    );

    expect(record.status).toBe("passed");
    expect(() => lstatSync(path.join(runDir, "pi-agent", "auth.json"))).toThrow();
  });

  test("container mode exposes only the selected skill, declared inputs, and output mount", async () => {
    const root = fixtureRoot();
    const checkout = path.join(root, "checkout");
    const skillDir = makeSkill(checkout);
    const inputDir = path.join(checkout, "fixture");
    mkdirSync(inputDir);
    writeFileSync(path.join(inputDir, "main.nf"), "workflow { }\n");
    mkdirSync(path.join(checkout, ".git"));
    mkdirSync(path.join(checkout, "content", "molds"), { recursive: true });
    mkdirSync(path.join(checkout, "_emulated-runs"));
    mkdirSync(path.join(checkout, "skills", "unrelated-skill"));
    const runDir = path.join(root, "runs", "container-run");
    const capture: { options?: RpcClientOptions; prompt?: string } = {};
    const secretName = "FOUNDRY_TEST_PROVIDER_KEY";
    process.env[secretName] = "test-secret";

    try {
      const record = await runPiSkill(
        {
          skillDir,
          prompt: "Summarize the declared pipeline.",
          inputPaths: [inputDir],
          runDir,
          provider: "test-provider",
          model: "requested-model",
          sandbox: "container",
          sandboxImage: "example/foundry-pi@sha256:requested",
          credentialEnv: [secretName],
        },
        {
          ...fakeDependencies((_prompt, options) => {
            writeFileSync(path.join(options.cwd!, "output.json"), '{"ok":true}\n');
          }, capture),
          inspectContainerImage: (requested) => ({
            requested,
            resolved_id: "sha256:resolved",
            repo_digests: ["example/foundry-pi@sha256:resolved"],
            pi_version: "0.84.4",
            foundry_cli_version: "0.1.0",
          }),
        },
      );

      expect(record.status).toBe("passed");
      expect(record.sandbox).toEqual(
        expect.objectContaining({
          mode: "container",
          security_boundary: true,
          network_policy: "bridge",
          credential_policy: "allowlisted-environment",
          credential_env: [secretName],
          workdir: "/workspace",
          agent_config_dir: "/pi-agent",
          image: expect.objectContaining({ resolved_id: "sha256:resolved" }),
        }),
      );
      if (record.sandbox.mode !== "container") throw new Error("expected container record");
      const bindMounts = record.sandbox.mounts.filter((mount) => mount.type === "bind");
      expect(bindMounts).toEqual([
        expect.objectContaining({
          source: path.join(runDir, "skill"),
          target: "/skill",
          read_only: true,
        }),
        expect.objectContaining({
          source: path.join(runDir, "inputs"),
          target: "/inputs",
          read_only: true,
        }),
        expect.objectContaining({
          source: path.join(runDir, "workspace"),
          target: "/workspace",
          read_only: false,
        }),
      ]);
      const manifest = JSON.stringify(record.sandbox.mounts);
      expect(manifest).not.toContain(checkout);
      expect(manifest).not.toContain("/.git");
      expect(manifest).not.toContain("/content/molds");
      expect(manifest).not.toContain("/_emulated-runs");
      expect(manifest).not.toContain("unrelated-skill");
      expect(capture.prompt).toContain("/inputs/fixture");
      expect(capture.options?.args).toContain("/skill");
      const launch = JSON.parse(
        capture.options?.env?.FOUNDRY_CONTAINER_LAUNCH_CONFIG ?? "null",
      ) as { image_id?: string; credential_env?: string[] };
      expect(launch.image_id).toBe("sha256:resolved");
      expect(launch.credential_env).toEqual([secretName]);
      expect(capture.options?.env).not.toHaveProperty(secretName);
    } finally {
      delete process.env[secretName];
    }
  });

  test("enforces a wall timeout and aborts the worker", async () => {
    const root = fixtureRoot();
    const capture: { aborted?: boolean } = {};
    const record = await runPiSkill(
      {
        skillDir: makeSkill(root),
        prompt: "Never finish.",
        expectedArtifacts: [],
        runDir: path.join(root, "run"),
        provider: "test-provider",
        model: "test-model",
        timeoutMs: 5,
      },
      fakeDependencies(() => new Promise<void>(() => undefined), capture),
    );

    expect(record.status).toBe("timed_out");
    expect(capture.aborted).toBe(true);
    expect(record.error).toContain("wall timeout");
  });
});

describe("skill manifests", () => {
  test("derives expected artifacts from cast provenance", () => {
    const root = fixtureRoot();
    expect(expectedArtifactsFromSkill(makeSkill(root))).toEqual([
      { id: "example-output", path: "output.json" },
    ]);
  });

  test("hashes file contents rather than filesystem metadata", () => {
    const root = fixtureRoot();
    const first = path.join(root, "first.txt");
    const second = path.join(root, "second.txt");
    writeFileSync(first, "same\n");
    writeFileSync(second, "same\n");
    chmodSync(second, 0o600);
    expect(sha256Path(first)).toBe(sha256Path(second));
  });
});
