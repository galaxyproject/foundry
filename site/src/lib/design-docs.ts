import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const DOCS_DIR = path.resolve('../docs');

export type DesignDoc = {
  slug: string;
  title: string;
  source: string;
  summary: string;
  category: 'foundation' | 'infrastructure';
};

export const DESIGN_DOCS: DesignDoc[] = [
  {
    slug: 'guiding-principles',
    title: 'Guiding Principles',
    source: 'GUIDING_PRINCIPLES.md',
    summary: 'The design pressure behind source authority, progressive disclosure, validation, portability, and corpus grounding.',
    category: 'foundation',
  },
  {
    slug: 'architecture',
    title: 'Architecture',
    source: 'ARCHITECTURE.md',
    summary: 'Physical layout, content types, validation pipeline, generated artifacts, and site rendering.',
    category: 'foundation',
  },
  {
    slug: 'molds',
    title: 'Molds',
    source: 'MOLDS.md',
    summary: 'The Mold inventory, bucketing axes, and boundaries between Molds and reference content.',
    category: 'foundation',
  },
  {
    slug: 'casting',
    title: 'Compilation Pipeline',
    source: 'COMPILATION_PIPELINE.md',
    summary: 'How typed Mold references become target-specific cast artifacts with provenance.',
    category: 'foundation',
  },
  {
    slug: 'cast-walkthrough',
    title: 'Cast Walkthrough',
    source: 'CAST_WALKTHROUGH.md',
    summary: 'One real committed cast (discover-shed-tool) annotated end to end: every bundle file traced back through per-kind dispatch and _provenance.json.',
    category: 'foundation',
  },
  {
    slug: 'corpus',
    title: 'Corpus Integration',
    source: 'CORPUS_INGESTION.md',
    summary: 'How IWC grounding works without turning the Foundry into an upstream workflow mirror.',
    category: 'foundation',
  },
  {
    slug: 'harness-pipelines',
    title: 'Harness Pipelines',
    source: 'HARNESS_PIPELINES.md',
    summary: 'The source-to-target journeys that compose Molds, loops, and branch phases.',
    category: 'foundation',
  },
  {
    slug: 'comparisons',
    title: 'Comparisons',
    source: 'COMPARISONS.md',
    summary: 'Where the Foundry sits versus wikis, skill bundles, and the KB-to-skill landscape (MCP, Agent Skills, llms.txt, Corpus2Skill, RAG) — a dated snapshot.',
    category: 'infrastructure',
  },
  {
    slug: 'pattern-authorship',
    title: 'Pattern Authorship Policy',
    source: 'PATTERNS.md',
    summary: 'Developer-facing authorship rules for operation-named, corpus-grounded pattern pages.',
    category: 'infrastructure',
  },
];

export const DESIGN_DOC_GROUPS = [
  {
    category: 'foundation',
    title: 'Foundry design records',
    summary: 'The core rationale behind Molds, casting, corpus grounding, and source-to-target pipelines.',
    action: 'READ THE RECORD',
  },
  {
    category: 'infrastructure',
    title: 'Project infrastructure research',
    summary: 'Developer-facing evaluations and adjacent-project notes that shape how the Foundry is built, hosted, and integrated.',
    action: 'READ THE RESEARCH',
  },
] as const;

export function designDocsByCategory(category: DesignDoc['category']): DesignDoc[] {
  return DESIGN_DOCS.filter(doc => doc.category === category);
}

export function getDesignDoc(slug: string): DesignDoc | undefined {
  return DESIGN_DOCS.find(doc => doc.slug === slug);
}

export function renderDesignDoc(doc: DesignDoc, base: string): string {
  const raw = fs.readFileSync(path.join(DOCS_DIR, doc.source), 'utf-8');
  const withoutTitle = raw.replace(/^# .+\n+/, '');
  const rewritten = rewriteDocLinks(withoutTitle, base);
  return marked.parse(rewritten, { async: false }) as string;
}

function rewriteDocLinks(markdown: string, base: string): string {
  const bySource = new Map(DESIGN_DOCS.map(doc => [doc.source, doc.slug]));
  return markdown.replace(/\]\(([^)]+\.md)(#[^)]+)?\)/g, (match, target, hash = '') => {
    const filename = target.split('/').pop();
    const slug = filename ? bySource.get(filename) : undefined;
    if (!slug) return match;
    return `](${base}/design/${slug}/${hash})`;
  });
}
