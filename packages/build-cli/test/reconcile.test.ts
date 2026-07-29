import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { driftOf, reconcile, reconcileText, sha256Text } from "../src/lib/reconcile.js";

let work: string;

beforeEach(() => {
  work = mkdtempSync(path.join(tmpdir(), "foundry-reconcile-"));
});

afterEach(() => {
  rmSync(work, { recursive: true, force: true });
});

const file = (name: string) => path.join(work, name);

describe("driftOf", () => {
  it("reports nothing when the bytes already match", () => {
    const p = file("a.json");
    writeFileSync(p, "same\n");
    expect(driftOf(p, sha256Text("same\n"), "a.json")).toEqual({
      currentHash: sha256Text("same\n"),
      expectedHash: sha256Text("same\n"),
    });
  });

  // MISSING and DRIFTED are separate verdicts, not one "stale": a first cast reports the
  // artifact absent, and a hand-edited one reports it changed. Collapsing them would tell an
  // author to look for an edit they never made.
  it("distinguishes a missing file from a drifted one", () => {
    const p = file("a.json");
    expect(driftOf(p, sha256Text("x"), "a.json").reason).toBe("a.json missing");
    writeFileSync(p, "hand-edited\n");
    expect(driftOf(p, sha256Text("x"), "a.json").reason).toBe("a.json content drifted");
  });

  // Provenance needs both halves: what the check FOUND, and what it should have found.
  it("hands back the hash that was on disk alongside the one that was wanted", () => {
    const p = file("a.json");
    writeFileSync(p, "stale\n");
    const drift = driftOf(p, sha256Text("fresh\n"), "a.json");
    expect(drift.currentHash).toBe(sha256Text("stale\n"));
    expect(drift.expectedHash).toBe(sha256Text("fresh\n"));
  });

  it("never writes", () => {
    const p = file("a.json");
    driftOf(p, sha256Text("x"), "a.json");
    expect(existsSync(p)).toBe(false);
  });
});

describe("reconcile", () => {
  it("runs the write callback when the file has drifted", () => {
    const p = file("a.json");
    writeFileSync(p, "old\n");
    let wrote = 0;
    const drift = reconcile({
      path: p,
      expectedHash: sha256Text("new\n"),
      label: "a.json",
      check: false,
      write: () => {
        wrote++;
        writeFileSync(p, "new\n");
      },
    });
    expect(drift.reason).toBe("a.json content drifted");
    expect(wrote).toBe(1);
    expect(readFileSync(p, "utf8")).toBe("new\n");
  });

  it("does not run the write callback when the file already matches", () => {
    const p = file("a.json");
    writeFileSync(p, "same\n");
    let wrote = 0;
    const drift = reconcile({
      path: p,
      expectedHash: sha256Text("same\n"),
      label: "a.json",
      check: false,
      write: () => wrote++,
    });
    expect(drift.reason).toBeUndefined();
    expect(wrote).toBe(0);
  });

  // The property the whole `--check` gate rests on. A check run that repaired what it found
  // would pass on its second invocation and report a clean tree that was never clean.
  it("reports drift without writing under --check", () => {
    const p = file("a.json");
    writeFileSync(p, "old\n");
    let wrote = 0;
    const drift = reconcile({
      path: p,
      expectedHash: sha256Text("new\n"),
      label: "a.json",
      check: true,
      write: () => wrote++,
    });
    expect(drift.reason).toBe("a.json content drifted");
    expect(wrote).toBe(0);
    expect(readFileSync(p, "utf8")).toBe("old\n");
  });

  // A verbatim ref is a file copy compared against the SOURCE's hash — the caller supplies both
  // the hash and the write, and neither is a string this module ever holds.
  it("compares against a hash the caller supplies rather than content it renders", () => {
    const src = file("src.bin");
    const dst = file("dst.bin");
    writeFileSync(src, "payload\n");
    const drift = reconcile({
      path: dst,
      expectedHash: sha256Text("payload\n"),
      label: "dst",
      check: false,
      write: () => writeFileSync(dst, readFileSync(src)),
    });
    expect(drift.reason).toBe("dst missing");
    expect(readFileSync(dst, "utf8")).toBe("payload\n");
  });
});

describe("reconcileText", () => {
  it("creates the parent directory a first cast has not made yet", () => {
    const p = path.join(work, "casts", "claude", "skills", "x", "SKILL.md");
    const drift = reconcileText({ path: p, expected: "# X\n", label: "SKILL.md", check: false });
    expect(drift.reason).toBe("SKILL.md missing");
    expect(readFileSync(p, "utf8")).toBe("# X\n");
    // Hashed once, on the way through — a caller recording provenance does not hash it again.
    expect(drift.expectedHash).toBe(sha256Text("# X\n"));
  });

  // `--check` on a never-cast mold must leave no bundle directory behind: an empty directory
  // would make the NEXT check report the file missing from a tree the check itself created.
  it("creates nothing under --check", () => {
    const dir = path.join(work, "casts", "claude", "skills", "x");
    const drift = reconcileText({
      path: path.join(dir, "SKILL.md"),
      expected: "# X\n",
      label: "SKILL.md",
      check: true,
    });
    expect(drift.reason).toBe("SKILL.md missing");
    expect(existsSync(dir)).toBe(false);
  });
});
