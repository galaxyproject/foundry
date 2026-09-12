// Which slug reaches which note — the vocabulary, beside the table that routes it.
//
// The RULE ships in @galaxy-foundry/content-reader: a note's primary address is its
// collection-relative id, primaries are registered before any alias, and an alias fills an empty
// address only. What is ours is the VOCABULARY — the further addresses a Galaxy note answers to.
//
// It lived in the build CLI while the CLI was its only reader. The site resolved links by a
// second map, built by its own walk from its own frontmatter parse, and carried no `tool command`
// address at all — so `[[foundry summarize-nextflow]]` rendered bold on the deployed page while
// `validate` called it good. Two readers cannot agree on an answer neither of them owns, so the
// vocabulary moved here, next to COLLECTIONS, which both of them route from already.

import path from "node:path";

import type { Frontmatter } from "@galaxy-foundry/cast";
import {
  createContentReader,
  type ContentAliases,
  type ContentTarget,
} from "@galaxy-foundry/content-reader";

import { COLLECTIONS, CONTENT_DIR, type CollectionName } from "./collections.js";

/**
 * Extra addresses a note answers to, beyond the slug of its own filename.
 *
 * Ours rather than the reader's, because the reader never asks the question — it is handed the
 * finished vocabulary. How many ways a note can be named is settled while the map is built.
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
 * The path segment a collection's notes publish under: `content/cli` → `cli`.
 *
 * Not the collection NAME. `cli-tools` and `cli-commands` are two kinds sharing one directory,
 * so the name and the published path diverge for exactly those two — and they are the pair the
 * corpus's one basename collision runs through.
 */
export const collectionPrefix = (name: CollectionName): string =>
  COLLECTIONS[name].base.slice(`${CONTENT_DIR}/`.length);

/**
 * One walk of a content tree, addressed by this instance's rules.
 *
 * `contentRoot` is the content directory itself, under whatever name a checkout gives it.
 * `targetOf` stays the caller's: the validator wants a repo-relative path to report against, the
 * site wants a URL to link to, and the addresses they reach those by are the same either way.
 */
export function readGalaxyContent<Target extends ContentTarget>(
  contentRoot: string,
  aliases: SlugAliases,
  targetOf: (collection: CollectionName, id: string, meta: Frontmatter) => Target,
) {
  const contentAliases: ContentAliases<typeof COLLECTIONS> = (meta, id) => [
    basenameOf(id),
    ...aliases(meta as Frontmatter),
  ];
  return createContentReader({
    collections: COLLECTIONS,
    // COLLECTIONS states its bases repo-relative — `content/molds` — so a path the reader hands
    // back is already in the frame callers publish in. Rebasing onto whatever the content
    // directory is called on disk is the whole of the translation.
    contentPath: (relativePath) => path.join(contentRoot, path.relative(CONTENT_DIR, relativePath)),
    aliases: contentAliases,
    targetOf: (collection, id, meta) =>
      targetOf(collection as CollectionName, id, (meta ?? {}) as Frontmatter),
  }).contentIndex();
}
