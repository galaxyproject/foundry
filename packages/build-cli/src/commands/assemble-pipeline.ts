#!/usr/bin/env tsx
// Deterministic pipeline-harness assembly. Reads a Pipeline note's `phases:`
// spine (via the shared `parsePhases` compiler) and projects a lightweight
// `pipeline-<slug>` harness skill — SKILL.md + _assembly.json — with no LLM
// step. Every prose pocket is either a template constant, a Mold `summary`,
// a Mold `loop_endstate`, a pipeline `harness_notes` entry, or derived from
// cast presence. Mirrors `cast`'s `--check` drift gate (byte-diff regen).
//
// Usage:
//   foundry-build assemble-pipeline <slug> [harness-name] [--check] [--root <dir>]

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { readMarkdown } from "../lib/frontmatter.js";
import { parsePhases, type ParsedPhase } from "../lib/pipeline-phases.js";
import type { Frontmatter } from "../lib/types.js";
import { fileSlug, findMdFiles } from "../lib/walk.js";
import { slugify } from "../lib/wiki-links.js";

// ---- argv ----

interface Args {
  slug: string;
  harnessName: string | null;
  check: boolean;
  root: string | null;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  let check = false;
  let root: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--check") check = true;
    else if (a.startsWith("--root=")) root = a.slice("--root=".length);
    else if (a === "--root") root = argv[++i] ?? ".";
    else if (!a.startsWith("--")) positional.push(a);
    else throw new Error(`unknown flag: ${a}`);
  }
  if (positional.length < 1 || positional.length > 2) {
    throw new Error(
      "usage: foundry-build assemble-pipeline <slug> [harness-name] [--check] [--root <dir>]",
    );
  }
  return { slug: positional[0]!, harnessName: positional[1] ?? null, check, root };
}

// ---- content index ----

function buildContentIndex(repoRoot: string): {
  slugMap: Map<string, string>;
  metaByPath: Map<string, Frontmatter>;
} {
  const slugMap = new Map<string, string>();
  const metaByPath = new Map<string, Frontmatter>();
  for (const abs of findMdFiles(path.join(repoRoot, "content"))) {
    const parsed = readMarkdown(abs);
    if (!parsed.hasFrontmatter) continue;
    const rel = path.relative(repoRoot, abs);
    slugMap.set(slugify(fileSlug(rel)), rel);
    metaByPath.set(rel, parsed.meta);
  }
  return { slugMap, metaByPath };
}

function listPipelines(repoRoot: string): string[] {
  const dir = path.join(repoRoot, "content", "pipelines");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3))
    .sort();
}

// ---- helpers ----

function castPresent(repoRoot: string, moldSlug: string): boolean {
  return existsSync(path.join(repoRoot, "casts", "claude", "skills", moldSlug, "SKILL.md"));
}

function scalar(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** First sentence of a summary (split on `". "`), trailing period stripped. */
function firstSentence(s: string): string {
  const idx = s.indexOf(". ");
  const head = idx >= 0 ? s.slice(0, idx) : s.replace(/\.\s*$/, "");
  return head.trim();
}

function sha256OfBuffer(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

// ---- assembly model ----

interface MoldPhaseEntry {
  phase: number;
  kind: "mold";
  skill: string;
  cast_present: boolean;
  loop: boolean;
}

interface BranchPhaseEntry {
  phase: number;
  kind: "branch";
  pattern: string;
  chain: string[];
  cast_present: (boolean | null)[];
}

type AssemblyPhase = MoldPhaseEntry | BranchPhaseEntry;

const SUPPORTED_BRANCH_PATTERNS = new Set(["test-data-resolution"]);

interface Assembled {
  skill: string;
  assemblyPhases: AssemblyPhase[];
  errors: string[];
}

function assemble(
  slug: string,
  harnessName: string,
  pipelineMeta: Frontmatter,
  parsed: ParsedPhase[],
  metaByPath: Map<string, Frontmatter>,
  repoRoot: string,
): Assembled {
  const errors: string[] = [];
  const title = scalar(pipelineMeta.title);
  const summary = scalar(pipelineMeta.summary);
  const revision = typeof pipelineMeta.revision === "number" ? pipelineMeta.revision : 0;
  const harnessNotes = Array.isArray(pipelineMeta.harness_notes)
    ? (pipelineMeta.harness_notes as unknown[]).filter((n): n is string => typeof n === "string")
    : [];

  const moldSummary = (moldPath: string | null): string =>
    moldPath ? scalar(metaByPath.get(moldPath)?.summary) : "";
  const loopEndstate = (moldPath: string | null): string => {
    const e = moldPath ? scalar(metaByPath.get(moldPath)?.loop_endstate) : "";
    return e || "Re-invoke until it reports no remaining work, then continue.";
  };

  // Per-phase render + assembly entry.
  const phaseLines: string[] = [];
  const assemblyPhases: AssemblyPhase[] = [];
  let moldCast = 0;
  let moldManual = 0;
  let hasManual = false;

  parsed.forEach((p, i) => {
    const n = i + 1;
    if (p.kind === "mold") {
      const skill = p.moldSlug ?? "(unresolved)";
      const cast = p.moldPath ? castPresent(repoRoot, skill) : false;
      if (cast) moldCast++;
      else {
        moldManual++;
        hasManual = true;
      }
      assemblyPhases.push({ phase: n, kind: "mold", skill, cast_present: cast, loop: p.loop });
      phaseLines.push(
        renderMoldLine(n, skill, p.loop, cast, moldSummary(p.moldPath), loopEndstate(p.moldPath)),
      );
    } else if (p.kind === "branch") {
      if (!SUPPORTED_BRANCH_PATTERNS.has(p.pattern)) {
        errors.push(
          `phases[${i}]: unsupported branch pattern '${p.pattern}' — only ${[...SUPPORTED_BRANCH_PATTERNS].join(", ")} render today (no inline pipeline uses the others yet)`,
        );
        return;
      }
      hasManual = true;
      const chain = p.items.map((it) => (it.sentinel ? it.raw : (it.moldSlug ?? "(unresolved)")));
      const castArr = p.items.map((it) =>
        it.sentinel ? null : it.moldPath ? castPresent(repoRoot, it.moldSlug!) : false,
      );
      assemblyPhases.push({
        phase: n,
        kind: "branch",
        pattern: p.pattern,
        chain,
        cast_present: castArr,
      });
      phaseLines.push(renderBranchLines(n, p, metaByPath, repoRoot));
    } else {
      errors.push(`phases[${i}]: unknown phase kind (keys: ${p.keys.join(",")}) — cannot assemble`);
    }
  });

  const intro = moldManual > moldCast;
  const skill = renderSkill({
    harnessName,
    slug,
    title,
    summary,
    revision,
    intro,
    phaseLines,
    hasManual,
    harnessNotes,
  });

  return { skill, assemblyPhases, errors };
}

// ---- SKILL.md rendering ----

function renderMoldLine(
  n: number,
  skill: string,
  loop: boolean,
  cast: boolean,
  summary: string,
  loopEndstate: string,
): string {
  const head = `${n}. **${skill}**${loop ? " (loop)" : ""} — `;
  if (cast && loop) {
    return `${head}invoke the \`${skill}\` skill, once per step. ${loopEndstate}`;
  }
  if (cast) {
    return `${head}invoke the \`${skill}\` skill. ${summary}`;
  }
  // Un-cast → MANUAL checkpoint. Summary is used verbatim (no reshaping).
  const intent = summary || "(no summary)";
  if (loop) {
    return `${head}MANUAL — \`${skill}\` is not yet cast. ${intent} ${loopEndstate}`;
  }
  return `${head}MANUAL — \`${skill}\` is not yet cast. ${intent} Do this by hand and confirm before continuing.`;
}

function renderBranchLines(
  n: number,
  phase: Extract<ParsedPhase, { kind: "branch" }>,
  metaByPath: Map<string, Frontmatter>,
  repoRoot: string,
): string {
  const lines = [
    `${n}. **${phase.pattern}** (branch) — resolve in order; stop at the first that yields acceptable output:`,
  ];
  phase.items.forEach((it, j) => {
    const prefix = j === 0 ? "Try" : "Otherwise try";
    if (it.sentinel) {
      lines.push(
        `   - **${it.raw}** — if nothing above yields acceptable output, ask the user to supply it directly.`,
      );
      return;
    }
    const summary = it.moldPath ? scalar(metaByPath.get(it.moldPath)?.summary) : "";
    const cast = it.moldPath ? castPresent(repoRoot, it.moldSlug!) : false;
    if (cast) {
      lines.push(`   - ${prefix} \`${it.moldSlug}\` — ${summary}`);
    } else {
      lines.push(
        `   - ${prefix} \`${it.moldSlug}\` (MANUAL — not yet cast). ${summary} Do this by hand.`,
      );
    }
  });
  return lines.join("\n");
}

function renderSkill(args: {
  harnessName: string;
  slug: string;
  title: string;
  summary: string;
  revision: number;
  intro: boolean;
  phaseLines: string[];
  hasManual: boolean;
  harnessNotes: string[];
}): string {
  const description = `${firstSentence(args.summary)} — orchestrates the Foundry skills of the ${args.title} pipeline in order, in a per-run working directory.`;
  const doneTail = args.hasManual ? " and any phases handled manually (marked MANUAL above)" : "";
  const notes = [
    "- Do not re-implement any skill's internal logic here; this harness only sequences and routes.",
    "- Carry unresolved assumptions forward as notes rather than inventing missing inputs.",
    ...args.harnessNotes.map((note) => `- ${note}`),
  ];

  const blocks: string[] = [
    "---",
    `name: ${args.harnessName}`,
    `description: "${description}"`,
    "---",
    "",
    `# ${args.harnessName}`,
    "",
    `Harness for the **${args.title}** Foundry pipeline. Runs the constituent skills in order inside a single per-run working directory. Assembled from \`content/pipelines/${args.slug}.md\` (revision ${args.revision}) — regenerate with \`foundry-build assemble-pipeline ${args.slug}\` if the pipeline changes; do not hand-edit.`,
  ];
  if (args.intro) {
    blocks.push(
      "",
      "Most of this pipeline's Molds are not yet cast, so this harness is mostly manual checkpoints today; it still fixes the phase order, the per-run working directory, and the few real casts. It strengthens as the remaining Molds are cast.",
    );
  }
  blocks.push(
    "",
    "## When To Use",
    "",
    `- ${args.summary}`,
    "",
    "## Working directory (do this first)",
    "",
    "Every constituent skill writes fixed filenames to its working directory. To keep one run's artifacts namespaced and avoid clobbering a prior run (foundry#282):",
    "",
    `1. Pick a run slug — use the harness argument if given; else ask the user for a short project name up front (the directory must exist before phase 1 writes its first artifact, so don't wait for a source title); else default \`${args.slug}-run\`.`,
    "2. Create `./<run-slug>/` in the current directory. If it exists, suffix `-2`, `-3`, … .",
    "3. Run **every** skill invocation below with `./<run-slug>/` as its working directory: **prefix every default input and output filename with `./<run-slug>/`** when you invoke the skill. The skills preserve their declared basenames and honor a harness-supplied directory; you supply the prefix on **both reads and writes**, so each phase finds the prior phase's output and nothing lands in the repo root.",
    "",
    "Announce the chosen directory before starting.",
    "",
    "## Pipeline",
    "",
    "Run these phases in order. After each, confirm the expected artifact exists in the run directory before advancing.",
    "",
    ...args.phaseLines,
    "",
    "## Done",
    "",
    `Report the final artifacts in \`./<run-slug>/\`${doneTail}.`,
    "",
    "## Notes",
    "",
    ...notes,
    "",
  );
  return blocks.join("\n");
}

// ---- _assembly.json rendering ----

/** Spaced-compact serializer: objects `{ "k": v, … }`, arrays `[v, …]`, on one line. */
function compactValue(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(compactValue).join(", ")}]`;
  if (v && typeof v === "object") {
    const parts = Object.entries(v).map(([k, val]) => `${JSON.stringify(k)}: ${compactValue(val)}`);
    return `{ ${parts.join(", ")} }`;
  }
  return JSON.stringify(v);
}

function renderAssembly(
  slug: string,
  harnessName: string,
  revision: number,
  phases: AssemblyPhase[],
): string {
  const lines = [
    "{",
    `  "source_pipeline": ${JSON.stringify(slug)},`,
    `  "source_revision": ${revision},`,
    `  "harness_name": ${JSON.stringify(harnessName)},`,
    `  "phases": [`,
    ...phases.map((p, i) => `    ${compactValue(p)}${i < phases.length - 1 ? "," : ""}`),
    "  ]",
    "}",
    "",
  ];
  return lines.join("\n");
}

// ---- reconcile ----

function reconcile(
  filePath: string,
  expected: string,
  check: boolean,
  label: string,
): { drift?: string } {
  const exists = existsSync(filePath);
  const currentHash = exists ? sha256(filePath) : null;
  if (currentHash === sha256OfBuffer(expected)) return {};
  if (!check) {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, expected);
  }
  return {
    drift: exists ? `${label} content differs from deterministic render` : `${label} missing`,
  };
}

// ---- main ----

export async function runAssemblePipelineCommand(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  if (args.root) process.chdir(args.root);
  const repoRoot = process.cwd();

  const pipelineRel = path.posix.join("content", "pipelines", `${args.slug}.md`);
  const pipelineAbs = path.join(repoRoot, pipelineRel);
  if (!existsSync(pipelineAbs)) {
    console.error(`pipeline source missing: ${pipelineRel}`);
    const available = listPipelines(repoRoot);
    if (available.length) console.error(`available pipelines: ${available.join(", ")}`);
    process.exit(2);
  }

  const parsed = readMarkdown(pipelineAbs);
  if (parsed.meta.type !== "pipeline") {
    console.error(`${pipelineRel}: type is not 'pipeline' (got ${String(parsed.meta.type)})`);
    process.exit(2);
  }
  const phases = parsed.meta.phases;
  if (!Array.isArray(phases)) {
    console.error(`${pipelineRel}: missing or non-array 'phases'`);
    process.exit(2);
  }

  const harnessName = args.harnessName ?? `pipeline-${args.slug}`;
  const { slugMap, metaByPath } = buildContentIndex(repoRoot);
  const parsedPhases = parsePhases(phases, slugMap, metaByPath, pipelineRel);

  const errors: string[] = [];
  for (const f of parsedPhases.findings) {
    if (f.severity === "error") errors.push(f.message);
  }

  const result = assemble(
    args.slug,
    harnessName,
    parsed.meta,
    parsedPhases.phases,
    metaByPath,
    repoRoot,
  );
  errors.push(...result.errors);

  const revision = typeof parsed.meta.revision === "number" ? parsed.meta.revision : 0;
  const assemblyText = renderAssembly(args.slug, harnessName, revision, result.assemblyPhases);

  for (const e of errors) console.error(`error: ${e}`);
  if (errors.length) {
    console.error(`refusing to assemble: ${errors.length} error(s)`);
    process.exit(1);
  }

  const bundleRoot = path.join(repoRoot, "casts", "claude", "skills", harnessName);
  const drift: Array<{ file: string; reason: string }> = [];
  const skillResult = reconcile(
    path.join(bundleRoot, "SKILL.md"),
    result.skill,
    args.check,
    "SKILL.md",
  );
  if (skillResult.drift) drift.push({ file: "SKILL.md", reason: skillResult.drift });
  const assemblyResult = reconcile(
    path.join(bundleRoot, "_assembly.json"),
    assemblyText,
    args.check,
    "_assembly.json",
  );
  if (assemblyResult.drift) drift.push({ file: "_assembly.json", reason: assemblyResult.drift });

  for (const d of drift) console.error(`drift: ${d.file} — ${d.reason}`);

  if (args.check) {
    if (drift.length) {
      console.error(`check failed: ${drift.length} drift(s) for ${harnessName}`);
      process.exit(1);
    }
    console.log(`clean: ${harnessName} (no drift)`);
    return;
  }

  console.log(`assembled ${path.relative(repoRoot, bundleRoot)}`);
  if (drift.length) console.log(`reconciled ${drift.length} drifted file(s)`);
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) {
  runAssemblePipelineCommand().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
