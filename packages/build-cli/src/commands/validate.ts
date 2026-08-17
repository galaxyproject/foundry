#!/usr/bin/env tsx
// Foundry frontmatter validator.
// See INITIAL_ARCHITECTURE.md §6 for the layered pipeline.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { galaxyToolCacheCliMeta, gxwfCliMeta } from "@galaxy-tool-util/cli/meta";
import { foundryCliMeta } from "@galaxy-foundry/foundry/meta";
import { planemoCliMeta } from "@galaxy-foundry/planemo-cli-meta";
import {
  buildNoteSchema,
  collectionOf,
  CONTENT_DIR,
  kindOf,
  KINDS_BY_NAME,
  loadReferenceContract,
  nonNoteAllowanceOf,
  type NoteSchema,
} from "@galaxy-foundry/note-schema";
// Directly from the shared package rather than through the barrel, which is the arrangement
// note-schema states for every other borrowed mechanism: one place to look, nothing to drift.
import { checkCompanions } from "@galaxy-foundry/kind-schema";
import { bundledPolicy, resolveLicenseRow } from "@galaxy-foundry/license-policy";
import { readMarkdown } from "../lib/frontmatter.js";
import { parsePhases, phaseMoldPaths, type ParsedPhase } from "../lib/pipeline-phases.js";
import { loadTagRegistry } from "../lib/schema.js";
import { GALAXY_SLUG_ALIASES, readContent } from "../lib/slug-map.js";
import type { FileMeta, Frontmatter, ValidationResult } from "../lib/types.js";
import { fileSlug, findMdFiles, routablePath } from "../lib/walk.js";
import { resolveWikiLink, WIKI_LINK_RE } from "../lib/wiki-links.js";

interface CliArgs {
  directory: string;
  tagsPath: string;
  root: string | null;
}

const CLI_METADATA_KEYS = new Set([
  ...[gxwfCliMeta, galaxyToolCacheCliMeta, foundryCliMeta].flatMap((program) =>
    program.commands.map((command) => `${program.name}/${command.name}`),
  ),
  ...planemoCliMeta.commands
    .filter((command) => !command.internal)
    .map((command) => `${planemoCliMeta.program}/${command.name}`),
]);

/**
 * The commands THIS repository implements, as opposed to the three programs whose metadata it
 * merely reads. A page for one of these summarizes nothing: the code is in the same tree, and a
 * `source_url` pointing back at our own `program.ts` gives a reader no second place to check.
 * Every other cli-command page is a summary of an external document and owes one.
 */
const OWN_CLI_KEYS = new Set(
  foundryCliMeta.commands.map((command) => `${foundryCliMeta.name}/${command.name}`),
);

/** Single-value vs array wiki-link fields. Schema's regex catches missing brackets; this catches whitespace-only inner text. */
const WIKI_LINK_FIELDS: Record<string, "single" | "array"> = {
  parent_pattern: "single",
  related_notes: "array",
  related_patterns: "array",
  related_molds: "array",
  implemented_by_patterns: "array",
};

// ---- per-file validation ----

export function validateData(data: Frontmatter, schema: NoteSchema): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };
  result.errors.push(...validateSchema(data, schema));
  result.errors.push(...validateDates(data));
  const wiki = validateWikiLinks(data);
  result.errors.push(...wiki.errors);
  result.warnings.push(...wiki.warnings);
  return result;
}

function validateSchema(data: Frontmatter, schema: NoteSchema): string[] {
  const parsed = schema.safeParse(data);
  if (parsed.success) return [];
  const messages = parsed.error.issues.map((issue) => {
    const loc = issue.path.join(".") || "(root)";
    if (issue.code === "unrecognized_keys") {
      // `.strict()` rejected extra keys. Preserve the producer-owned-schema hint
      // and otherwise mirror the old ajv additionalProperties wording.
      if (issue.keys.includes("schema") && /^input_artifacts\.\d+$/.test(loc)) {
        return `${loc}: 'schema' is producer-owned — declare it on the producer Mold's output_artifacts[].schema (consumers inherit via id).`;
      }
      const key = issue.keys[0] ?? "";
      const at = loc === "(root)" ? key : `${loc}.${key}`;
      return `${at}: must NOT have additional properties ('${key}')`;
    }
    return `${loc}: ${issue.message}`;
  });
  return messages.sort((a, b) => a.localeCompare(b));
}

function validateDates(data: Frontmatter): string[] {
  const errors: string[] = [];
  for (const field of ["created", "revised"] as const) {
    const v = data[field];
    if (typeof v !== "string") continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) {
      errors.push(`${field}: '${v}' is not a valid ISO date (YYYY-MM-DD)`);
    }
  }
  return errors;
}

function validateWikiLinks(data: Frontmatter): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };
  for (const [field, mode] of Object.entries(WIKI_LINK_FIELDS)) {
    const v = data[field];
    if (v === undefined) continue;
    const values = mode === "single" ? [v] : Array.isArray(v) ? v : [];
    values.forEach((val, i) => {
      if (typeof val !== "string") return;
      const m = WIKI_LINK_RE.exec(val);
      if (!m) return;
      const inner = m[1];
      if (inner !== undefined && inner.trim() === "") {
        const loc = mode === "array" ? `${field}[${i}]` : field;
        result.errors.push(`${loc}: wiki link has whitespace-only inner text: '${val}'`);
      }
    });
  }
  const refs = data.references;
  if (Array.isArray(refs)) {
    refs.forEach((ref, i) => {
      if (typeof ref !== "object" || ref === null || Array.isArray(ref)) return;
      const value = (ref as Record<string, unknown>).ref;
      if (typeof value !== "string") return;
      const m = WIKI_LINK_RE.exec(value);
      if (!m) return;
      const inner = m[1];
      if (inner !== undefined && inner.trim() === "") {
        result.errors.push(
          `references[${i}].ref: wiki link has whitespace-only inner text: '${value}'`,
        );
      }
    });
  }
  return result;
}

// ---- cross-file validation ----

interface CrossFileFinding {
  path: string;
  message: string;
  severity: "error" | "warning";
}

// Registry drift — "is a registered tag carried by nothing?" — is deliberately NOT checked
// here. validateDirectory runs against arbitrary directories, including small fixtures, where
// almost every registered tag is legitimately unused; the question only means anything against
// the whole corpus. It lives in tests/registry-drift.test.ts instead.

// Addressing has to match what casting resolves against, or a link this command calls good
// fails at cast time. The whole map is taken from the same reader the caster's is projected
// from, rather than the same rule restated a third time — assemble-pipeline's copy carried a
// comment claiming parity with cast's instead of holding it.
//
// Narrowed to files that validated, which is this command's own rule and not the reader's: a
// note whose frontmatter is broken should not be reachable by a link the same run calls good.
function buildSlugMap(files: FileMeta[], contentRoot: string): Map<string, string> {
  const valid = new Map(files.map((f) => [path.resolve(f.path), f.path]));
  const m = new Map<string, string>();
  for (const [address, note] of readContent(contentRoot, GALAXY_SLUG_ALIASES).notesByAddress) {
    const full = valid.get(path.resolve(contentRoot, path.relative(CONTENT_DIR, note.file)));
    if (full) m.set(address, full);
  }
  return m;
}

/** `related_patterns` and `related_molds` resolve to a note of the kind the field names. */
function validateRelatedFields(
  files: FileMeta[],
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const checks: Array<{ field: string; expected: string }> = [
    { field: "related_patterns", expected: "pattern" },
    { field: "related_molds", expected: "mold" },
  ];
  for (const f of files) {
    for (const c of checks) {
      const v = f.meta[c.field];
      if (!Array.isArray(v)) continue;
      for (const wl of v) {
        const tp = resolveWikiLink(wl, slugMap);
        if (!tp) {
          findings.push({
            path: f.path,
            severity: "error",
            message: `${c.field}: wiki link ${wl} did not resolve`,
          });
          continue;
        }
        const targetType = metaByPath.get(tp)?.type;
        if (targetType !== c.expected) {
          findings.push({
            path: f.path,
            severity: "error",
            message: `${c.field}: wiki link ${wl} resolves to type=${targetType ?? "(none)"}, expected ${c.expected}`,
          });
        }
      }
    }
  }
  return findings;
}

/** Mold typed-references resolve to a note of the kind the reference declares. */
function validateMoldRefs(
  files: FileMeta[],
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
  contentRoot: string,
): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  for (const f of files) {
    if (f.meta.type !== "mold") continue;
    const typedRefs = f.meta.references;
    if (Array.isArray(typedRefs)) {
      typedRefs.forEach((ref, i) => {
        validateTypedReference(ref, i, f.path, contentRoot, slugMap, metaByPath, findings);
      });
    }
  }
  return findings;
}

function validateSourcePatternRefs(
  files: FileMeta[],
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  for (const f of files) {
    if (f.meta.type !== "source-pattern") continue;
    const refs = f.meta.implemented_by_patterns;
    if (!Array.isArray(refs)) continue;
    for (const wl of refs) {
      const tp = resolveWikiLink(wl, slugMap);
      if (!tp) {
        findings.push({
          path: f.path,
          severity: "error",
          message: `implemented_by_patterns: wiki link ${wl} did not resolve`,
        });
        continue;
      }
      const targetType = metaByPath.get(tp)?.type;
      if (targetType !== "pattern") {
        findings.push({
          path: f.path,
          severity: "error",
          message: `implemented_by_patterns: wiki link ${wl} resolves to type=${targetType ?? "(none)"}, expected pattern`,
        });
      }
    }
  }
  return findings;
}

function validateTypedReference(
  raw: unknown,
  index: number,
  filePath: string,
  contentRoot: string,
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
  findings: CrossFileFinding[],
): void {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return;
  const ref = raw as Record<string, unknown>;
  if (typeof ref.kind !== "string" || typeof ref.ref !== "string") return;

  const expectedTypes: Record<string, string> = {
    pattern: "pattern",
    "cli-command": "cli-command",
    prompt: "prompt",
    research: "research",
  };

  if (ref.kind === "schema") {
    if (ref.evidence === "hypothesis") {
      findings.push({
        path: filePath,
        severity: "warning",
        message: `references[${index}]: schema ref with evidence=hypothesis is suspicious — schema is the cast contract, expect cast-validated`,
      });
    }
    // Schema refs are wiki-links to a `type: schema` note that declares both
    // `package` and `package_export` (cast-mold imports the named export).
    if (!WIKI_LINK_RE.test(ref.ref)) {
      findings.push({
        path: filePath,
        severity: "error",
        message: `references[${index}]: schema ref must be a [[wiki-link]] to a schema note (got ${ref.ref})`,
      });
      return;
    }
    const tp = resolveWikiLink(ref.ref, slugMap);
    if (!tp) {
      findings.push({
        path: filePath,
        severity: "error",
        message: `references[${index}]: schema ref ${ref.ref} did not resolve`,
      });
      return;
    }
    const noteMeta = metaByPath.get(tp);
    if (noteMeta?.type !== "schema") {
      findings.push({
        path: filePath,
        severity: "error",
        message: `references[${index}]: schema ref ${ref.ref} resolves to type=${noteMeta?.type ?? "(none)"}, expected schema`,
      });
      return;
    }
    const pkg = typeof noteMeta.package === "string" ? noteMeta.package : null;
    const exp = typeof noteMeta.package_export === "string" ? noteMeta.package_export : null;
    if (!pkg || !exp) {
      findings.push({
        path: filePath,
        severity: "error",
        message: `references[${index}]: schema wiki-link ref requires the target note to declare both 'package' and 'package_export' (got package=${pkg ?? "(none)"}, package_export=${exp ?? "(none)"})`,
      });
    }
    return;
  }
  if (ref.kind === "example") {
    validatePathReference(ref.ref, index, filePath, contentRoot, findings, "content/");
    return;
  }

  const expected = expectedTypes[ref.kind];
  if (!expected) return;
  const tp = resolveWikiLink(ref.ref, slugMap);
  if (!tp) {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: ${ref.kind} ref ${ref.ref} did not resolve`,
    });
    return;
  }
  const targetType = metaByPath.get(tp)?.type;
  if (targetType !== expected) {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: ${ref.kind} ref ${ref.ref} resolves to type=${targetType ?? "(none)"}, expected ${expected}`,
    });
  }
}

function validatePathReference(
  ref: string,
  index: number,
  filePath: string,
  contentRoot: string,
  findings: CrossFileFinding[],
  requiredPrefix: string,
): void {
  if (WIKI_LINK_RE.test(ref)) {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: path reference must not be a wiki link: ${ref}`,
    });
    return;
  }
  if (!ref.startsWith(requiredPrefix)) {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: path reference must start with ${requiredPrefix}: ${ref}`,
    });
    return;
  }
  const repoRelativeAbs = path.resolve(process.cwd(), ref);
  const contentRelativeAbs = path.resolve(contentRoot, ref.replace(/^content\//, ""));
  const abs = existsSync(repoRelativeAbs) ? repoRelativeAbs : contentRelativeAbs;
  if (!existsSync(abs)) {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: path reference does not exist: ${ref}`,
    });
    return;
  }
  if (!statSync(abs).isFile()) {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: path reference is not a file: ${ref}`,
    });
  }
}

// Phase parsing lives in `lib/pipeline-phases.ts` (shared with the assembler).
// `validatePipelinePhases` consumes its typed descriptors below.

/**
 * Mold artifact handoff validation.
 *   - Every `input_artifacts[].id` must resolve to some `output_artifacts[].id`
 *     declared by another Mold (multi-producer is allowed; same id can come
 *     from a discover-or-author branch).
 *   - All producers of the same artifact id must declare the same schema, or
 *     none at all; consumers inherit the contract by id.
 *   - When `output_artifacts[].schema` is set, the wiki-link must resolve to a
 *     `type: schema` note.
 */
function validateArtifactGraph(
  files: FileMeta[],
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const producerIds = new Set<string>();
  const producersById = new Map<
    string,
    Array<{ path: string; index: number; schema?: string; schemaTarget?: string }>
  >();
  for (const f of files) {
    if (f.meta.type !== "mold") continue;
    const out = f.meta.output_artifacts;
    if (!Array.isArray(out)) continue;
    out.forEach((a, index) => {
      if (a && typeof a === "object" && typeof (a as { id?: unknown }).id === "string") {
        const id = (a as { id: string }).id;
        producerIds.add(id);
        const schema = (a as { schema?: unknown }).schema;
        const producers = producersById.get(id) ?? [];
        producers.push({
          path: f.path,
          index,
          schema: typeof schema === "string" ? schema : undefined,
          schemaTarget:
            typeof schema === "string"
              ? (resolveWikiLink(schema, slugMap) ?? undefined)
              : undefined,
        });
        producersById.set(id, producers);
      }
    });
  }
  for (const [id, producers] of producersById) {
    if (producers.length < 2) continue;
    const declaredSchemas = producers.filter((p) => p.schema);
    const schemaTargets = new Set(declaredSchemas.map((p) => p.schemaTarget ?? p.schema));
    if (schemaTargets.size > 1) {
      const declared = producers
        .map((p) => `${p.path}:output_artifacts[${p.index}].schema=${p.schema ?? "(none)"}`)
        .join(", ");
      findings.push({
        path: producers[0]!.path,
        severity: "error",
        message: `output_artifacts id '${id}' has inconsistent producer schemas; consumers inherit by id, so all producers must declare the same schema or none (${declared})`,
      });
    } else if (declaredSchemas.length > 0 && declaredSchemas.length < producers.length) {
      const declared = producers
        .map((p) => `${p.path}:output_artifacts[${p.index}].schema=${p.schema ?? "(none)"}`)
        .join(", ");
      findings.push({
        path: producers[0]!.path,
        severity: "warning",
        message: `output_artifacts id '${id}' has mixed schema coverage across producers; consumers cannot inherit a guaranteed contract until every producer declares the same schema (${declared})`,
      });
    }
  }
  for (const f of files) {
    if (f.meta.type !== "mold") continue;
    const out = f.meta.output_artifacts;
    if (Array.isArray(out)) {
      const refs = Array.isArray(f.meta.references) ? f.meta.references : [];
      const schemaRefs = new Set<string>(
        refs
          .map((r) =>
            r && typeof r === "object" && (r as { kind?: unknown }).kind === "schema"
              ? (r as { ref?: unknown }).ref
              : null,
          )
          .filter((v): v is string => typeof v === "string"),
      );
      out.forEach((a, i) => {
        if (!a || typeof a !== "object") return;
        const schema = (a as { schema?: unknown }).schema;
        if (typeof schema !== "string") return;
        const tp = resolveWikiLink(schema, slugMap);
        if (!tp) {
          findings.push({
            path: f.path,
            severity: "error",
            message: `output_artifacts[${i}].schema: wiki link ${schema} did not resolve`,
          });
          return;
        }
        const noteMeta = metaByPath.get(tp);
        const targetType = noteMeta?.type;
        if (targetType !== "schema") {
          findings.push({
            path: f.path,
            severity: "error",
            message: `output_artifacts[${i}].schema: wiki link ${schema} resolves to type=${targetType ?? "(none)"}, expected schema`,
          });
          return;
        }
        const pkg = typeof noteMeta?.package === "string" ? noteMeta.package : null;
        const exp = typeof noteMeta?.package_export === "string" ? noteMeta.package_export : null;
        if (!pkg || !exp) {
          findings.push({
            path: f.path,
            severity: "error",
            message: `output_artifacts[${i}].schema: target schema note ${schema} must declare both 'package' and 'package_export' (got package=${pkg ?? "(none)"}, package_export=${exp ?? "(none)"})`,
          });
        }
        if (!schemaRefs.has(schema)) {
          findings.push({
            path: f.path,
            severity: "warning",
            message: `output_artifacts[${i}].schema declares ${schema} but no matching references[] entry of kind=schema — the schema will be named in the cast contract but not packaged into the bundle. Add a 'kind: schema, ref: "${schema}"' entry to references.`,
          });
        }
      });
    }
    const inp = f.meta.input_artifacts;
    if (Array.isArray(inp)) {
      inp.forEach((a, i) => {
        if (!a || typeof a !== "object") return;
        const id = (a as { id?: unknown }).id;
        if (typeof id !== "string") return;
        if (!producerIds.has(id)) {
          findings.push({
            path: f.path,
            severity: "error",
            message: `input_artifacts[${i}].id '${id}' has no producer (no Mold declares it in output_artifacts)`,
          });
        }
      });
    }
  }
  return findings;
}

function validateSchemaVendoring(files: FileMeta[], contentRoot: string): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const repoRoot =
    path.basename(contentRoot) === "content" ? path.dirname(contentRoot) : contentRoot;
  // The table ships with the package rather than sitting in the tree being validated,
  // so a content tree no longer has to carry a copy to be checked against it.
  const getPolicy = bundledPolicy;

  // Reconcile with the license → redistribution-policy table (foundry-pattern#4):
  // an own-words-only license redistributes nothing verbatim, so it must NOT ship
  // a license_file. Applies to every note type that carries a license.
  for (const f of files) {
    const license = typeof f.meta.license === "string" ? f.meta.license : "";
    if (!license) continue;
    const row = resolveLicenseRow(getPolicy(), license);
    const licenseFile = typeof f.meta.license_file === "string" ? f.meta.license_file : "";
    if (row.policy === "own-words-only" && licenseFile) {
      findings.push({
        path: f.path,
        severity: "error",
        message: `license ${license} is own-words-only; drop license_file (nothing is redistributed verbatim)`,
      });
    }
  }

  // External-upstream schema notes redistribute third-party content: they must
  // declare a license, and (for verbatim-carry licenses) a license_file that exists.
  for (const f of files) {
    if (f.meta.type !== "schema") continue;
    const upstream = typeof f.meta.upstream === "string" ? f.meta.upstream : "";
    if (!upstream || upstream.includes("github.com/galaxyproject/foundry/")) continue;
    if (typeof f.meta.license !== "string") {
      findings.push({
        path: f.path,
        severity: "error",
        message: "vendored schema with external upstream must declare license",
      });
      continue;
    }
    const row = resolveLicenseRow(getPolicy(), f.meta.license);
    if (!row.license_file) continue; // own-words-only carry needs no license_file
    const licenseFile = typeof f.meta.license_file === "string" ? f.meta.license_file : "";
    if (!licenseFile) {
      findings.push({
        path: f.path,
        severity: "error",
        message: "vendored schema with external upstream must declare license_file",
      });
      continue;
    }
    const fullPath = path.join(repoRoot, licenseFile);
    if (!existsSync(fullPath) || !statSync(fullPath).isFile() || statSync(fullPath).size === 0) {
      findings.push({
        path: f.path,
        severity: "error",
        message: `license_file: file does not exist or is empty: ${licenseFile}`,
      });
    }
  }
  return findings;
}

function packageJsonPath(repoRoot: string, packageName: string): string {
  if (packageName.startsWith("@galaxy-foundry/")) {
    return path.join(repoRoot, "packages", packageName.split("/")[1]!, "package.json");
  }
  return path.join(repoRoot, "node_modules", ...packageName.split("/"), "package.json");
}

function validateSchemaValidatorBins(files: FileMeta[], contentRoot: string): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const repoRoot =
    path.basename(contentRoot) === "content" ? path.dirname(contentRoot) : contentRoot;
  for (const f of files) {
    if (f.meta.type !== "schema") continue;
    const validatorBin = typeof f.meta.validator_bin === "string" ? f.meta.validator_bin : "";
    if (!validatorBin) continue;
    // The package that SHIPS the bin: `validator_package` when the note declares one,
    // otherwise `package` (which names the export source, and usually ships the CLI too).
    const packageName =
      typeof f.meta.validator_package === "string"
        ? f.meta.validator_package
        : typeof f.meta.package === "string"
          ? f.meta.package
          : "";
    if (!packageName) {
      findings.push({
        path: f.path,
        severity: "error",
        message: `validator_bin '${validatorBin}' requires package or validator_package frontmatter`,
      });
      continue;
    }
    const pkgPath = packageJsonPath(repoRoot, packageName);
    if (!existsSync(pkgPath)) {
      findings.push({
        path: f.path,
        severity: "error",
        message: `validator_bin '${validatorBin}' package ${packageName} has no package.json at ${path.relative(repoRoot, pkgPath)}`,
      });
      continue;
    }
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
    } catch (e) {
      findings.push({
        path: f.path,
        severity: "error",
        message: `validator_bin '${validatorBin}' package ${packageName} package.json is not valid JSON: ${(e as Error).message}`,
      });
      continue;
    }
    const bin = pkg.bin;
    const hasBin =
      typeof bin === "string"
        ? validatorBin === packageName.split("/").pop()
        : !!(bin && typeof bin === "object" && validatorBin in bin);
    if (!hasBin) {
      findings.push({
        path: f.path,
        severity: "error",
        message: `validator_bin '${validatorBin}' is not declared in ${packageName} package.json bin map`,
      });
    }
  }
  return findings;
}

function validatePipelinePhases(
  files: FileMeta[],
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  for (const f of files) {
    if (f.meta.type !== "pipeline") continue;
    const phases = f.meta.phases;
    if (!Array.isArray(phases)) continue;
    const parsed = parsePhases(phases, slugMap, metaByPath, f.path);
    findings.push(...parsed.findings);
    findings.push(...validatePipelineArtifactBindings(f, parsed.phases, metaByPath));
  }
  return findings;
}

/**
 * Every phase's input_artifacts are produced by a prior phase, counting inputs that
 * share a `role` as alternatives that one producer satisfies.
 */
function validatePipelineArtifactBindings(
  file: FileMeta,
  phases: ParsedPhase[],
  metaByPath: Map<string, Frontmatter>,
): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const phaseDecls: { out: Set<string>; in: { id: string; role?: string }[] }[] = [];

  phases.forEach((phase) => {
    const out = new Set<string>();
    const inputs: { id: string; role?: string }[] = [];
    for (const moldPath of phaseMoldPaths(phase)) {
      const meta = metaByPath.get(moldPath);
      if (!meta) continue;
      const o = meta.output_artifacts;
      if (Array.isArray(o)) {
        for (const a of o) {
          if (a && typeof a === "object" && typeof (a as { id?: unknown }).id === "string") {
            out.add((a as { id: string }).id);
          }
        }
      }
      const inp = meta.input_artifacts;
      if (Array.isArray(inp)) {
        for (const a of inp) {
          if (a && typeof a === "object" && typeof (a as { id?: unknown }).id === "string") {
            const { id, role } = a as { id: string; role?: unknown };
            inputs.push({ id, role: typeof role === "string" ? role : undefined });
          }
        }
      }
    }
    phaseDecls.push({ out, in: inputs });
  });

  // Build cumulative produced ids, walking phases in order.
  const cumulative = new Set<string>();
  phaseDecls.forEach((decl, i) => {
    // A phase may satisfy its own input — loop phases re-feed themselves.
    const bound = (id: string) => cumulative.has(id) || decl.out.has(id);
    const roles = new Map<string, string[]>();
    for (const inp of decl.in) {
      if (inp.role) {
        roles.set(inp.role, [...(roles.get(inp.role) ?? []), inp.id]);
      } else if (!bound(inp.id)) {
        findings.push({
          path: file.path,
          severity: "warning",
          message: `phases[${i}]: input_artifact '${inp.id}' has no prior phase producing it in this pipeline`,
        });
      }
    }
    for (const [role, ids] of roles) {
      if (!ids.some(bound)) {
        findings.push({
          path: file.path,
          severity: "warning",
          message: `phases[${i}]: no prior phase produces any input_artifact for role '${role}' (${ids.join(", ")})`,
        });
      }
    }
    for (const id of decl.out) cumulative.add(id);
  });

  return findings;
}

const REFINEMENT_DECISION_VOCAB = new Set([
  "keep",
  "schema-change",
  "reference-change",
  "eval-add",
  "open-question",
  "other",
]);

function validateMoldSourceLayout(contentRoot: string, moldFiles: FileMeta[]): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const moldsRoot = path.join(contentRoot, "molds");
  if (!existsSync(moldsRoot) || !statSync(moldsRoot).isDirectory()) return findings;

  const seenMoldDirs = new Set(moldFiles.map((f) => path.dirname(f.path)));
  for (const entry of readdirSync(moldsRoot).sort()) {
    const moldDir = path.join(moldsRoot, entry);
    if (!statSync(moldDir).isDirectory()) continue;
    const indexPath = path.join(moldDir, "index.md");
    const evalPath = path.join(moldDir, "eval.md");

    if (!existsSync(indexPath)) {
      findings.push({
        path: moldDir,
        severity: "error",
        message: "mold source directory must contain index.md",
      });
    } else if (!seenMoldDirs.has(moldDir)) {
      findings.push({
        path: indexPath,
        severity: "error",
        message: "mold source index.md must validate as type=mold",
      });
    }

    for (const mdPath of listMarkdownFiles(moldDir)) {
      if (path.basename(mdPath) === "index.md") continue;
      const rel = path.relative(moldDir, mdPath);
      const inRefinements = rel.split(path.sep)[0] === "refinements";
      const parsed = readMarkdown(mdPath);
      if (inRefinements) {
        validateRefinementEntry(mdPath, parsed, findings);
      } else if (parsed.hasFrontmatter) {
        findings.push({
          path: mdPath,
          severity: "error",
          message: "only mold index.md may have frontmatter",
        });
      }
    }

    const scenariosPath = path.join(moldDir, "scenarios.md");
    if (existsSync(scenariosPath)) {
      const scenariosBody = readMarkdown(scenariosPath).body;
      if (!/^##\s+Case:/m.test(scenariosBody)) {
        findings.push({
          path: scenariosPath,
          severity: "warning",
          message: "scenarios.md should declare at least one '## Case:' section",
        });
      } else if (!/\bfixture\b/i.test(scenariosBody)) {
        findings.push({
          path: scenariosPath,
          severity: "warning",
          message: "scenarios.md cases should bind a fixture",
        });
      }
    }

    // Whether eval.md is PRESENT is the companion declaration's business — `recommended` there
    // produces the warning this used to duplicate. What is left here is whether its CONTENTS say
    // anything, which no layout declaration can answer.
    if (!existsSync(evalPath)) continue;

    const evalBody = readMarkdown(evalPath).body;
    if (!/^##\s+Property:/m.test(evalBody)) {
      findings.push({
        path: evalPath,
        severity: "warning",
        message: "eval.md should declare at least one '## Property:' section",
      });
    }
    if (/^##\s+Case:/m.test(evalBody)) {
      findings.push({
        path: evalPath,
        severity: "warning",
        message:
          "eval.md should not use '## Case:' sections — concrete cases belong in scenarios.md",
      });
    }
    if (!/\b(deterministic|llm-judged)\b/.test(evalBody)) {
      findings.push({
        path: evalPath,
        severity: "warning",
        message: "eval.md should identify deterministic or llm-judged checks",
      });
    }
  }

  return findings;
}

function validatePipelineSourceLayout(
  contentRoot: string,
  pipelineFiles: FileMeta[],
): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const pipelinesRoot = path.join(contentRoot, "pipelines");
  if (!existsSync(pipelinesRoot) || !statSync(pipelinesRoot).isDirectory()) return findings;

  const seenDirs = new Set(pipelineFiles.map((f) => path.dirname(f.path)));
  for (const entry of readdirSync(pipelinesRoot).sort()) {
    const pdir = path.join(pipelinesRoot, entry);
    // A flat `.md` here is not this function's to report any more. `validateUnroutedContent`
    // catches it as content no collection claims — one rule covering every collection, instead
    // of a per-collection warning that only `pipelines` ever got written for.
    if (!statSync(pdir).isDirectory()) continue;

    const indexPath = path.join(pdir, "index.md");
    if (!existsSync(indexPath)) {
      findings.push({
        path: pdir,
        severity: "error",
        message: "pipeline source directory must contain index.md",
      });
    } else if (!seenDirs.has(pdir)) {
      findings.push({
        path: indexPath,
        severity: "error",
        message: "pipeline source index.md must validate as type=pipeline",
      });
    }

    for (const mdPath of listMarkdownFiles(pdir)) {
      if (path.basename(mdPath) === "index.md") continue;
      if (readMarkdown(mdPath).hasFrontmatter) {
        findings.push({
          path: mdPath,
          severity: "error",
          message: "only pipeline index.md may have frontmatter",
        });
      }
    }

    const scenariosPath = path.join(pdir, "scenarios.md");
    if (existsSync(scenariosPath)) {
      const scenariosBody = readMarkdown(scenariosPath).body;
      if (!/^##\s+Case:/m.test(scenariosBody)) {
        findings.push({
          path: scenariosPath,
          severity: "warning",
          message: "scenarios.md should declare at least one '## Case:' section",
        });
      } else if (!/\bfixture\b/i.test(scenariosBody)) {
        findings.push({
          path: scenariosPath,
          severity: "warning",
          message: "scenarios.md cases should bind a fixture",
        });
      }
    }

    const evalPath = path.join(pdir, "eval.md");
    if (existsSync(evalPath)) {
      const evalBody = readMarkdown(evalPath).body;
      if (!/^##\s+Property:/m.test(evalBody)) {
        findings.push({
          path: evalPath,
          severity: "warning",
          message: "eval.md should declare at least one '## Property:' section",
        });
      }
      if (/^##\s+Case:/m.test(evalBody)) {
        findings.push({
          path: evalPath,
          severity: "warning",
          message:
            "eval.md should not use '## Case:' sections — concrete cases belong in scenarios.md",
        });
      }
    }
  }

  return findings;
}

function validateRefinementEntry(
  filePath: string,
  parsed: { hasFrontmatter: boolean; meta?: Record<string, unknown> },
  findings: CrossFileFinding[],
): void {
  if (!parsed.hasFrontmatter) {
    findings.push({
      path: filePath,
      severity: "warning",
      message: "refinement journal entry should declare mold/date/intent/decision frontmatter",
    });
    return;
  }
  const meta = parsed.meta ?? {};
  for (const key of ["mold", "date", "intent", "decision"]) {
    if (meta[key] === undefined || meta[key] === null || meta[key] === "") {
      findings.push({
        path: filePath,
        severity: "warning",
        message: `refinement journal entry missing '${key}' frontmatter`,
      });
    }
  }
  const decision = meta.decision;
  if (typeof decision === "string" && !REFINEMENT_DECISION_VOCAB.has(decision)) {
    findings.push({
      path: filePath,
      severity: "warning",
      message: `refinement journal 'decision' should be one of: ${[...REFINEMENT_DECISION_VOCAB].join(", ")}`,
    });
  }
}

const BODY_WIKI_LINK_RE = /\[\[([^\]\n]+)\]\]/g;
const FENCED_CODE_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /(`+)[\s\S]+?\1/g;

/** Body wiki links resolve, outside fenced and inline code. */
function validateBodyWikiLinks(
  files: FileMeta[],
  slugMap: Map<string, string>,
): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  for (const f of files) {
    const body = readMarkdown(f.path).body.replace(FENCED_CODE_RE, "").replace(INLINE_CODE_RE, "");
    const seen = new Set<string>();
    BODY_WIKI_LINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BODY_WIKI_LINK_RE.exec(body)) !== null) {
      const raw = m[1];
      if (raw === undefined) continue;
      const inner = raw.trim();
      if (!inner) continue;
      const wl = `[[${inner}]]`;
      if (seen.has(wl)) continue;
      seen.add(wl);
      if (!resolveWikiLink(wl, slugMap)) {
        findings.push({
          path: f.path,
          severity: "error",
          message: `body wiki-link ${wl} did not resolve`,
        });
      }
    }
  }
  return findings;
}

const STUB_BODY_RE = /^Stub\.\s+Replace with real/m;

function validateMoldStubBody(files: FileMeta[]): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  for (const f of files) {
    if (f.meta.type !== "mold") continue;
    const refs = f.meta.references;
    if (!Array.isArray(refs) || refs.length === 0) continue;
    const body = readMarkdown(f.path).body;
    if (STUB_BODY_RE.test(body)) {
      findings.push({
        path: f.path,
        severity: "warning",
        message: `mold body is a stub but declares ${refs.length} reference(s) — cast bundles them with no procedure to apply`,
      });
    }
  }
  return findings;
}

function validateCliCommandDocs(files: FileMeta[]): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const requiredSections = ["Output", "Examples", "Gotchas"];
  for (const f of files) {
    if (f.meta.type !== "cli-command") continue;
    const key = `${String(f.meta.tool)}/${String(f.meta.command)}`;
    if (!CLI_METADATA_KEYS.has(key)) {
      findings.push({
        path: f.path,
        severity: "error",
        message: `cli-command ${key} is absent from upstream CLI metadata`,
      });
    }
    if (typeof f.meta.package !== "string" || f.meta.package.length === 0) {
      findings.push({
        path: f.path,
        severity: "error",
        message: "cli-command must declare package for metadata-backed rendering",
      });
    }
    const sourceUrl = f.meta.source_url;
    const hasSourceUrl = typeof sourceUrl === "string" && sourceUrl.length > 0;
    if (OWN_CLI_KEYS.has(key)) {
      if (hasSourceUrl) {
        findings.push({
          path: f.path,
          severity: "error",
          message: `cli-command ${key} is implemented in this repository and must not declare source_url`,
        });
      }
    } else if (!hasSourceUrl) {
      findings.push({
        path: f.path,
        severity: "error",
        message: "cli-command must declare source_url — the external document this page summarizes",
      });
    }
    const body = readMarkdown(f.path).body;
    for (const section of requiredSections) {
      if (new RegExp(`^##\\s+${section}\\b`, "m").test(body)) continue;
      findings.push({
        path: f.path,
        severity: "warning",
        message: `cli-command should include ## ${section}`,
      });
    }
  }
  return findings;
}

function validateCliTools(files: FileMeta[]): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const bySlug = new Map<string, FileMeta[]>();
  for (const f of files) {
    if (f.meta.type !== "cli-tool") continue;
    const slug = typeof f.meta.tool === "string" ? f.meta.tool : "";
    if (!slug) {
      findings.push({
        path: f.path,
        severity: "error",
        message: "cli-tool note must declare `tool`",
      });
      continue;
    }
    const expected = `content/cli/${slug}/index.md`;
    if (!f.path.endsWith(expected)) {
      findings.push({
        path: f.path,
        severity: "error",
        message: `cli-tool with tool=${slug} must live at ${expected}`,
      });
    }
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), f]);
  }
  for (const [slug, group] of bySlug) {
    if (group.length <= 1) continue;
    for (const f of group) {
      findings.push({
        path: f.path,
        severity: "error",
        message: `duplicate cli-tool slug \`${slug}\` (also declared in: ${group
          .filter((g) => g !== f)
          .map((g) => g.path)
          .join(", ")})`,
      });
    }
  }
  return findings;
}

/**
 * Every directory note, measured against what its kind declares sits beside it.
 *
 * One function where there were four mechanisms: two hardcoded allowlists (mold, pipeline), a
 * per-kind constant naming a single required file (prompt), and nothing at all for `cli-tool`. The
 * allowlists could not say a file was REQUIRED, the constant could not say a file was forbidden,
 * and none of them was reachable from the kind whose layout it described.
 *
 * `note` is supplied from the collection table rather than guessed, and `content/cli/<tool>/` is
 * why: `index.md` is a cli-tool and every sibling `.md` is a cli-command, so that kind has a
 * directory full of markdown and no companions at all. Inferring from the extension would report
 * every documented subcommand in the corpus as a stray.
 */
function validateCompanionLayout(contentRoot: string, files: FileMeta[]): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  for (const f of files) {
    const definition = KINDS_BY_NAME.get(String(f.meta.type));
    if (definition === undefined || definition.shape !== "directory") continue;

    const dir = path.dirname(f.path);
    const entries = readdirSync(dir, { withFileTypes: true })
      // The one exclusion a declaration cannot express, and the same carve-out the walker makes:
      // a dotfile is editor or OS state, not something a kind failed to declare.
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => ({
        name: entry.name,
        directory: entry.isDirectory(),
        note: kindOf(routablePath(contentRoot, path.join(dir, entry.name))) !== undefined,
      }));

    const layout = checkCompanions(entries, definition);
    for (const companion of layout.missingRequired) {
      findings.push({
        path: f.path,
        severity: "error",
        message: `${definition.kind}: required companion is missing: ${companion.file}`,
      });
    }
    for (const companion of layout.missingRecommended) {
      findings.push({
        path: f.path,
        severity: "warning",
        message: `${definition.kind}: should have ${companion.file} — ${companion.purpose}`,
      });
    }
    // An error, not a warning. A file the kind does not declare is indistinguishable from a
    // misnamed one — `scenario.md` beside a mold is the case worth catching — and the corpus has
    // none today, so this costs nothing and stops the next one at the gate.
    for (const entry of layout.unknown) {
      findings.push({
        path: path.join(dir, entry.name),
        severity: "error",
        message: `${definition.kind}: undeclared ${entry.directory ? "directory" : "file"} beside the note: ${entry.name}`,
      });
    }
  }
  return findings;
}

/**
 * Markdown under the content root that is neither a note, nor a companion, nor declared as
 * deliberately neither.
 *
 * The residue used to be accounted for by silence. Nothing claimed `content/log.md`, so the
 * walker skipped it — and skipped, by exactly the same rule, anything else nobody had routed.
 * `content/prompts/**` lived in that gap for as long as it existed: two notes, committed,
 * validated by nothing and published by nothing. This closes the set, so the residue is empty
 * by construction rather than by having been looked at recently.
 *
 * A directory-shaped note's own directory is left alone: `validateCompanionLayout` owns it, and
 * reports an undeclared file there against the KIND that failed to declare it, which is the
 * more useful sentence. Reporting it twice would say less, not more.
 *
 * Markdown only. Every collection pattern selects `.md`, so "is this a note?" is a question
 * only a markdown file raises; the fixtures, schemas and vendored sources under `content/` are
 * data, governed by the companion declaration of whichever note owns their directory.
 */
function validateUnroutedContent(contentRoot: string, files: FileMeta[]): CrossFileFinding[] {
  const ownedByKind = new Set(
    files
      .filter((f) => KINDS_BY_NAME.get(String(f.meta.type))?.shape === "directory")
      .map((f) => path.dirname(routablePath(contentRoot, f.path))),
  );
  const underDirectoryNote = (routable: string): boolean => {
    for (let dir = path.dirname(routable); dir !== CONTENT_DIR && dir !== "."; ) {
      if (ownedByKind.has(dir)) return true;
      dir = path.dirname(dir);
    }
    return false;
  };

  const findings: CrossFileFinding[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
        continue;
      }
      if (!entry.name.endsWith(".md")) continue;
      const routable = routablePath(contentRoot, full);
      if (collectionOf(routable)) continue;
      if (nonNoteAllowanceOf(routable)) continue;
      if (underDirectoryNote(routable)) continue;
      findings.push({
        path: full,
        severity: "error",
        message:
          "no collection claims this file and no allowance declares it — add it to a " +
          "collection, put it beside the note that owns it, or declare it in NOT_NOTES",
      });
    }
  };
  visit(contentRoot);
  return findings;
}

function validateCompanionFiles(files: FileMeta[]): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  for (const f of files) {
    const companions = Array.isArray(f.meta.companions) ? f.meta.companions : [];
    if (companions.length === 0) continue;
    for (const c of companions) {
      if (typeof c !== "string") continue;
      const fullPath = path.resolve(path.dirname(f.path), c);
      if (!existsSync(fullPath)) {
        findings.push({
          path: f.path,
          severity: "error",
          message: `companions: file does not exist: ${c}`,
        });
        continue;
      }
      if (!statSync(fullPath).isFile()) {
        findings.push({
          path: f.path,
          severity: "error",
          message: `companions: path is not a file: ${c}`,
        });
      }
    }
  }
  return findings;
}

function validatePatternVerificationEvidence(files: FileMeta[]): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  for (const f of files) {
    if (f.meta.type === "pattern") {
      validatePatternVerificationPaths(f, findings);
      validatePatternIwcExemplars(f, findings);
    }
  }
  return findings;
}

const GENERATED_IWC_REF_RE =
  /(?:^|\/)(?:\$IWC_FORMAT2|\$IWC_SKELETONS|workflow-fixtures\/iwc-(?:format2|skeletons)|iwc-(?:format2|skeletons)\/)|\.(?:ga|gxwf\.ya?ml)$/;
const LINE_REF_RE = /:\d+(?:-\d+)?$/;

function validatePatternIwcExemplars(file: FileMeta, findings: CrossFileFinding[]): void {
  const exemplars = Array.isArray(file.meta.iwc_exemplars) ? file.meta.iwc_exemplars : [];
  if (["operation", "recipe"].includes(String(file.meta.pattern_kind)) && exemplars.length === 0) {
    findings.push({
      path: file.path,
      severity: "warning",
      message: "operation or recipe pattern should declare iwc_exemplars metadata",
    });
  }

  exemplars.forEach((raw, index) => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return;
    const exemplar = raw as Record<string, unknown>;
    if (typeof exemplar.workflow !== "string") return;
    const workflow = exemplar.workflow;
    if (GENERATED_IWC_REF_RE.test(workflow) || LINE_REF_RE.test(workflow)) {
      findings.push({
        path: file.path,
        severity: "error",
        message: `iwc_exemplars[${index}].workflow must use an abstract IWC workflow ID, not a generated path or line citation: ${workflow}`,
      });
    }
  });
}

function validatePatternVerificationPaths(file: FileMeta, findings: CrossFileFinding[]): void {
  const verificationPaths = Array.isArray(file.meta.verification_paths)
    ? file.meta.verification_paths
    : [];
  for (const verificationPath of verificationPaths) {
    if (typeof verificationPath !== "string") continue;
    const abs = path.resolve(process.cwd(), verificationPath);
    if (!existsSync(abs)) {
      findings.push({
        path: file.path,
        severity: "error",
        message: `verification_paths: file does not exist: ${verificationPath}`,
      });
    } else if (!statSync(abs).isFile()) {
      findings.push({
        path: file.path,
        severity: "error",
        message: `verification_paths: path is not a file: ${verificationPath}`,
      });
    }
  }

  const evidence = file.meta.evidence;
  if (evidence === "structurally-verified" || evidence === "corpus-and-verified") {
    if (verificationPaths.length === 0) {
      findings.push({
        path: file.path,
        severity: "error",
        message: `evidence=${evidence} requires at least one verification path`,
      });
    }
  } else if (
    (evidence === "corpus-observed" || evidence === "hypothesis") &&
    verificationPaths.length > 0
  ) {
    findings.push({
      path: file.path,
      severity: "error",
      message: `evidence=${evidence} must not declare verification_paths`,
    });
  }
}

function listMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) files.push(...listMarkdownFiles(full));
    else if (entry.endsWith(".md")) files.push(full);
  }
  return files;
}

// ---- driver ----

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    directory: "content",
    tagsPath: "meta_tags.yml",
    root: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tags") args.tagsPath = argv[++i] ?? args.tagsPath;
    else if (a === "--root") args.root = argv[++i] ?? ".";
    else if (a?.startsWith("--root=")) args.root = a.slice("--root=".length);
    else if (a && !a.startsWith("--")) args.directory = a;
  }
  return args;
}

export interface ValidateOptions {
  directory: string;
  tagsPath: string;
}

export function validateDirectory(opts: ValidateOptions): {
  errors: number;
  warnings: number;
  filesChecked: number;
} {
  const schema = buildNoteSchema({
    tags: loadTagRegistry(opts.tagsPath),
    contract: loadReferenceContract(),
    licensePolicy: bundledPolicy(),
  });

  let errorCount = 0;
  let warningCount = 0;
  let filesChecked = 0;
  const validFiles: FileMeta[] = [];
  let lastHeader: string | undefined;

  // Reprint on every change of file, not once per file: a file's findings arrive in more than one
  // block, and a header printed only the first time files the later ones under its neighbour.
  const printHeader = (filePath: string): void => {
    if (lastHeader === filePath) return;
    lastHeader = filePath;
    process.stdout.write(`\n${filePath}:\n`);
  };

  for (const filePath of findMdFiles(opts.directory)) {
    filesChecked++;
    const parsed = readMarkdown(filePath);
    if (!parsed.hasFrontmatter) {
      printHeader(filePath);
      process.stdout.write(`  ERROR  no frontmatter found\n`);
      errorCount++;
      continue;
    }
    const r = validateData(parsed.meta, schema);
    if (r.errors.length || r.warnings.length) printHeader(filePath);
    for (const e of r.errors) {
      process.stdout.write(`  ERROR  ${e}\n`);
      errorCount++;
    }
    for (const w of r.warnings) {
      process.stdout.write(`  WARN   ${w}\n`);
      warningCount++;
    }
    if (r.errors.length === 0) {
      validFiles.push({
        path: filePath,
        relPath: path.relative(opts.directory, filePath),
        slug: fileSlug(filePath),
        meta: parsed.meta,
      });
    }
  }

  // Cross-file passes.
  const slugMap = buildSlugMap(validFiles, opts.directory);
  const metaByPath = new Map<string, Frontmatter>();
  for (const f of validFiles) metaByPath.set(f.path, f.meta);

  const crossFindings: CrossFileFinding[] = [];
  crossFindings.push(...validateRelatedFields(validFiles, slugMap, metaByPath));
  crossFindings.push(...validateMoldRefs(validFiles, slugMap, metaByPath, opts.directory));
  crossFindings.push(...validateSourcePatternRefs(validFiles, slugMap, metaByPath));
  crossFindings.push(...validatePipelinePhases(validFiles, slugMap, metaByPath));
  crossFindings.push(...validateArtifactGraph(validFiles, slugMap, metaByPath));
  crossFindings.push(...validateSchemaVendoring(validFiles, opts.directory));
  crossFindings.push(...validateSchemaValidatorBins(validFiles, opts.directory));
  crossFindings.push(
    ...validateMoldSourceLayout(
      opts.directory,
      validFiles.filter((f) => f.meta.type === "mold"),
    ),
  );
  crossFindings.push(
    ...validatePipelineSourceLayout(
      opts.directory,
      validFiles.filter((f) => f.meta.type === "pipeline"),
    ),
  );
  crossFindings.push(...validateCliCommandDocs(validFiles));
  crossFindings.push(...validateCliTools(validFiles));
  crossFindings.push(...validateCompanionLayout(opts.directory, validFiles));
  crossFindings.push(...validateUnroutedContent(opts.directory, validFiles));
  crossFindings.push(...validateCompanionFiles(validFiles));
  crossFindings.push(...validatePatternVerificationEvidence(validFiles));
  crossFindings.push(...validateBodyWikiLinks(validFiles, slugMap));
  crossFindings.push(...validateMoldStubBody(validFiles));

  // Grouped, so each file reads as one block rather than once per cross-file pass that found it.
  const findingsByPath = new Map<string, CrossFileFinding[]>();
  for (const f of crossFindings) {
    const group = findingsByPath.get(f.path);
    if (group) group.push(f);
    else findingsByPath.set(f.path, [f]);
  }
  for (const [filePath, group] of findingsByPath) {
    printHeader(filePath);
    for (const f of group) {
      if (f.severity === "error") {
        process.stdout.write(`  ERROR  ${f.message}\n`);
        errorCount++;
      } else {
        process.stdout.write(`  WARN   ${f.message}\n`);
        warningCount++;
      }
    }
  }

  process.stdout.write(`\n${"=".repeat(50)}\n`);
  process.stdout.write(
    `Files: ${filesChecked}  Errors: ${errorCount}  Warnings: ${warningCount}\n`,
  );
  return { errors: errorCount, warnings: warningCount, filesChecked };
}

export function runValidateCommand(argv = process.argv.slice(2)): void {
  const args = parseArgs(argv);
  if (args.root) process.chdir(args.root);
  if (!existsSync(args.directory) || !statSync(args.directory).isDirectory()) {
    process.stderr.write(`directory not found: ${args.directory}\n`);
    process.exit(2);
  }
  const { errors } = validateDirectory(args);
  process.exit(errors > 0 ? 1 : 0);
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) runValidateCommand();
