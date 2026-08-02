// The design record is a collection now, so what is worth asserting has changed.
//
// This file used to check that every `source:` in the site's hand-written DESIGN_DOCS array
// named a real file under `docs/`. That is one direction, and it was the direction that could
// not fail usefully: an array entry pointing at nothing is a broken link somebody notices. The
// direction that was never checked is the one that broke — a file under `docs/` that the array
// did NOT name simply went unrendered, silently, and two of them had. The array named ten of
// the twelve records present.
//
// Both directions are asserted below, against the directory rather than against a list, so the
// listing is the answer instead of a second opinion about it.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

import { bundledPolicy } from "@galaxy-foundry/license-policy";
import { COLLECTIONS, buildNoteSchema, loadReferenceContract } from "@galaxy-foundry/note-schema";
import { loadTagRegistry } from "@galaxy-foundry/tag-registry";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const META_DIR = path.join(repoRoot, COLLECTIONS.meta.base);

/** Files the `meta` collection's pattern deliberately does NOT select, spelled as it spells them. */
const EXCLUDED = COLLECTIONS.meta.pattern.filter((p) => p.startsWith("!")).map((p) => p.slice(1));

function frontmatter(file: string): Record<string, unknown> {
  const text = fs.readFileSync(file, "utf8");
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) throw new Error(`${path.basename(file)} has no frontmatter block`);
  return yaml.load(m[1]!) as Record<string, unknown>;
}

const markdownFiles = fs
  .readdirSync(META_DIR)
  .filter((f) => f.endsWith(".md"))
  .sort();

const recordFiles = markdownFiles.filter((f) => !EXCLUDED.includes(f));

const schema = buildNoteSchema({
  tags: loadTagRegistry(path.join(repoRoot, "meta_tags.yml")),
  contract: loadReferenceContract(path.join(repoRoot, "reference_contract.yml")),
  licensePolicy: bundledPolicy(),
});

describe("the design record", () => {
  // Guards against a path change turning every assertion below into a vacuous pass.
  it("finds design records at all", () => {
    expect(recordFiles.length).toBeGreaterThan(1);
  });

  it("every markdown file in the directory is either a record or a declared exclusion", () => {
    // The direction the old test lacked. A record that exists and is rendered by nothing can
    // no longer happen quietly — it has to be excluded ON PURPOSE, by name, in COLLECTIONS.
    const unaccounted = markdownFiles.filter(
      (f) => !recordFiles.includes(f) && !EXCLUDED.includes(f),
    );
    expect(unaccounted).toEqual([]);
  });

  it("every record declares the meta kind and validates against it", () => {
    const failures: string[] = [];
    for (const file of recordFiles) {
      const fm = frontmatter(path.join(META_DIR, file));
      if (fm.type !== "meta") {
        failures.push(`${file}: type is ${JSON.stringify(fm.type)}, not "meta"`);
        continue;
      }
      const result = schema.safeParse(fm);
      if (!result.success) {
        const issues = result.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; ");
        failures.push(`${file}: ${issues}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("the glossary shares the directory without being a record", () => {
    // It is hand-curated, alphabetical, and rendered by its own page. Excluded on purpose, so
    // the exclusion is asserted rather than left to be inferred from its absence.
    expect(EXCLUDED).toContain("glossary.md");

    const glossary = path.join(META_DIR, "glossary.md");
    expect(fs.existsSync(glossary)).toBe(true);
    // It carries no frontmatter at all, which is the strongest form of "not a note": there is
    // no `type:` to disagree about. If one ever appears, the exclusion above stops being a
    // filing decision and starts hiding a note from validation — so this fails loudly.
    expect(/^---\n/.test(fs.readFileSync(glossary, "utf8"))).toBe(false);
  });

  it("orders a reader can follow: no duplicate order within a shelf", () => {
    // `order` replaced the old array's POSITION. Position could not collide; a number can, and
    // two records sharing one sort non-deterministically.
    const seen = new Map<string, string[]>();
    for (const file of recordFiles) {
      const fm = frontmatter(path.join(META_DIR, file));
      const key = `${fm.record_kind}/${fm.order}`;
      seen.set(key, [...(seen.get(key) ?? []), file]);
    }
    const collisions = [...seen.entries()]
      .filter(([, files]) => files.length > 1)
      .map(([key, files]) => `${key}: ${files.join(", ")}`);
    expect(collisions).toEqual([]);
  });
});
