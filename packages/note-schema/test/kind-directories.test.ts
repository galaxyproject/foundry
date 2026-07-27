// The types/ layout must actually hold, or the isolation it buys is imaginary.
//
// Four things are asserted per kind: the barrel and the directory listing agree BOTH ways,
// `kind` matches the directory name, kind.md and example.md exist, and example.md's
// frontmatter parses against that kind's own schema. The last one is what keeps the
// documentation executable — an example that stopped validating is a kind whose docs lie.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

import { bundledPolicy } from "@galaxy-foundry/license-policy";
import { KINDS, buildNoteSchema, loadReferenceContract } from "../src/index.js";
import { loadTagRegistry } from "@galaxy-foundry/tag-registry";

const here = path.dirname(fileURLToPath(import.meta.url));
const typesDir = path.resolve(here, "../src/types");
const repoRoot = path.resolve(here, "../../..");

/** Directories under types/ are kinds; loose files (context.ts, index.ts) are not. */
const kindDirs = readdirSync(typesDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

function frontmatter(file: string): Record<string, unknown> {
  const text = readFileSync(file, "utf8");
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) throw new Error(`${file} has no frontmatter block`);
  // js-yaml, not a bespoke parser: an unquoted date must coerce exactly as Astro's loader
  // does, so the footgun surfaces here rather than in production.
  return yaml.load(m[1]) as Record<string, unknown>;
}

describe("types/ kind directories", () => {
  // Guards against a path change turning every assertion below into a vacuous pass.
  it("finds kind directories at all", () => {
    expect(kindDirs.length).toBeGreaterThan(1);
  });

  it("the barrel enumerates exactly the directories on disk", () => {
    // Both directions. A directory the barrel forgot is a kind that silently does not exist;
    // a barrel entry with no directory is a stale import.
    expect(KINDS.map((k) => k.kind).sort()).toEqual(kindDirs);
  });

  it("declares no duplicate kind names", () => {
    expect(new Set(KINDS.map((k) => k.kind)).size).toBe(KINDS.length);
  });

  const schema = buildNoteSchema({
    tags: loadTagRegistry(path.join(repoRoot, "meta_tags.yml")),
    contract: loadReferenceContract(path.join(repoRoot, "reference_contract.yml")),
    licensePolicy: bundledPolicy(),
  });

  for (const definition of KINDS) {
    describe(definition.kind, () => {
      const dir = path.join(typesDir, definition.kind);

      it("has kind.md and example.md beside its schema", () => {
        expect(existsSync(path.join(dir, "schema.ts"))).toBe(true);
        expect(existsSync(path.join(dir, "kind.md"))).toBe(true);
        expect(existsSync(path.join(dir, "example.md"))).toBe(true);
      });

      it("declares a summary the catalog can render", () => {
        expect(definition.summary.length).toBeGreaterThan(20);
        expect(definition.title.length).toBeGreaterThan(0);
      });

      it("example.md declares this kind and validates against it", () => {
        const fm = frontmatter(path.join(dir, "example.md"));
        expect(fm.type).toBe(definition.kind);

        const result = schema.safeParse(fm);
        if (!result.success) {
          throw new Error(
            `${definition.kind}/example.md does not validate:\n` +
              result.error.issues
                .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
                .join("\n"),
          );
        }
      });
    });
  }
});
