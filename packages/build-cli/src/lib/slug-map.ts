// Wiki-link addressing for the whole corpus: which slug reaches which note.
//
// Three commands built this map, and all three agreed by hand that a cli-command note is
// addressable as `[[gxwf validate]]` as well as by filename. assemble-pipeline's copy carried a
// comment saying "parity with cast's buildSlugMap" — parity asserted in prose rather than held
// by construction, which is the arrangement that lets two of the three drift and nothing notice.

import path from "node:path";

import { readMarkdown } from "./frontmatter.js";
import type { Frontmatter } from "./types.js";
import { fileSlug, findMdFiles } from "./walk.js";
import { slugify } from "./wiki-links.js";

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
  const slugMap = new Map<string, string>();
  const metaByPath = new Map<string, Frontmatter>();
  for (const abs of findMdFiles(path.join(repoRoot, "content"))) {
    const parsed = readMarkdown(abs);
    if (!parsed.hasFrontmatter) continue;
    const rel = path.relative(repoRoot, abs);
    slugMap.set(slugify(fileSlug(rel)), rel);
    metaByPath.set(rel, parsed.meta);
    for (const alias of aliases(parsed.meta)) slugMap.set(slugify(alias), rel);
  }
  return { slugMap, metaByPath };
}
