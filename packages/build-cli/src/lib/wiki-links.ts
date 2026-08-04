// The wiki-link slug + resolver the validator and the caster share.
//
// The grammar and the lookup rule now live in @galaxy-foundry/wiki-links, shared across
// Foundry instances. This module exists only to keep the `string | null` return the call
// sites here were written against; everything else re-exports straight through.
//
// The prefix-match fallback this used to carry is GONE, deliberately. Measured over the
// whole corpus it resolved exactly one link: `[[...]]` in the glossary, which slugifies to
// the empty string and therefore prefix-matched all 264 map keys, landing on whichever came
// first. Every other link already matched exactly. See content/meta/architecture.md §7.

import { resolveWikiLink as resolve } from "@galaxy-foundry/wiki-links";

export {
  WIKI_LINK_RE,
  WIKI_LINK_SCAN_RE,
  parseWikiLink,
  slugify,
  stripBrackets,
} from "@galaxy-foundry/wiki-links";

export function resolveWikiLink(
  wikiLink: unknown,
  slugToPath: ReadonlyMap<string, string>,
): string | null {
  return resolve(wikiLink, slugToPath) ?? null;
}
