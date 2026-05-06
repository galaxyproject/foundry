import type { CollectionEntry } from 'astro:content';

export interface WikiLinkTarget {
  id: string;
  summary: string;
}

/** Map from slugified note basename → target. */
export function buildWikiLinkMap(entries: CollectionEntry<'content'>[]): Map<string, WikiLinkTarget> {
  const map = new Map<string, WikiLinkTarget>();
  for (const entry of entries) {
    const basename = entry.id.split('/').pop()!;
    map.set(basename, { id: entry.id, summary: entry.data.summary });
    // Mold notes also addressable by their `name` field.
    if (entry.data.type === 'mold' && entry.data.name) {
      const nameSlug = slugify(entry.data.name);
      if (!map.has(nameSlug)) map.set(nameSlug, { id: entry.id, summary: entry.data.summary });
    }
    if (entry.data.type === 'cli-command' && entry.data.tool && entry.data.command) {
      const commandSlug = slugify(`${entry.data.tool} ${entry.data.command}`);
      if (!map.has(commandSlug)) map.set(commandSlug, { id: entry.id, summary: entry.data.summary });
    }
  }
  return map;
}

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/\s+-\s+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-');
}

function stripBrackets(wikiLink: string): string {
  return wikiLink.replace(/^\[\[/, '').replace(/\]\]$/, '');
}

/** Resolve a `[[...]]` wiki link to an entry href + summary. */
export function resolveWikiLink(
  wikiLink: string,
  linkMap: Map<string, WikiLinkTarget>,
  base: string
): { href: string | null; label: string; summary: string | null } {
  const label = stripBrackets(wikiLink);
  const hashIdx = label.indexOf('#');
  const pageLabel = hashIdx >= 0 ? label.slice(0, hashIdx) : label;
  const anchor = hashIdx >= 0 ? label.slice(hashIdx) : '';
  const slug = slugify(pageLabel);

  if (linkMap.has(slug)) {
    const t = linkMap.get(slug)!;
    return { href: `${base}/${t.id}/${anchor}`, label, summary: t.summary };
  }
  for (const [basename, target] of linkMap) {
    if (basename.startsWith(slug)) {
      return { href: `${base}/${target.id}/${anchor}`, label, summary: target.summary };
    }
  }
  return { href: null, label, summary: null };
}

export function resolveWikiLinkId(
  wikiLink: string,
  linkMap: Map<string, WikiLinkTarget>
): string | null {
  const label = stripBrackets(wikiLink);
  const hashIdx = label.indexOf('#');
  const pageLabel = hashIdx >= 0 ? label.slice(0, hashIdx) : label;
  const slug = slugify(pageLabel);
  if (linkMap.has(slug)) return linkMap.get(slug)!.id;
  for (const [basename, target] of linkMap) {
    if (basename.startsWith(slug)) return target.id;
  }
  return null;
}

export type BacklinkField =
  | 'parent_pattern'
  | 'related_notes'
  | 'related_patterns'
  | 'related_molds'
  | 'implemented_by_patterns'
  | 'phases'
  | 'output_artifact_schema';

export interface Backlink {
  sourceId: string;
  field: BacklinkField;
}

/** Build target entry ID → notes that link to it via frontmatter wiki-link fields. */
export function buildBacklinkMap(
  entries: CollectionEntry<'content'>[],
  linkMap: Map<string, WikiLinkTarget>
): Map<string, Backlink[]> {
  const map = new Map<string, Backlink[]>();
  const add = (targetId: string, sourceId: string, field: BacklinkField) => {
    if (targetId === sourceId) return;
    const list = map.get(targetId) ?? [];
    if (!list.some(b => b.sourceId === sourceId && b.field === field)) {
      list.push({ sourceId, field });
    }
    map.set(targetId, list);
  };

  for (const entry of entries) {
    const data = entry.data as any;

    const single: [BacklinkField, string | undefined][] = [
      ['parent_pattern', data.parent_pattern],
    ];
    for (const [field, val] of single) {
      if (!val) continue;
      const tid = resolveWikiLinkId(val, linkMap);
      if (tid) add(tid, entry.id, field);
    }

    const arrays: [BacklinkField, string[] | undefined][] = [
      ['related_notes', data.related_notes],
      ['related_patterns', data.related_patterns],
      ['related_molds', data.related_molds],
      ['implemented_by_patterns', data.implemented_by_patterns],
    ];
    for (const [field, arr] of arrays) {
      if (!arr) continue;
      for (const wl of arr) {
        const tid = resolveWikiLinkId(wl, linkMap);
        if (tid) add(tid, entry.id, field);
      }
    }

    // Pipeline phases: walk and collect mold references.
    if (data.type === 'pipeline' && Array.isArray(data.phases)) {
      for (const wl of collectPhaseRefs(data.phases)) {
        const tid = resolveWikiLinkId(wl, linkMap);
        if (tid) add(tid, entry.id, 'phases');
      }
    }

    // Mold output_artifacts[].schema: link the schema note back to the producing Mold.
    if (data.type === 'mold' && Array.isArray(data.output_artifacts)) {
      for (const a of data.output_artifacts) {
        const schema = a && typeof a === 'object' ? (a as any).schema : undefined;
        if (typeof schema !== 'string') continue;
        const tid = resolveWikiLinkId(schema, linkMap);
        if (tid) add(tid, entry.id, 'output_artifact_schema');
      }
    }
  }
  return map;
}

function collectPhaseRefs(phases: unknown[]): string[] {
  const out: string[] = [];
  const visit = (node: unknown) => {
    if (typeof node === 'string') {
      if (/^\[\[.+\]\]$/.test(node)) out.push(node);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (typeof obj.mold === 'string') out.push(obj.mold);
    if (typeof obj.fallthrough === 'string') out.push(obj.fallthrough);
    if (Array.isArray(obj.branches)) obj.branches.forEach(visit);
    if (Array.isArray(obj.chain)) obj.chain.forEach(visit);
  };
  phases.forEach(visit);
  return out;
}
