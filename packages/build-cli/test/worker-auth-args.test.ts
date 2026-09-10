import path from "node:path";

import { expect, test } from "vitest";

import { parseTestPipelineArgs } from "../src/commands/test-pipeline.js";
import { parseTestSkillArgs } from "../src/commands/test-skill.js";

const authDir = path.resolve("custom-eval-auth");

test("test-skill forwards a custom pi-test-auth directory", () => {
  const args = parseTestSkillArgs([
    "summarize-nextflow",
    "--prompt",
    "Summarize it",
    "--provider",
    "openai-codex",
    "--model",
    "gpt-test",
    "--pi-test-auth",
    "--auth-dir",
    authDir,
  ]);
  expect(args.piTestAuthDir).toBe(authDir);
});

test("test-pipeline forwards a custom pi-test-auth directory", () => {
  const args = parseTestPipelineArgs([
    "nextflow-to-galaxy",
    "--scenario",
    "demo",
    "--provider",
    "openai-codex",
    "--model",
    "gpt-test",
    "--pi-test-auth",
    `--auth-dir=${authDir}`,
  ]);
  expect(args.piTestAuthDir).toBe(authDir);
});

test("worker commands reject a custom auth directory unless pi-test-auth is enabled", () => {
  expect(() =>
    parseTestSkillArgs([
      "summarize-nextflow",
      "--prompt",
      "Summarize it",
      "--provider",
      "openai-codex",
      "--model",
      "gpt-test",
      "--auth-dir",
      authDir,
    ]),
  ).toThrow("--auth-dir requires --pi-test-auth");
  expect(() =>
    parseTestPipelineArgs([
      "nextflow-to-galaxy",
      "--scenario",
      "demo",
      "--provider",
      "openai-codex",
      "--model",
      "gpt-test",
      "--auth-dir",
      authDir,
    ]),
  ).toThrow("--auth-dir requires --pi-test-auth");
});
