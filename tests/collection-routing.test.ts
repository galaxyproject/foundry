import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  COLLECTIONS,
  COLLECTION_NAMES,
  CONTENT_DIR,
  collectionOf,
  collectionsClaiming,
  KINDS,
  NON_NOTE_NAMES,
  nonNoteAllowanceOf,
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
// Four distinct failures this catches:
//   1. a kind with no collection — unauthorable, its schema can never run;
//   2. a note file no collection claims — committed, validated by nothing, published by nothing;
//   3. a note whose declared `type:` is not the kind its location routes to;
//   4. a walk that does not yield what the table claims.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

/** Every markdown file under `content/`, repo-relative, whether or not it is a note. */
const everyMarkdownFile = (() => {
  const found: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir).sort()) {
      if (entry.startsWith(".")) continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        visit(full);
        continue;
      }
      if (entry.endsWith(".md"))
        found.push(path.relative(repoRoot, full).split(path.sep).join("/"));
    }
  };
  visit(path.join(repoRoot, CONTENT_DIR));
  return found;
})();

/** Every file the validator's walk yields, repo-relative and in walk order. */
const corpusFiles = [...findMdFiles(path.join(repoRoot, CONTENT_DIR))].map((file) =>
  path.relative(repoRoot, file).split(path.sep).join("/"),
);

/**
 * Every markdown file under `content/` that declares a `type:`, as (path, declared type).
 *
 * Deliberately NOT sourced from the walk. The walk now routes from COLLECTIONS, so anything
 * derived from it agrees with the table by construction — the orphan check below would pass on
 * a corpus it was silently blind to. Frontmatter is the one statement of "this is a note" that
 * the table does not get a vote in, so it is what the table is held against.
 */
const corpus = (() => {
  const notes: { rel: string; type: string }[] = [];
  for (const rel of everyMarkdownFile) {
    const { hasFrontmatter, meta } = readMarkdown(path.join(repoRoot, rel));
    if (!hasFrontmatter) continue;
    const type = meta?.type;
    if (typeof type !== "string") continue;
    notes.push({ rel, type });
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

  // `CONTENT_DIR` is what lets a consumer holding the content directory under some other name
  // route a path it finds there. It is only true because every `base` starts with it, and
  // nothing in the table's own types says so.
  it("puts every collection under the content dir", () => {
    const outside = COLLECTION_NAMES.filter(
      (n) => !COLLECTIONS[n].base.startsWith(`${CONTENT_DIR}/`),
    );
    expect(outside, `\ncollections outside ${CONTENT_DIR}/: ${outside.join(", ")}`).toEqual([]);
  });

  // The validator's walk and the site's globs are ONE rule now, so this is what holds the walk
  // to it: it enumerates the content tree independently and asserts the walk yields exactly the
  // files the table claims, no frontmatter filter involved.
  //
  // Both directions matter and fail differently. A file the table claims but the walk misses is
  // published unvalidated; a file the walk yields but the table disclaims is validated as a note
  // the site will never render — which is precisely the `content/prompts/**` bug this table was
  // written to end, in the era when the walk decided for itself.
  it("walks exactly the files the table claims", () => {
    const walked = corpusFiles;
    const claimed = everyMarkdownFile.filter((rel) => collectionOf(rel));
    const missed = claimed.filter((rel) => !walked.includes(rel));
    const extra = walked.filter((rel) => !claimed.includes(rel));
    expect(
      { missed, extra },
      `\nclaimed but not walked:\n  ${missed.join("\n  ")}\nwalked but not claimed:\n  ${extra.join("\n  ")}`,
    ).toEqual({ missed: [], extra: [] });
  });

  // A kind's `shape` and the glob its notes are found by are two statements of one fact, and
  // they were free to disagree. `research` said `shape: 'file'` while its collection globbed
  // `**/*.md`, and flipping the kind to `directory` without tightening the glob to `**/index.md`
  // would have left every companion `.md` beside a note routed as a second note — validated
  // against the wrong schema and published as a page nobody meant to write.
  //
  // Stated as: a directory kind is found at `index.md`, and a file kind is not. `!`-prefixed
  // exclusions are not claims about shape, so they are skipped — `cli-commands` carves out
  // `!*/index.md` precisely because its notes are the files that are NOT the directory's note.
  it("globs each kind's notes at the shape the kind declares", () => {
    const shapeOf = new Map(KINDS.map((k) => [k.kind, k.shape]));
    const mismatches: string[] = [];
    for (const name of COLLECTION_NAMES) {
      const { kind, pattern } = COLLECTIONS[name];
      const shape = shapeOf.get(kind);
      for (const glob of pattern) {
        if (glob.startsWith("!")) continue;
        const findsIndex = glob.endsWith("/index.md");
        if (shape === "directory" && !findsIndex)
          mismatches.push(`${name}: kind '${kind}' is directory-shaped but globs '${glob}'`);
        if (shape === "file" && findsIndex)
          mismatches.push(`${name}: kind '${kind}' is file-shaped but globs '${glob}'`);
      }
    }
    expect(mismatches, `\n  ${mismatches.join("\n  ")}`).toEqual([]);
  });

  // Every collection's `kind` must be a kind that exists — the other direction of the same
  // rule, which a typo in the table would otherwise satisfy silently.
  it("routes every collection to a kind that exists", () => {
    const known = new Set(KINDS.map((k) => k.kind));
    const bogus = COLLECTION_NAMES.filter((n) => !known.has(COLLECTIONS[n].kind));
    expect(bogus, `\ncollections naming no kind: ${bogus.join(", ")}`).toEqual([]);
  });

  // A file that declares a `type:` has announced itself as a note. If no collection claims it,
  // it is authored, committed, and invisible to everything — neither validated nor published.
  // `content/prompts/**` sat in exactly that state, and this is the check that would have said
  // so on the day it was added.
  it("claims every note in the content tree", () => {
    const orphans = corpus.filter((n) => !collectionOf(n.rel)).map((n) => n.rel);
    expect(
      orphans,
      `\ndeclares a type but is in no collection:\n  ${orphans.join("\n  ")}`,
    ).toEqual([]);
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

  // The other direction from "claims every note": not "is every note routed" but "is every
  // markdown file accounted for at all". A file with no frontmatter cannot announce itself as a
  // note, so the orphan check above never sees it — and it is exactly the file that can sit in
  // the tree indefinitely, meaning nothing to anything.
  //
  // Three ways to be accounted for, and no fourth: a collection claims it, a directory note
  // owns the directory it sits in (its kind's companion declaration answers for it), or
  // NOT_NOTES declares it deliberately outside the note system.
  it("accounts for every markdown file in the content tree", () => {
    const directoryNoteDirs = new Set(
      corpus
        .filter((n) => KINDS.find((k) => k.kind === n.type)?.shape === "directory")
        .map((n) => path.dirname(n.rel)),
    );
    const ownedByDirectoryNote = (rel: string): boolean => {
      for (let dir = path.dirname(rel); dir !== CONTENT_DIR && dir !== "."; ) {
        if (directoryNoteDirs.has(dir)) return true;
        dir = path.dirname(dir);
      }
      return false;
    };

    const unaccounted = everyMarkdownFile.filter(
      (rel) => !collectionOf(rel) && !nonNoteAllowanceOf(rel) && !ownedByDirectoryNote(rel),
    );
    expect(
      unaccounted,
      `\nneither note, companion, nor declared non-note:\n  ${unaccounted.join("\n  ")}`,
    ).toEqual([]);
  });

  // An allowance is a location table like COLLECTIONS, and the same failure applies: a base
  // nothing reaches is a row claiming to account for something that is not there.
  it("matches every non-note allowance to a file that exists", () => {
    const empty = NON_NOTE_NAMES.filter(
      (name) => !everyMarkdownFile.some((rel) => nonNoteAllowanceOf(rel) === name),
    );
    expect(empty, `\nallowances matching nothing: ${empty.join(", ")}`).toEqual([]);
  });

  // Both tables answer "what is this path?", and a path both claim has two answers. `content/`
  // is a collection base and an allowance base at once, so the overlap is one glob away.
  it("keeps the allowance table disjoint from the collection table", () => {
    const both = everyMarkdownFile.filter((rel) => collectionOf(rel) && nonNoteAllowanceOf(rel));
    expect(both, `\nclaimed as note AND declared not-a-note:\n  ${both.join("\n  ")}`).toEqual([]);
  });

  // `collectionOf` returns the FIRST match, so overlapping collections would route by table
  // order — a rule nobody wrote down. The two `content/cli` collections are the near miss:
  // they share a base and are kept disjoint only by the `!*/index.md` exclusion.
  it("claims each note for exactly one collection", () => {
    const overlapping = corpus
      .map((n) => ({ rel: n.rel, names: collectionsClaiming(n.rel) }))
      .filter((r) => r.names.length > 1)
      .map((r) => `${r.rel}: ${r.names.join(", ")}`);
    expect(overlapping, `\nclaimed by several collections:\n  ${overlapping.join("\n  ")}`).toEqual(
      [],
    );
  });
});
