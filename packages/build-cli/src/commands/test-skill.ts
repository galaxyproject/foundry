import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  expectedArtifactsFromSkill,
  runPiSkill,
  type ExpectedArtifact,
} from "@galaxy-foundry/gxwf-pi-harness";

import {
  createWorkerRuntimeArgScanner,
  defaultWorkerRunDir,
  readOption,
  type WorkerRuntimeArgs,
} from "../lib/worker-runtime-args.js";

export interface TestSkillCliArgs extends WorkerRuntimeArgs {
  skill: string;
  prompt: string;
  inputs: string[];
  expected: ExpectedArtifact[] | null;
}

function parseExpected(value: string): ExpectedArtifact {
  const separator = value.indexOf("=");
  if (separator < 1 || separator === value.length - 1) {
    throw new Error("--expect must use <artifact-id>=<relative-path>");
  }
  return { id: value.slice(0, separator), path: value.slice(separator + 1) };
}

export function parseTestSkillArgs(argv: string[]): TestSkillCliArgs {
  const runtime = createWorkerRuntimeArgScanner();
  const positional: string[] = [];
  const inputs: string[] = [];
  const expected: ExpectedArtifact[] = [];
  let prompt: string | null = null;
  let promptFile: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const value = argv[i]!;
    let option = readOption(argv, i, "--prompt");
    if (option) {
      prompt = option.value;
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--prompt-file");
    if (option) {
      promptFile = option.value;
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--input");
    if (option) {
      inputs.push(option.value);
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--expect");
    if (option) {
      expected.push(parseExpected(option.value));
      i = option.lastIndex;
      continue;
    }
    const consumed = runtime.consume(argv, i);
    if (consumed !== null) {
      i = consumed;
      continue;
    }
    if (!value.startsWith("--")) positional.push(value);
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

  const options = runtime.finish();
  return {
    ...options,
    skill: positional[0]!,
    prompt,
    inputs,
    expected: expected.length ? expected : null,
  };
}

export function defaultTestSkillRunDir(skill: string, now?: Date, id?: string): string {
  return defaultWorkerRunDir("foundry-pi-run", skill, now, id);
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
