import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { scanFile, scanRunDir } from "../src/lib/run-scan.js";

function tree(files: Record<string, string | Buffer>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "foundry-run-scan-"));
  for (const [relpath, body] of Object.entries(files)) {
    const full = path.join(dir, relpath);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
}

function byPath(dir: string, options = {}) {
  const result = scanRunDir(dir, options);
  return { result, entries: new Map(result.entries.map((entry) => [entry.relpath, entry])) };
}

describe("scanRunDir budgets", () => {
  it("skips the hash above the hash cap and says why", () => {
    const { entries } = byPath(tree({ "big.json": "x".repeat(200) }), { maxHashBytes: 100 });
    expect(entries.get("big.json")!.sha256).toBeNull();
    expect(entries.get("big.json")!.hash_skipped_reason).toMatch(/hash cap/);
  });

  it("does not embed a file above the per-file cap", () => {
    const { entries } = byPath(tree({ "big.md": "x".repeat(200) }), { maxEmbedBytes: 100 });
    expect(entries.get("big.md")!.text).toBeNull();
    expect(entries.get("big.md")!.text_skip_reason).toMatch(/per-file embed cap/);
  });

  it("stops embedding once the run-wide budget is spent", () => {
    const { entries } = byPath(tree({ "a.md": "x".repeat(60), "b.md": "y".repeat(60) }), {
      totalEmbedBudget: 100,
    });
    expect(entries.get("a.md")!.text).not.toBeNull();
    expect(entries.get("b.md")!.text).toBeNull();
    expect(entries.get("b.md")!.text_skip_reason).toBe("run-wide embed budget exhausted");
  });

  it("treats a text-named file holding a NUL byte as binary", () => {
    const { entries } = byPath(tree({ "odd.json": Buffer.from([0x7b, 0x00, 0x7d]) }));
    expect(entries.get("odd.json")!.text).toBeNull();
    expect(entries.get("odd.json")!.text_skip_reason).toBe("binary content");
  });
});

describe("scanRunDir exclusions", () => {
  it("skips dotfiles and editor swap files at every depth", () => {
    const dir = tree({
      ".hidden": "x",
      "draft.yml.swp": "x",
      "kept.md": "x",
      "nested/.hidden": "x",
      "nested/notes.md.swp": "x",
      "nested/kept.md": "x",
    });
    const { result, entries } = byPath(dir, { deepDirs: true });
    expect([...entries.keys()].sort()).toEqual(["kept.md", "nested", "nested/kept.md"]);
    expect(entries.get("nested")!.dir_summary!.entry_count).toBe(1);
    expect(result.ignored_count).toBeGreaterThanOrEqual(2);
  });

  it("leaves the dashboard's own outputs out, so a re-run does not read itself", () => {
    const { entries } = byPath(
      tree({ "run-manifest.json": "{}", "dashboard.html": "<html>", "kept.md": "x" }),
    );
    expect([...entries.keys()]).toEqual(["kept.md"]);
  });

  it("does not follow a symlink that leaves the run directory", () => {
    const outside = tree({ "secret.md": "outside the run", "deep/x.md": "x" });
    const dir = tree({ "kept.md": "x" });
    symlinkSync(path.join(outside, "secret.md"), path.join(dir, "linked.md"));
    symlinkSync(path.join(outside, "deep"), path.join(dir, "linked-dir"));
    const { entries } = byPath(dir, { deepDirs: true });
    expect([...entries.keys()]).toEqual(["kept.md"]);
  });

  it("follows a symlink that stays inside the run directory", () => {
    const dir = tree({ "kept.md": "x" });
    symlinkSync(path.join(dir, "kept.md"), path.join(dir, "alias.md"));
    const { entries } = byPath(dir);
    expect(entries.get("alias.md")?.text).toBe("x");
  });
});

describe("scanRunDir with deep directories", () => {
  it("lists every nested file, not a sample, under the same budgets", () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 30; i++) files[`test-data/sub/f${String(i).padStart(2, "0")}.txt`] = "x";
    const { entries } = byPath(tree(files), { deepDirs: true, totalEmbedBudget: 10 });
    const nested = [...entries.values()].filter((entry) => entry.relpath.startsWith("test-data/"));
    expect(nested).toHaveLength(30);
    expect(nested.every((entry) => entry.sha256 !== null)).toBe(true);
    expect(nested.filter((entry) => entry.text !== null)).toHaveLength(10);
  });

  it("counts a nested file's bytes once", () => {
    const { result } = byPath(tree({ "a/b.txt": "12345", "c.txt": "123" }), { deepDirs: true });
    expect(result.total_bytes).toBe(8);
  });

  it("summarizes without walking when not asked to go deep", () => {
    const { entries } = byPath(tree({ "a/b.txt": "12345" }));
    expect([...entries.keys()]).toEqual(["a"]);
    expect(entries.get("a")!.dir_summary).toMatchObject({ entry_count: 1, total_bytes: 5 });
  });
});

describe("scanRunDir nested-file cap", () => {
  it("stops listing nested files at the cap and counts the rest as ignored", () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 8; i++) files[`d/f${i}.txt`] = "x";
    const { result } = byPath(tree(files), { deepDirs: true, maxDeepEntries: 5 });
    expect(result.entries.filter((entry) => entry.relpath.startsWith("d/"))).toHaveLength(5);
    expect(result.ignored_count).toBe(3);
  });
});

describe("scanFile", () => {
  it("reads one file exactly as the directory scan does", () => {
    const dir = tree({ "sub/notes.md": "# hi\n" });
    const scanned = byPath(dir, { deepDirs: true }).entries.get("sub/notes.md")!;
    expect(scanFile(path.join(dir, "sub/notes.md"), "sub/notes.md")).toEqual(scanned);
  });

  it("is null for a missing path or a directory", () => {
    const dir = tree({ "sub/a.md": "a" });
    expect(scanFile(path.join(dir, "absent.md"), "absent.md")).toBeNull();
    expect(scanFile(path.join(dir, "sub"), "sub")).toBeNull();
  });

  it("applies the run-wide embed budget only when given one to share", () => {
    const dir = tree({ "a.md": "x".repeat(60), "b.md": "y".repeat(60) });
    const options = { totalEmbedBudget: 100 };
    expect(scanFile(path.join(dir, "b.md"), "b.md", options)!.text).not.toBeNull();

    const budget = { spent: 0 };
    expect(scanFile(path.join(dir, "a.md"), "a.md", options, budget)!.text).not.toBeNull();
    const second = scanFile(path.join(dir, "b.md"), "b.md", options, budget)!;
    expect(second.text).toBeNull();
    expect(second.text_skip_reason).toBe("run-wide embed budget exhausted");
    expect(budget.spent).toBe(60);
  });
});
