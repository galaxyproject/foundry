import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  buildSummary,
  isRemoteSource,
  resolveSource,
  SummarizeNextflowInputError,
  SummarizeNextflowResolutionError,
  validateSummary,
} from "../src/index.js";

const OPTIONS = {
  profile: "test",
  withNextflow: false,
  fetchTestData: false,
  validate: true,
};

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function write(root: string, path: string, content: string): void {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function pipelineFiles(root: string, processName: string): void {
  write(root, "nextflow.config", "manifest { name = 'adhoc/pinned' }\n");
  write(root, "modules/m.nf", `process ${processName} {\n  script:\n  'x'\n}\n`);
  write(
    root,
    "main.nf",
    `include { ${processName} } from './modules/m'\nworkflow PIPE { main: ${processName}() }\n`,
  );
}

/**
 * A local git repo with two tagged commits on `main` plus a `feature` branch,
 * standing in for a remote so the suite needs no network.
 */
function tempRepo(): { path: string; first: string; second: string; feature: string } {
  const path = mkdtempSync(join(tmpdir(), "summarize-nextflow-repo-"));
  git(path, ["init", "--quiet", "--initial-branch=main"]);
  git(path, ["config", "user.email", "test@example.invalid"]);
  git(path, ["config", "user.name", "Test"]);
  git(path, ["remote", "add", "origin", "https://github.com/example/pinned.git"]);

  pipelineFiles(path, "FIRST");
  git(path, ["add", "-A"]);
  git(path, ["commit", "--quiet", "-m", "first"]);
  git(path, ["tag", "v1.0.0"]);
  const first = git(path, ["rev-parse", "HEAD"]).trim();

  git(path, ["checkout", "--quiet", "-b", "feature"]);
  pipelineFiles(path, "ONFEATURE");
  git(path, ["add", "-A"]);
  git(path, ["commit", "--quiet", "-m", "feature"]);
  const feature = git(path, ["rev-parse", "HEAD"]).trim();

  git(path, ["checkout", "--quiet", "main"]);
  pipelineFiles(path, "SECOND");
  git(path, ["add", "-A"]);
  git(path, ["commit", "--quiet", "-m", "second"]);
  git(path, ["tag", "v2.0.0"]);
  const second = git(path, ["rev-parse", "HEAD"]).trim();

  return { path, first, second, feature };
}

interface SummarySource {
  source: { url: string; version: string };
  processes: { name: string }[];
}

async function summarize(pathOrUrl: string, pin?: string): Promise<SummarySource> {
  return (await buildSummary(pathOrUrl, { ...OPTIONS, pin })) as unknown as SummarySource;
}

function tempCheckoutCount(): number {
  return readdirSync(tmpdir()).filter((entry) => entry.startsWith("summarize-nextflow-src-"))
    .length;
}

describe("source resolution", () => {
  test("classifies remote and local sources", () => {
    expect(isRemoteSource("https://github.com/nf-core/demo.git")).toBe(true);
    expect(isRemoteSource("http://example.com/x.git")).toBe(true);
    expect(isRemoteSource("/local/path")).toBe(false);
    expect(isRemoteSource("./relative")).toBe(false);
  });

  test("uses an unpinned local directory in place without a temporary checkout", () => {
    const repo = tempRepo();
    const before = tempCheckoutCount();
    const resolved = resolveSource(repo.path);

    expect(resolved.root).toBe(repo.path);
    expect(resolved.version).toBeNull();
    expect(tempCheckoutCount()).toBe(before);
    resolved.cleanup();
  });

  test("summarizes a tag pin from a detached temporary checkout", async () => {
    const repo = tempRepo();
    const summary = await summarize(repo.path, "v1.0.0");

    expect(summary.processes.map((process) => process.name)).toEqual(["FIRST"]);
    expect(summary.source.version).toBe(repo.first);
    expect(summary.source.url).toBe("https://github.com/example/pinned.git");
  });

  test("resolves branch, short SHA, and full SHA pins to the same commit", async () => {
    const repo = tempRepo();

    const branch = await summarize(repo.path, "feature");
    expect(branch.processes.map((process) => process.name)).toEqual(["ONFEATURE"]);
    expect(branch.source.version).toBe(repo.feature);

    const shortSha = await summarize(repo.path, repo.first.slice(0, 7));
    const fullSha = await summarize(repo.path, repo.first);
    expect(shortSha.source.version).toBe(repo.first);
    expect(fullSha.source.version).toBe(repo.first);
    expect(shortSha.source.version).toHaveLength(40);
  });

  test("reports the pipeline as of the pin, not the caller's checked-out tip", async () => {
    const repo = tempRepo();

    const pinned = await summarize(repo.path, "v1.0.0");
    const tip = await summarize(repo.path);

    expect(pinned.processes.map((process) => process.name)).toEqual(["FIRST"]);
    expect(tip.processes.map((process) => process.name)).toEqual(["SECOND"]);
  });

  test("never mutates the caller's checkout", async () => {
    const repo = tempRepo();
    const headBefore = git(repo.path, ["rev-parse", "HEAD"]).trim();
    const branchBefore = git(repo.path, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();

    await summarize(repo.path, "v1.0.0");
    await summarize(repo.path, "feature");

    expect(git(repo.path, ["rev-parse", "HEAD"]).trim()).toBe(headBefore);
    expect(git(repo.path, ["rev-parse", "--abbrev-ref", "HEAD"]).trim()).toBe(branchBefore);
    expect(git(repo.path, ["status", "--porcelain"])).toBe("");
  });

  test("emits schema-valid output from a pinned revision", async () => {
    const repo = tempRepo();
    const summary = await summarize(repo.path, "v2.0.0");

    expect(validateSummary(summary).valid).toBe(true);
  });

  test("rejects a missing pipeline path as an input error", () => {
    expect(() => resolveSource(join(tmpdir(), "summarize-nextflow-absent"))).toThrow(
      SummarizeNextflowInputError,
    );
  });

  test("rejects a flag-shaped pin before it reaches git", () => {
    const repo = tempRepo();
    expect(() => resolveSource(repo.path, "--upload-pack=touch /tmp/pwned")).toThrow(
      SummarizeNextflowInputError,
    );
  });

  test("reports an unresolvable pin as a resolution error", () => {
    const repo = tempRepo();
    expect(() => resolveSource(repo.path, "v9.9.9-missing")).toThrow(
      SummarizeNextflowResolutionError,
    );
  });

  test("removes the temporary checkout on success and on failure", async () => {
    const repo = tempRepo();
    const before = tempCheckoutCount();

    await summarize(repo.path, "v1.0.0");
    expect(tempCheckoutCount()).toBe(before);

    expect(() => resolveSource(repo.path, "v9.9.9-missing")).toThrow();
    expect(tempCheckoutCount()).toBe(before);
  });

  test("leaves the checkout in place for the caller until cleanup runs", () => {
    const repo = tempRepo();
    const resolved = resolveSource(repo.path, "v1.0.0");

    expect(existsSync(join(resolved.root, "main.nf"))).toBe(true);
    resolved.cleanup();
    expect(existsSync(resolved.root)).toBe(false);
  });
});
