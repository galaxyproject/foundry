import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const foundryBuild = path.join(repoRoot, "packages", "build-cli", "src", "bin", "foundry-build.ts");
// Resolve the repo-local tsx binary by absolute path. Invoking `npx tsx` from a
// temp-dir cwd can't see local node_modules and auto-installs tsx into the
// shared npx cache; two such installs racing across test files corrupt it.
const tsxBin = path.join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");

const PIPELINES = [
  "cwl-to-galaxy",
  "interview-to-galaxy",
  "nextflow-to-cwl",
  "nextflow-to-galaxy",
  "paper-to-cwl",
  "paper-to-galaxy",
];

function runTsx(
  script: string,
  args: string[],
  cwd = repoRoot,
): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(tsxBin, [script, ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    const err = e as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      code: typeof err.status === "number" ? err.status : 1,
      stdout: typeof err.stdout === "string" ? err.stdout : (err.stdout?.toString() ?? ""),
      stderr: typeof err.stderr === "string" ? err.stderr : (err.stderr?.toString() ?? ""),
    };
  }
}

describe("assemble-pipeline (committed harnesses)", () => {
  for (const slug of PIPELINES) {
    it(`--check passes for pipeline-${slug}`, () => {
      const r = runTsx(foundryBuild, ["assemble-pipeline", slug, "--check", "--root", repoRoot]);
      expect(r.code, `stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);
      expect(r.stdout).toContain("clean");
    });
  }

  it("_assembly.json projects the pipeline spine", () => {
    const assembly = JSON.parse(
      readFileSync(
        path.join(repoRoot, "casts/claude/skills/pipeline-paper-to-galaxy/_assembly.json"),
        "utf8",
      ),
    );
    expect(assembly.source_pipeline).toBe("paper-to-galaxy");
    expect(assembly.harness_name).toBe("pipeline-paper-to-galaxy");
    expect(typeof assembly.source_revision).toBe("number");
    const branch = assembly.phases.find((p: { kind: string }) => p.kind === "branch");
    expect(branch.pattern).toBe("test-data-resolution");
    expect(branch.chain).toEqual(["paper-to-test-data", "find-test-data", "user-supplied"]);
    expect(branch.cast_present).toEqual([false, false, null]);
    const loop = assembly.phases.find((p: { loop?: boolean }) => p.loop === true);
    expect(loop.skill).toBe("advance-galaxy-draft-step");
  });

  it("documents the --use-subagents and --checkpoint run options", () => {
    const skill = readFileSync(
      path.join(repoRoot, "casts/claude/skills/pipeline-nextflow-to-galaxy/SKILL.md"),
      "utf8",
    );
    expect(skill).toContain("## Run options");
    expect(skill).toContain("`--use-subagents`");
    expect(skill).toContain("one subagent per iteration");
    expect(skill).toContain("`--checkpoint`");
    expect(skill).toContain("git init ./<run-slug>/");
    expect(skill).toContain("once per iteration");
    // MANUAL precedence over the per-iteration rules (S1).
    expect(skill).toContain("including MANUAL loop phases");
    // Standalone per-run repo, not added to a surrounding repo (S2).
    expect(skill).toContain("standalone per-run repo");
  });

  it("_assembly.json surfaces the uniform run options", () => {
    const assembly = JSON.parse(
      readFileSync(
        path.join(repoRoot, "casts/claude/skills/pipeline-nextflow-to-galaxy/_assembly.json"),
        "utf8",
      ),
    );
    expect(assembly.options).toEqual(["use-subagents", "checkpoint"]);
  });

  it("rolls harness CLIs up into a deduped bootstrap manifest", () => {
    const dir = "casts/claude/skills/pipeline-nextflow-to-galaxy";
    const assembly = JSON.parse(readFileSync(path.join(repoRoot, dir, "_assembly.json"), "utf8"));
    const tools = assembly.required_tools.map((t: { tool: string }) => t.tool);
    // foundry (summarize-nextflow), gxwf (validate/draft/discover), planemo (run-workflow-test).
    expect(tools).toEqual(["foundry", "gxwf", "planemo"]);
    // planemo proves the run-workflow-test backfill flows into the pipeline manifest.
    const planemo = assembly.required_tools.find((t: { tool: string }) => t.tool === "planemo");
    expect(planemo.source).toBe("referenced");
    // gxwf is implied by its subcommand notes, including the compound-slug ref.
    const gxwf = assembly.required_tools.find((t: { tool: string }) => t.tool === "gxwf");
    expect(gxwf.implied_by).toContain("gxwf validate");

    const skill = readFileSync(path.join(repoRoot, dir, "SKILL.md"), "utf8");
    expect(skill).toContain("## Bootstrap (install these CLIs first)");
    expect(skill).toMatch(/\*\*`planemo`\*\* \(planemo\)/);
  });

  it("--check catches a tampered SKILL.md", () => {
    const skillPath = path.join(repoRoot, "casts/claude/skills/pipeline-paper-to-galaxy/SKILL.md");
    const original = readFileSync(skillPath, "utf8");
    try {
      writeFileSync(skillPath, original + "\nhand-edited drift\n");
      const r = runTsx(foundryBuild, [
        "assemble-pipeline",
        "paper-to-galaxy",
        "--check",
        "--root",
        repoRoot,
      ]);
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("drift");
    } finally {
      writeFileSync(skillPath, original);
    }
  });
});

describe("assemble-pipeline negative cases", () => {
  it("unknown pipeline fails fast", () => {
    const r = runTsx(foundryBuild, ["assemble-pipeline", "does-not-exist", "--check"]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toContain("pipeline source missing");
  });

  it("refuses to assemble an unsupported branch pattern", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-assemble-"));
    try {
      mkdirSync(path.join(dir, "content/pipelines/test-pipe"), { recursive: true });
      mkdirSync(path.join(dir, "content/molds/mold-a"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude/skills"), { recursive: true });
      writeFileSync(
        path.join(dir, "content/molds/mold-a/index.md"),
        `---
type: mold
name: mold-a
axis: generic
tags: [mold]
status: draft
created: 2026-06-11
revised: 2026-06-11
revision: 1
ai_generated: false
summary: A minimal mold used by the unsupported-branch assemble test.
---

# mold-a
`,
      );
      writeFileSync(
        path.join(dir, "content/pipelines/test-pipe/index.md"),
        `---
type: pipeline
title: TEST PIPE
tags: [pipeline]
status: draft
created: 2026-06-11
revised: 2026-06-11
revision: 1
ai_generated: false
summary: A minimal pipeline exercising an unsupported branch pattern for the test.
phases:
  - mold: "[[mold-a]]"
  - branch: discover-or-author
    branches:
      - "[[mold-a]]"
      - fallthrough: "[[mold-a]]"
---

# TEST PIPE
`,
      );
      const r = runTsx(foundryBuild, ["assemble-pipeline", "test-pipe", "--root", dir], dir);
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("unsupported branch pattern");
      expect(existsSync(path.join(dir, "casts/claude/skills/pipeline-test-pipe/SKILL.md"))).toBe(
        false,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("assembles a minimal pipeline and writes SKILL.md + _assembly.json", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-assemble-ok-"));
    try {
      mkdirSync(path.join(dir, "content/pipelines/mini"), { recursive: true });
      mkdirSync(path.join(dir, "content/molds/looper"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude/skills"), { recursive: true });
      writeFileSync(
        path.join(dir, "content/molds/looper/index.md"),
        `---
type: mold
name: looper
axis: generic
tags: [mold]
status: draft
created: 2026-06-11
revised: 2026-06-11
revision: 1
ai_generated: false
summary: A looping mold used by the minimal assemble test.
loop_endstate: "Owns its own oracle; re-invoke until done, then continue."
---

# looper
`,
      );
      writeFileSync(
        path.join(dir, "content/pipelines/mini/index.md"),
        `---
type: pipeline
title: MINI
tags: [pipeline]
status: draft
created: 2026-06-11
revised: 2026-06-11
revision: 1
ai_generated: false
summary: A minimal one-phase pipeline for the assemble happy path.
phases:
  - mold: "[[looper]]"
    loop: true
---

# MINI
`,
      );
      const r = runTsx(foundryBuild, ["assemble-pipeline", "mini", "--root", dir], dir);
      expect(r.code, `stderr: ${r.stderr}`).toBe(0);
      const skill = readFileSync(
        path.join(dir, "casts/claude/skills/pipeline-mini/SKILL.md"),
        "utf8",
      );
      // Un-cast loop phase: MANUAL marker + verbatim summary + loop_endstate prose.
      expect(skill).toContain("**looper** (loop) — MANUAL");
      expect(skill).toContain("Owns its own oracle; re-invoke until done, then continue.");
      // Run options are uniform — present even on a minimal one-phase pipeline.
      expect(skill).toContain("## Run options");
      const assembly = JSON.parse(
        readFileSync(path.join(dir, "casts/claude/skills/pipeline-mini/_assembly.json"), "utf8"),
      );
      expect(assembly.options).toEqual(["use-subagents", "checkpoint"]);
      expect(assembly.phases[0]).toEqual({
        phase: 1,
        kind: "mold",
        skill: "looper",
        cast_present: false,
        loop: true,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
