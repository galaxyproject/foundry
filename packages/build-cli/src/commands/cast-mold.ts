#!/usr/bin/env tsx
// Deterministic cast assembly. Reads the Mold's `index.md` frontmatter as the
// source of truth for `references:` and resolves each ref to a concrete file
// op against `casts/<target>/<mold>/`. Writes `_provenance.json` (schema v4)
// recording every resolved ref and its hash. Assembly is deterministic
// throughout: there is no LLM phase, so a cast is byte-stable and --check-able.
//
// Usage:
//   foundry-build cast <mold-name> [--target=claude] [--check] [--note="..."]

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import {
  applyLicensePolicy,
  castsTargetDir,
  copyVerbatim,
  gitHead,
  provenanceRecord,
  readProvenanceCarryOver,
  PROVENANCE_SCHEMA_VERSION,
  type ProvenanceCarryOver,
  type ProvenanceRefEntry,
} from "@galaxy-foundry/cast";

import { loadCastReferenceContract } from "@galaxy-foundry/note-schema";

import type {
  ProvenanceArtifactInput,
  ProvenanceArtifactOutput,
  ProvenanceArtifacts,
} from "../lib/artifact-contract.js";
import type { BundleFile, CastHooks } from "../lib/caster/hooks.js";
import {
  castOneRef,
  expandCompanions,
  resolveMoldRef,
  type ResolvedRef,
} from "../lib/caster/refs.js";
import {
  bulletSection,
  refRows,
  renderSkillMarkdown,
  runtimeProcedureBody,
  scalar,
  sentence,
  skillSummary,
  stripWikiLinks,
} from "../lib/caster/skill.js";
import { loadTargetConfig } from "../lib/caster/target.js";
import { errorMessage } from "../lib/errors.js";
import { readMarkdown } from "../lib/frontmatter.js";
import { reconcileAbsent, reconcileText, reconcileTreeTo, sha256File } from "../lib/reconcile.js";
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

/**
 * Compare every contributed file against the bundle, and bring it into line unless checking.
 *
 * Run twice per cast: once to report, before the error gate, and once to write, after it. The
 * second call's findings are discarded because the first already reported them. Splitting it
 * that way is what keeps a refused cast from leaving files behind — a cast that reports an
 * unresolved ref and exits must not have already written a manifest describing the bundle it
 * declined to finish.
 */
function reconcileBundleFiles(
  files: readonly BundleFile[],
  bundleRoot: string,
  check: boolean,
): Array<{ file: string; reason: string }> {
  const found: Array<{ file: string; reason: string }> = [];
  for (const file of files) {
    const abs = path.join(bundleRoot, file.path);
    const outcome =
      file.content === null
        ? reconcileAbsent({
            path: abs,
            reason: file.absentReason ?? "stale (nothing declares it)",
            check,
          })
        : reconcileText({ path: abs, expected: file.content, label: file.path, check });
    if (outcome.reason) found.push({ file: file.path, reason: outcome.reason });
  }
  return found;
}

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

/** The hand-recorded fields of the record already on disk, or nothing on a first cast. */
function readExistingProvenance(provenancePath: string): ProvenanceCarryOver {
  return readProvenanceCarryOver(
    existsSync(provenancePath) ? readFileSync(provenancePath, "utf8") : null,
  );
}

/**
 * A record with the two fields that move on every cast held fixed, or null if it will not parse.
 *
 * `cast_at` is the clock and `mold.commit` is wherever HEAD happens to be. Comparing raw bytes
 * would report drift on every check of a bundle nothing changed, which is why the record was
 * never compared at all — and why it became the one file in a bundle whose drift a `--check`
 * could not see. These are the same two fields a regenerate has always been expected to move.
 *
 * Key order survives normalizing: `JSON.parse` preserves it and reassigning an existing key does
 * not move it, so a record whose fields were reshuffled still compares unequal here. That is the
 * case worth catching — every value stays correct while every committed record rewrites.
 */
function comparableProvenance(text: string): string | null {
  let doc: { cast_at?: unknown; mold?: { commit?: unknown } | null };
  try {
    doc = JSON.parse(text) as typeof doc;
  } catch {
    return null;
  }
  if (typeof doc !== "object" || doc === null) return null;
  doc.cast_at = "";
  if (typeof doc.mold === "object" && doc.mold !== null) doc.mold.commit = "";
  return JSON.stringify(doc);
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
  const provenancePath = path.join(bundleRoot, "_provenance.json");
  const carry = readExistingProvenance(provenancePath);

  const { slugMap, metaByPath } = buildSlugMap(repoRoot, GALAXY_HOOKS.slugAliases);
  const producerIndex = producerIndexFor(metaByPath);

  const rawRefs = Array.isArray(moldParsed.meta.references)
    ? (moldParsed.meta.references as unknown[])
    : [];
  // A malformed contract is a authoring error in a YAML file, not a bug in the caster, so it
  // reports like every other bad input here rather than as a stack trace. Same reasoning as
  // catching `payloadCompanionOf` below: the message is already good, the delivery was not.
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

  const resolved: ResolvedRef[] = [];
  const errors: string[] = [];
  rawRefs.forEach((r, i) => {
    const out = resolveMoldRef(r, i, slugMap, metaByPath, target, castContract, refContract.kinds);
    if (out.error) errors.push(out.error);
    if (out.resolved) resolved.push(out.resolved);
  });

  // Expand multi-file notes' declared companion files into sibling verbatim refs.
  const expanded = expandCompanions(resolved, metaByPath, target, castContract);
  resolved.length = 0;
  resolved.push(...expanded);

  // Stable ordering: by (kind, note, companions after the note they belong to).
  //
  // Keyed on `dst` rather than `src` because `dst` is what a reader of the bundle sees, and
  // because a companion's place in the list is not a fact about where it is stored. Sorting on
  // `src` put a companion after its note only while both were flat and `.md` sorted before
  // `.yml`; under `<slug>/index.md` it sorted before instead, and the SKILL.md line saying
  // "sibling of X — read it where that note directs" arrived above X.
  const groupKey = (r: ResolvedRef): string => r.companion_of ?? r.dst;
  resolved.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    const group = groupKey(a).localeCompare(groupKey(b));
    if (group !== 0) return group;
    // Same note: it comes first, then its companions among themselves.
    const companion = Number(Boolean(a.companion_of)) - Number(Boolean(b.companion_of));
    return companion !== 0 ? companion : a.dst.localeCompare(b.dst);
  });

  // Assemble against a private copy of the current bundle. Every reconciliation therefore
  // reports the same drift it would find on the real tree while leaving the checkout untouched,
  // and hooks inspect the complete expected bundle — new refs, contributed files and provenance
  // together. Only a cast that clears every error publishes the owned files below.
  const stageDir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-stage-"));
  const stagedBundleRoot = path.join(stageDir, "bundle");
  if (existsSync(bundleRoot)) cpSync(bundleRoot, stagedBundleRoot, { recursive: true });
  else mkdirSync(stagedBundleRoot, { recursive: true });

  try {
    const refEntries: ProvenanceRefEntry[] = [];
    const drift: Array<{ file: string; reason: string }> = [];

    // Every bundle-relative path this cast writes into the staged bundle, recorded beside the
    // write that produces it. Publishing copies exactly this set, so the two halves cannot
    // disagree about what a cast produces: a new kind of output is added here, at the write,
    // rather than here AND again in a publish block that re-derives its own list.
    const staged = new Set<string>();

    for (const r of resolved) {
      const result = await castOneRef(r, repoRoot, stagedBundleRoot, GALAXY_HOOKS.renderers);
      refEntries.push(result.entry);
      staged.add(result.entry.dst);
      if (result.error) errors.push(result.error);
      if (result.drift) drift.push({ file: r.src, reason: result.drift });
    }

    // License → redistribution-policy enforcement + license_file hashing.
    errors.push(...applyLicensePolicy(refEntries, repoRoot));

    const artifactContracts = readArtifactContracts(moldParsed.meta, producerIndex);
    const skillText = renderSkillMarkdown({
      moldName: args.moldName,
      meta: moldParsed.meta,
      lede: GALAXY_HOOKS.skillLede,
      sections: GALAXY_HOOKS.skillSections({
        moldName: args.moldName,
        meta: moldParsed.meta,
        body: moldParsed.body,
        refs: refEntries,
        metaByPath,
        slugMap,
      }),
    });
    const skillDrift = reconcileText({
      path: path.join(stagedBundleRoot, "SKILL.md"),
      expected: skillText,
      label: "SKILL.md",
      check: false,
    });
    if (skillDrift.reason) drift.push({ file: "SKILL.md", reason: skillDrift.reason });
    staged.add("SKILL.md");

    // Reduce `references/` to exactly what provenance lists.
    //
    // Casting writes each ref and never looked at what was already there, so a file that stops
    // being a ref stayed in the bundle forever. Undeclaring one companion was enough to prove it:
    // provenance dropped `galaxy-collection-semantics.upstream.myst`, SKILL.md stopped naming it,
    // and the file sat in nine bundles regardless — invisible to every check, and still the first
    // thing an agent listing the directory would find.
    //
    // Scoped to `references/` because that subtree is the only part of a bundle casting owns —
    // `runs/` is harvested output and is not ours to delete.
    const declaredRefs = new Set(refEntries.map((entry) => entry.dst));
    drift.push(
      ...reconcileTreeTo({
        root: path.join(stagedBundleRoot, "references"),
        declared: declaredRefs,
        relativeTo: stagedBundleRoot,
        reason: () => "orphan (no ref claims it)",
        check: false,
      }),
    );

    // Bundle-root files this instance contributes are reconciled into the staged bundle before
    // checks run. A checker therefore sees the bytes this cast proposes, never a stale manifest
    // copied from the previous cast.
    const contributed = GALAXY_HOOKS.bundleFiles.flatMap((contribute) =>
      contribute({
        moldName: args.moldName,
        meta: moldParsed.meta,
        refs: refEntries,
        metaByPath,
        slugMap,
      }),
    );
    drift.push(...reconcileBundleFiles(contributed, stagedBundleRoot, false));
    for (const file of contributed) if (file.content !== null) staged.add(file.path);

    // A `--note` opens a new cast revision. Decided before the record is assembled rather than
    // assigned onto it after, so the numbering does not depend on where a later assignment
    // would leave a key.
    const history = carry.cast_history ?? [];
    const revised = args.note
      ? (() => {
          const rev = history.reduce((m, h) => Math.max(m, h.rev), 0) + 1;
          const today = new Date().toISOString().slice(0, 10);
          return {
            cast_date: today,
            cast_revision: rev,
            cast_history: [...history, { rev, date: today, note: args.note }],
          };
        })()
      : {
          cast_date: carry.cast_date,
          cast_revision: carry.cast_revision,
          cast_history: carry.cast_history,
        };

    // `artifacts` is this Foundry's, not casting's — the package reserves the slot between
    // `refs` and `validation_results` and takes whatever fills it. A Mold that declares no
    // handoff passes `undefined` and the key is simply absent, which is what a Foundry with no
    // artifacts at all gets for free.
    const next = provenanceRecord<{ artifacts?: ProvenanceArtifacts }>({
      head: {
        provenance_schema_version: PROVENANCE_SCHEMA_VERSION,
        cast_target: args.target,
        mold: {
          name: args.moldName,
          path: moldRel,
          revision:
            typeof moldParsed.meta.revision === "number" ? moldParsed.meta.revision : undefined,
          content_hash: moldHash,
          commit: gitHead(repoRoot),
        },
        cast_method: carry.cast_method,
        cast_agent: carry.cast_agent,
        cast_at: new Date().toISOString(),
        ...revised,
      },
      refs: refEntries,
      extensions: { artifacts: artifactContracts },
      tail: {
        validation_results: carry.validation_results,
        open_questions: carry.open_questions,
      },
    });

    const provenanceText = JSON.stringify(next, null, 2) + "\n";

    // The record is reconciled like everything else in the bundle. It used to be the one
    // exception — written straight out, never compared — which made the file that IS the cast's
    // contract the only one a `--check` could not see drift in.
    const stagedProvenance = path.join(stagedBundleRoot, "_provenance.json");
    const committed = existsSync(stagedProvenance)
      ? comparableProvenance(readFileSync(stagedProvenance, "utf8"))
      : undefined;
    if (committed === undefined) {
      drift.push({ file: "_provenance.json", reason: "missing (this Mold has not been cast)" });
    } else if (committed === null) {
      drift.push({ file: "_provenance.json", reason: "unreadable as JSON" });
    } else if (committed !== comparableProvenance(provenanceText)) {
      drift.push({
        file: "_provenance.json",
        reason: "changed (a re-cast records something else)",
      });
    }
    writeFileSync(stagedProvenance, provenanceText);
    staged.add("_provenance.json");

    // Checks this instance runs over the finished staged bundle.
    //
    // Collected rather than thrown: a bundle that fails its own check is a finding about this
    // cast, and the caller reports findings. Letting one escape ends the run with a stack trace
    // instead — and a check that throws is itself a finding, not a reason to lose the others.
    for (const check of GALAXY_HOOKS.bundleChecks) {
      try {
        errors.push(
          ...check({
            moldName: args.moldName,
            meta: moldParsed.meta,
            refs: refEntries,
            metaByPath,
            slugMap,
            bundleRoot: stagedBundleRoot,
          }),
        );
      } catch (e) {
        errors.push(errorMessage(e));
      }
    }

    // Report.
    for (const e of errors) console.error(`error: ${e}`);
    for (const d of drift) console.error(`drift: ${d.file} — ${d.reason}`);

    if (args.check) {
      if (errors.length || drift.length) {
        console.error(`check failed: ${errors.length} error(s), ${drift.length} drift(s)`);
        process.exitCode = 1;
        return;
      }
      console.log("clean: no drift, no errors");
      return;
    }

    if (errors.length) {
      console.error(`refusing to update provenance: ${errors.length} error(s)`);
      process.exitCode = 1;
      return;
    }

    // Publish what was staged, and only that. `runs/` and any other harvested state stay exactly
    // as found — casting did not write them and does not own them.
    //
    // The set is the one built alongside the staging writes, so this cannot fall behind them.
    // It iterates in insertion order, which puts `_provenance.json` last because it is staged
    // last — the record lands only after the files it describes.
    //
    // A path in it that is not on disk means a write was recorded and did not happen, which is a
    // bug in this function rather than a condition to tolerate: publishing the rest would leave a
    // bundle whose provenance names a file it does not contain.
    mkdirSync(bundleRoot, { recursive: true });
    for (const rel of staged) {
      const from = path.join(stagedBundleRoot, rel);
      if (!existsSync(from)) throw new Error(`staged but never written: ${rel}`);
      copyVerbatim(from, path.join(bundleRoot, rel));
    }

    // Removals, which copying cannot express: refs that stopped being refs, and contributions
    // whose declaration says the file must not be there.
    reconcileTreeTo({
      root: path.join(bundleRoot, "references"),
      declared: declaredRefs,
      relativeTo: bundleRoot,
      reason: () => "orphan (no ref claims it)",
      check: false,
    });
    reconcileBundleFiles(
      contributed.filter((file) => file.content === null),
      bundleRoot,
      false,
    );

    console.log(`wrote ${path.relative(repoRoot, provenancePath)}`);
    if (drift.length) console.log(`reconciled ${drift.length} drifted file(s)`);
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) {
  runCastMoldCommand().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
