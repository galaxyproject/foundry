// The design record, read from the corpus rather than restated beside it.
//
// This module used to BE the registry: a hand-written `DESIGN_DOCS` array carrying every
// record's title, summary, source filename and category in TypeScript, plus a link rewriter
// that turned relative `docs/*.md` links into routes. It drifted, as a second copy does —
// `MOLD_SPEC.md` and `SCHEMA_PACKAGES.md` sat in `docs/` and the array named neither, so two
// design records were rendered by nothing and no check could notice.
//
// Now the records are notes of the `meta` kind under `content/meta/`, so title and summary
// come from frontmatter that a schema checks, and membership is the collection's answer. A
// record cannot exist and go unrendered any more: the collection either has it or it is not a
// record. The renderer is gone too — these are ordinary notes, so the catch-all note route
// renders them and the wiki-link checker gates their cross-references.
//
// What is left here is the part that is genuinely presentation: how the two shelves are
// introduced on the index page.

import { getCollection, type CollectionEntry } from 'astro:content';

export type DesignDoc = CollectionEntry<'meta'>;

export type RecordKind = DesignDoc['data']['record_kind'];

/** The route a design record renders at — the same content-path rule every note follows. */
export function designDocHref(doc: DesignDoc, base: string): string {
  return `${base}/${doc.id}/`;
}

/**
 * Every design record, in reading order.
 *
 * Sorted by the note's own `order`, which is what the old array's POSITION used to carry and
 * the only thing about it that frontmatter could not otherwise express: the sequence is
 * pedagogical, so neither `created` nor the title sorts it right.
 */
export async function getDesignDocs(): Promise<DesignDoc[]> {
  const docs = await getCollection('meta');
  return docs.sort((a, b) => a.data.order - b.data.order);
}

export async function designDocsByCategory(category: RecordKind): Promise<DesignDoc[]> {
  const docs = await getDesignDocs();
  return docs.filter(doc => doc.data.record_kind === category);
}

// Shelf furniture: headings and card verbs for the index page. Deliberately NOT frontmatter —
// this describes how a SET of records is introduced, and no single record owns it. `category`
// is typed as the kind's own enum, so a `record_kind` added to the schema without a heading
// here is a typecheck error rather than a section that silently renders empty.
export const DESIGN_DOC_GROUPS: readonly {
  category: RecordKind;
  title: string;
  summary: string;
  action: string;
}[] = [
  {
    category: 'foundation',
    title: 'Foundry design records',
    summary:
      'The core rationale behind Molds, casting, corpus grounding, and source-to-target pipelines.',
    action: 'READ THE RECORD',
  },
  {
    category: 'infrastructure',
    title: 'Project infrastructure research',
    summary:
      'Developer-facing evaluations and adjacent-project notes that shape how the Foundry is built, hosted, and integrated.',
    action: 'READ THE RESEARCH',
  },
];
