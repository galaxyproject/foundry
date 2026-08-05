import type { InputArtifact, OutputArtifact } from '@galaxy-foundry/note-schema';
import { type NoteEntry } from './notes';
import { resolveWikiLinkId, type WikiLinkTarget } from './wiki-links';

// These two were spelled out here, field for field, copied from the mold schema by reading it —
// the same re-description the reference manifest had, one level down. An interface beside a schema
// does not fail against it: `schema` is optional on both sides, so removing it from the kind left
// this one still satisfied and the artifact tables would simply have stopped linking.
export type OutputArtifactDecl = OutputArtifact;
export type InputArtifactDecl = InputArtifact;

export interface ArtifactProducer {
  moldId: string;
  decl: OutputArtifactDecl;
}

export interface ArtifactConsumer {
  moldId: string;
  decl: InputArtifactDecl;
}

export interface ArtifactPipelineUse {
  pipelineId: string;
  /** Phase indices (1-based) where this artifact is produced. */
  produceAt: number[];
  /** Phase indices (1-based) where this artifact is consumed. */
  consumeAt: number[];
}

export interface ArtifactNode {
  id: string;
  producers: ArtifactProducer[];
  consumers: ArtifactConsumer[];
  schemas: Set<string>;
  defaultFilenames: Set<string>;
  pipelines: Map<string, ArtifactPipelineUse>;
}

export type ArtifactGraph = Map<string, ArtifactNode>;

function ensure(graph: ArtifactGraph, id: string): ArtifactNode {
  let node = graph.get(id);
  if (!node) {
    node = {
      id,
      producers: [],
      consumers: [],
      schemas: new Set(),
      defaultFilenames: new Set(),
      pipelines: new Map(),
    };
    graph.set(id, node);
  }
  return node;
}

function pipelineUse(node: ArtifactNode, pipelineId: string): ArtifactPipelineUse {
  let use = node.pipelines.get(pipelineId);
  if (!use) {
    use = { pipelineId, produceAt: [], consumeAt: [] };
    node.pipelines.set(pipelineId, use);
  }
  return use;
}

function collectMoldRefsFromPhase(phase: unknown): string[] {
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
  visit(phase);
  return out;
}

export function buildArtifactGraph(
  entries: NoteEntry[],
  linkMap: Map<string, WikiLinkTarget>,
): ArtifactGraph {
  const graph: ArtifactGraph = new Map();
  const moldDeclByEntry = new Map<string, { out: OutputArtifactDecl[]; in: InputArtifactDecl[] }>();

  for (const entry of entries) {
    const data = entry.data;
    if (data.type !== 'mold') continue;
    // The annotations are the point: they used to sit in front of `any` and assert nothing. With
    // the arm narrowed they compare the mold schema's shape against the one this module renders,
    // so a field renamed there fails here instead of arriving undefined.
    const out: OutputArtifactDecl[] = data.output_artifacts ?? [];
    const inp: InputArtifactDecl[] = data.input_artifacts ?? [];
    moldDeclByEntry.set(entry.id, { out, in: inp });
    for (const o of out) {
      const node = ensure(graph, o.id);
      node.producers.push({ moldId: entry.id, decl: o });
      if (o.schema) node.schemas.add(o.schema);
      if (o.default_filename) node.defaultFilenames.add(o.default_filename);
    }
    for (const i of inp) {
      const node = ensure(graph, i.id);
      node.consumers.push({ moldId: entry.id, decl: i });
    }
  }

  // Pipeline binding inference: walk phases in order, attribute artifact ids to phase indices
  // by following each phase's referenced Mold(s)' declared artifacts.
  for (const entry of entries) {
    const data = entry.data;
    if (data.type !== 'pipeline') continue;
    data.phases.forEach((phase, idx) => {
      const phaseNum = idx + 1;
      const moldRefs = collectMoldRefsFromPhase(phase);
      for (const wl of moldRefs) {
        const moldId = resolveWikiLinkId(wl, linkMap);
        if (!moldId) continue;
        const decls = moldDeclByEntry.get(moldId);
        if (!decls) continue;
        for (const o of decls.out) {
          const use = pipelineUse(ensure(graph, o.id), entry.id);
          if (!use.produceAt.includes(phaseNum)) use.produceAt.push(phaseNum);
        }
        for (const i of decls.in) {
          const use = pipelineUse(ensure(graph, i.id), entry.id);
          if (!use.consumeAt.includes(phaseNum)) use.consumeAt.push(phaseNum);
        }
      }
    });
  }

  return graph;
}

/** id slug used in /artifacts/<slug>/ URLs. Artifact ids are already kebab. */
export function artifactSlug(id: string): string {
  return id;
}

export function artifactHref(base: string, id: string): string {
  return `${base}/artifacts/${artifactSlug(id)}/`;
}
