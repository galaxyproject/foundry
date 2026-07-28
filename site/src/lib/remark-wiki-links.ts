import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import remarkWikiLinks from '@galaxy-foundry/wiki-links/remark';
import { resolveWikiLink, slugify } from '@galaxy-foundry/wiki-links';
import type { Root } from 'mdast';

// The map is ours — a filesystem walk, because this runs at markdown-compile time when
// astro:content is not available yet. The walk over the tree, the `[[a#b|c]]` grammar and
// the lookup rule come from @galaxy-foundry/wiki-links, so this file and
// site/src/lib/wiki-links.ts can no longer drift. See docs/ARCHITECTURE.md §7.

interface Target {
  id: string;
  summary?: string;
  name?: string;
}

interface Options {
  contentDir: string;
  base: string;
}

function slugifyPath(rel: string): string {
  return rel.replace(/\.md$/, '').split('/').map(slugify).join('/');
}

const SKIP_TOP = new Set(['Dashboard.md', 'Index.md', 'log.md', 'glossary.md']);
const SKIP_DIRS = new Set(['.obsidian', 'templates']);

function walk(dir: string, root: string, out: string[]): void {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    const rel = path.relative(root, full);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(full, root, out);
    } else if (ent.isFile() && ent.name.endsWith('.md')) {
      if (rel === ent.name && SKIP_TOP.has(ent.name)) continue;
      out.push(rel);
    }
  }
}

function parseFrontmatter(raw: string): Record<string, unknown> | null {
  if (!raw.startsWith('---\n')) return null;
  const end = raw.indexOf('\n---', 4);
  if (end < 0) return null;
  try {
    return (yaml.load(raw.slice(4, end)) as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}

function buildMap(contentDir: string): Map<string, Target> {
  const abs = path.resolve(contentDir);
  const files: string[] = [];
  walk(abs, abs, files);
  const map = new Map<string, Target>();
  for (const rel of files) {
    let id = slugifyPath(rel);
    if (id.endsWith('/index')) id = id.slice(0, -'/index'.length);
    const basename = id.split('/').pop()!;
    let summary: string | undefined;
    let name: string | undefined;
    try {
      const fm = parseFrontmatter(fs.readFileSync(path.join(abs, rel), 'utf-8'));
      if (fm) {
        if (typeof fm.summary === 'string') summary = fm.summary;
        if (typeof fm.name === 'string') name = fm.name;
      }
    } catch { /* ignore */ }
    const target: Target = { id, summary, name };
    map.set(basename, target);
    if (name) {
      const nameSlug = slugify(name);
      if (!map.has(nameSlug)) map.set(nameSlug, target);
    }
  }
  return map;
}

export default function remarkWikiLinksPlugin(opts: Options) {
  let cache: Map<string, Target> | null = null;
  const getMap = () => (cache ??= buildMap(opts.contentDir));
  const baseTrim = opts.base.replace(/\/$/, '');

  const transform = remarkWikiLinks({
    resolve: (link) => {
      const t = resolveWikiLink(link.target, getMap());
      return t ? { href: `${baseTrim}/${t.id}/`, title: t.summary ?? null } : null;
    },
  });

  return function transformer(tree: Root) {
    transform(tree);
  };
}
