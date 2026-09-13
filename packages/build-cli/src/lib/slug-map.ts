// Wiki-link addressing for the whole corpus, in the frame the build CLI reports in.
//
// Three commands built this map, and all three agreed by hand that a cli-command note is
// addressable as `[[gxwf validate]]` as well as by filename. assemble-pipeline's copy carried a
// comment saying "parity with cast's buildSlugMap" — parity asserted in prose rather than held
// by construction, which is the arrangement that lets two of the three drift and nothing notice.
//
// The walk, the frontmatter read and the precedence rule ship in
// @galaxy-foundry/content-reader. The vocabulary they are driven by — which second address a
// Galaxy note answers to — now ships in @galaxy-foundry/gxwf-foundry-note-schema, beside
// COLLECTIONS, because the site reads it too. What stays here is this caller's frame: a target
// is a repo-relative path, because every finding this CLI prints is filed against one.

import path from "node:path";

import {
  CONTENT_DIR,
  GALAXY_SLUG_ALIASES,
  readGalaxyContent,
  type SlugAliases,
} from "@galaxy-foundry/gxwf-foundry-note-schema";

import type { Frontmatter } from "./types.js";

export { GALAXY_SLUG_ALIASES, type SlugAliases };

/**
 * One walk of a content tree, targeted at the paths this CLI reports against.
 *
 * `contentRoot` is the content directory itself, under whatever name a checkout gives it — the
 * same frame `findMdFiles` takes, so a caller that has one has the other.
 */
export function readContent(contentRoot: string, aliases: SlugAliases) {
  return readGalaxyContent(contentRoot, aliases, (collection, id) => ({
    path: `${collection}/${id}`,
  }));
}

/**
 * Every note in the corpus, indexed by the slugs that address it and by its repo-relative path.
 *
 * `aliases` is asked of every note. A note's own filename slug is always registered; anything
 * further is the instance's business.
 */
export function buildSlugMap(
  repoRoot: string,
  aliases: SlugAliases,
): {
  slugMap: ReadonlyMap<string, string>;
  metaByPath: ReadonlyMap<string, Frontmatter>;
} {
  const index = readContent(path.join(repoRoot, CONTENT_DIR), aliases);
  const slugMap = new Map<string, string>(
    [...index.notesByAddress].map(([address, note]) => [address, note.file]),
  );
  // Keyed off `notes` and not the address map: every note has a path whether or not it kept an
  // address, and a meta lookup that silently misses is a cross-file check that passes for the
  // wrong reason.
  const metaByPath = new Map<string, Frontmatter>(
    index.notes.map((note) => [note.file, note.meta ?? {}]),
  );
  return { slugMap, metaByPath };
}
