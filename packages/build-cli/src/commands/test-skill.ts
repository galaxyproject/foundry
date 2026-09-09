import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import {
  defaultPiTestAuthDir,
  expectedArtifactsFromSkill,
  PI_TEST_AUTH_PROVIDER,
  runPiSkill,
  type ContainerNetworkPolicy,
  type ExpectedArtifact,
  type PiThinkingLevel,
  type SandboxMode,
} from "@galaxy-foundry/gxwf-pi-harness";

export interface TestSkillCliArgs {
  skill: string;
  root: string | null;
  prompt: string;
  inputs: string[];
  expected: ExpectedArtifact[] | null;
  runDir: string | null;
  provider: string;
  model: string;
  thinking?: PiThinkingLevel;
  timeoutMs: number;
  tools?: string[];
  sandbox: SandboxMode;
  sandboxImage?: string;
  sandboxNetwork: ContainerNetworkPolicy;
  credentialEnv: string[];
  piTestAuth: boolean;
  piTestAuthDir: string | null;
}

const THINKING_LEVELS = new Set<PiThinkingLevel>([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);

function takeValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function parseExpected(value: string): ExpectedArtifact {
  const separator = value.indexOf("=");
  if (separator < 1 || separator === value.length - 1) {
    throw new Error("--expect must use <artifact-id>=<relative-path>");
  }
  return { id: value.slice(0, separator), path: value.slice(separator + 1) };
}

function parseThinking(value: string): PiThinkingLevel {
  if (!THINKING_LEVELS.has(value as PiThinkingLevel)) {
    throw new Error(`invalid --thinking value: ${value}`);
  }
  return value as PiThinkingLevel;
}

export function parseTestSkillArgs(argv: string[]): TestSkillCliArgs {
  const positional: string[] = [];
  const inputs: string[] = [];
  const expected: ExpectedArtifact[] = [];
  let root: string | null = null;
  let prompt: string | null = null;
  let promptFile: string | null = null;
  let runDir: string | null = null;
  let provider: string | null = null;
  let model: string | null = null;
  let thinking: PiThinkingLevel | undefined;
  let timeoutMs = 10 * 60 * 1000;
  let tools: string[] | undefined;
  let sandbox: SandboxMode = "local";
  let sandboxImage: string | undefined;
  let sandboxNetwork: ContainerNetworkPolicy = "bridge";
  const credentialEnv: string[] = [];
  let piTestAuth = false;
  let piTestAuthDir: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const value = argv[i]!;
    if (value === "--root") root = takeValue(argv, i++, value);
    else if (value.startsWith("--root=")) root = value.slice("--root=".length);
    else if (value === "--prompt") prompt = takeValue(argv, i++, value);
    else if (value.startsWith("--prompt=")) prompt = value.slice("--prompt=".length);
    else if (value === "--prompt-file") promptFile = takeValue(argv, i++, value);
    else if (value.startsWith("--prompt-file=")) {
      promptFile = value.slice("--prompt-file=".length);
    } else if (value === "--input") inputs.push(takeValue(argv, i++, value));
    else if (value.startsWith("--input=")) inputs.push(value.slice("--input=".length));
    else if (value === "--expect") expected.push(parseExpected(takeValue(argv, i++, value)));
    else if (value.startsWith("--expect=")) {
      expected.push(parseExpected(value.slice("--expect=".length)));
    } else if (value === "--run-dir") runDir = takeValue(argv, i++, value);
    else if (value.startsWith("--run-dir=")) runDir = value.slice("--run-dir=".length);
    else if (value === "--provider") provider = takeValue(argv, i++, value);
    else if (value.startsWith("--provider=")) provider = value.slice("--provider=".length);
    else if (value === "--model") model = takeValue(argv, i++, value);
    else if (value.startsWith("--model=")) model = value.slice("--model=".length);
    else if (value === "--thinking") {
      thinking = parseThinking(takeValue(argv, i++, value));
    } else if (value.startsWith("--thinking=")) {
      thinking = parseThinking(value.slice("--thinking=".length));
    } else if (value === "--timeout-seconds") {
      timeoutMs = Number(takeValue(argv, i++, value)) * 1000;
    } else if (value.startsWith("--timeout-seconds=")) {
      timeoutMs = Number(value.slice("--timeout-seconds=".length)) * 1000;
    } else if (value === "--tools") {
      tools = takeValue(argv, i++, value).split(",").filter(Boolean);
    } else if (value.startsWith("--tools=")) {
      tools = value.slice("--tools=".length).split(",").filter(Boolean);
    } else if (value === "--sandbox") {
      const requested = takeValue(argv, i++, value);
      if (requested !== "local" && requested !== "container") {
        throw new Error("--sandbox must be local or container");
      }
      sandbox = requested;
    } else if (value.startsWith("--sandbox=")) {
      const requested = value.slice("--sandbox=".length);
      if (requested !== "local" && requested !== "container") {
        throw new Error("--sandbox must be local or container");
      }
      sandbox = requested;
    } else if (value === "--sandbox-image") {
      sandboxImage = takeValue(argv, i++, value);
    } else if (value.startsWith("--sandbox-image=")) {
      sandboxImage = value.slice("--sandbox-image=".length);
    } else if (value === "--sandbox-network") {
      const requested = takeValue(argv, i++, value);
      if (requested !== "bridge" && requested !== "none") {
        throw new Error("--sandbox-network must be bridge or none");
      }
      sandboxNetwork = requested;
    } else if (value.startsWith("--sandbox-network=")) {
      const requested = value.slice("--sandbox-network=".length);
      if (requested !== "bridge" && requested !== "none") {
        throw new Error("--sandbox-network must be bridge or none");
      }
      sandboxNetwork = requested;
    } else if (value === "--credential-env") {
      credentialEnv.push(takeValue(argv, i++, value));
    } else if (value.startsWith("--credential-env=")) {
      credentialEnv.push(value.slice("--credential-env=".length));
    } else if (value === "--pi-test-auth") {
      piTestAuth = true;
    } else if (value === "--auth-dir" || value === "--pi-test-auth-dir") {
      piTestAuthDir = takeValue(argv, i++, value);
    } else if (value.startsWith("--auth-dir=")) {
      piTestAuthDir = value.slice("--auth-dir=".length);
    } else if (value.startsWith("--pi-test-auth-dir=")) {
      piTestAuthDir = value.slice("--pi-test-auth-dir=".length);
    } else if (!value.startsWith("--")) positional.push(value);
    else throw new Error(`unknown flag: ${value}`);
  }

  if (positional.length !== 1) {
    throw new Error(
      "usage: foundry-build test-skill <skill> --prompt <text> --provider <provider> --model <model> [options]",
    );
  }
  if (prompt && promptFile) throw new Error("use only one of --prompt or --prompt-file");
  if (promptFile) prompt = readFileSync(promptFile, "utf8");
  if (!prompt) throw new Error("--prompt or --prompt-file is required");
  if (!provider) throw new Error("--provider is required so the worker runtime is pinned");
  if (!model) throw new Error("--model is required so the worker runtime is pinned");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("--timeout-seconds must be a positive number");
  }
  if (sandbox === "local" && (sandboxImage || credentialEnv.length)) {
    throw new Error("--sandbox-image and --credential-env require --sandbox container");
  }
  if (piTestAuth && sandbox !== "local") {
    throw new Error("--pi-test-auth requires --sandbox local");
  }
  if (piTestAuth && provider !== PI_TEST_AUTH_PROVIDER) {
    throw new Error(`--pi-test-auth requires --provider ${PI_TEST_AUTH_PROVIDER}`);
  }
  if (piTestAuthDir && !piTestAuth) {
    throw new Error("--auth-dir requires --pi-test-auth");
  }
  return {
    skill: positional[0]!,
    root,
    prompt,
    inputs,
    expected: expected.length ? expected : null,
    runDir,
    provider,
    model,
    thinking,
    timeoutMs,
    tools,
    sandbox,
    sandboxImage,
    sandboxNetwork,
    credentialEnv,
    piTestAuth,
    piTestAuthDir: piTestAuth ? path.resolve(piTestAuthDir ?? defaultPiTestAuthDir()) : null,
  };
}

export function defaultTestSkillRunDir(skill: string, now = new Date(), id = randomUUID()): string {
  const stamp = now.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  return path.join(tmpdir(), `foundry-pi-run-${skill}-${stamp}-${id}`);
}

export async function runTestSkillCommand(argv = process.argv.slice(2)): Promise<void> {
  const args = parseTestSkillArgs(argv);
  const piTestAuthDir = args.piTestAuthDir ?? undefined;
  if (args.root) process.chdir(args.root);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.skill)) {
    throw new Error(`invalid cast skill name: ${args.skill}`);
  }
  const skillDir = path.resolve("casts", "claude", "skills", args.skill);
  const record = await runPiSkill({
    skillDir,
    prompt: args.prompt,
    inputPaths: args.inputs.map((input) => path.resolve(input)),
    expectedArtifacts: args.expected ?? expectedArtifactsFromSkill(skillDir),
    runDir: path.resolve(args.runDir ?? defaultTestSkillRunDir(args.skill)),
    provider: args.provider,
    model: args.model,
    thinking: args.thinking,
    timeoutMs: args.timeoutMs,
    tools: args.tools,
    sandbox: args.sandbox,
    sandboxImage: args.sandboxImage,
    sandboxNetwork: args.sandboxNetwork,
    credentialEnv: args.credentialEnv,
    piTestAuthDir,
  });
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
  if (record.status !== "passed") process.exitCode = 1;
}
