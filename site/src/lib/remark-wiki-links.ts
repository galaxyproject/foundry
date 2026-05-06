import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { visit, SKIP } from 'unist-util-visit';
import type { Root, Text, PhrasingContent } from 'mdast';

interface Target {
  id: string;
  summary?: string;
  name?: string;
}

interface Options {
  contentDir: string;
  base: string;
}

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/\s+-\s+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-');
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

function resolve(label: string, map: Map<string, Target>): Target | null {
  const slug = slugify(label);
  const exact = map.get(slug);
  if (exact) return exact;
  for (const [basename, target] of map) {
    if (basename.startsWith(slug)) return target;
  }
  return null;
}

const WIKI_RE = /\[\[([^\]\n]+)\]\]/g;

export default function remarkWikiLinks(opts: Options) {
  let cache: Map<string, Target> | null = null;
  const getMap = () => (cache ??= buildMap(opts.contentDir));
  const baseTrim = opts.base.replace(/\/$/, '');

  return function transformer(tree: Root) {
    const map = getMap();
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      if (parent.type === 'link' || parent.type === 'linkReference') return;
      const value = node.value;
      if (!value.includes('[[')) return;

      const replacements: PhrasingContent[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      WIKI_RE.lastIndex = 0;
      while ((m = WIKI_RE.exec(value)) !== null) {
        if (m.index > last) {
          replacements.push({ type: 'text', value: value.slice(last, m.index) });
        }
        const inner = m[1];
        if (inner === undefined) continue;
        const pipe = inner.indexOf('|');
        const target = pipe >= 0 ? inner.slice(0, pipe) : inner;
        const display = pipe >= 0 ? inner.slice(pipe + 1) : inner;
        const hashIdx = target.indexOf('#');
        const pageTarget = hashIdx >= 0 ? target.slice(0, hashIdx) : target;
        const anchor = hashIdx >= 0 ? target.slice(hashIdx) : '';
        const t = resolve(pageTarget, map);
        if (t) {
          replacements.push({
            type: 'link',
            url: `${baseTrim}/${t.id}/${anchor}`,
            title: t.summary ?? null,
            children: [{ type: 'text', value: display }],
          });
        } else {
          replacements.push({
            type: 'strong',
            children: [{ type: 'text', value: display }],
          });
        }
        last = m.index + m[0].length;
      }
      if (last === 0) return;
      if (last < value.length) {
        replacements.push({ type: 'text', value: value.slice(last) });
      }
      (parent.children as PhrasingContent[]).splice(index, 1, ...replacements);
      return [SKIP, index + replacements.length];
    });
  };
}
