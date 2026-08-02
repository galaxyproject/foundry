import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import {
  addBoldTermAnchors,
  resolveWikiLink,
  resolveWikiLinksInMarkdown,
} from '@galaxy-foundry/wiki-links';

/**
 * What this renderer needs of a link target, which is less than `./wiki-links` defines.
 *
 * Declared here rather than imported so the module reaches no `astro:content` — that import
 * arrives through `./wiki-links` → `./notes`, and it is what kept a pure string renderer
 * untestable outside an Astro build. Structural, so the site's own `WikiLinkTarget` satisfies it;
 * a caller passing the real map is checked against it either way.
 */
export interface VaultDocTarget {
  id: string;
  summary: string;
}

// The glossary and the ops log live outside every collection, so they render through `marked`
// rather than the remark pipeline — which means links resolve on the STRING, before parsing.
//
// Neither half of that is ours. The grammar and the anchor minting both ship in
// @galaxy-foundry/wiki-links, so this path and its remark twin cannot answer differently. What
// was here before was a local `/\[\[([^\[\]]+)\]\]/g` plus a local copy of the anchor helpers,
// and the regex rewrote inside code spans, where a backtick means the syntax: the glossary's
// definition of a Phase rendered `mold: [[...]]` as `mold: **...**`. Nothing reported it — the
// validator strips code spans before scanning too, so both surfaces went blind on the same text.
//
// Resolving through the package rather than `./wiki-links` also uncouples this module from
// astro:content, which that wrapper reaches through `./notes`. It is a string renderer; it can
// now be tested as one.

const DEFAULT_CONTENT_DIR = path.resolve('../content');

/**
 * Load a content-root markdown file (log.md, glossary.md), resolve [[wiki links]],
 * and render to HTML.
 *
 * `contentDir` defaults to the corpus as seen from the site/ cwd an Astro build runs in. It is a
 * parameter for the same reason the LICENSES directory is one: an implicit relative path is
 * exactly the part that does not survive being called from somewhere else.
 */
export function renderContentDoc(
  filename: string,
  linkMap: Map<string, VaultDocTarget>,
  base: string,
  contentDir: string = DEFAULT_CONTENT_DIR
): string {
  const raw = fs.readFileSync(path.join(contentDir, filename), 'utf-8');
  const withLinks = resolveWikiLinksInMarkdown(raw, {
    // Deliberately the same body as the remark plugin's `resolve`: one link map, one href shape,
    // and the package appends the link's own `#anchor` to whatever it is handed.
    resolve: (link) => {
      const target = resolveWikiLink(link.target, linkMap);
      return target ? { href: `${base}/${target.id}/`, title: target.summary } : null;
    },
  });
  const html = marked.parse(withLinks, { async: false }) as string;
  return addBoldTermAnchors(html);
}
