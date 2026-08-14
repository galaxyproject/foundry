// Wiki-link addressing for the whole corpus: which slug reaches which note.
//
// Three commands built this map, and all three agreed by hand that a cli-command note is
// addressable as `[[gxwf validate]]` as well as by filename. assemble-pipeline's copy carried a
// comment saying "parity with cast's buildSlugMap" — parity asserted in prose rather than held
// by construction, which is the arrangement that lets two of the three drift and nothing notice.
//
// The walk, the frontmatter read and the precedence rule now ship in
// @galaxy-foundry/content-reader. What stays here is this instance's vocabulary: which second
// addresses a Galaxy note answers to, and the frame its paths are stated in.

import path from "node:path";

import { createContentReader, type ContentAliases } from "@galaxy-foundry/content-reader";
import { COLLECTIONS, CONTENT_DIR } from "@galaxy-foundry/note-schema";

import type { Frontmatter } from "./types.js";

/**
 * Extra addresses a note answers to, beyond the slug of its own filename.
 *
 * Ours rather than the caster's, because a cast never asks the question — it is handed the
 * finished map. How many ways a note can be named is settled while that map is built, which
 * happens entirely on this side of the boundary.
 */
export type SlugAliases = (meta: Frontmatter) => readonly string[];

/**
 * This instance's second addresses.
 *
 * A cli-command note answers to `<tool> <command>` because that is how a Mold author refers to
 * it — `[[gxwf validate]]`, not `[[gxwf-validate]]`. The rule is Galaxy's knowledge of its own
 * CLI vocabulary, which is why it is a value passed to the map builder rather than a branch
 * inside it.
 */
export const GALAXY_SLUG_ALIASES: SlugAliases = (meta) =>
  meta.type === "cli-command" && typeof meta.tool === "string" && typeof meta.command === "string"
    ? [`${meta.tool} ${meta.command}`]
    : [];

/**
 * The basename of a note's id, which is the address this corpus was written against.
 *
 * The reader's primary address is the full collection-relative id — `nextflow/mix-collect-…` for
 * a source pattern, `galaxy/custom-tool-critic` for a prompt — and 174 links in `content/` are
 * written to the basename alone. Registered as an ALIAS, both spellings resolve and the qualified
 * one becomes available without a rewrite.
 *
 * Alias rather than a change to the reader because the precedence is the point: an alias never
 * takes an address a routed note already holds. `[[summarize-nextflow]]` is the Mold, whose id IS
 * `summarize-nextflow`, and the CLI note of the same basename can no longer take it depending on
 * which collection was walked last.
 */
const basenameOf = (id: string): string => id.split("/").pop()!;

/**
 * One walk of a content tree, addressed by this instance's rules.
 *
 * `contentRoot` is the content directory itself, under whatever name a checkout gives it — the
 * same frame `findMdFiles` takes, so a caller that has one has the other.
 */
export function readContent(contentRoot: string, aliases: SlugAliases) {
  const contentAliases: ContentAliases<typeof COLLECTIONS> = (meta, id) => [
    basenameOf(id),
    ...aliases(meta),
  ];
  return createContentReader({
    collections: COLLECTIONS,
    // COLLECTIONS states its bases repo-relative — `content/molds` — so a path the reader hands
    // back is already in the frame `slugMap` publishes. Rebasing onto whatever the content
    // directory is called on disk is the whole of the translation.
    contentPath: (relativePath) => path.join(contentRoot, path.relative(CONTENT_DIR, relativePath)),
    aliases: contentAliases,
    targetOf: (collection, id) => ({ path: `${collection}/${id}` }),
  }).contentIndex();
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
