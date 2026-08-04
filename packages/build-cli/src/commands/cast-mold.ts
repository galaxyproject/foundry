#!/usr/bin/env tsx
// Deterministic cast assembly. Reads the Mold's `index.md` frontmatter as the
// source of truth for `references:` and resolves each ref to a concrete file
// op against `casts/<target>/<mold>/`. Writes `_provenance.json` (schema v4)
// recording every resolved ref and its hash. Assembly is deterministic
// throughout: there is no LLM phase, so a cast is byte-stable and --check-able.
//
// Usage:
//   foundry-build cast <mold-name> [--target=claude] [--check] [--note="..."]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import yaml from "js-yaml";

import {
  applyLicensePolicy,
  copyVerbatim,
  gitHead,
  readProvenanceCarryOver,
  recordedHash,
  PROVENANCE_SCHEMA_VERSION,
  type Provenance,
  type ProvenanceArtifactInput,
  type ProvenanceArtifactOutput,
  type ProvenanceArtifacts,
  type ProvenanceCarryOver,
  type ProvenanceRefEntry,
} from "@galaxy-foundry/cast";

import {
  loadCastReferenceContract,
  type CastContract,
  type ReferenceContractTerm,
} from "@galaxy-foundry/note-schema";

import type { BundleFile, CastHooks, SkillSection, RefRenderers } from "../lib/cast-hooks.js";
import { payloadCompanionOf } from "../lib/dispositions.js";
import { errorMessage } from "../lib/errors.js";
import { readMarkdown } from "../lib/frontmatter.js";
import {
  reconcile,
  reconcileAbsent,
  reconcileText,
  reconcileTreeTo,
  sha256File,
} from "../lib/reconcile.js";
import { aggregateRequiredTools, requiredToolRows } from "../lib/required-tools.js";
import { validateRuns } from "../lib/runs-check.js";
import { buildSlugMap, GALAXY_SLUG_ALIASES } from "../lib/slug-map.js";
import { bundlePathOf, resolveBundlePath } from "../lib/target-layout.js";
import type { Frontmatter } from "../lib/types.js";
import { fileSlug } from "../lib/walk.js";
import {
  parseWikiLink,
  resolveWikiLink,
  WIKI_LINK_RE,
  WIKI_LINK_SCAN_RE,
} from "../lib/wiki-links.js";

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

// ---- target config ----

interface TargetKindConfig {
  dst_dir: string;
  dst_extension: string;
  modes: string[];
}

/**
 * What a `_target.yml` declares.
 *
 * Deliberately no `provenance_schema_version`. The record's shape is the CASTER's, not the
 * target's, so the version travels with the code that emits it — `PROVENANCE_SCHEMA_VERSION`
 * in @galaxy-foundry/cast. A target that declared its own could name a shape the caster does
 * not write, and the JSON Schema at scripts/lib/schemas/cast-provenance.schema.json stays the
 * contract of record: `make check-verify` validates every committed record against it, so the
 * two are cross-checked rather than merely restated.
 */
interface TargetConfig {
  name: string;
  /** Where bundles sit under `casts/<target>/`; see lib/target-layout.ts. */
  bundle_path?: string;
  required_outputs: string[];
  kinds: Record<string, TargetKindConfig>;
  skill_constraints: {
    frontmatter_required: string[];
    forbidden_runtime_paths: string[];
  };
}

function loadTargetConfig(repoRoot: string, target: string): TargetConfig {
  const p = path.join(repoRoot, "casts", target, "_target.yml");
  if (!existsSync(p)) throw new Error(`missing target config: ${p}`);
  const data = yaml.load(readFileSync(p, "utf8")) as TargetConfig;
  if (!data || typeof data !== "object") throw new Error(`invalid target config: ${p}`);
  return data;
}

// ---- ref resolution ----

interface ResolvedRef {
  kind: "schema" | "research" | "pattern" | "cli-tool" | "cli-command" | "prompt";
  mode: "verbatim" | "sidecar";
  ref: string;
  src: string;
  dst: string;
  used_at: "cast-time" | "runtime" | "both";
  load: "upfront" | "on-demand";
  evidence?: string;
  purpose?: string;
  trigger?: string;
  verification?: string;
  /** Set when src is an npm package export rather than a repo file. */
  package_source?: { spec: string; exportName: string };
  /** Bundle-relative dst of the parent note when this ref is a copied companion file. */
  companion_of?: string;
  /** License of redistributed third-party content, from the source note's frontmatter. */
  license?: string;
  /** Repo-relative LICENSES/ path this ref redistributes under. */
  license_file?: string;
}

// Which kinds are castable, what each defaults to, and how each resolves are read from
// `reference_contract.yml`'s `cast:` blocks rather than decided here — see
// packages/note-schema/src/cast-contract.ts for why.

function deriveDst(kind: string, src: string, mode: string, kindCfg: TargetKindConfig): string {
  // 1:1 strict slug mapping: a bundled file is named for the note it came from, never for the
  // file it happens to be stored in. Those were the same string while every note was
  // `<slug>.md`, which is why the verbatim branch could get away with the basename — and why
  // it silently produced `references/notes/index.md` the moment a kind became a directory.
  //
  // Non-markdown sources keep their literal basename: a slug plus `dst_extension` would turn
  // `gxformat2.schema.json` into `gxformat2.schema.json.json`.
  if (path.extname(src) !== ".md") {
    return path.posix.join(kindCfg.dst_dir, path.basename(src));
  }
  const slug = fileSlug(src);
  const ext = mode === "verbatim" ? ".md" : kindCfg.dst_extension;
  return path.posix.join(kindCfg.dst_dir, `${slug}${ext}`);
}

function resolveMoldRef(
  raw: unknown,
  index: number,
  moldPath: string,
  slugMap: ReadonlyMap<string, string>,
  metaByPath: ReadonlyMap<string, Frontmatter>,
  target: TargetConfig,
  castContract: CastContract,
  refKinds: Record<string, ReferenceContractTerm & { ref_shape?: string }>,
): { resolved?: ResolvedRef; error?: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { error: `references[${index}]: not an object` };
  }
  const ref = raw as Record<string, unknown>;
  const kind = typeof ref.kind === "string" ? ref.kind : "";
  const refStr = typeof ref.ref === "string" ? ref.ref : "";

  const castDecl = castContract[kind];
  if (!castDecl) {
    // Two different failures, and the distinction is the declaration's: a kind the contract
    // never names is a typo, while a kind it names WITHOUT a `cast:` block is deliberate —
    // authored vocabulary the caster has no support for yet.
    return {
      error: refKinds[kind]
        ? `references[${index}]: kind=${kind} is not castable — reference_contract.yml declares it with no \`cast:\` block (the first Mold to need one defines the contract)`
        : `references[${index}]: unknown kind=${kind}`,
    };
  }
  const kindCfg = target.kinds[kind];
  if (!kindCfg) {
    return { error: `references[${index}]: target=${target.name} does not declare kind=${kind}` };
  }

  const mode = (
    typeof ref.mode === "string" ? ref.mode : castDecl.default_mode
  ) as ResolvedRef["mode"];
  // The target's list is a CONSTRAINT on the kind's, never a second declaration of it: a
  // target may refuse a mode the kind allows, and can never permit one the kind does not.
  if (!kindCfg.modes.includes(mode)) {
    return {
      error: `references[${index}]: kind=${kind} does not support mode=${mode} (allowed: ${kindCfg.modes.join(", ")})`,
    };
  }

  // Resolve src.
  let src: string;
  let dstOverride: string | undefined;
  let packageSource: { spec: string; exportName: string } | undefined;

  // Every kind addresses its note the same way and expects the note's `type` to be the kind's
  // own name; the strategies differ only in what they take FROM that note.
  //
  // The address check answers to the kind's declared `ref_shape` rather than assuming every
  // castable kind is wiki-link-shaped. They all are today, which is exactly why asserting it
  // in code would sit there being true until the first `path`-shaped kind, and then be wrong.
  //
  // It is deliberately strict. `resolveWikiLink` accepts the bare inner text
  // (`planemo-asserts-idioms`) as readily as `[[planemo-asserts-idioms]]`, so without this
  // precheck a kind could declare `ref_shape: wiki-link` and still take things that are not
  // wiki-links — a declaration that means nothing. All 253 committed refs are bracketed; a bare
  // or space-padded one is refused.
  if (refKinds[kind]?.ref_shape === "wiki-link" && !WIKI_LINK_RE.test(refStr)) {
    return {
      error: `references[${index}]: ${kind} ref must be a [[wiki-link]] to a ${kind} note (got ${refStr})`,
    };
  }
  const tp = resolveWikiLink(refStr, slugMap);
  if (!tp) return { error: `references[${index}]: ${kind} ref ${refStr} did not resolve` };
  // Frontmatter of the note this ref resolves to; source of its license fields.
  const noteMeta: Frontmatter | undefined = metaByPath.get(tp);
  if (noteMeta?.type !== kind) {
    return {
      error: `references[${index}]: ${kind} ref ${refStr} resolves to type=${noteMeta?.type ?? "(none)"}, expected ${kind}`,
    };
  }

  // The bundled filename is the note's slug, never the storage filename — `fileSlug` is what
  // keeps a directory-shaped kind from landing as `index.md`. `slug_field` overrides it where
  // the note's own slug is the wrong name for a reader of the bundle.
  //
  // A declared `slug_field` the note does not carry is an ERROR, not a fallback to the slug:
  // the declaration's whole content is "the note's own slug is the wrong name here", so
  // quietly using it anyway would rename every file of the kind on a typo'd field name and
  // look like a successful cast.
  let slug = fileSlug(tp);
  if (castDecl.slug_field) {
    const declaredSlug = noteMeta[castDecl.slug_field];
    if (typeof declaredSlug !== "string" || !declaredSlug) {
      return {
        error: `references[${index}]: ${kind} ref ${refStr} resolves to a note with no \`${castDecl.slug_field}\`, which its kind declares as slug_field`,
      };
    }
    slug = declaredSlug;
  }
  const namedDst = path.posix.join(kindCfg.dst_dir, `${slug}${kindCfg.dst_extension}`);

  switch (castDecl.resolve) {
    case "package-export": {
      // The note declares `package` + `package_export`; cast imports the runtime export,
      // JSON.stringifies it, and writes that to the bundle. There is no file to copy.
      const pkg = typeof noteMeta.package === "string" ? noteMeta.package : null;
      const exp = typeof noteMeta.package_export === "string" ? noteMeta.package_export : null;
      if (!pkg || !exp) {
        return {
          error: `references[${index}]: ${kind} ref ${refStr} resolves to a note missing 'package' and/or 'package_export' frontmatter`,
        };
      }
      src = `package://${pkg}#${exp}`;
      dstOverride = namedDst;
      packageSource = { spec: pkg, exportName: exp };
      break;
    }
    case "payload-companion": {
      // What casting packages is the payload beside the note, never the wrapper. Which file
      // that is comes from the kind's own companion declaration, so there is nothing here to
      // resolve and nothing that can point at a file that is not there.
      //
      // Caught rather than thrown: a kind declaring no single `bundled` companion is a broken
      // declaration, and every other failure in this function arrives as a collected
      // `references[i]: ...` line. Letting this one escape as a stack trace would lose the
      // ref index — the only thing that says WHICH reference was being resolved.
      let payload: string;
      try {
        payload = payloadCompanionOf(kind);
      } catch (e) {
        return { error: `references[${index}]: ${errorMessage(e)}` };
      }
      src = path.posix.join(path.posix.dirname(tp), payload);
      dstOverride = namedDst;
      break;
    }
    case "note": {
      src = tp;
      // Only a kind that renames its output needs the explicit dst; the rest go through
      // `deriveDst`, which is also the path a non-markdown source has to take.
      if (castDecl.slug_field) dstOverride = namedDst;
      break;
    }
  }

  const dst = dstOverride ?? deriveDst(kind, src, mode, kindCfg);

  const used_at = (
    typeof ref.used_at === "string" ? ref.used_at : "runtime"
  ) as ResolvedRef["used_at"];
  const load = (typeof ref.load === "string" ? ref.load : "on-demand") as ResolvedRef["load"];

  return {
    resolved: {
      kind: kind as ResolvedRef["kind"],
      mode,
      ref: refStr,
      src,
      dst,
      used_at,
      load,
      evidence: typeof ref.evidence === "string" ? ref.evidence : undefined,
      purpose: typeof ref.purpose === "string" ? ref.purpose : undefined,
      trigger: typeof ref.trigger === "string" ? ref.trigger : undefined,
      verification: typeof ref.verification === "string" ? ref.verification : undefined,
      package_source: packageSource,
      license: typeof noteMeta?.license === "string" ? noteMeta.license : undefined,
      license_file: typeof noteMeta?.license_file === "string" ? noteMeta.license_file : undefined,
    },
  };
}

// Expand companion files declared on a note's frontmatter into sibling refs.
// A multi-file note (e.g. a vendored bundle) lists `companions:` filenames in
// its `.md`; each is copied verbatim next to the note in the bundle so the
// note body can reference it at runtime. Companions ship verbatim whatever the
// parent ref's mode — a note points at its structured sibling either way. They
// inherit the parent ref's load/used_at/trigger/purpose and carry
// `companion_of` for provenance.
function expandCompanions(
  resolved: ResolvedRef[],
  metaByPath: ReadonlyMap<string, Frontmatter>,
  target: TargetConfig,
  castContract: CastContract,
): ResolvedRef[] {
  const out: ResolvedRef[] = [];
  for (const r of resolved) {
    out.push(r);
    // Whether a kind's notes may carry companions is the kind's declaration, not a pair of
    // names checked here. The note still lists its own — membership stays declared per-note,
    // and a file is never packaged for merely sitting in the directory.
    if (!castContract[r.kind]?.companions) continue;
    const rawCompanions = metaByPath.get(r.src)?.companions;
    const companions = Array.isArray(rawCompanions) ? (rawCompanions as unknown[]) : [];
    if (companions.length === 0) continue;
    const kindCfg = target.kinds[r.kind];
    if (!kindCfg) continue;
    const srcDir = path.posix.dirname(r.src);
    for (const c of companions) {
      if (typeof c !== "string") continue;
      out.push({
        kind: r.kind,
        mode: "verbatim",
        ref: r.ref,
        src: path.posix.join(srcDir, c),
        dst: path.posix.join(kindCfg.dst_dir, c),
        used_at: r.used_at,
        load: r.load,
        evidence: r.evidence,
        purpose: r.purpose,
        trigger: r.trigger,
        companion_of: r.dst,
        license: r.license,
        license_file: r.license_file,
      });
    }
  }
  return out;
}

// ---- file ops ----

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

// ---- cast assembly ----

async function castOneRef(
  resolved: ResolvedRef,
  repoRoot: string,
  bundleRoot: string,
  check: boolean,
  renderers: RefRenderers,
): Promise<{ entry: ProvenanceRefEntry; drift?: string; error?: string }> {
  const dstAbs = path.join(bundleRoot, resolved.dst);

  // Package-vendored schema: import the named export, JSON.stringify, write verbatim.
  // No file `src` exists; src_hash and dst_hash are both the hash of the synthesized JSON.
  if (resolved.package_source) {
    if (resolved.kind !== "schema" || resolved.mode !== "verbatim") {
      return {
        entry: { ...skeleton(resolved), src_hash: null, dst_hash: null, source: "deterministic" },
        error: `package_source ref must be kind=schema mode=verbatim (got ${resolved.kind}/${resolved.mode})`,
      };
    }
    let json: string;
    try {
      const mod = (await import(resolved.package_source.spec)) as Record<string, unknown>;
      const exported = mod[resolved.package_source.exportName];
      if (exported === undefined) {
        return {
          entry: { ...skeleton(resolved), src_hash: null, dst_hash: null, source: "deterministic" },
          error: `package ${resolved.package_source.spec} has no export '${resolved.package_source.exportName}'`,
        };
      }
      const stringified = JSON.stringify(exported, null, 2);
      if (stringified === undefined) {
        return {
          entry: { ...skeleton(resolved), src_hash: null, dst_hash: null, source: "deterministic" },
          error: `package ${resolved.package_source.spec} export '${resolved.package_source.exportName}' is not JSON-serializable (typeof=${typeof exported}). The export must be a plain JSON Schema object; an Effect schema function needs upstream to publish a JSON-converted sibling.`,
        };
      }
      json = stringified + "\n";
    } catch (e) {
      return {
        entry: { ...skeleton(resolved), src_hash: null, dst_hash: null, source: "deterministic" },
        error: `failed to import ${resolved.package_source.spec}: ${(e as Error).message}`,
      };
    }
    const drift = reconcileText({
      path: dstAbs,
      expected: json,
      label: "package schema",
      check,
    });
    return {
      entry: {
        ...skeleton(resolved),
        src_hash: drift.expectedHash,
        dst_hash: recordedHash(drift, check),
        source: "deterministic",
      },
      drift: drift.reason,
    };
  }

  const srcAbs = path.join(repoRoot, resolved.src);
  if (!existsSync(srcAbs)) {
    return {
      entry: { ...skeleton(resolved), src_hash: null, dst_hash: null, source: "deterministic" },
      error: `ref source missing: ${resolved.src}`,
    };
  }
  const srcHash = sha256File(srcAbs);

  if (resolved.mode === "verbatim") {
    // The one ref that is a COPY rather than a render: compared against the source's own hash,
    // and written with `copyFileSync`, so the expected bytes are never a string in hand.
    const drift = reconcile({
      path: dstAbs,
      expectedHash: srcHash,
      label: "dst",
      check,
      write: () => copyVerbatim(srcAbs, dstAbs),
    });
    return {
      entry: {
        ...skeleton(resolved),
        src_hash: srcHash,
        dst_hash: recordedHash(drift, check),
        source: "deterministic",
      },
      drift: drift.reason,
    };
  }

  // Dispatched on the mode alone. Which kinds may take a given mode is already declared — the
  // target's `kinds.<kind>.modes` gates it above — so naming the kind again here would be a
  // second gate that could only ever disagree with the first.
  //
  // Which RENDERER a mode selects is a separate question, and the instance answers it. The mode
  // is shared vocabulary; the bytes it produces are not.
  const renderer = renderers[resolved.mode];
  if (renderer) {
    const parsed = readMarkdown(srcAbs);
    const text = await renderer({ srcAbs, srcRel: resolved.src, meta: parsed.meta });
    const drift = reconcileText({ path: dstAbs, expected: text, label: resolved.mode, check });
    return {
      entry: {
        ...skeleton(resolved),
        src_hash: srcHash,
        dst_hash: recordedHash(drift, check),
        source: "deterministic",
      },
      drift: drift.reason,
    };
  }

  // Unreachable from this instance, and kept anyway. Our `modes` vocabulary is narrowed to
  // exactly the modes we implement, so an unimplemented one is refused when the contract loads.
  // That is a fact about this instance's vocabulary, not a guarantee of the caster: widen the
  // vocabulary without registering a renderer and this is the failure. Says which of the two
  // disagreed, because "kind does not support mode" is a Mold to fix and this is a hook to write.
  return {
    entry: { ...skeleton(resolved), src_hash: srcHash, dst_hash: null, source: "deterministic" },
    error: `no renderer for mode=${resolved.mode} (kind=${resolved.kind}) — the target admits this mode but nothing implements it`,
  };
}

function skeleton(r: ResolvedRef): Omit<ProvenanceRefEntry, "src_hash" | "dst_hash" | "source"> {
  return {
    kind: r.kind,
    mode: r.mode,
    ref: r.ref,
    src: r.src,
    dst: r.dst,
    used_at: r.used_at,
    load: r.load,
    evidence: r.evidence,
    purpose: r.purpose,
    trigger: r.trigger,
    verification: r.verification,
    companion_of: r.companion_of,
    license: r.license,
    license_file: r.license_file,
  };
}

// The license → redistribution-policy check ships in @galaxy-foundry/cast. What stays this
// Foundry's is the license_file PRESENCE rule — which notes must declare one at all — because
// only the validator's `upstream` scoping can tell a Foundry-authored license annotation from
// genuine third-party redistribution.

// ---- deterministic SKILL.md assembly ----

function scalar(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

// A cast bundle is read outside the site, where `[[a#b|c]]` addresses nothing — so the
// SKILL.md body carries the human text and drops the syntax.
//
// The grammar is the package's, not another regex here. This function used to hand-roll a
// fifth copy of `[[target#anchor|display]]`, which is exactly the drift the shared package
// exists to stop.
export function stripWikiLinks(text: string): string {
  return text.replace(WIKI_LINK_SCAN_RE, (whole) => {
    const link = parseWikiLink(whole);
    if (!link) return whole;
    // An explicit alias wins. Without one, `display` is the whole address, so fall back to
    // the bare target and drop the anchor.
    const label = link.display === `${link.target}${link.anchor}` ? link.target : link.display;
    return label.trim() || whole;
  });
}

function runtimeProcedureBody(body: string, moldName: string): string {
  return stripWikiLinks(body.trim())
    .replace(new RegExp(`^#\\s+${moldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n+`), "")
    .replace(/^(#{2,5})\s/gm, "$1# ")
    .replace(/\bcast skill\b/g, "skill")
    .replace(/\bThis Mold\b/g, "This skill")
    .replace(/\bThe Mold\b/g, "The skill")
    .replace(/\bthis Mold\b/g, "this skill")
    .replace(/\bthe Mold\b/g, "the skill")
    .replace(/\bMolds\b/g, "skills")
    .replace(/\bMold\b/g, "skill");
}

function escapeFrontmatterString(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
}

function sentence(text: string): string {
  const cleaned = stripWikiLinks(text).trim().replace(/[.]+$/, "");
  return cleaned ? `${cleaned}.` : "";
}

function lowerFirst(text: string): string {
  return text ? text[0]!.toLowerCase() + text.slice(1) : text;
}

function triggerSentence(text: string): string {
  const cleaned = stripWikiLinks(text)
    .trim()
    .replace(/[.]+$/, "")
    .replace(/^when\s+/i, "");
  return cleaned ? `Use when: ${lowerFirst(cleaned)}.` : "";
}

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

/**
 * One line per reference: where it landed, what it is, and when to read it.
 *
 * The row's shape is casting's; the nouns in it are the instance's, which is why `describe`
 * is an argument. A second Foundry gets the same layout under its own vocabulary instead of
 * re-deriving how a reference should read.
 */
function refRows(
  refs: readonly ProvenanceRefEntry[],
  describe: {
    kindLabel: (ref: ProvenanceRefEntry) => string;
    modePhrase: (ref: ProvenanceRefEntry) => string;
  },
): string[] {
  return refs.map((r) => {
    const details = [`- \`${r.dst}\`: ${describe.kindLabel(r)} ${describe.modePhrase(r)}.`];
    if (r.companion_of) {
      // The parent note row already carries purpose/trigger; just point to it.
      details.push(`Sibling of \`${r.companion_of}\`; read it where that note directs.`);
      return details.join(" ");
    }
    if (r.purpose) details.push(sentence(r.purpose));
    if (r.trigger) details.push(triggerSentence(r.trigger));
    return details.join(" ");
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

/**
 * A section whose content is a list, with something to say when the list is empty.
 *
 * The empty case is not omission: a skill that declares no required tools has said something,
 * and a reader who finds no heading cannot tell that from a caster that forgot to ask.
 */
export function bulletSection(
  title: string,
  lines: string[],
  empty = "- None declared.",
): SkillSection {
  return { title, body: (lines.length ? lines : [empty]).join("\n") };
}

/** The skill's one-line description, falling back to naming the Mold when none was written. */
function skillSummary(meta: Frontmatter, moldName: string): string {
  return scalar(meta.summary) ?? `Run the ${moldName} Mold.`;
}

/**
 * The skill document: frontmatter, title, lede, then the sections the instance contributed.
 *
 * What stays here is only what holds for any Foundry — the frontmatter a harness reads to find
 * the skill, and the `## Title` convention. Which sections exist and what they say came from
 * `skillSections`, because a document's contents are a fact about the corpus it describes.
 */
export function renderSkillMarkdown(args: {
  moldName: string;
  meta: Frontmatter;
  lede: string;
  sections: readonly SkillSection[];
}): string {
  const summary = skillSummary(args.meta, args.moldName);
  return [
    "---",
    `name: ${args.moldName}`,
    `description: "${escapeFrontmatterString(stripWikiLinks(summary))}"`,
    "---",
    "",
    `# ${args.moldName}`,
    "",
    args.lede,
    "",
    ...args.sections.map((s) => [`## ${s.title}`, "", s.body, ""].join("\n")),
  ].join("\n");
}

// ---- main ----

export async function runCastMoldCommand(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  if (args.root) process.chdir(args.root);
  const repoRoot = process.cwd();

  const target = loadTargetConfig(repoRoot, args.target);
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
    repoRoot,
    "casts",
    args.target,
    resolveBundlePath(
      bundlePathOf(target.bundle_path, `casts/${args.target}/_target.yml`),
      args.moldName,
    ),
  );
  // --check is read-only: never materialize the bundle dir for a never-cast Mold.
  if (!args.check) mkdirSync(bundleRoot, { recursive: true });
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
  let castContract: CastContract;
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
    const out = resolveMoldRef(
      r,
      i,
      moldRel,
      slugMap,
      metaByPath,
      target,
      castContract,
      refContract.kinds,
    );
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

  const refEntries: ProvenanceRefEntry[] = [];
  const drift: Array<{ file: string; reason: string }> = [];

  for (const r of resolved) {
    const result = await castOneRef(r, repoRoot, bundleRoot, args.check, GALAXY_HOOKS.renderers);
    refEntries.push(result.entry);
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
    path: path.join(bundleRoot, "SKILL.md"),
    expected: skillText,
    label: "SKILL.md",
    check: args.check,
  });
  if (skillDrift.reason) drift.push({ file: "SKILL.md", reason: skillDrift.reason });

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
  drift.push(
    ...reconcileTreeTo({
      root: path.join(bundleRoot, "references"),
      declared: new Set(refEntries.map((entry) => entry.dst)),
      relativeTo: bundleRoot,
      reason: () => "orphan (no ref claims it)",
      check: args.check,
    }),
  );

  // Bundle-root files this instance contributes. Reported here, written after the error gate —
  // a cast that refuses to finish must not leave a manifest describing the bundle it declined.
  const contributed = GALAXY_HOOKS.bundleFiles.flatMap((contribute) =>
    contribute({
      moldName: args.moldName,
      meta: moldParsed.meta,
      refs: refEntries,
      metaByPath,
      slugMap,
    }),
  );
  drift.push(...reconcileBundleFiles(contributed, bundleRoot, true));

  // Checks this instance runs over the finished bundle.
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
          bundleRoot,
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
      process.exit(1);
    }
    console.log("clean: no drift, no errors");
    return;
  }

  if (errors.length) {
    console.error(`refusing to update provenance: ${errors.length} error(s)`);
    process.exit(1);
  }

  const next: Provenance = {
    provenance_schema_version: PROVENANCE_SCHEMA_VERSION,
    cast_target: args.target,
    mold: {
      name: args.moldName,
      path: moldRel,
      revision: typeof moldParsed.meta.revision === "number" ? moldParsed.meta.revision : undefined,
      content_hash: moldHash,
      commit: gitHead(repoRoot),
    },
    cast_method: carry.cast_method,
    cast_agent: carry.cast_agent,
    cast_at: new Date().toISOString(),
    cast_date: carry.cast_date,
    cast_revision: carry.cast_revision,
    cast_history: carry.cast_history,
    refs: refEntries,
    artifacts: artifactContracts,
    validation_results: carry.validation_results,
    open_questions: carry.open_questions,
  };

  if (args.note) {
    const today = new Date().toISOString().slice(0, 10);
    const lastRev = (carry.cast_history ?? []).reduce((m, h) => Math.max(m, h.rev), 0);
    next.cast_history = [
      ...(carry.cast_history ?? []),
      { rev: lastRev + 1, date: today, note: args.note },
    ];
    next.cast_revision = lastRev + 1;
    next.cast_date = today;
  }

  writeFileSync(provenancePath, JSON.stringify(next, null, 2) + "\n");
  // Findings discarded: the reporting pass above already collected them, and this call exists
  // to write. Reaching here means the cast is finishing, so contributed files land beside the
  // provenance record that describes the same bundle.
  reconcileBundleFiles(contributed, bundleRoot, false);
  console.log(`wrote ${path.relative(repoRoot, provenancePath)}`);
  if (drift.length) console.log(`reconciled ${drift.length} drifted ref(s)`);
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) {
  runCastMoldCommand().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
