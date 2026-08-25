#!/usr/bin/env tsx
// This Foundry's `cast` command: find what a cast needs, hand it to the caster, report what
// came back.
//
// The assembly is in @galaxy-foundry/cast. What is here is the three things it cannot know — where this
// repo keeps its Molds, its targets and its reference contract; what Galaxy puts in a bundle and
// in a record; and how a CLI wants findings rendered. Assembly stays deterministic throughout:
// there is no LLM phase, so a cast is byte-stable and --check-able.
//
// Usage:
//   foundry-build cast <mold-name> [--target=claude] [--check] [--note="..."]

import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  bulletSection,
  refRows,
  runtimeProcedureBody,
  scalar,
  sentence,
  skillSummary,
  stripWikiLinks,
  type CastHooks,
  type ProvenanceRefEntry,
} from "@galaxy-foundry/cast";
import { castCommand, type CastCommandSpec } from "@galaxy-foundry/cast/command";
import {
  DEFINITIONS,
  requireRuntimeArtifactRegistry,
  type RuntimeArtifactRegistry,
} from "@galaxy-foundry/note-schema";

import type {
  ProvenanceArtifactInput,
  ProvenanceArtifactOutput,
  ProvenanceArtifacts,
} from "../lib/artifact-contract.js";
import { readMarkdown } from "../lib/frontmatter.js";
import { aggregateRequiredTools, requiredToolRows } from "../lib/required-tools.js";
import { validateRuns } from "../lib/runs-check.js";
import { buildSlugMap, GALAXY_SLUG_ALIASES } from "../lib/slug-map.js";
import type { Frontmatter } from "../lib/types.js";
import { fileSlug } from "../lib/walk.js";
import { resolveWikiLink } from "../lib/wiki-links.js";

// ---- the sidecar this Foundry renders ----

interface CliSidecar {
  type: "cli-command";
  tool: string;
  command: string;
  summary?: string;
  source_path: string;
  source_revision?: number;
  package?: string;
  description?: string;
  synopsis?: string;
  args?: unknown[];
  options?: unknown[];
  body: string;
}

interface CliCommandMeta {
  name: string;
  description?: string;
  synopsis?: string;
  args?: unknown[];
  options?: unknown[];
}

// Resolve a command's args/options/synopsis from the package's `meta` subpath
// (the same browser-safe spec the CLI's commander program and --help are built
// from). Mirrors the schema package-import path: the package is the single
// source of CLI surface text, so the note body never restates it. Returns null
// when the package ships no `meta` subpath or doesn't carry this command, in
// which case the sidecar falls back to body-only (e.g. planemo).
async function resolveCliCommandMeta(
  pkg: string,
  tool: string,
  command: string,
): Promise<CliCommandMeta | null> {
  let mod: Record<string, unknown>;
  try {
    mod = (await import(`${pkg}/meta`)) as Record<string, unknown>;
  } catch {
    return null;
  }
  for (const value of Object.values(mod)) {
    if (
      value &&
      typeof value === "object" &&
      (value as { name?: unknown }).name === tool &&
      Array.isArray((value as { commands?: unknown }).commands)
    ) {
      const cmd = (value as { commands: CliCommandMeta[] }).commands.find(
        (c) => c.name === command,
      );
      if (cmd) return cmd;
    }
  }
  return null;
}

async function buildCliSidecar(
  srcAbs: string,
  srcRel: string,
  meta: Frontmatter,
): Promise<CliSidecar> {
  const parsed = readMarkdown(srcAbs);
  const tool = typeof meta.tool === "string" ? meta.tool : "";
  const command = typeof meta.command === "string" ? meta.command : "";
  const pkg = typeof meta.package === "string" ? meta.package : undefined;
  const cmd = pkg ? await resolveCliCommandMeta(pkg, tool, command) : null;
  const sidecar: CliSidecar = {
    type: "cli-command",
    tool,
    command,
    summary: typeof meta.summary === "string" ? meta.summary : undefined,
    source_path: srcRel,
    source_revision: typeof meta.revision === "number" ? meta.revision : undefined,
    ...(cmd
      ? {
          package: pkg,
          description: cmd.description,
          synopsis: cmd.synopsis,
          args: cmd.args ?? [],
          options: cmd.options ?? [],
        }
      : {}),
    body: parsed.body.trim(),
  };
  return sidecar;
}

/**
 * What this instance attaches to the caster.
 *
 * `sidecar` renders a planemo command description: the note's body plus, when the note names a
 * `package`, the argument and option metadata that package publishes. Nothing about that is
 * general — it is this repo's knowledge of how Galaxy's CLI tooling describes itself, which is
 * exactly why it is registered here rather than living inside the dispatch.
 */
const GALAXY_HOOKS: CastHooks = {
  renderers: {
    sidecar: async ({ srcAbs, srcRel, meta }) =>
      JSON.stringify(await buildCliSidecar(srcAbs, srcRel, meta), null, 2) + "\n",
  },
  bundleFiles: [
    // Runtime feedback protocol, single-sourced from the registry's protocol note.
    ({ metaByPath }) => {
      const runtime = runtimeArtifactsByCorpus.get(metaByPath);
      const content = runtime?.protocolBodies.get("foundry-feedback-ledger") ?? null;
      return [
        {
          path: "_feedback.md",
          content,
          absentReason: "stale feedback protocol (runtime artifact not registered)",
        },
      ];
    },
    // Which Galaxy tools a skill needs installed before it can run.
    ({ refs, metaByPath, slugMap }) => {
      const tools = aggregateRequiredTools([...refs], metaByPath, slugMap);
      return [
        {
          path: "_required_tools.json",
          content: tools.length ? JSON.stringify(tools, null, 2) + "\n" : null,
          absentReason: "stale manifest (no tools required)",
        },
      ];
    },
    // How to check an artifact this skill produced — which validator, invoked how.
    ({ meta, metaByPath, slugMap }) => [
      {
        path: "_verify.json",
        content:
          JSON.stringify(
            buildVerifyManifest(meta, producerIndexFor(metaByPath), slugMap, metaByPath),
            null,
            2,
          ) + "\n",
      },
    ],
  ],
  skillLede:
    "Follow the procedure below and use the artifact/reference sections as the runtime contract.",
  skillSections: ({ moldName, meta, body, noun, refs, metaByPath, slugMap }) => {
    const summary = skillSummary(meta, moldName, noun);
    const artifacts = readArtifactContracts(meta, producerIndexFor(metaByPath));
    const produces = artifacts?.produces ?? [];
    const runtime = refs.filter((r) => r.used_at !== "cast-time");
    const feedback = runtimeArtifactsByCorpus
      .get(metaByPath)
      ?.registry.artifacts.get("foundry-feedback-ledger");
    const requiresFeedback =
      Array.isArray(meta.input_artifacts) &&
      meta.input_artifacts.some(
        (artifact) =>
          artifact &&
          typeof artifact === "object" &&
          (artifact as { id?: unknown }).id === "foundry-feedback-ledger",
      );
    const describe = { kindLabel: refKindLabel, modePhrase: refModePhrase };
    const procedure = runtimeProcedureBody(body, moldName, noun);
    return [
      bulletSection("When To Use", [`- ${stripWikiLinks(summary)}`]),
      bulletSection(
        "Inputs",
        artifactRows(artifacts?.consumes ?? [], "input"),
        "- No upstream artifact inputs declared. See the procedure for user-supplied runtime inputs.",
      ),
      bulletSection("Outputs", artifactRows(produces, "output")),
      bulletSection(
        "Required Tools",
        requiredToolRows(aggregateRequiredTools([...refs], metaByPath, slugMap)),
        "- None declared. Procedure should not assume external CLIs are present.",
      ),
      bulletSection(
        "Load Upfront",
        refRows(
          runtime.filter((r) => r.load === "upfront"),
          describe,
        ),
      ),
      bulletSection(
        "Load On Demand",
        refRows(
          runtime.filter((r) => r.load === "on-demand"),
          describe,
        ),
      ),
      bulletSection("Validation", schemaValidationRows(produces, slugMap, metaByPath)),
      { title: "Procedure", body: procedure || "No Mold body supplied." },
      ...(feedback
        ? [
            bulletSection("Feedback Mode", [
              requiresFeedback
                ? `- This skill requires \`${feedback.default_filename}\`; read \`_feedback.md\` before doing the work even when the caller did not invoke a pipeline with \`--${feedback.producer.option}\`.`
                : `- Feedback mode is off unless the caller explicitly enables \`--${feedback.producer.option}\` or supplies a feedback-ledger path.`,
              ...(requiresFeedback
                ? []
                : [
                    `- When enabled, read \`_feedback.md\` before doing the work and use its registered \`${feedback.default_filename}\` protocol.`,
                  ]),
              "- Preserve harness-owned run and phase state. Append only concrete, upstreamable observations about canonical Foundry source assets; do not put ordinary workflow requirements in this ledger.",
              "- Pass the same ledger path to any subagent used for this work, and merge updates serially so one writer cannot overwrite another.",
            ]),
          ]
        : []),
      // Contributed whole rather than appended to a generic closing note. Two of the three
      // bullets name artifacts, and an instance that inherited the third would be unable to
      // reword or reorder around its own.
      bulletSection("Runtime Notes", [
        "- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.",
        "- Preserve declared artifact filenames unless the user or harness supplies explicit paths.",
        "- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.",
      ]),
    ];
  },
  // Which npm module a `package-export` ref means. It has to be imported from HERE: a bare
  // `import(spec)` resolves relative to the file that runs it, and @galaxy-foundry/cast is
  // installed somewhere this repo's own packages are not visible from. Written in this tree,
  // resolution starts in this tree.
  packageLoader: (spec) => import(spec) as Promise<Record<string, unknown>>,
  bundleChecks: [
    // Harvested sample runs, against the schema this Mold declares for its OWN output. Not
    // against whichever schema ref happens to come first: a Mold's runs contain what that Mold
    // produces, and only `output_artifacts[].schema` states which schema that is.
    ({ meta, refs, metaByPath, bundleRoot }) => {
      const declared = new Set(
        (readArtifactContracts(meta, producerIndexFor(metaByPath))?.produces ?? [])
          .map((o) => o.schema)
          .filter((s): s is string => !!s),
      );
      const schemaRef = refs.find((r) => r.kind === "schema" && declared.has(r.ref));
      if (!schemaRef) return [];
      const schemaAbs = path.join(bundleRoot, schemaRef.dst);
      return existsSync(schemaAbs) ? validateRuns(bundleRoot, schemaAbs) : [];
    },
  ],
};

// ---- provenance ----
//
// The record's shape ships in @galaxy-foundry/cast. What stays here is what this Foundry puts
// IN it: which artifacts a Mold declares, which producer feeds which input, and what its
// validators reported.

interface ProducerInfo {
  schema?: string;
  kind?: string;
  default_filename?: string;
  producers: string[];
  hasSchemaGap?: boolean;
}

export interface VerifyManifestEntry {
  artifact_id: string;
  direction: "input" | "output";
  kind?: string;
  default_filename?: string;
  schema: string;
  validator_bin: string;
  args: string[];
}

export interface VerifyManifest {
  verify_schema_version: 1;
  entries: VerifyManifestEntry[];
}

const producerIndexCache = new WeakMap<
  ReadonlyMap<string, Frontmatter>,
  Map<string, ProducerInfo>
>();
interface RuntimeArtifactContext {
  registry: RuntimeArtifactRegistry;
  protocolBodies: ReadonlyMap<string, string>;
}

const runtimeArtifactsByCorpus = new WeakMap<
  ReadonlyMap<string, Frontmatter>,
  RuntimeArtifactContext
>();

/**
 * The producer index for a corpus, built once per corpus.
 *
 * Three contributors want it — the verify manifest, the artifact contracts, the runs check — and
 * each would otherwise walk every note again. Keyed on the map itself rather than memoized into
 * a module variable, so a test casting against two fixture corpora in one process gets the index
 * for the corpus it asked about.
 */
function producerIndexFor(metaByPath: ReadonlyMap<string, Frontmatter>): Map<string, ProducerInfo> {
  const cached = producerIndexCache.get(metaByPath);
  if (cached) return cached;
  const built = buildProducerIndex(metaByPath, runtimeArtifactsByCorpus.get(metaByPath)?.registry);
  producerIndexCache.set(metaByPath, built);
  return built;
}

export function buildProducerIndex(
  metaByPath: ReadonlyMap<string, Frontmatter>,
  runtimeArtifacts?: RuntimeArtifactRegistry,
): Map<string, ProducerInfo> {
  const idx = new Map<string, ProducerInfo>();
  for (const [rel, meta] of metaByPath) {
    if (meta.type !== "mold") continue;
    const producerSlug = fileSlug(rel);
    const out = meta.output_artifacts;
    if (!Array.isArray(out)) continue;
    for (const a of out) {
      if (!a || typeof a !== "object") continue;
      const o = a as Record<string, unknown>;
      if (typeof o.id !== "string") continue;
      const info = idx.get(o.id) ?? { producers: [] };
      info.producers.push(producerSlug);
      if (typeof o.kind === "string" && !info.kind) info.kind = o.kind;
      if (typeof o.default_filename === "string" && !info.default_filename) {
        info.default_filename = o.default_filename;
      }
      const schema = typeof o.schema === "string" ? o.schema : undefined;
      if (!schema) {
        info.schema = undefined;
        info.hasSchemaGap = true;
      } else if (!info.hasSchemaGap) {
        if (info.schema && info.schema !== schema) {
          info.schema = undefined; // disagreement — drop the inherited hint
        } else {
          info.schema = schema;
        }
      }
      idx.set(o.id, info);
    }
  }
  for (const [id, artifact] of runtimeArtifacts?.artifacts ?? []) {
    if (idx.has(id)) {
      throw new Error(`runtime artifact '${id}' collides with a Mold output producer`);
    }
    idx.set(id, {
      producers: [`runtime:${artifact.producer.option}`],
      kind: artifact.kind,
      default_filename: artifact.default_filename,
    });
  }
  return idx;
}

interface ValidatorInvocation {
  bin: string;
  args: string[];
}

function schemaValidatorInvocation(
  schemaRef: string,
  slugMap: ReadonlyMap<string, string>,
  metaByPath: ReadonlyMap<string, Frontmatter>,
): ValidatorInvocation | undefined {
  const target = resolveWikiLink(schemaRef, slugMap);
  if (!target) return undefined;
  const meta = metaByPath.get(target);
  const bin = typeof meta?.validator_bin === "string" ? meta.validator_bin : undefined;
  if (!bin) return undefined;
  const sub =
    typeof meta?.validator_subcommand === "string" ? meta.validator_subcommand : undefined;
  return { bin, args: sub ? [sub, "{artifact_path}"] : ["{artifact_path}"] };
}

export function buildVerifyManifest(
  meta: Frontmatter,
  producerIndex: Map<string, ProducerInfo>,
  slugMap: ReadonlyMap<string, string>,
  metaByPath: ReadonlyMap<string, Frontmatter>,
): VerifyManifest {
  const entries: VerifyManifestEntry[] = [];
  const rawOut = meta.output_artifacts;
  if (Array.isArray(rawOut)) {
    for (const a of rawOut) {
      if (!a || typeof a !== "object") continue;
      const o = a as Record<string, unknown>;
      if (typeof o.id !== "string" || typeof o.schema !== "string") continue;
      const inv = schemaValidatorInvocation(o.schema, slugMap, metaByPath);
      if (!inv) continue;
      entries.push({
        artifact_id: o.id,
        direction: "output",
        kind: typeof o.kind === "string" ? o.kind : undefined,
        default_filename: typeof o.default_filename === "string" ? o.default_filename : undefined,
        schema: o.schema,
        validator_bin: inv.bin,
        args: inv.args,
      });
    }
  }
  const rawIn = meta.input_artifacts;
  if (Array.isArray(rawIn)) {
    for (const a of rawIn) {
      if (!a || typeof a !== "object") continue;
      const o = a as Record<string, unknown>;
      if (typeof o.id !== "string") continue;
      const producer = producerIndex.get(o.id);
      if (!producer?.schema) continue;
      const inv = schemaValidatorInvocation(producer.schema, slugMap, metaByPath);
      if (!inv) continue;
      entries.push({
        artifact_id: o.id,
        direction: "input",
        kind: producer.kind,
        default_filename: producer.default_filename,
        schema: producer.schema,
        validator_bin: inv.bin,
        args: inv.args,
      });
    }
  }
  entries.sort((a, b) =>
    a.direction === b.direction
      ? a.artifact_id.localeCompare(b.artifact_id)
      : a.direction.localeCompare(b.direction),
  );
  return { verify_schema_version: 1, entries };
}

export function readArtifactContracts(
  meta: Frontmatter,
  producerIndex: Map<string, ProducerInfo>,
): ProvenanceArtifacts | undefined {
  const out: ProvenanceArtifactOutput[] = [];
  const inp: ProvenanceArtifactInput[] = [];
  const rawOut = meta.output_artifacts;
  if (Array.isArray(rawOut)) {
    for (const a of rawOut) {
      if (!a || typeof a !== "object") continue;
      const o = a as Record<string, unknown>;
      if (typeof o.id !== "string") continue;
      out.push({
        id: o.id,
        kind: typeof o.kind === "string" ? o.kind : "other",
        default_filename: typeof o.default_filename === "string" ? o.default_filename : "",
        schema: typeof o.schema === "string" ? o.schema : undefined,
        description: typeof o.description === "string" ? o.description : "",
      });
    }
  }
  const rawIn = meta.input_artifacts;
  if (Array.isArray(rawIn)) {
    for (const a of rawIn) {
      if (!a || typeof a !== "object") continue;
      const o = a as Record<string, unknown>;
      if (typeof o.id !== "string") continue;
      const info = producerIndex.get(o.id);
      inp.push({
        id: o.id,
        description: typeof o.description === "string" ? o.description : "",
        inherited_schema: info?.schema,
        producers: info && info.producers.length > 0 ? [...info.producers].sort() : undefined,
      });
    }
  }
  if (out.length === 0 && inp.length === 0) return undefined;
  return { produces: out, consumes: inp };
}

// The license → redistribution-policy check ships in @galaxy-foundry/cast. What stays this
// Foundry's is the license_file PRESENCE rule — which notes must declare one at all — because
// only the validator's `upstream` scoping can tell a Foundry-authored license annotation from
// genuine third-party redistribution.

// ---- this Foundry's vocabulary, as a skill document reads it ----
//
// The document's shape ships in @galaxy-foundry/cast. What is here is the nouns that go in it —
// what a kind is called, what a mode did to a file, how an artifact handoff reads as a line.
// Every one of them is Galaxy's, which is why they are arguments to the row builders rather
// than branches inside them.

/**
 * How this instance's kinds read in prose.
 *
 * Every name here is Galaxy's — a Foundry of research notes has no schemas and no CLI tools, and
 * would answer this question with its own nouns. Passed to `refRows` rather than consulted
 * inside it for the same reason a renderer is passed to the dispatch: the shape of a reference
 * row is general, the vocabulary in it is not.
 */
function refKindLabel(ref: ProvenanceRefEntry): string {
  if (ref.companion_of) return "Companion file";
  if (ref.kind === "schema") return "Schema file";
  if (ref.kind === "research") return "Research note";
  if (ref.kind === "pattern") return "Pattern note";
  if (ref.kind === "cli-tool") return "CLI tool reference";
  if (ref.kind === "cli-command") return "CLI command reference";
  return `${ref.kind} reference`;
}

/** How this instance's modes read in prose. Same reasoning as `refKindLabel`. */
function refModePhrase(ref: ProvenanceRefEntry): string {
  return ref.mode === "sidecar" ? "packaged as a sidecar" : "copied verbatim into the bundle";
}

function artifactRows(
  artifacts: ProvenanceArtifactOutput[] | ProvenanceArtifactInput[],
  direction: "input" | "output",
): string[] {
  return artifacts.map((a) => {
    const filename =
      "default_filename" in a && a.default_filename ? `\`${a.default_filename}\`` : undefined;
    const action = direction === "output" ? "Write" : "Read";
    const parts = [`- ${action} artifact \`${a.id}\`${filename ? ` as ${filename}` : ""}.`];
    if ("kind" in a && a.kind) parts.push(`Format: \`${a.kind}\`.`);
    const schema =
      "schema" in a ? a.schema : "inherited_schema" in a ? a.inherited_schema : undefined;
    if (schema) parts.push(`Schema: ${stripWikiLinks(schema)}.`);
    if ("producers" in a && a.producers?.length) {
      parts.push(`Produced by ${a.producers.map((p) => `\`${p}\``).join(", ")}.`);
    }
    if (a.description) parts.push(sentence(a.description));
    return parts.join(" ");
  });
}

function schemaValidationRows(
  outputs: ProvenanceArtifactOutput[],
  slugMap: ReadonlyMap<string, string>,
  metaByPath: ReadonlyMap<string, Frontmatter>,
): string[] {
  const rows: string[] = [];
  for (const output of outputs) {
    if (!output.schema) continue;
    const target = resolveWikiLink(output.schema, slugMap);
    const meta = target ? metaByPath.get(target) : undefined;
    const validator = scalar(meta?.validator_bin);
    const subcommand = scalar(meta?.validator_subcommand);
    const command = validator && subcommand ? `${validator} ${subcommand}` : validator;
    // The package that ships the bin, which the note declares when it differs from the
    // package the export comes from. Inferring it from "has a subcommand" hardcoded one
    // instance's CLI package name in the caster, and was wrong in principle for any Foundry
    // whose multi-command validator is not called @galaxy-foundry/foundry.
    const validatorPackage = scalar(meta?.validator_package) ?? scalar(meta?.package);
    const schemaName = stripWikiLinks(output.schema);
    const file = output.default_filename
      ? `\`${output.default_filename}\``
      : "the emitted artifact";
    rows.push(
      validator
        ? `- Validate ${file} before returning it: run \`${command} ${output.default_filename ?? "<artifact-path>"}\`${validatorPackage ? ` from \`${validatorPackage}\`` : ""}. ${validatorPackage ? `If the command is not on PATH, run \`npx --package ${validatorPackage} ${command} ${output.default_filename ?? "<artifact-path>"}\`. ` : ""}This checks artifact \`${output.id}\` against the ${schemaName} schema.`
        : `- Validate ${file} for artifact \`${output.id}\` against the ${schemaName} schema when a validator is available.`,
    );
  }
  return rows;
}

// ---- main ----

/**
 * Turn a cast's findings into stderr lines and an exit code.
 *
 * Every finding is printed before any verdict, so a reader sees what happened before being told
 * what it added up to. `wrote` is consulted rather than re-deriving the publish rule from
 * `errors`: whether a bundle was written is the caster's decision, and a second copy of that
 * decision here could only ever disagree with the first.
 */
/**
 * What this Foundry contributes to a cast.
 *
 * Flags, target and contract loading, the Mold's own file, and which of four endings a run had
 * are all the same for any Foundry that casts, and live in the package. What is left here is what
 * only this one can answer.
 *
 * A named value rather than a literal inside the command, because there are two commands now:
 * `cast` for one Mold and `cast-all` for the corpus. Two copies of it would be two chances to
 * disagree about what this Foundry is.
 */
function buildGalaxyCorpus(repoRoot: string) {
  const corpus = buildSlugMap(repoRoot, GALAXY_SLUG_ALIASES);
  const registry = requireRuntimeArtifactRegistry(path.join(repoRoot, "runtime_artifacts.yml"));
  const protocolBodies = new Map<string, string>();
  for (const [id, artifact] of registry.artifacts) {
    const protocolPath = resolveWikiLink(artifact.protocol, corpus.slugMap);
    if (!protocolPath) {
      throw new Error(
        `runtime_artifacts.yml: artifacts.${id}.protocol ${artifact.protocol} did not resolve`,
      );
    }
    const absolute = path.isAbsolute(protocolPath)
      ? protocolPath
      : path.join(repoRoot, protocolPath);
    protocolBodies.set(id, `${readMarkdown(absolute).body.trim()}\n`);
  }
  runtimeArtifactsByCorpus.set(corpus.metaByPath, { registry, protocolBodies });
  return corpus;
}

export const GALAXY_CAST_SPEC: CastCommandSpec<{ artifacts?: ProvenanceArtifacts }> = {
  usage: "foundry-build cast",
  defaultTarget: "claude",
  hooks: GALAXY_HOOKS,
  corpus: buildGalaxyCorpus,
  // Which siblings of a referenced note travel into the bundle. The kind definitions are handed
  // over whole rather than projected onto a casting-shaped copy: `shape`, `companions` and
  // `additionalCompanions` are the same declarations the validator and the site read, and a
  // projection here would be a second thing to keep in step.
  kindLayouts: DEFINITIONS,
  // What this Foundry records in the slot the record reserves beside `refs`. A Mold that
  // declares no handoff supplies `undefined` and the key is simply absent — which is also what
  // a Foundry with no artifacts at all gets, by passing no extensions.
  extensions: ({ meta, corpus }) => ({
    artifacts: readArtifactContracts(meta, producerIndexFor(corpus.metaByPath)),
  }),
};

export async function runCastMoldCommand(argv = process.argv.slice(2)): Promise<void> {
  await castCommand<{ artifacts?: ProvenanceArtifacts }>(argv, GALAXY_CAST_SPEC);
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) {
  runCastMoldCommand().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
