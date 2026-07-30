import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findVendoredDrift,
  loadVendoredUpstreams,
  syncVendoredUpstreams,
  updateVendoredManifestRefs,
} from "../scripts/lib/vendored-upstreams";

describe("vendored upstream sync", () => {
  let dir: string;

  beforeEach(() => {
    dir = path.join(
      os.tmpdir(),
      `foundry-vendored-${process.pid}-${Math.random().toString(16).slice(2)}`,
    );
    mkdirSync(path.join(dir, "upstream", "docs"), { recursive: true });
    mkdirSync(path.join(dir, "content"), { recursive: true });
    execFileSync("git", ["init"], { cwd: path.join(dir, "upstream"), stdio: "ignore" });
    writeFileSync(path.join(dir, "upstream", "docs", "source.txt"), "new\n");
    execFileSync("git", ["add", "."], { cwd: path.join(dir, "upstream") });
    execFileSync("git", ["commit", "-m", "init"], {
      cwd: path.join(dir, "upstream"),
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "Test User",
        GIT_AUTHOR_EMAIL: "test@example.com",
        GIT_COMMITTER_NAME: "Test User",
        GIT_COMMITTER_EMAIL: "test@example.com",
      },
      stdio: "ignore",
    });
    writeFileSync(
      path.join(dir, "common_paths.yml"),
      `upstream:\n  path: ${path.join(dir, "upstream")}\n`,
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("detects and syncs drift from common_paths source", () => {
    writeFileSync(path.join(dir, "content", "vendored.txt"), "old\n");
    writeFileSync(
      path.join(dir, "content", "note.md"),
      "> pinned at SHA `abcdef0`\nsource/blob/abcdef0123456789/docs/source.txt\nsha: abcdef0\nrevised: 2026-01-01\n",
    );
    const entry = {
      local: "content/vendored.txt",
      source: "$UPSTREAM/docs/source.txt",
      pinned_ref: "abcdef0123456789",
      framing: "content/note.md",
    };

    expect(findVendoredDrift(dir, [entry])).toHaveLength(1);
    const synced = syncVendoredUpstreams(dir, [entry]);
    expect(synced).toHaveLength(1);
    expect(findVendoredDrift(dir, [entry])).toHaveLength(0);
  });

  it("requires license and license_file on every entry", () => {
    writeFileSync(
      path.join(dir, "vendored_upstreams.yml"),
      "- local: content/vendored.txt\n  source: $UPSTREAM/docs/source.txt\n  pinned_ref: abc\n",
    );
    expect(() => loadVendoredUpstreams(dir)).toThrow(/requires license and license_file/);
  });

  it("asserts the referenced license_file exists at load time", () => {
    writeFileSync(
      path.join(dir, "vendored_upstreams.yml"),
      "- local: content/vendored.txt\n  source: $UPSTREAM/docs/source.txt\n  pinned_ref: abc\n  license: MIT\n  license_file: LICENSES/missing.LICENSE\n",
    );
    expect(() => loadVendoredUpstreams(dir)).toThrow(/license_file does not exist or is empty/);
  });

  it("loads license fields when the license_file exists", () => {
    mkdirSync(path.join(dir, "LICENSES"), { recursive: true });
    writeFileSync(path.join(dir, "LICENSES", "test.LICENSE"), "MIT text\n");
    writeFileSync(
      path.join(dir, "vendored_upstreams.yml"),
      "- local: content/vendored.txt\n  source: $UPSTREAM/docs/source.txt\n  pinned_ref: abc\n  license: MIT\n  license_file: LICENSES/test.LICENSE\n",
    );
    const entries = loadVendoredUpstreams(dir);
    expect(entries[0]!.license).toBe("MIT");
    expect(entries[0]!.license_file).toBe("LICENSES/test.LICENSE");
  });

  it("updates manifest pins without losing comments", () => {
    const manifest = path.join(dir, "vendored_upstreams.yml");
    writeFileSync(
      manifest,
      "# keep\n\n- local: content/vendored.txt\n  source: $UPSTREAM/docs/source.txt\n  pinned_ref: old\n",
    );

    updateVendoredManifestRefs(manifest, new Map([["content/vendored.txt", "newref"]]));

    expect(readFileSync(manifest, "utf-8")).toBe(
      "# keep\n\n- local: content/vendored.txt\n  source: $UPSTREAM/docs/source.txt\n  pinned_ref: newref\n",
    );
  });
});

// The real manifest, checked against the real tree. `check:vendored` cannot do this in CI:
// it resolves every `source:` against a clone named in common_paths.yml, so it needs upstream
// checkouts nobody has on a fresh machine, and it is in no workflow. That left the manifest's
// own paths unverified by anything — a `local:` naming a file that is not there, or a `framing:`
// naming a note that is not there, was findable only by a human reading 16 entries.
//
// This asks the half of the question that needs no network: are both ends of every entry
// actually on disk here?
describe("vendored_upstreams.yml (the committed manifest)", () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const entries = loadVendoredUpstreams(repoRoot);

  it("has entries", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries.map((e) => e.local))("vendors a file that exists: %s", (local) => {
    expect(existsSync(path.join(repoRoot, local))).toBe(true);
  });

  it.each([...new Set(entries.map((e) => e.framing).filter((f): f is string => Boolean(f)))])(
    "is framed by a note that exists: %s",
    (framing) => {
      expect(existsSync(path.join(repoRoot, framing))).toBe(true);
    },
  );

  it("frames each vendored file from a note in its own directory", () => {
    // What the directory shape buys: a companion and the note that frames it are siblings, so
    // "which note owns this file" is answerable by looking at where it sits. While research was
    // flat the only association was a shared basename, and `gxformat2.schema.json` sat one
    // hyphen away from `gxformat2-schema.md` and shipped into no cast because of it.
    for (const entry of entries) {
      if (!entry.framing) continue;
      expect(entry.local.startsWith(`${path.posix.dirname(entry.framing)}/`), entry.local).toBe(
        true,
      );
    }
  });
});
