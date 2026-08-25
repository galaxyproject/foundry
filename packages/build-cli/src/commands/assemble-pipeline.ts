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

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { readMarkdown } from "../lib/frontmatter.js";
import { parsePhases, phaseMoldPaths, type ParsedPhase } from "../lib/pipeline-phases.js";
import { reconcileText } from "../lib/reconcile.js";
import { buildSlugMap, GALAXY_SLUG_ALIASES } from "../lib/slug-map.js";
import { bundleDir } from "../lib/target-layout.js";
import {
  aggregateRequiredTools,
  moldCliRefs,
  requiredToolRows,
  type RequiredTool,
  type RequiredToolRef,
} from "../lib/required-tools.js";
import {
  requireRuntimeArtifactRegistry,
  type RuntimeArtifactDefinition,
} from "@galaxy-foundry/note-schema";
import type { Frontmatter } from "../lib/types.js";

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

function listPipelines(repoRoot: string): string[] {
  const dir = path.join(repoRoot, "content", "pipelines");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => existsSync(path.join(dir, f, "index.md")))
    .sort();
}

// ---- helpers ----

function castPresent(repoRoot: string, moldSlug: string): boolean {
  return existsSync(path.join(bundleDir(repoRoot, "claude", moldSlug), "SKILL.md"));
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

// Runtime invocation options every assembled harness honors. Uniform across
// pipelines (#291): documented as prose in `## Run options` and surfaced in
// `_assembly.json` for the site / future visualization tooling.
const BASE_HARNESS_OPTIONS = ["use-subagents", "checkpoint"] as const;

function harnessOptions(feedback?: RuntimeArtifactDefinition): string[] {
  return [...BASE_HARNESS_OPTIONS, ...(feedback ? [feedback.producer.option] : [])];
}

function runOptionsSection(feedback?: RuntimeArtifactDefinition): string[] {
  return [
    "## Run options",
    "",
    "Optional flags, given as leading arguments. Strip any you recognize; treat the remaining positional argument as the run slug. All default off and compose.",
    "",
    "- `--use-subagents` — run each cast phase in its own subagent to keep this orchestrator's context small. For each phase whose skill is cast, spawn a subagent, tell it the run directory and to invoke the named skill with every default filename prefixed by `./<run-slug>/`, and have it return a short report (artifacts written, assumptions, status) rather than its full transcript; carry only that report forward. A cast loop phase runs **one subagent per iteration** — each advances a single step and returns its done-signal, and you inspect that signal to decide whether to spawn the next iteration. Branch phases run their whole fallback chain in one subagent. MANUAL (un-cast) phases are never delegated — including MANUAL loop phases — so handle those yourself regardless of the per-iteration rule above.",
    "- `--checkpoint` — commit after every phase so the run directory's git history is a per-step record (a data source for workflow-implementation visualizations). When set, `git init ./<run-slug>/` during working-directory setup — this is a standalone per-run repo; do not add it to any surrounding repo you are working inside. Then after each phase's artifact is confirmed run `git -C ./<run-slug>/ add -A && git -C ./<run-slug>/ commit -m \"phase <n>: <skill>\"`. Loop phases commit **once per iteration** (`phase <n> step <k>: <skill>`); for a MANUAL loop, commit once per by-hand step. With `--use-subagents`, the subagent does the work and returns; you make the commit.",
    ...(feedback
      ? [
          `- \`--${feedback.producer.option}\` — create \`./<run-slug>/${feedback.default_filename}\` before phase 1. Copy the complete top-level roster from \`_assembly.json\` with \`run.status: running\` and every phase \`pending\`; set a phase \`running\` immediately before it starts and \`done\` after success. Keep one row per loop and increment \`iterations\`; record a branch's chosen path as \`selected\`. Pass the same ledger path to every skill and subagent. On a terminating error mark the phase and run \`failed\`; on a graceful stop mark the run \`cancelled\`; after every intended phase is done mark the run \`complete\`. Never describe an empty incomplete ledger as a clean run.`,
        ]
      : []),
    "",
  ];
}

interface Assembled {
  skill: string;
  assemblyPhases: AssemblyPhase[];
  requiredTools: RequiredTool[];
  errors: string[];
}

function assemble(
  slug: string,
  harnessName: string,
  pipelineMeta: Frontmatter,
  parsed: ParsedPhase[],
  metaByPath: ReadonlyMap<string, Frontmatter>,
  slugMap: ReadonlyMap<string, string>,
  repoRoot: string,
  feedback?: RuntimeArtifactDefinition,
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

  // Bootstrap rollup: union every member Mold's cli-tool/cli-command refs
  // (top-level + branch-inner), then aggregate to deduped install metadata.
  const unionRefs: RequiredToolRef[] = [];
  for (const p of parsed) {
    for (const moldPath of phaseMoldPaths(p)) {
      unionRefs.push(...moldCliRefs(metaByPath.get(moldPath), slugMap));
    }
  }
  const requiredTools = aggregateRequiredTools(unionRefs, metaByPath, slugMap);

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
    requiredTools,
    feedback,
  });

  return { skill, assemblyPhases, requiredTools, errors };
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
  metaByPath: ReadonlyMap<string, Frontmatter>,
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
  requiredTools: RequiredTool[];
  feedback?: RuntimeArtifactDefinition;
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
    `Harness for the **${args.title}** Foundry pipeline. Runs the constituent skills in order inside a single per-run working directory. Assembled from \`content/pipelines/${args.slug}/index.md\` (revision ${args.revision}) — regenerate with \`foundry-build assemble-pipeline ${args.slug}\` if the pipeline changes; do not hand-edit.`,
  ];
  if (args.intro) {
    blocks.push(
      "",
      "Most of this pipeline's Molds are not yet cast, so this harness is mostly manual checkpoints today; it still fixes the phase order, the per-run working directory, and the few real casts. It strengthens as the remaining Molds are cast.",
    );
  }
  blocks.push("", "## When To Use", "", `- ${args.summary}`);
  if (args.requiredTools.length) {
    blocks.push(
      "",
      "## Bootstrap (install these CLIs first)",
      "",
      "Install the harness CLIs every constituent skill invokes before driving the pipeline. Deduped across all phases; bioinformatics tools the constructed workflow installs are out of scope (the discovery phase pins those).",
      "",
      ...requiredToolRows(args.requiredTools),
    );
  }
  blocks.push(
    "",
    ...runOptionsSection(args.feedback),
    "## Working directory (do this first)",
    "",
    "Every constituent skill writes fixed filenames to its working directory. To keep one run's artifacts namespaced and avoid clobbering a prior run (foundry#282):",
    "",
    `1. Pick a run slug — use the harness argument if given; else ask the user for a short project name up front (the directory must exist before phase 1 writes its first artifact, so don't wait for a source title); else default \`${args.slug}-run\`.`,
    "2. Create `./<run-slug>/` in the current directory. If it exists, suffix `-2`, `-3`, … . If invoked with `--checkpoint`, run `git init ./<run-slug>/` now (see Run options).",
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
  requiredTools: RequiredTool[],
  feedback?: RuntimeArtifactDefinition,
): string {
  // JSON round-trip drops undefined-valued keys before the compact serializer.
  const tools = JSON.parse(JSON.stringify(requiredTools)) as unknown[];
  const lines = [
    "{",
    `  "source_pipeline": ${JSON.stringify(slug)},`,
    `  "source_revision": ${revision},`,
    `  "harness_name": ${JSON.stringify(harnessName)},`,
    `  "options": ${compactValue(harnessOptions(feedback))},`,
    `  "required_tools": [`,
    ...tools.map((t, i) => `    ${compactValue(t)}${i < tools.length - 1 ? "," : ""}`),
    `  ],`,
    `  "phases": [`,
    ...phases.map((p, i) => `    ${compactValue(p)}${i < phases.length - 1 ? "," : ""}`),
    "  ]",
    "}",
    "",
  ];
  return lines.join("\n");
}

// ---- main ----

export async function runAssemblePipelineCommand(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  if (args.root) process.chdir(args.root);
  const repoRoot = process.cwd();

  const pipelineRel = path.posix.join("content", "pipelines", args.slug, "index.md");
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
  const { slugMap, metaByPath } = buildSlugMap(repoRoot, GALAXY_SLUG_ALIASES);
  const runtimeArtifacts = requireRuntimeArtifactRegistry(
    path.join(repoRoot, "runtime_artifacts.yml"),
  );
  const feedback = runtimeArtifacts.artifacts.get("foundry-feedback-ledger");
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
    slugMap,
    repoRoot,
    feedback,
  );
  errors.push(...result.errors);

  const revision = typeof parsed.meta.revision === "number" ? parsed.meta.revision : 0;
  const assemblyText = renderAssembly(
    args.slug,
    harnessName,
    revision,
    result.assemblyPhases,
    result.requiredTools,
    feedback,
  );

  for (const e of errors) console.error(`error: ${e}`);
  if (errors.length) {
    console.error(`refusing to assemble: ${errors.length} error(s)`);
    process.exit(1);
  }

  const bundleRoot = bundleDir(repoRoot, "claude", harnessName);
  const drift: Array<{ file: string; reason: string }> = [];
  for (const [label, expected] of [
    ["SKILL.md", result.skill],
    ["_assembly.json", assemblyText],
  ] as const) {
    const outcome = reconcileText({
      path: path.join(bundleRoot, label),
      expected,
      label,
      check: args.check,
    });
    if (outcome.reason) drift.push({ file: label, reason: outcome.reason });
  }

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
