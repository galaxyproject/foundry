import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  COLLECTIONS,
  COLLECTION_NAMES,
  collectionOf,
  KINDS,
  matchesCollection,
} from "@galaxy-foundry/note-schema";
import { readMarkdown } from "../packages/build-cli/src/lib/frontmatter.js";
import { findMdFiles } from "../packages/build-cli/src/lib/walk.js";

// The path→kind table and the corpus must agree BOTH ways, and the table must agree with
// itself.
//
// Ported from the statistical-genomics-foundry instance, which has carried the
// "routes every note kind to at least one collection" invariant since it split its content
// into per-kind collections. Nothing here is domain-specific; it is the check any Foundry
// wants once location decides which schema a note is parsed against.
//
// Three distinct failures this catches:
//   1. a kind with no collection — unauthorable, its schema can never run;
//   2. a note file no collection claims — walked by the validator, published by nothing;
//   3. a note whose declared `type:` is not the kind its location routes to.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

/** Every walked note, as (repo-relative path, declared type). */
const corpus = (() => {
  const notes: { rel: string; type: string }[] = [];
  for (const file of findMdFiles(path.join(repoRoot, "content"))) {
    const { hasFrontmatter, meta } = readMarkdown(file);
    if (!hasFrontmatter) continue;
    const type = meta?.type;
    if (typeof type !== "string") continue;
    notes.push({ rel: path.relative(repoRoot, file).split(path.sep).join("/"), type });
  }
  return notes;
})();

describe("collection routing (path table vs corpus)", () => {
  // Guards the walk itself. Every assertion below is "no violations found", so an empty
  // corpus would report a clean bill of health we did not earn.
  it("found notes to route", () => {
    expect(corpus.length).toBeGreaterThan(100);
  });

  // The converse of "every kind has notes": every kind must have somewhere to PUT notes. A
  // kind no collection routes to is unauthorable — its schema can never run against real
  // content, so nothing would ever notice it was unreachable.
  it("routes every note kind to at least one collection", () => {
    const routed = new Set<string>(COLLECTION_NAMES.map((n) => COLLECTIONS[n].kind));
    const unroutable = KINDS.map((k) => k.kind).filter((k) => !routed.has(k));
    expect(unroutable, `\nkinds with no collection: ${unroutable.join(", ")}`).toEqual([]);
  });

  // Every collection's `kind` must be a kind that exists — the other direction of the same
  // rule, which a typo in the table would otherwise satisfy silently.
  it("routes every collection to a kind that exists", () => {
    const known = new Set(KINDS.map((k) => k.kind));
    const bogus = COLLECTION_NAMES.filter((n) => !known.has(COLLECTIONS[n].kind));
    expect(bogus, `\ncollections naming no kind: ${bogus.join(", ")}`).toEqual([]);
  });

  // A note the validator checks but no collection claims is checked and never published.
  // This is the drift that existed while the Astro glob and `walk.ts` were two separate
  // rules, and the reason this table exists.
  it("claims every note the validator walks", () => {
    const orphans = corpus.filter((n) => !collectionOf(n.rel)).map((n) => n.rel);
    expect(orphans, `\nwalked but in no collection:\n  ${orphans.join("\n  ")}`).toEqual([]);
  });

  // Location picks the schema; the `type:` literal in that schema asserts the note agrees.
  // Checking it here too means a misfiled note is named as misfiled rather than reported as
  // a wrong-literal failure buried in the validator's output.
  it("routes every note to the kind it declares", () => {
    const misfiled = corpus
      .filter((n) => {
        const name = collectionOf(n.rel);
        return name !== undefined && COLLECTIONS[name].kind !== n.type;
      })
      .map(
        (n) =>
          `${n.rel} declares '${n.type}' but routes to '${COLLECTIONS[collectionOf(n.rel)!].kind}'`,
      );
    expect(misfiled, `\n${misfiled.join("\n")}`).toEqual([]);
  });

  // `collectionOf` returns the FIRST match, so overlapping collections would route by table
  // order — a rule nobody wrote down. The two `content/cli` collections are the near miss:
  // they share a base and are kept disjoint only by the `!*/index.md` exclusion.
  it("claims each note for exactly one collection", () => {
    const overlapping = corpus
      .map((n) => ({
        rel: n.rel,
        names: COLLECTION_NAMES.filter((c) => matchesCollection(n.rel, COLLECTIONS[c])),
      }))
      .filter((r) => r.names.length > 1)
      .map((r) => `${r.rel}: ${r.names.join(", ")}`);
    expect(overlapping, `\nclaimed by several collections:\n  ${overlapping.join("\n  ")}`).toEqual(
      [],
    );
  });
});
