// Works out which pipeline a run directory came from when it carries no run record.
//
// This is a migration aid for runs made before the run record existed, not the design. It cannot
// recover loop iterations, cannot say which phase wrote a file that seven Molds declare, and
// cannot separate two pipelines that declare the same filenames. Where it cannot know, it says so
// and stops, rather than picking.

import {
  declaredOutputs,
  declaringSkillsByFilename,
  listPipelineSlugs,
  loadAssembly,
  type AssemblyManifest,
  type DeclaredOutput,
} from "./cast-registry.js";
import type { RuntimeArtifactRegistry } from "@galaxy-foundry/gxwf-foundry-note-schema";

import type { RunWarning } from "./run-model.js";

export type DetectionSource = "run-record" | "feedback-ledger" | "flag" | "filename-inference";
export type DetectionConfidence = "declared" | "flag" | "inferred";

export interface PipelineCandidateScore {
  pipeline: string;
  matched: number;
  declared_total: number;
  /** Files some other pipeline declares and this one cannot explain. */
  foreign: number;
  coverage: number;
  score: number;
  matched_filenames: string[];
}

export interface PipelineDetection {
  pipeline: string;
  confidence: DetectionConfidence;
  source: DetectionSource;
  candidates: PipelineCandidateScore[];
  conflict: { declared: string; best_inferred: string; note: string } | null;
  /** Stated sources that disagree with each other, or name a pipeline this checkout lacks. */
  warnings: RunWarning[];
}

export class PipelineUndeterminedError extends Error {
  readonly candidates: PipelineCandidateScore[];
  constructor(message: string, candidates: PipelineCandidateScore[]) {
    super(message);
    this.name = "PipelineUndeterminedError";
    this.candidates = candidates;
  }
}

export interface PipelineIndex {
  assemblies: Map<string, AssemblyManifest>;
  declared: Map<string, DeclaredOutput[]>;
  /** filename -> pipelines declaring it, across every assembled harness */
  filenameOwners: Map<string, string[]>;
  /** filename -> cast skills declaring it, including Molds no pipeline lists as a phase */
  skillOwners: Map<string, string[]>;
}

export function buildPipelineIndex(
  repoRoot: string,
  runtimeArtifacts?: RuntimeArtifactRegistry,
): PipelineIndex {
  const assemblies = new Map<string, AssemblyManifest>();
  const declared = new Map<string, DeclaredOutput[]>();
  const filenameOwners = new Map<string, string[]>();

  for (const slug of listPipelineSlugs(repoRoot)) {
    const manifest = loadAssembly(repoRoot, slug);
    const outputs = declaredOutputs(repoRoot, manifest, runtimeArtifacts);
    assemblies.set(slug, manifest);
    declared.set(slug, outputs);
    for (const output of outputs) {
      const owners = filenameOwners.get(output.default_filename) ?? [];
      if (!owners.includes(slug)) owners.push(slug);
      filenameOwners.set(output.default_filename, owners);
    }
  }

  return { assemblies, declared, filenameOwners, skillOwners: declaringSkillsByFilename(repoRoot) };
}

/**
 * Score every pipeline against the basenames on disk.
 *
 * `foreign` is the discriminating term. Without it a small CWL run ties against any larger
 * pipeline that happens to be a superset, and `paper-to-cwl` scores on the same `freeform-summary.md`
 * as `paper-to-galaxy`. With it, a `summary-cwl.json` that a candidate does not declare counts
 * against that candidate rather than being ignored.
 */
export function scorePipelines(observed: string[], index: PipelineIndex): PipelineCandidateScore[] {
  const seen = new Set(observed);
  const declaredAnywhere = new Set(index.filenameOwners.keys());
  const evidence = [...seen].filter((name) => declaredAnywhere.has(name));

  const scores: PipelineCandidateScore[] = [];
  for (const [pipeline, outputs] of index.declared) {
    const names = new Set(outputs.map((output) => output.default_filename));
    const matchedFilenames = evidence.filter((name) => names.has(name)).sort();
    const matched = matchedFilenames.length;
    const foreign = evidence.filter((name) => !names.has(name)).length;
    scores.push({
      pipeline,
      matched,
      declared_total: names.size,
      foreign,
      coverage: names.size === 0 ? 0 : matched / names.size,
      score: matched - foreign,
      matched_filenames: matchedFilenames,
    });
  }

  return scores.sort(
    (a, b) =>
      b.score - a.score ||
      b.coverage - a.coverage ||
      a.declared_total - b.declared_total ||
      a.pipeline.localeCompare(b.pipeline),
  );
}

/** Below this, the evidence is too thin to name a pipeline at all. */
const MINIMUM_SCORE = 2;

function formatCandidateTable(candidates: PipelineCandidateScore[]): string {
  const rows = candidates.slice(0, 6);
  const width = Math.max(8, ...rows.map((row) => row.pipeline.length));
  const header = `  ${"pipeline".padEnd(width)}  score  matched  foreign  coverage`;
  const body = rows.map(
    (row) =>
      `  ${row.pipeline.padEnd(width)}  ${String(row.score).padStart(5)}  ${String(row.matched).padStart(7)}  ${String(row.foreign).padStart(7)}  ${row.coverage.toFixed(2).padStart(8)}`,
  );
  return [header, ...body].join("\n");
}

export interface DetectHints {
  recordPipeline?: string | null;
  ledgerPipeline?: string | null;
  flagPipeline?: string | null;
}

export function detectPipeline(
  observed: string[],
  index: PipelineIndex,
  hints: DetectHints = {},
): PipelineDetection {
  const candidates = scorePipelines(observed, index);
  const known = (slug: string | null): slug is string =>
    slug !== null && index.assemblies.has(slug);
  const flag = hints.flagPipeline || null;
  const recorded = hints.recordPipeline || null;
  const ledger = hints.ledgerPipeline || null;
  const warnings: RunWarning[] = [];
  const available = [...index.assemblies.keys()].sort().join(", ");

  // A stated pipeline this checkout cannot read must not fall through to inference: the run would
  // then be described as whichever pipeline its filenames resemble, under a claim it never made.
  if (flag && !known(flag)) {
    throw new PipelineUndeterminedError(
      `--pipeline ${flag} has no assembled harness in this checkout. Available: ${available}.`,
      candidates,
    );
  }
  if (recorded && !known(recorded) && !flag) {
    throw new PipelineUndeterminedError(
      `the run record names pipeline ${recorded}, which has no assembled harness in this checkout, so its phases cannot be read against anything. Re-run with --pipeline <slug> to read it against one that does. Available: ${available}.`,
      candidates,
    );
  }
  if (ledger && !known(ledger)) {
    warnings.push({
      code: "pipeline-unknown",
      message: `the feedback ledger names pipeline ${ledger}, which has no assembled harness in this checkout`,
      subject: ledger,
    });
  }

  const disagree = (a: string, aSource: string, b: string, bSource: string): void => {
    if (a === b) return;
    warnings.push({
      code: "pipeline-sources-disagree",
      message: `${aSource} says ${a} but ${bSource} says ${b}; reading it as ${a}`,
      subject: a,
    });
  };
  if (flag && recorded) disagree(flag, "--pipeline", recorded, "the run record");
  if (recorded && ledger) disagree(recorded, "the run record", ledger, "the feedback ledger");
  if (flag && ledger && !recorded) disagree(flag, "--pipeline", ledger, "the feedback ledger");

  const stated =
    (flag && { slug: flag, source: "flag" as const }) ||
    (known(recorded) && { slug: recorded, source: "run-record" as const }) ||
    (known(ledger) && { slug: ledger, source: "feedback-ledger" as const }) ||
    null;

  if (stated) {
    const best = candidates[0];
    const statedScore =
      candidates.find((candidate) => candidate.pipeline === stated.slug)?.score ??
      Number.NEGATIVE_INFINITY;
    // The stated pipeline still gets scored. A run whose files do not look like what it claims is
    // worth saying out loud; silently accepting the claim would hide a mixed or mislabelled run.
    // A tie is not a conflict: pipelines that declare identical filenames always tie, which is the
    // very reason the run states its pipeline rather than leaving it to be inferred.
    const conflict =
      best && best.pipeline !== stated.slug && best.score > statedScore
        ? {
            declared: stated.slug,
            best_inferred: best.pipeline,
            note: `the run states ${stated.slug}, but its files score higher for ${best.pipeline}`,
          }
        : null;
    return {
      pipeline: stated.slug,
      confidence: stated.source === "flag" ? "flag" : "declared",
      source: stated.source,
      candidates,
      conflict,
      warnings,
    };
  }

  const winner = candidates[0];
  const runnerUp = candidates[1];
  if (!winner || winner.score < MINIMUM_SCORE) {
    throw new PipelineUndeterminedError(
      `cannot determine which pipeline produced this run: too little declared evidence on disk.\n\n${formatCandidateTable(candidates)}\n\nRe-run with --pipeline <slug>.`,
      candidates,
    );
  }
  if (runnerUp && runnerUp.score === winner.score) {
    const tied = candidates
      .filter((candidate) => candidate.score === winner.score)
      .map((candidate) => candidate.pipeline);
    throw new PipelineUndeterminedError(
      `cannot determine which pipeline produced this run: ${tied.join(" and ")} score equally.\n\n${formatCandidateTable(candidates)}\n\nThese pipelines declare the same filenames, so no file on disk can separate them. Re-run with --pipeline <slug>, or run the pipeline again so it writes a run record.`,
      candidates,
    );
  }

  return {
    pipeline: winner.pipeline,
    confidence: "inferred",
    source: "filename-inference",
    candidates,
    conflict: null,
    warnings,
  };
}
