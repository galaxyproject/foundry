// Behavioural guard for foundry#763: without --profile, the CLI must not override the profiles a
// pipeline's nf-test files declare.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildProgram } from "../src/program.js";

function pipelineWithTwoProfiles(): string {
  const root = mkdtempSync(join(tmpdir(), "foundry-763-"));
  const files: Record<string, string> = {
    "nextflow.config":
      "manifest { name = 'nf-core/profile-cli' }\nprofiles { test {} test_stub {} }\n",
    "main.nf": "workflow PROFILE_CLI { }\n",
    "nf-test.config": 'config {\n  profile = "test"\n}\n',
    "tests/default.nf.test":
      'nextflow_pipeline {\n  test("uses nf-test.config profile") {\n    then { assert workflow.success }\n  }\n}\n',
    "tests/stub.nf.test":
      'profile "test_stub"\nnextflow_pipeline {\n  test("file-level profile") {\n    then { assert workflow.success }\n  }\n}\n',
  };
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content);
  }
  return root;
}

async function profilesFromCli(extraArgs: string[]): Promise<[string, string[]][]> {
  const root = pipelineWithTwoProfiles();
  const out = join(root, "summary.json");
  await buildProgram().parseAsync(
    ["summarize-nextflow", root, "--no-with-nextflow", "--out", out, ...extraArgs],
    { from: "user" },
  );
  const summary = JSON.parse(readFileSync(out, "utf8")) as {
    test_candidates?: { id: string; effective_profiles: string[] }[];
  };
  return (summary.test_candidates ?? []).map((c) => [c.id, c.effective_profiles]);
}

describe("foundry summarize-nextflow --profile", () => {
  it("keeps each test's own profiles when --profile is omitted", async () => {
    expect(await profilesFromCli([])).toEqual([
      ["tests/default.nf.test::uses nf-test.config profile", ["test"]],
      ["tests/stub.nf.test::file-level profile", ["test_stub"]],
    ]);
  });

  it("applies an explicit --profile to every candidate", async () => {
    const profiles = await profilesFromCli(["--profile", "test"]);
    expect(profiles.map(([, p]) => p)).toEqual([["test"], ["test"]]);
  });
});
