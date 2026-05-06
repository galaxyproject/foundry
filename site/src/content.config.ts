import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { contractKeys, loadReferenceContract } from './lib/reference-contract';

const referenceContract = loadReferenceContract();

function registryEnum(group: keyof typeof referenceContract) {
  const values = contractKeys(referenceContract, group);
  return z.string().refine((v: string) => values.includes(v), { message: `must be one of: ${values.join(', ')}` });
}

function slugifyPath(entry: string): string {
  return entry.replace(/\.md$/, '').split('/')
    .map(s => s.toLowerCase().replace(/\s+-\s+/g, '-').replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '').replace(/-+/g, '-'))
    .join('/');
}

const wikiLink = z.string().regex(/^\[\[.+\]\]$/, { message: 'must be a [[wiki-link]]' });

const typedReference = z.object({
  kind: registryEnum('kinds'),
  ref: z.string().min(1),
  used_at: registryEnum('used_at'),
  load: registryEnum('load'),
  mode: registryEnum('modes'),
  evidence: registryEnum('evidence'),
  purpose: z.string().min(1).optional(),
  trigger: z.string().min(1).optional(),
  verification: z.string().min(1).optional(),
}).strict().superRefine((ref: any, ctx: any) => {
  if (ref.evidence === 'hypothesis' && !ref.verification) {
    ctx.addIssue({ code: 'custom', message: 'hypothesis references require `verification`' });
  }
});

const iwcExemplarStep = z.object({
  label: z.string().min(1).optional(),
  id: z.union([z.string().min(1), z.number().int()]).optional(),
}).strict().refine((step: any) => step.label || step.id !== undefined, {
  message: 'step needs `label` or `id`',
});

const iwcExemplar = z.object({
  workflow: z.string().min(1),
  steps: z.array(iwcExemplarStep).min(1).optional(),
  why: z.string().min(1),
  confidence: z.enum(['high', 'medium', 'low']),
}).strict();

const baseFields = {
  tags: z.array(z.string()).min(1),
  status: z.enum(['draft', 'reviewed', 'revised', 'stale', 'archived']),
  created: z.coerce.date(),
  revised: z.coerce.date(),
  revision: z.number().int().min(1),
  ai_generated: z.boolean(),
  summary: z.string().min(20).max(160),
  title: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  sources: z.array(z.string().min(1)).min(1).optional(),
  related_notes: z.array(wikiLink).optional(),
  related_patterns: z.array(wikiLink).optional(),
  related_molds: z.array(wikiLink).optional(),
};

// Pipeline phase: Mold-shape or branch-shape. Branch can have branches[] or chain[].
const branchItem: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    wikiLink,
    z.string(), // free-text terminal like "user-supplied"
    z.object({ fallthrough: wikiLink }).strict(),
  ])
);

const moldPhase = z.object({
  mold: wikiLink,
  loop: z.boolean().optional(),
}).strict();

const branchPhase = z.object({
  branch: z.string(),
  loop: z.boolean().optional(),
  branches: z.array(branchItem).optional(),
  chain: z.array(branchItem).optional(),
}).strict().refine(p => p.branches || p.chain, {
  message: 'branch phase needs `branches` or `chain`',
});

const phase = z.union([moldPhase, branchPhase]);

const artifactId = z.string().regex(/^[a-z][a-z0-9-]*$/, { message: 'must be a kebab id' });

const outputArtifact = z.object({
  id: artifactId,
  kind: z.enum(['json', 'markdown', 'yaml', 'text', 'other']),
  default_filename: z.string().min(1),
  schema: wikiLink.optional(),
  description: z.string().min(20),
}).strict();

const inputArtifact = z.object({
  id: artifactId,
  description: z.string().min(20),
}).strict();

const moldSchema = z.object({
  type: z.literal('mold'),
  name: z.string(),
  axis: z.enum(['source-specific', 'target-specific', 'tool-specific', 'generic']),
  source: z.enum(['paper', 'nextflow', 'cwl', 'snakemake']).optional(),
  target: z.enum(['galaxy', 'cwl', 'web', 'generic']).optional(),
  tool: z.enum(['gxwf', 'planemo']).optional(),
  input_schemas: z.array(wikiLink).optional(),
  output_schemas: z.array(wikiLink).optional(),
  output_artifacts: z.array(outputArtifact).optional(),
  input_artifacts: z.array(inputArtifact).optional(),
  references: z.array(typedReference).optional(),
  ...baseFields,
}).strict();

const patternSchema = z.object({
  ...baseFields,
  type: z.literal('pattern'),
  pattern_kind: z.enum(['operation', 'recipe', 'moc']),
  evidence: z.enum(['corpus-observed', 'structurally-verified', 'corpus-and-verified', 'hypothesis']),
  title: z.string(),
  parent_pattern: wikiLink.optional(),
  verification_paths: z.array(z.string()).optional(),
  iwc_exemplars: z.array(iwcExemplar).optional(),
}).strict();

const sourcePatternSchema = z.object({
  ...baseFields,
  type: z.literal('source-pattern'),
  title: z.string(),
  source: z.enum(['nextflow', 'cwl', 'snakemake']),
  target: z.enum(['galaxy', 'cwl', 'web', 'generic']),
  source_pattern_kind: z.enum(['moc', 'channel-shape', 'operator', 'lifecycle', 'review-trigger']),
  implemented_by_patterns: z.array(wikiLink).min(1),
  review_triggers: z.array(z.string().min(1)).optional(),
}).strict();

const cliCommandSchema = z.object({
  type: z.literal('cli-command'),
  tool: z.enum(['gxwf', 'planemo']),
  command: z.string(),
  ...baseFields,
}).strict();

const pipelineSchema = z.object({
  ...baseFields,
  type: z.literal('pipeline'),
  title: z.string(),
  phases: z.array(phase).min(1),
}).strict();

const researchSchema = z.object({
  type: z.literal('research'),
  subtype: z.enum(['component', 'design-problem', 'design-spec']),
  component: z.string().optional(),
  ...baseFields,
}).strict();

const schemaNoteSchema = z.object({
  ...baseFields,
  type: z.literal('schema'),
  name: z.string(),
  title: z.string(),
  package: z.string().optional(),
  upstream: z.string().optional(),
  package_export: z.string().optional(),
  license: z.string().optional(),
  license_file: z.string().optional(),
}).strict();

const noteSchema = z.discriminatedUnion('type', [
  moldSchema,
  patternSchema,
  sourcePatternSchema,
  cliCommandSchema,
  pipelineSchema,
  researchSchema,
  schemaNoteSchema,
]).superRefine((d, ctx) => {
  if (d.type !== 'mold') return;
  if (d.axis === 'source-specific' && !d.source) ctx.addIssue({ code: 'custom', message: 'source-specific mold requires `source`' });
  if (d.axis === 'target-specific' && !d.target) ctx.addIssue({ code: 'custom', message: 'target-specific mold requires `target`' });
  if (d.axis === 'tool-specific' && !d.tool) ctx.addIssue({ code: 'custom', message: 'tool-specific mold requires `tool`' });
});

const content = defineCollection({
  loader: glob({
    pattern: [
      'cli/**/*.md',
      'molds/**/index.md',
      'patterns/**/*.md',
      'source-patterns/**/*.md',
      'pipelines/**/*.md',
      'research/**/*.md',
      'schemas/**/*.md',
      '!Dashboard.md',
      '!Index.md',
      '!log.md',
      '!glossary.md',
    ],
    base: '../content',
    generateId({ entry }) {
      let id = slugifyPath(entry);
      if (id.endsWith('/index')) id = id.slice(0, -'/index'.length);
      return id;
    },
  }),
  schema: noteSchema,
});

export const collections = { content };
