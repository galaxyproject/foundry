import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  checkDirectoryLayout,
  companionOf,
  readCompanionIn,
} from "../site/src/lib/companions";

// The site's view of a note's directory, held to the same declaration the validator reads.
//
// Nothing tested this before, and it was wrong in two ways at once: the panel resolved
// `content/` one level short of the repository root under `astro build` — reporting every Mold
// as having no eval.md while 33 had one — and its layout rule was a recursive scan for
// frontmatter, which counts a `refinements/` entry as a stray. Both were invisible in `astro
// dev`, which is where a person looks.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moldDir = (slug: string) => path.join(repoRoot, "content/molds", slug);

describe("companionOf", () => {
  it("reads the kind's declaration rather than a copy of it", () => {
    const companion = companionOf("mold", "eval.md");
    expect(companion.requirement).toBe("recommended");
    expect(companion.disposition).toBe("foundry-only");
    // The help text a page shows comes from here. It used to be paraphrased in the component,
    // and the paraphrase had drifted.
    expect(companion.purpose.length).toBeGreaterThan(0);
  });

  it("normalizes a directory companion", () => {
    const companion = companionOf("mold", "refinements");
    expect(companion.directory).toBe(true);
    expect(companion.file).toBe("refinements/");
  });

  // A page naming a companion the kind stopped declaring should fail the build, not render
  // "not written yet" about a file nothing expects.
  it("throws for a companion the kind does not declare", () => {
    expect(() => companionOf("mold", "scenario.md")).toThrow(/does not declare/);
  });
});

describe("checkDirectoryLayout", () => {
  // The regression this replaced a recursive frontmatter scan to fix. Ten Molds carry
  // refinement entries, and every entry has frontmatter by declaration.
  it("does not report a refinements entry as a stray", () => {
    const slug = "discover-shed-tool";
    const layout = checkDirectoryLayout(moldDir(slug), `molds/${slug}`, "mold");
    expect(layout.unknown).toEqual([]);
  });

  it("reports a misnamed companion", () => {
    const dir = path.join(repoRoot, ".tmp-test-mold-layout");
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "index.md"), "---\ntype: mold\n---\n");
    writeFileSync(path.join(dir, "scenario.md"), "# misnamed\n");
    try {
      const layout = checkDirectoryLayout(dir, "molds/tmp", "mold");
      expect(layout.unknown.map((e) => e.name)).toEqual(["scenario.md"]);
      // Declared `recommended` and absent — the panel reads its severity from this.
      expect(layout.missingRecommended.map((c) => c.name).sort()).toEqual([
        "eval.md",
        "scenarios.md",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("readCompanionIn", () => {
  it("agrees with the corpus about which Molds have an eval plan", () => {
    const companion = companionOf("mold", "eval.md");
    expect(readCompanionIn(moldDir("discover-shed-tool"), companion)).toContain("#");
    expect(readCompanionIn(moldDir("no-such-mold"), companion)).toBeUndefined();
  });
});
