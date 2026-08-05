#!/usr/bin/env tsx
// This Foundry's `cast` command: find what a cast needs, hand it to the caster, report what
// came back.
//
// The assembly is in lib/caster/. What is here is the three things it cannot know — where this
// repo keeps its Molds, its targets and its reference contract; what Galaxy puts in a bundle and
// in a record; and how a CLI wants findings rendered. Assembly stays deterministic throughout:
// there is no LLM phase, so a cast is byte-stable and --check-able.
//
// Usage:
//   foundry-build cast <mold-name> [--target=claude] [--check] [--note="..."]

import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { castsTargetDir, type ProvenanceRefEntry } from "@galaxy-foundry/cast";

import { loadCastReferenceContract } from "@galaxy-foundry/note-schema";

import type {
  ProvenanceArtifactInput,
  ProvenanceArtifactOutput,
  ProvenanceArtifacts,
} from "../lib/artifact-contract.js";
import { castMold, type CastOutcome } from "../lib/caster/cast.js";
import type { CastHooks } from "../lib/caster/hooks.js";
import {
  bulletSection,
  refRows,
  runtimeProcedureBody,
  scalar,
  sentence,
  skillSummary,
  stripWikiLinks,
} from "../lib/caster/skill.js";
import { loadTargetConfig } from "../lib/caster/target.js";
import { payloadCompanionOf } from "../lib/dispositions.js";
import { errorMessage } from "../lib/errors.js";
import { readMarkdown } from "../lib/frontmatter.js";
import { sha256File } from "../lib/reconcile.js";
import { aggregateRequiredTools, requiredToolRows } from "../lib/required-tools.js";
import { validateRuns } from "../lib/runs-check.js";
import { buildSlugMap, GALAXY_SLUG_ALIASES } from "../lib/slug-map.js";
import { bundlePathOf, resolveBundlePath } from "../lib/target-layout.js";
import type { Frontmatter } from "../lib/types.js";
import { fileSlug } from "../lib/walk.js";
import { resolveWikiLink } from "../lib/wiki-links.js";

// ---- argv ----

interface Args {
  moldName: string;
  target: string;
  check: boolean;
  note: string | null;
  root: string | null;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  let target = "claude";
  let check = false;
  let note: string | null = null;
  let root: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--check") check = true;
    else if (a.startsWith("--target=")) target = a.slice("--target=".length);
    else if (a === "--target") target = argv[++i] ?? target;
    else if (a.startsWith("--note=")) note = a.slice("--note=".length);
    else if (a === "--note") note = argv[++i] ?? note;
    else if (a.startsWith("--root=")) root = a.slice("--root=".length);
    else if (a === "--root") root = argv[++i] ?? ".";
    else if (!a.startsWith("--")) positional.push(a);
    else throw new Error(`unknown flag: ${a}`);
  }
  if (positional.length !== 1) {
    throw new Error(
      'usage: foundry-build cast <mold-name> [--target=claude] [--check] [--note="..."]',
    );
  }
  return { moldName: positional[0]!, target, check, note, root };
}

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
  skillSections: ({ moldName, meta, body, refs, metaByPath, slugMap }) => {
    const summary = skillSummary(meta, moldName);
    const artifacts = readArtifactContracts(meta, producerIndexFor(metaByPath));
    const produces = artifacts?.produces ?? [];
    const runtime = refs.filter((r) => r.used_at !== "cast-time");
    const describe = { kindLabel: refKindLabel, modePhrase: refModePhrase };
    const procedure = runtimeProcedureBody(body, moldName);
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
  slugAliases: GALAXY_SLUG_ALIASES,
  // Which file a `payload-companion` kind ships instead of its note. Read off the kind's own
  // companion declarations, so a prompt bundle carries the prompt rather than the note framing
  // it — and so nothing here names the file.
  payloadCompanion: payloadCompanionOf,
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
  const built = buildProducerIndex(metaByPath);
  producerIndexCache.set(metaByPath, built);
  return built;
}

export function buildProducerIndex(
  metaByPath: ReadonlyMap<string, Frontmatter>,
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
// The document's shape ships in lib/caster/skill.ts. What is here is the nouns that go in it —
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
function reportCast(outcome: CastOutcome, check: boolean, repoRoot: string): void {
  for (const e of outcome.errors) console.error(`error: ${e}`);
  for (const d of outcome.drift) console.error(`drift: ${d.file} — ${d.reason}`);

  if (check) {
    if (outcome.errors.length || outcome.drift.length) {
      console.error(
        `check failed: ${outcome.errors.length} error(s), ${outcome.drift.length} drift(s)`,
      );
      process.exitCode = 1;
      return;
    }
    console.log("clean: no drift, no errors");
    return;
  }

  if (!outcome.wrote) {
    console.error(`refusing to update provenance: ${outcome.errors.length} error(s)`);
    process.exitCode = 1;
    return;
  }

  console.log(`wrote ${path.relative(repoRoot, outcome.wrote)}`);
  if (outcome.drift.length) console.log(`reconciled ${outcome.drift.length} drifted file(s)`);
}

export async function runCastMoldCommand(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  if (args.root) process.chdir(args.root);
  const repoRoot = process.cwd();

  // Where this Foundry keeps its targets and its Molds. Both are layout facts about this repo,
  // stated here rather than reached for from inside the caster.
  const targetDir = castsTargetDir(repoRoot, args.target);
  const target = loadTargetConfig(targetDir);
  const moldRel = path.posix.join("content", "molds", args.moldName, "index.md");
  const moldAbs = path.join(repoRoot, moldRel);
  if (!existsSync(moldAbs)) {
    console.error(`mold source missing: ${moldRel}`);
    process.exit(2);
  }

  const moldParsed = readMarkdown(moldAbs);
  if (moldParsed.meta.type !== "mold") {
    console.error(`${moldRel}: type is not 'mold' (got ${String(moldParsed.meta.type)})`);
    process.exit(2);
  }
  const moldHash = sha256File(moldAbs);

  const bundleRoot = path.join(
    targetDir,
    resolveBundlePath(
      bundlePathOf(target.bundle_path, path.join(targetDir, "_target.yml")),
      args.moldName,
    ),
  );
  const { slugMap, metaByPath } = buildSlugMap(repoRoot, GALAXY_HOOKS.slugAliases);
  const producerIndex = producerIndexFor(metaByPath);

  // A malformed contract is a authoring error in a YAML file, not a bug in the caster, so it
  // reports like every other bad input here rather than as a stack trace. Same reasoning as
  // catching a broken companion declaration during resolution: the message is already good, the
  // delivery was not.
  let refContract: ReturnType<typeof loadCastReferenceContract>["contract"];
  let castContract: ReturnType<typeof loadCastReferenceContract>["cast"];
  try {
    ({ contract: refContract, cast: castContract } = loadCastReferenceContract(
      path.join(repoRoot, "reference_contract.yml"),
    ));
  } catch (e) {
    console.error(errorMessage(e));
    process.exit(2);
  }

  const outcome = await castMold<{ artifacts?: ProvenanceArtifacts }>({
    repoRoot,
    bundleRoot,
    targetName: args.target,
    target,
    mold: {
      name: args.moldName,
      path: moldRel,
      meta: moldParsed.meta,
      body: moldParsed.body,
      contentHash: moldHash,
    },
    castContract,
    refKinds: refContract.kinds,
    slugMap,
    metaByPath,
    hooks: GALAXY_HOOKS,
    // What this Foundry records in the slot the record reserves beside `refs`. A Mold that
    // declares no handoff supplies `undefined` and the key is simply absent — which is also what
    // a Foundry with no artifacts at all gets, by passing no extensions.
    extensions: { artifacts: readArtifactContracts(moldParsed.meta, producerIndex) },
    check: args.check,
    note: args.note,
  });

  reportCast(outcome, args.check, repoRoot);
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) {
  runCastMoldCommand().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
