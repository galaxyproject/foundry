#!/usr/bin/env tsx
// Deterministic cast assembly. Reads the Mold's `index.md` frontmatter as the
// source of truth for `references:` and resolves each ref to a concrete file
// op against `casts/<target>/<mold>/`. Writes `_provenance.json` (schema v3)
// recording every resolved ref, its hash, and whether it was produced
// deterministically or is pending an LLM step.
//
// Usage:
//   foundry-build cast <mold-name> [--target=claude] [--check] [--note="..."]

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import type { ErrorObject } from "ajv";
import AjvImport from "ajv";
import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";
import yaml from "js-yaml";

import { readMarkdown } from "../lib/frontmatter.js";
import { loadLicensePolicy, resolveLicenseRow, type LicensePolicy } from "../lib/license-policy.js";
import {
  aggregateRequiredTools,
  requiredToolRows,
  type RequiredTool,
} from "../lib/required-tools.js";
import type { Frontmatter } from "../lib/types.js";
import { fileSlug, findMdFiles } from "../lib/walk.js";
import { resolveWikiLink, slugify, WIKI_LINK_RE } from "../lib/wiki-links.js";

type AjvValidator = {
  compile: (schema: unknown) => ((data: unknown) => boolean) & { errors?: ErrorObject[] | null };
};
const Ajv = AjvImport as unknown as new (opts: {
  allErrors: boolean;
  strict: boolean;
}) => AjvValidator;
const Ajv2020 = Ajv2020Import as unknown as new (opts: {
  allErrors: boolean;
  strict: boolean;
}) => AjvValidator;
const addFormats = addFormatsImport as unknown as (ajv: AjvValidator) => unknown;

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

interface TargetConfig {
  name: string;
  provenance_schema_version: number;
  required_outputs: string[];
  kinds: Record<string, TargetKindConfig>;
  condense_prompts: Record<string, string>;
  skill_constraints: {
    frontmatter_required: string[];
    forbidden_runtime_paths: string[];
    forbid_packaged_files: string[];
  };
}

function loadTargetConfig(repoRoot: string, target: string): TargetConfig {
  const p = path.join(repoRoot, "casts", target, "_target.yml");
  if (!existsSync(p)) throw new Error(`missing target config: ${p}`);
  const data = yaml.load(readFileSync(p, "utf8")) as TargetConfig;
  if (!data || typeof data !== "object") throw new Error(`invalid target config: ${p}`);
  return data;
}

// ---- slug map (shared with validator semantics) ----

function buildSlugMap(repoRoot: string): {
  slugMap: Map<string, string>;
  metaByPath: Map<string, Frontmatter>;
} {
  const slugMap = new Map<string, string>();
  const metaByPath = new Map<string, Frontmatter>();
  const contentRoot = path.join(repoRoot, "content");
  for (const abs of findMdFiles(contentRoot)) {
    const parsed = readMarkdown(abs);
    if (!parsed.hasFrontmatter) continue;
    const rel = path.relative(repoRoot, abs);
    const slug = fileSlug(rel);
    slugMap.set(slugify(slug), rel);
    metaByPath.set(rel, parsed.meta);
    if (
      parsed.meta.type === "cli-command" &&
      typeof parsed.meta.tool === "string" &&
      typeof parsed.meta.command === "string"
    ) {
      slugMap.set(slugify(`${parsed.meta.tool} ${parsed.meta.command}`), rel);
    }
  }
  return { slugMap, metaByPath };
}

// ---- ref resolution ----

interface ResolvedRef {
  kind: "schema" | "research" | "pattern" | "cli-tool" | "cli-command" | "prompt";
  mode: "verbatim" | "condense" | "sidecar";
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

const SUPPORTED_KINDS = new Set([
  "schema",
  "research",
  "pattern",
  "cli-tool",
  "cli-command",
  "prompt",
]);
const NOT_IMPLEMENTED_KINDS = new Set(["example"]);

function deriveDst(kind: string, src: string, mode: string, kindCfg: TargetKindConfig): string {
  // 1:1 strict slug mapping. For verbatim copies, preserve the source basename
  // (avoids double-extension hazards like `.schema.json`). For sidecars,
  // derive a new file from the source slug with the target's dst_extension.
  if (mode === "verbatim") {
    return path.posix.join(kindCfg.dst_dir, path.basename(src));
  }
  const ext = path.extname(src);
  const base = path.basename(src, ext);
  const slug = base === "index" ? path.basename(path.dirname(src)) : base;
  return path.posix.join(kindCfg.dst_dir, `${slug}${kindCfg.dst_extension}`);
}

function resolveMoldRef(
  raw: unknown,
  index: number,
  moldPath: string,
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
  target: TargetConfig,
): { resolved?: ResolvedRef; error?: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { error: `references[${index}]: not an object` };
  }
  const ref = raw as Record<string, unknown>;
  const kind = typeof ref.kind === "string" ? ref.kind : "";
  const refStr = typeof ref.ref === "string" ? ref.ref : "";

  if (NOT_IMPLEMENTED_KINDS.has(kind)) {
    return {
      error: `references[${index}]: kind=${kind} not implemented in v1 (no real consumers; first Mold to need this defines the contract)`,
    };
  }
  if (!SUPPORTED_KINDS.has(kind)) {
    return { error: `references[${index}]: unknown kind=${kind}` };
  }
  const kindCfg = target.kinds[kind];
  if (!kindCfg) {
    return { error: `references[${index}]: target=${target.name} does not declare kind=${kind}` };
  }

  // Default mode by kind: schema/research/pattern → verbatim, cli-command → sidecar.
  const defaultMode = kind === "cli-command" ? "sidecar" : "verbatim";
  const mode = (typeof ref.mode === "string" ? ref.mode : defaultMode) as ResolvedRef["mode"];
  if (!kindCfg.modes.includes(mode)) {
    return {
      error: `references[${index}]: kind=${kind} does not support mode=${mode} (allowed: ${kindCfg.modes.join(", ")})`,
    };
  }

  // Resolve src.
  let src: string;
  let dstOverride: string | undefined;
  let packageSource: { spec: string; exportName: string } | undefined;
  // Frontmatter of the note this ref resolves to; source of its license fields.
  let noteMeta: Frontmatter | undefined;
  if (kind === "schema") {
    // Schema refs are wiki-links to a `type: schema` note. The note declares
    // `package` + `package_export`; cast imports the runtime export,
    // JSON.stringifies it, and writes to the bundle.
    if (!WIKI_LINK_RE.test(refStr)) {
      return {
        error: `references[${index}]: schema ref must be a [[wiki-link]] to a schema note (got ${refStr})`,
      };
    }
    const tp = resolveWikiLink(refStr, slugMap);
    if (!tp) return { error: `references[${index}]: schema ref ${refStr} did not resolve` };
    noteMeta = metaByPath.get(tp);
    if (noteMeta?.type !== "schema") {
      return {
        error: `references[${index}]: schema ref ${refStr} resolves to type=${noteMeta?.type ?? "(none)"}, expected schema`,
      };
    }
    const pkg = typeof noteMeta.package === "string" ? noteMeta.package : null;
    const exp = typeof noteMeta.package_export === "string" ? noteMeta.package_export : null;
    if (!pkg || !exp) {
      return {
        error: `references[${index}]: schema ref ${refStr} resolves to a schema note missing 'package' and/or 'package_export' frontmatter`,
      };
    }
    const noteSlug = path.basename(tp, ".md");
    src = `package://${pkg}#${exp}`;
    dstOverride = path.posix.join(kindCfg.dst_dir, `${noteSlug}.schema.json`);
    packageSource = { spec: pkg, exportName: exp };
  } else {
    const tp = resolveWikiLink(refStr, slugMap);
    if (!tp) return { error: `references[${index}]: ${kind} ref ${refStr} did not resolve` };
    noteMeta = metaByPath.get(tp);
    const expected = kind === "cli-command" ? "cli-command" : kind;
    const targetType = noteMeta?.type;
    if (targetType !== expected) {
      return {
        error: `references[${index}]: ${kind} ref ${refStr} resolves to type=${targetType ?? "(none)"}, expected ${expected}`,
      };
    }
    if (kind === "prompt") {
      const promptFile = metaByPath.get(tp)?.prompt_file;
      if (typeof promptFile !== "string" || promptFile.length === 0) {
        return {
          error: `references[${index}]: prompt ref ${refStr} target is missing prompt_file`,
        };
      }
      src = path.posix.join(path.posix.dirname(tp), promptFile);
      dstOverride = path.posix.join(
        kindCfg.dst_dir,
        `${path.basename(tp, ".md")}${kindCfg.dst_extension}`,
      );
    } else if (kind === "cli-tool") {
      // cli-tool notes live at content/cli/<tool>/index.md. Use the parent dir
      // slug (which equals the tool name) for the bundled filename so casts
      // get readable filenames like references/cli/cwltool.md.
      src = tp;
      const toolSlug =
        typeof metaByPath.get(tp)?.tool === "string"
          ? (metaByPath.get(tp)!.tool as string)
          : path.basename(path.posix.dirname(tp));
      dstOverride = path.posix.join(kindCfg.dst_dir, `${toolSlug}${kindCfg.dst_extension}`);
    } else {
      src = tp;
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
// note body can reference it at runtime. Companions ship verbatim regardless
// of the parent note's mode — a condensed note still points at its structured
// sibling. They inherit the parent ref's load/used_at/trigger/purpose and
// carry `companion_of` for provenance.
function expandCompanions(
  resolved: ResolvedRef[],
  metaByPath: Map<string, Frontmatter>,
  target: TargetConfig,
): ResolvedRef[] {
  const out: ResolvedRef[] = [];
  for (const r of resolved) {
    out.push(r);
    if (r.kind !== "research" && r.kind !== "pattern") continue;
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

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function sha256OfBuffer(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

function gitHead(repoRoot: string): string | null {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function copyVerbatim(srcAbs: string, dstAbs: string): void {
  mkdirSync(path.dirname(dstAbs), { recursive: true });
  copyFileSync(srcAbs, dstAbs);
}

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

// ---- runs/*/summary.json schema validation ----

function loadAjvForSchema(schemaPath: string): ReturnType<AjvValidator["compile"]> {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const schemaUri = typeof schema?.$schema === "string" ? schema.$schema : "";
  const ajv = schemaUri.includes("2020-12")
    ? new Ajv2020({ allErrors: true, strict: false })
    : new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

function validateRuns(bundleRoot: string, schemaAbs: string): string[] {
  const errors: string[] = [];
  const runsDir = path.join(bundleRoot, "runs");
  if (!existsSync(runsDir)) return errors;
  const validate = loadAjvForSchema(schemaAbs);
  for (const entry of readdirSync(runsDir)) {
    const summaryPath = path.join(runsDir, entry, "summary.json");
    if (!existsSync(summaryPath)) continue;
    const data = JSON.parse(readFileSync(summaryPath, "utf8"));
    if (!validate(data)) {
      const messages = (validate.errors ?? []).map(
        (e) => `    ${e.instancePath || "(root)"}: ${e.message}`,
      );
      errors.push(`runs/${entry}/summary.json:\n${messages.join("\n")}`);
    }
  }
  return errors;
}

// ---- provenance ----

interface ProvenanceRefEntry {
  kind: string;
  mode: string;
  ref: string;
  src: string;
  dst: string;
  used_at: string;
  load: string;
  evidence?: string;
  purpose?: string;
  trigger?: string;
  verification?: string;
  src_hash: string | null;
  dst_hash: string | null;
  source: "deterministic" | "llm";
  pending_llm?: boolean;
  prompt?: { origin: string; identity: string; hash?: string };
  model?: { name: string; version?: string };
  companion_of?: string;
  // License lineage of redistributed third-party content (foundry-pattern#4).
  // Absent for Foundry-authored refs (root LICENSE, out of policy scope).
  license?: string;
  license_file?: string;
  license_file_hash?: string;
}

interface ProvenanceArtifactOutput {
  id: string;
  kind: string;
  default_filename: string;
  schema?: string;
  description: string;
}

interface ProvenanceArtifactInput {
  id: string;
  description: string;
  inherited_schema?: string;
  producers?: string[];
}

interface ProvenanceArtifacts {
  produces: ProvenanceArtifactOutput[];
  consumes: ProvenanceArtifactInput[];
}

interface Provenance {
  provenance_schema_version: number;
  cast_target: string;
  mold: {
    name: string;
    path: string;
    revision?: number;
    content_hash: string;
    commit: string | null;
  };
  cast_method?: string;
  cast_agent?: string;
  cast_at: string;
  cast_date?: string;
  cast_revision?: number;
  cast_history?: Array<{ rev: number; date: string; note: string }>;
  refs: ProvenanceRefEntry[];
  artifacts?: ProvenanceArtifacts;
  validation_results?: ValidationResult[];
  open_questions?: string[];
}

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

interface ValidationResult {
  artifact_id: string;
  path: string;
  status: "passed" | "failed" | "error";
  validator_bin: string;
  artifact_hash?: string;
  stdout: string;
  stderr: string;
  stdout_hash?: string;
  stderr_hash?: string;
  exit_code?: number | null;
  error?: string;
}

export function buildProducerIndex(
  metaByPath: Map<string, Frontmatter>,
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
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
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
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
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

interface LegacyProvenanceCarryOver {
  cast_method?: string;
  cast_agent?: string;
  cast_date?: string;
  cast_revision?: number;
  cast_history?: Array<{ rev: number; date: string; note: string }>;
  open_questions?: string[];
  validation_results?: ValidationResult[];
  prior_refs?: Map<string, ProvenanceRefEntry>;
}

function readExistingProvenance(provenancePath: string): LegacyProvenanceCarryOver {
  if (!existsSync(provenancePath)) return {};
  const data = JSON.parse(readFileSync(provenancePath, "utf8")) as Record<string, unknown>;
  const carry: LegacyProvenanceCarryOver = {
    cast_method: typeof data.cast_method === "string" ? data.cast_method : undefined,
    cast_agent: typeof data.cast_agent === "string" ? data.cast_agent : undefined,
    cast_date: typeof data.cast_date === "string" ? data.cast_date : undefined,
    cast_revision: typeof data.cast_revision === "number" ? data.cast_revision : undefined,
    cast_history: Array.isArray(data.cast_history)
      ? (data.cast_history as Array<{ rev: number; date: string; note: string }>)
      : undefined,
    open_questions: Array.isArray(data.open_questions)
      ? (data.open_questions as string[])
      : undefined,
    validation_results: Array.isArray(data.validation_results)
      ? (data.validation_results as ValidationResult[])
      : undefined,
  };
  // Capture prior refs by src so condense LLM output and prompt provenance carry
  // over across re-casts. Accept v2 and v3 so a v2 bundle still seeds a v3 re-cast.
  if (
    typeof data.provenance_schema_version === "number" &&
    data.provenance_schema_version >= 2 &&
    Array.isArray(data.refs)
  ) {
    const prior = new Map<string, ProvenanceRefEntry>();
    for (const r of data.refs as ProvenanceRefEntry[]) {
      if (typeof r?.src === "string") prior.set(`${r.kind}:${r.src}`, r);
    }
    carry.prior_refs = prior;
  }
  return carry;
}

// ---- cast assembly ----

async function castOneRef(
  resolved: ResolvedRef,
  repoRoot: string,
  bundleRoot: string,
  prior: Map<string, ProvenanceRefEntry> | undefined,
  check: boolean,
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
    const expectedHash = sha256OfBuffer(json);
    const dstExists = existsSync(dstAbs);
    const dstHash = dstExists ? sha256(dstAbs) : null;
    let drift: string | undefined;
    if (dstHash !== expectedHash) {
      drift = dstExists ? "package schema content drifted" : "package schema missing";
      if (!check) {
        mkdirSync(path.dirname(dstAbs), { recursive: true });
        writeFileSync(dstAbs, json);
      }
    }
    return {
      entry: {
        ...skeleton(resolved),
        src_hash: expectedHash,
        dst_hash: drift && check ? dstHash : expectedHash,
        source: "deterministic",
      },
      drift,
    };
  }

  const srcAbs = path.join(repoRoot, resolved.src);
  if (!existsSync(srcAbs)) {
    return {
      entry: { ...skeleton(resolved), src_hash: null, dst_hash: null, source: "deterministic" },
      error: `ref source missing: ${resolved.src}`,
    };
  }
  const srcHash = sha256(srcAbs);

  if (resolved.mode === "verbatim") {
    const dstExists = existsSync(dstAbs);
    const dstHash = dstExists ? sha256(dstAbs) : null;
    let drift: string | undefined;
    if (dstHash !== srcHash) {
      drift = dstExists ? "dst hash differs from src" : "dst missing";
      if (!check) copyVerbatim(srcAbs, dstAbs);
    }
    return {
      entry: {
        ...skeleton(resolved),
        src_hash: srcHash,
        dst_hash: drift && check ? dstHash : srcHash,
        source: "deterministic",
      },
      drift,
    };
  }

  if (resolved.mode === "sidecar" && resolved.kind === "cli-command") {
    const parsed = readMarkdown(srcAbs);
    const sidecar = await buildCliSidecar(srcAbs, resolved.src, parsed.meta);
    const text = JSON.stringify(sidecar, null, 2) + "\n";
    const expectedHash = sha256OfBuffer(text);
    const dstExists = existsSync(dstAbs);
    const dstHash = dstExists ? sha256(dstAbs) : null;
    let drift: string | undefined;
    if (dstHash !== expectedHash) {
      drift = dstExists ? "sidecar content differs" : "sidecar missing";
      if (!check) {
        mkdirSync(path.dirname(dstAbs), { recursive: true });
        writeFileSync(dstAbs, text);
      }
    }
    return {
      entry: {
        ...skeleton(resolved),
        src_hash: srcHash,
        dst_hash: drift && check ? dstHash : expectedHash,
        source: "deterministic",
      },
      drift,
    };
  }

  if (resolved.mode === "condense") {
    // Two-phase. Deterministic phase records placeholder; LLM phase fills in.
    const priorEntry = prior?.get(`${resolved.kind}:${resolved.src}`);
    if (
      priorEntry &&
      priorEntry.pending_llm !== true &&
      priorEntry.src_hash === srcHash &&
      priorEntry.dst_hash
    ) {
      // Source hasn't drifted; carry forward prior LLM output entry.
      const dstExists = existsSync(dstAbs);
      const dstHash = dstExists ? sha256(dstAbs) : null;
      const drift =
        dstHash === priorEntry.dst_hash
          ? undefined
          : dstExists
            ? "condense output drifted vs recorded dst_hash"
            : "condense output missing";
      return {
        entry: {
          ...priorEntry,
          ...skeleton(resolved),
          src_hash: srcHash,
          dst_hash: priorEntry.dst_hash,
          source: "llm",
          prompt: priorEntry.prompt,
          model: priorEntry.model,
        },
        drift,
      };
    }
    // Either no prior LLM output, or source drifted — re-mark pending.
    return {
      entry: {
        ...skeleton(resolved),
        src_hash: srcHash,
        dst_hash: null,
        source: "llm",
        pending_llm: true,
      },
      drift: priorEntry ? "source drift requires re-condense" : "condense output not yet produced",
    };
  }

  return {
    entry: { ...skeleton(resolved), src_hash: srcHash, dst_hash: null, source: "deterministic" },
    error: `unsupported (kind=${resolved.kind}, mode=${resolved.mode})`,
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

// Enforce the license → redistribution-policy table (foundry-pattern#4) over the
// assembled refs, and stamp each redistributed ref's license_file content hash
// into provenance. Refs with no `license` are Foundry-authored (root LICENSE) and
// out of policy scope. The transform-mode check is the enforcement hook: an
// own-words-only license may not be carried verbatim/sidecar. The license_file
// *presence* rules live in the validator, where `upstream` scoping distinguishes
// Foundry-authored license annotations from genuine third-party redistribution.
// Returns error strings for any policy violation.
function applyLicensePolicy(entries: ProvenanceRefEntry[], repoRoot: string): string[] {
  // Load the policy table only when a ref actually redistributes licensed content,
  // so bundles/casts with no third-party refs don't require the table to exist.
  if (!entries.some((e) => e.license)) return [];
  const policy: LicensePolicy = loadLicensePolicy(repoRoot);
  const errors: string[] = [];
  for (const e of entries) {
    if (!e.license) continue;
    const row = resolveLicenseRow(policy, e.license);
    if (!row.allowed_modes.includes(e.mode as (typeof row.allowed_modes)[number])) {
      errors.push(
        `${e.src}: license ${e.license} (${row.policy}) forbids mode=${e.mode} (allowed: ${row.allowed_modes.join(", ")})`,
      );
    }
    if (e.license_file) {
      const abs = path.join(repoRoot, e.license_file);
      if (existsSync(abs)) {
        e.license_file_hash = sha256(abs);
      } else {
        errors.push(`${e.src}: license_file missing: ${e.license_file}`);
      }
    }
  }
  return errors;
}

// ---- deterministic SKILL.md assembly ----

function scalar(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stripWikiLinks(text: string): string {
  return text.replace(/\[\[([^\]#|]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_m, target, label) =>
    String(label || target).trim(),
  );
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

function refKindLabel(ref: ProvenanceRefEntry): string {
  if (ref.companion_of) return "Companion file";
  if (ref.kind === "schema") return "Schema file";
  if (ref.kind === "research") return "Research note";
  if (ref.kind === "pattern") return "Pattern note";
  if (ref.kind === "cli-tool") return "CLI tool reference";
  if (ref.kind === "cli-command") return "CLI command reference";
  return `${ref.kind} reference`;
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

function refRows(refs: ProvenanceRefEntry[]): string[] {
  return refs.map((r) => {
    const packaging =
      r.mode === "sidecar" ? "packaged as a sidecar" : "copied verbatim into the bundle";
    const details = [`- \`${r.dst}\`: ${refKindLabel(r)} ${packaging}.`];
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
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
): string[] {
  const rows: string[] = [];
  for (const output of outputs) {
    if (!output.schema) continue;
    const target = resolveWikiLink(output.schema, slugMap);
    const meta = target ? metaByPath.get(target) : undefined;
    const validator = scalar(meta?.validator_bin);
    const subcommand = scalar(meta?.validator_subcommand);
    const command = validator && subcommand ? `${validator} ${subcommand}` : validator;
    // A declared subcommand means the bin ships in the foundry CLI package; the
    // schema's `package` only names the export source (mirrors validate.ts).
    const validatorPackage = subcommand ? "@galaxy-foundry/foundry" : scalar(meta?.package);
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

function renderSection(title: string, lines: string[], empty = "- None declared."): string {
  return [`## ${title}`, "", ...(lines.length ? lines : [empty]), ""].join("\n");
}

function renderSkillMarkdown(args: {
  moldName: string;
  meta: Frontmatter;
  body: string;
  refs: ProvenanceRefEntry[];
  artifacts?: ProvenanceArtifacts;
  slugMap: Map<string, string>;
  metaByPath: Map<string, Frontmatter>;
  requiredTools: RequiredTool[];
}): string {
  const summary = scalar(args.meta.summary) ?? `Run the ${args.moldName} Mold.`;
  const consumes = args.artifacts?.consumes ?? [];
  const produces = args.artifacts?.produces ?? [];
  const upfront = args.refs.filter((r) => r.load === "upfront" && r.used_at !== "cast-time");
  const onDemand = args.refs.filter((r) => r.load === "on-demand" && r.used_at !== "cast-time");
  const validationRows = schemaValidationRows(produces, args.slugMap, args.metaByPath);
  const toolRows = requiredToolRows(args.requiredTools);
  const body = runtimeProcedureBody(args.body, args.moldName);
  const lines = [
    "---",
    `name: ${args.moldName}`,
    `description: "${escapeFrontmatterString(stripWikiLinks(summary))}"`,
    "---",
    "",
    `# ${args.moldName}`,
    "",
    "Follow the procedure below and use the artifact/reference sections as the runtime contract.",
    "",
    renderSection("When To Use", [`- ${stripWikiLinks(summary)}`]),
    renderSection(
      "Inputs",
      artifactRows(consumes, "input"),
      "- No upstream artifact inputs declared. See the procedure for user-supplied runtime inputs.",
    ),
    renderSection("Outputs", artifactRows(produces, "output")),
    renderSection(
      "Required Tools",
      toolRows,
      "- None declared. Procedure should not assume external CLIs are present.",
    ),
    renderSection("Load Upfront", refRows(upfront)),
    renderSection("Load On Demand", refRows(onDemand)),
    renderSection("Validation", validationRows),
    "## Procedure",
    "",
    body || "No Mold body supplied.",
    "",
    "## Runtime Notes",
    "",
    "- Do not read Foundry source files at runtime; use only files packaged in this skill bundle and user-supplied artifacts.",
    "- Preserve declared artifact filenames unless the user or harness supplies explicit paths.",
    "- Carry unresolved assumptions into the output artifact instead of silently inventing missing source evidence.",
    "",
  ];
  return lines.join("\n");
}

function reconcileSkillMarkdown(
  bundleRoot: string,
  expected: string,
  check: boolean,
): { drift?: string } {
  const skillPath = path.join(bundleRoot, "SKILL.md");
  const expectedHash = sha256OfBuffer(expected);
  const exists = existsSync(skillPath);
  const currentHash = exists ? sha256(skillPath) : null;
  if (currentHash === expectedHash) return {};
  if (!check) writeFileSync(skillPath, expected);
  return {
    drift: exists ? "SKILL.md content differs from deterministic render" : "SKILL.md missing",
  };
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
  const moldHash = sha256(moldAbs);

  // Claude target lives under a `skills/` subdir so casts/claude/ doubles as a
  // Claude Code plugin root (.claude-plugin/plugin.json + skills/<name>/SKILL.md).
  const bundleRoot =
    args.target === "claude"
      ? path.join(repoRoot, "casts", args.target, "skills", args.moldName)
      : path.join(repoRoot, "casts", args.target, args.moldName);
  // --check is read-only: never materialize the bundle dir for a never-cast Mold.
  if (!args.check) mkdirSync(bundleRoot, { recursive: true });
  const provenancePath = path.join(bundleRoot, "_provenance.json");
  const carry = readExistingProvenance(provenancePath);

  const { slugMap, metaByPath } = buildSlugMap(repoRoot);
  const producerIndex = buildProducerIndex(metaByPath);

  const rawRefs = Array.isArray(moldParsed.meta.references)
    ? (moldParsed.meta.references as unknown[])
    : [];
  const resolved: ResolvedRef[] = [];
  const errors: string[] = [];
  rawRefs.forEach((r, i) => {
    const out = resolveMoldRef(r, i, moldRel, slugMap, metaByPath, target);
    if (out.error) errors.push(out.error);
    if (out.resolved) resolved.push(out.resolved);
  });

  // Expand multi-file notes' declared companion files into sibling verbatim refs.
  const expanded = expandCompanions(resolved, metaByPath, target);
  resolved.length = 0;
  resolved.push(...expanded);

  // Stable ordering: by (kind, src).
  resolved.sort((a, b) =>
    a.kind === b.kind ? a.src.localeCompare(b.src) : a.kind.localeCompare(b.kind),
  );

  const refEntries: ProvenanceRefEntry[] = [];
  const drift: Array<{ src: string; reason: string }> = [];

  for (const r of resolved) {
    const result = await castOneRef(r, repoRoot, bundleRoot, carry.prior_refs, args.check);
    refEntries.push(result.entry);
    if (result.error) errors.push(result.error);
    if (result.drift) drift.push({ src: r.src, reason: result.drift });
  }

  // License → redistribution-policy enforcement + license_file hashing.
  errors.push(...applyLicensePolicy(refEntries, repoRoot));

  const artifactContracts = readArtifactContracts(moldParsed.meta, producerIndex);
  const requiredTools = aggregateRequiredTools(refEntries, metaByPath, slugMap);
  const skillText = renderSkillMarkdown({
    moldName: args.moldName,
    meta: moldParsed.meta,
    body: moldParsed.body,
    refs: refEntries,
    artifacts: artifactContracts,
    slugMap,
    metaByPath,
    requiredTools,
  });
  const skillResult = reconcileSkillMarkdown(bundleRoot, skillText, args.check);
  if (skillResult.drift) drift.push({ src: "SKILL.md", reason: skillResult.drift });

  // Emit/reconcile _required_tools.json manifest at bundle root.
  const requiredToolsPath = path.join(bundleRoot, "_required_tools.json");
  if (requiredTools.length === 0) {
    if (existsSync(requiredToolsPath)) {
      if (args.check) {
        drift.push({ src: "_required_tools.json", reason: "stale manifest (no tools required)" });
      } else {
        unlinkSync(requiredToolsPath);
      }
    }
  } else {
    const manifestText = JSON.stringify(requiredTools, null, 2) + "\n";
    const expectedHash = sha256OfBuffer(manifestText);
    const exists = existsSync(requiredToolsPath);
    const currentHash = exists ? sha256(requiredToolsPath) : null;
    if (currentHash !== expectedHash) {
      drift.push({
        src: "_required_tools.json",
        reason: exists ? "manifest content drifted" : "manifest missing",
      });
      if (!args.check) writeFileSync(requiredToolsPath, manifestText);
    }
  }

  const verify = buildVerifyManifest(moldParsed.meta, producerIndex, slugMap, metaByPath);
  const verifyText = JSON.stringify(verify, null, 2) + "\n";
  const verifyPath = path.join(bundleRoot, "_verify.json");
  if (args.check) {
    const existingVerifyHash = existsSync(verifyPath) ? sha256(verifyPath) : null;
    const expectedVerifyHash = sha256OfBuffer(verifyText);
    if (existingVerifyHash !== expectedVerifyHash) {
      drift.push({
        src: "_verify.json",
        reason: existingVerifyHash ? "verify manifest content drifted" : "verify manifest missing",
      });
    }
  }

  // runs/*/summary.json validation — find a schema ref for this mold and validate any committed runs.
  const schemaRefEntry =
    refEntries.find((r) => r.kind === "schema" && r.ref === "[[summary-nextflow]]") ??
    refEntries.find((r) => r.kind === "schema");
  if (schemaRefEntry) {
    const schemaAbs = path.join(bundleRoot, schemaRefEntry.dst);
    if (existsSync(schemaAbs)) {
      errors.push(...validateRuns(bundleRoot, schemaAbs));
    }
  }

  // Report.
  for (const e of errors) console.error(`error: ${e}`);
  for (const d of drift) console.error(`drift: ${d.src} — ${d.reason}`);

  if (args.check) {
    if (errors.length || drift.length) {
      console.error(`check failed: ${errors.length} error(s), ${drift.length} drift(s)`);
      process.exit(1);
    }
    if (refEntries.some((r) => r.pending_llm)) {
      const pending = refEntries
        .filter((r) => r.pending_llm)
        .map((r) => r.src)
        .join(", ");
      console.error(`check failed: pending_llm refs: ${pending}`);
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
    provenance_schema_version: target.provenance_schema_version,
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
  writeFileSync(verifyPath, verifyText);
  console.log(`wrote ${path.relative(repoRoot, provenancePath)}`);
  if (drift.length) console.log(`reconciled ${drift.length} drifted ref(s)`);
  if (refEntries.some((r) => r.pending_llm)) {
    const pending = refEntries.filter((r) => r.pending_llm).map((r) => r.src);
    console.log(`pending LLM steps for ${pending.length} ref(s):`);
    for (const s of pending) console.log(`  - ${s}`);
  }
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) {
  runCastMoldCommand().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
