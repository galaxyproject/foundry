import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { replaceGeneratedRegion } from "../packages/build-cli/src/lib/content-notes.js";

// The README's own numbers, checked against the corpus by counting it a second, independent way.
//
// `check:readme` already fails when the region does not match the generator, which catches a hand
// edit and a stale regeneration. It cannot catch the generator being wrong, because it compares
// the generator to itself. So the corpus is counted here off the filesystem instead — the way a
// person would, and the way that produced the numbers the README used to carry.
//
// That is the failure this replaced: `45 Molds` in two sentences while 47 directories existed,
// and `every Mold is still status: draft` while 27 of them had been reviewed.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const README = readFileSync(path.join(repoRoot, "README.md"), "utf8");

/** A row's count, by the label in its first cell. */
function statedCount(label: string): number {
  const row = README.split("\n").find((line) => line.startsWith(`| ${label} |`));
  if (!row) throw new Error(`README has no generated row labelled ${label}`);
  const value = row.split("|")[2]?.trim() ?? "";
  const count = Number.parseInt(value, 10);
  if (Number.isNaN(count)) throw new Error(`row ${label} states no leading count: ${value}`);
  return count;
}

const directoriesIn = (relative: string): string[] =>
  readdirSync(path.join(repoRoot, relative), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

describe("README corpus counts", () => {
  it("states the number of Molds on disk", () => {
    expect(statedCount("Molds")).toBe(directoriesIn("content/molds").length);
  });

  it("states the number of Pipelines on disk", () => {
    expect(statedCount("Pipelines")).toBe(directoriesIn("content/pipelines").length);
  });

  // The half that had drifted furthest: the numerator was right in both sentences and only the
  // denominator was stale, so a check on coverage alone would have passed while the README said
  // 45 Molds.
  it("states companion coverage that matches the Mold directories", () => {
    for (const companion of ["eval.md", "scenarios.md"]) {
      const present = directoriesIn("content/molds").filter((slug) =>
        existsSync(path.join(repoRoot, "content/molds", slug, companion)),
      ).length;
      expect(statedCount(`… with \`${companion}\``), companion).toBe(present);
    }
  });

  // "Every Mold is still `status: draft` — none have passed a review gate" was the claim, and it
  // was false for 27 of 47. A count that renders the statuses it finds cannot make that claim.
  it("breaks Molds down by the statuses the corpus actually carries", () => {
    const statuses = directoriesIn("content/molds").map((slug) => {
      const body = readFileSync(path.join(repoRoot, "content/molds", slug, "index.md"), "utf8");
      return body.match(/^status:\s*(\S+)/m)?.[1] ?? "draft";
    });
    const row = README.split("\n").find((line) => line.startsWith("| Molds |")) ?? "";
    for (const status of new Set(statuses)) {
      const count = statuses.filter((s) => s === status).length;
      expect(row, status).toContain(`${count} ${status}`);
    }
  });
});

describe("replaceGeneratedRegion", () => {
  it("replaces the body and leaves the prose either side alone", () => {
    const before = "keep me\n<!-- generated:x -->\nold\n<!-- /generated:x -->\nand me\n";
    expect(replaceGeneratedRegion(before, "x", "new")).toBe(
      "keep me\n<!-- generated:x -->\nnew\n<!-- /generated:x -->\nand me\n",
    );
  });

  // A generator that no-ops on a file someone reorganized would report success and go on being
  // wrong — which is the whole failure mode this mechanism exists to end.
  it("throws rather than silently doing nothing when the markers are gone", () => {
    expect(() => replaceGeneratedRegion("no markers here\n", "x", "new")).toThrow(/generated:x/);
  });
});
