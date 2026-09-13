import path from "node:path";

import { defaultPiTestAuthDir, PI_TEST_AUTH_PROVIDER } from "@galaxy-foundry/gxwf-pi-harness";
import { describe, expect, test } from "vitest";

import { defaultTestPipelineRunDir, parseTestPipelineArgs } from "../src/commands/test-pipeline.js";
import { defaultTestSkillRunDir, parseTestSkillArgs } from "../src/commands/test-skill.js";

const SKILL_REQUIRED = ["summarize-nextflow", "--prompt", "Summarize it"];
const PIPELINE_REQUIRED = ["nextflow-to-galaxy", "--scenario", "demo"];
const RUNTIME_REQUIRED = ["--provider", "openai-codex", "--model", "gpt-test"];

/**
 * Both worker commands route their shared runtime flags through the same parser, so
 * every case below runs against both and asserts the same outcome.
 */
const COMMANDS = [
  {
    name: "test-skill",
    parse: (flags: string[]) => parseTestSkillArgs([...SKILL_REQUIRED, ...flags]),
    ownFlag: ["--expect", "summary=out/summary.md"],
    otherCommandFlag: "--scenario",
  },
  {
    name: "test-pipeline",
    parse: (flags: string[]) => parseTestPipelineArgs([...PIPELINE_REQUIRED, ...flags]),
    ownFlag: ["--trials", "2"],
    otherCommandFlag: "--prompt",
  },
] as const;

describe.each(COMMANDS)("$name worker runtime flags", ({ parse, ownFlag, otherCommandFlag }) => {
  test("applies shared defaults", () => {
    const args = parse(RUNTIME_REQUIRED);
    expect(args).toMatchObject({
      root: null,
      runDir: null,
      provider: "openai-codex",
      model: "gpt-test",
      timeoutMs: 10 * 60 * 1000,
      sandbox: "local",
      sandboxNetwork: "bridge",
      credentialEnv: [],
    });
    expect(args.thinking).toBeUndefined();
    expect(args.tools).toBeUndefined();
    expect(args.sandboxImage).toBeUndefined();
  });

  test("parses the full common flag set with separate values", () => {
    const args = parse([
      ...RUNTIME_REQUIRED,
      "--root",
      "/repo",
      "--run-dir",
      "/runs/one",
      "--thinking",
      "high",
      "--timeout-seconds",
      "30",
      "--tools",
      "read,,write",
      "--sandbox",
      "container",
      "--sandbox-image",
      "foundry:test",
      "--sandbox-network",
      "none",
      "--credential-env",
      "TOKEN_A",
      "--credential-env",
      "TOKEN_B",
    ]);
    expect(args).toMatchObject({
      root: "/repo",
      runDir: "/runs/one",
      thinking: "high",
      timeoutMs: 30_000,
      tools: ["read", "write"],
      sandbox: "container",
      sandboxImage: "foundry:test",
      sandboxNetwork: "none",
      credentialEnv: ["TOKEN_A", "TOKEN_B"],
    });
  });

  test("--flag=value is equivalent to --flag value", () => {
    const separate = parse([
      ...RUNTIME_REQUIRED,
      "--root",
      "/repo",
      "--run-dir",
      "/runs/one",
      "--thinking",
      "low",
      "--timeout-seconds",
      "45",
      "--tools",
      "read",
      "--sandbox",
      "container",
      "--sandbox-image",
      "foundry:test",
      "--sandbox-network",
      "none",
      "--credential-env",
      "TOKEN_A",
    ]);
    const inline = parse([
      "--provider=openai-codex",
      "--model=gpt-test",
      "--root=/repo",
      "--run-dir=/runs/one",
      "--thinking=low",
      "--timeout-seconds=45",
      "--tools=read",
      "--sandbox=container",
      "--sandbox-image=foundry:test",
      "--sandbox-network=none",
      "--credential-env=TOKEN_A",
    ]);
    expect(inline).toEqual(separate);
  });

  test("--pi-test-auth defaults the auth directory and accepts both aliases", () => {
    const enabled = parse([...RUNTIME_REQUIRED, "--pi-test-auth"]);
    expect(enabled.piTestAuthDir).toBe(path.resolve(defaultPiTestAuthDir()));

    const custom = path.resolve("custom-eval-auth");
    const authDir = parse([...RUNTIME_REQUIRED, "--pi-test-auth", "--auth-dir", custom]);
    const aliasSpaced = parse([
      ...RUNTIME_REQUIRED,
      "--pi-test-auth",
      "--pi-test-auth-dir",
      custom,
    ]);
    const aliasInline = parse([
      ...RUNTIME_REQUIRED,
      "--pi-test-auth",
      `--pi-test-auth-dir=${custom}`,
    ]);
    expect(authDir.piTestAuthDir).toBe(custom);
    expect(aliasSpaced).toEqual(authDir);
    expect(aliasInline).toEqual(authDir);
  });

  test("rejects invalid shared values", () => {
    expect(() => parse([...RUNTIME_REQUIRED, "--thinking", "extreme"])).toThrow(
      "invalid --thinking value: extreme",
    );
    expect(() => parse([...RUNTIME_REQUIRED, "--sandbox", "vm"])).toThrow(
      "--sandbox must be local or container",
    );
    expect(() => parse([...RUNTIME_REQUIRED, "--sandbox-network=host"])).toThrow(
      "--sandbox-network must be bridge or none",
    );
    expect(() => parse([...RUNTIME_REQUIRED, "--timeout-seconds", "0"])).toThrow(
      "--timeout-seconds must be a positive number",
    );
    expect(() => parse([...RUNTIME_REQUIRED, "--timeout-seconds=abc"])).toThrow(
      "--timeout-seconds must be a positive number",
    );
    expect(() => parse([...RUNTIME_REQUIRED, "--root"])).toThrow("--root requires a value");
    expect(() => parse([...RUNTIME_REQUIRED, "--provider", "--model"])).toThrow(
      "--provider requires a value",
    );
  });

  test("requires a pinned provider and model", () => {
    expect(() => parse(["--model", "gpt-test"])).toThrow(
      "--provider is required so the worker runtime is pinned",
    );
    expect(() => parse(["--provider", "openai-codex"])).toThrow(
      "--model is required so the worker runtime is pinned",
    );
  });

  test("rejects incompatible shared option combinations", () => {
    expect(() => parse([...RUNTIME_REQUIRED, "--sandbox-image", "foundry:test"])).toThrow(
      "--sandbox-image and --credential-env require --sandbox container",
    );
    expect(() => parse([...RUNTIME_REQUIRED, "--credential-env", "TOKEN_A"])).toThrow(
      "--sandbox-image and --credential-env require --sandbox container",
    );
    expect(() => parse([...RUNTIME_REQUIRED, "--sandbox", "container", "--pi-test-auth"])).toThrow(
      "--pi-test-auth requires --sandbox local",
    );
    expect(() =>
      parse(["--provider", "anthropic", "--model", "gpt-test", "--pi-test-auth"]),
    ).toThrow(`--pi-test-auth requires --provider ${PI_TEST_AUTH_PROVIDER}`);
    expect(() => parse([...RUNTIME_REQUIRED, "--auth-dir", "/tmp/auth"])).toThrow(
      "--auth-dir requires --pi-test-auth",
    );
  });

  test("keeps command-specific flags owned by their own command", () => {
    expect(() => parse([...RUNTIME_REQUIRED, otherCommandFlag, "value"])).toThrow(
      `unknown flag: ${otherCommandFlag}`,
    );
    expect(() => parse([...RUNTIME_REQUIRED, ...ownFlag])).not.toThrow();
    expect(() => parse([...RUNTIME_REQUIRED, "--nope"])).toThrow("unknown flag: --nope");
  });
});

test("command-specific flags still parse alongside shared runtime flags", () => {
  const skill = parseTestSkillArgs([
    "summarize-nextflow",
    "--prompt",
    "Summarize it",
    "--input",
    "a.txt",
    "--input=b.txt",
    "--expect",
    "summary=out/summary.md",
    ...RUNTIME_REQUIRED,
  ]);
  expect(skill.skill).toBe("summarize-nextflow");
  expect(skill.prompt).toBe("Summarize it");
  expect(skill.inputs).toEqual(["a.txt", "b.txt"]);
  expect(skill.expected).toEqual([{ id: "summary", path: "out/summary.md" }]);

  const pipeline = parseTestPipelineArgs([
    "nextflow-to-galaxy",
    "--scenario",
    "demo",
    "--through",
    "3",
    "--trials=2",
    "--engine",
    "pi",
    ...RUNTIME_REQUIRED,
  ]);
  expect(pipeline.pipeline).toBe("nextflow-to-galaxy");
  expect(pipeline.scenario).toBe("demo");
  expect(pipeline.through).toBe("3");
  expect(pipeline.trials).toBe(2);
  expect(() =>
    parseTestPipelineArgs([...PIPELINE_REQUIRED, ...RUNTIME_REQUIRED, "--trials", "0"]),
  ).toThrow("--trials must be a positive integer");
  expect(() =>
    parseTestPipelineArgs([...PIPELINE_REQUIRED, ...RUNTIME_REQUIRED, "--engine=other"]),
  ).toThrow("--engine currently supports only pi");
});

test("disabled pi-test-auth keeps each command's own empty representation", () => {
  expect(parseTestSkillArgs([...SKILL_REQUIRED, ...RUNTIME_REQUIRED]).piTestAuthDir).toBeNull();
  expect(
    parseTestPipelineArgs([...PIPELINE_REQUIRED, ...RUNTIME_REQUIRED]).piTestAuthDir,
  ).toBeUndefined();
});

test("run directories stay distinct per command", () => {
  const now = new Date("2026-01-02T03:04:05.678Z");
  expect(defaultTestSkillRunDir("summarize-nextflow", now, "id")).toMatch(
    /foundry-pi-run-summarize-nextflow-2026-01-02T03-04-05-678Z-id$/,
  );
  expect(defaultTestPipelineRunDir("nextflow-to-galaxy", now, "id")).toMatch(
    /foundry-pi-pipeline-run-nextflow-to-galaxy-2026-01-02T03-04-05-678Z-id$/,
  );
});
