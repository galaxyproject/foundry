import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import {
  parseRunDashboardArgs,
  runDashboard,
  runDashboardFlagWarnings,
  type RunDashboardDeps,
} from "../src/commands/run-dashboard.js";
import { buildPipelineIndex, type PipelineIndex } from "../src/lib/run-reconstruct.js";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const TINY = path.join(REPO_ROOT, "packages/build-cli/test/fixtures/runs/tiny-nextflow-run");

let index: PipelineIndex;
beforeAll(() => {
  index = buildPipelineIndex(REPO_ROOT);
});

interface Captured {
  code: number;
  stdout: string;
  stderr: string;
}

function run(argv: string[], deps: Partial<RunDashboardDeps> = {}): Captured {
  let stdout = "";
  let stderr = "";
  const code = runDashboard(argv, {
    cwd: REPO_ROOT,
    stdout: (text) => (stdout += text),
    stderr: (text) => (stderr += text),
    pipelineIndex: index,
    now: () => new Date("2026-09-18T12:00:00.000Z"),
    ...deps,
  });
  return { code, stdout, stderr };
}

function scratch(): string {
  return mkdtempSync(path.join(tmpdir(), "run-dashboard-cli-"));
}

describe("parseRunDashboardArgs", () => {
  it("reads flags in both spellings", () => {
    const args = parseRunDashboardArgs([
      "runs/x",
      "--out=/tmp/o",
      "--trial",
      "2",
      "--offline",
      "--force",
    ]);
    expect(args).toMatchObject({
      runDir: "runs/x",
      out: "/tmp/o",
      trial: 2,
      siteBase: "",
      force: true,
    });
  });

  it("rejects a run that would write nothing", () => {
    expect(() => parseRunDashboardArgs(["x", "--manifest-only", "--html-only"])).toThrow(
      /--manifest-only.*--html-only/,
    );
  });

  it("rejects unknown flags, bad integers and a missing run directory", () => {
    expect(() => parseRunDashboardArgs(["x", "--nope"])).toThrow(/unknown flag/);
    expect(() => parseRunDashboardArgs(["x", "--trial=0"])).toThrow(/positive integer/);
    expect(() => parseRunDashboardArgs([])).toThrow(/usage/);
  });
});

describe("runDashboardFlagWarnings", () => {
  it("says --trial means nothing to a harness run", () => {
    const warnings = runDashboardFlagWarnings(
      parseRunDashboardArgs(["x", "--trial", "2"]),
      "harness",
    );
    expect(warnings).toEqual([expect.stringContaining("--trial")]);
  });

  it("says which harness-only flags a test-pipeline run ignores", () => {
    const args = parseRunDashboardArgs([
      "x",
      "--pipeline",
      "p",
      "--reconstruct",
      "--max-embed-bytes",
      "10",
      "--deep-dirs",
    ]);
    const warnings = runDashboardFlagWarnings(args, "test-pipeline").join("\n");
    for (const flag of ["--pipeline", "--reconstruct", "--max-embed-bytes", "--deep-dirs"]) {
      expect(warnings).toContain(flag);
    }
  });

  it("says --json writes no files", () => {
    const args = parseRunDashboardArgs(["x", "--json", "--out", "o", "--force", "--html-only"]);
    const warnings = runDashboardFlagWarnings(args, "harness").join("\n");
    for (const flag of ["--out", "--force", "--html-only"]) expect(warnings).toContain(flag);
  });

  it("is silent for a plain invocation", () => {
    expect(runDashboardFlagWarnings(parseRunDashboardArgs(["x"]), "harness")).toEqual([]);
  });
});

describe("runDashboard", () => {
  it("writes both files and names where", () => {
    const out = scratch();
    const result = run([TINY, "--root", REPO_ROOT, "--out", out, "--offline"]);
    expect(result.stderr).toBe("");
    expect(result.code).toBe(0);
    expect(existsSync(path.join(out, "run-manifest.json"))).toBe(true);
    expect(existsSync(path.join(out, "dashboard.html"))).toBe(true);
    // The scratch directory is outside the working directory, so the path is printed whole.
    expect(result.stdout).toContain(`wrote run-manifest.json, dashboard.html in ${out}\n`);
    // A second run overwrites its own output.
    expect(run([TINY, "--root", REPO_ROOT, "--out", out, "--offline"]).code).toBe(0);
  });

  it("refuses before writing anything when either output belongs to someone else", () => {
    const out = scratch();
    writeFileSync(path.join(out, "dashboard.html"), "<p>mine</p>");
    const result = run([TINY, "--root", REPO_ROOT, "--out", out, "--offline"]);
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/dashboard\.html.*--force/);
    expect(result.stderr).not.toMatch(/^\s+at /m);
    expect(existsSync(path.join(out, "run-manifest.json"))).toBe(false);
    expect(readFileSync(path.join(out, "dashboard.html"), "utf8")).toBe("<p>mine</p>");

    const forced = run([TINY, "--root", REPO_ROOT, "--out", out, "--offline", "--force"]);
    expect(forced.code).toBe(0);
    expect(existsSync(path.join(out, "run-manifest.json"))).toBe(true);
  });

  it("only guards the file it was asked to write", () => {
    const out = scratch();
    writeFileSync(path.join(out, "dashboard.html"), "<p>mine</p>");
    const result = run([TINY, "--root", REPO_ROOT, "--out", out, "--manifest-only", "--offline"]);
    expect(result.code).toBe(0);
    expect(existsSync(path.join(out, "run-manifest.json"))).toBe(true);
  });

  it("exits 2 on contradictory flags and writes nothing", () => {
    const out = scratch();
    const result = run([TINY, "--out", out, "--manifest-only", "--html-only"]);
    expect(result.code).toBe(2);
    expect(existsSync(path.join(out, "run-manifest.json"))).toBe(false);
  });

  it("exits 3 when the run carries no record", () => {
    const empty = scratch();
    const result = run([empty, "--root", REPO_ROOT, "--out", scratch()]);
    expect(result.code).toBe(3);
    expect(result.stderr).toContain("--reconstruct");
  });

  it("warns on stderr about a flag the run ignores", () => {
    const result = run([TINY, "--root", REPO_ROOT, "--out", scratch(), "--trial", "2"]);
    expect(result.code).toBe(0);
    expect(result.stderr).toContain("--trial");
  });

  it("keeps the home directory out of the page footer", () => {
    const home = scratch();
    const out = path.join(home, "dash");
    mkdirSync(out);
    const result = run([TINY, "--root", REPO_ROOT, `--out=${out}`, "--offline"], { home });
    expect(result.code).toBe(0);
    const html = readFileSync(path.join(out, "dashboard.html"), "utf8");
    const footer = html.slice(
      html.indexOf('<footer class="page-foot">'),
      html.indexOf("</footer>"),
    );
    expect(footer).toContain("--out=~/dash");
    expect(footer).toContain("packages/build-cli/test/fixtures/runs/tiny-nextflow-run");
    expect(footer).not.toContain(home);
    expect(footer).not.toContain(REPO_ROOT);
  });
});
