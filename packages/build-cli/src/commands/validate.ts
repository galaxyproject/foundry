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
  loadReferenceContract,
  type NoteSchema,
} from "@galaxy-foundry/note-schema";
import { readMarkdown } from "../lib/frontmatter.js";
import { loadLicensePolicy, resolveLicenseRow } from "../lib/license-policy.js";
import { parsePhases, phaseMoldPaths, type ParsedPhase } from "../lib/pipeline-phases.js";
import { loadTags } from "../lib/schema.js";
import type { FileMeta, Frontmatter, ValidationResult } from "../lib/types.js";
import { fileSlug, findMdFiles } from "../lib/walk.js";
import { resolveWikiLink, slugify, WIKI_LINK_RE } from "../lib/wiki-links.js";

interface CliArgs {
  directory: string;
  tagsPath: string;
  root: string | null;
}

const TYPE_TAG_MAP: Record<string, string> = {
  "mold|": "mold",
  "pattern|": "pattern",
  "source-pattern|": "source-pattern",
  "cli-command|": "cli-command",
  "pipeline|": "pipeline",
  "research|component": "research/component",
  "research|design-problem": "research/design-problem",
  "research|design-spec": "research/design-spec",
  "schema|": "schema",
  "prompt|": "prompt",
};

const CLI_METADATA_KEYS = new Set([
  ...[gxwfCliMeta, galaxyToolCacheCliMeta, foundryCliMeta].flatMap((program) =>
    program.commands.map((command) => `${program.name}/${command.name}`),
  ),
  ...planemoCliMeta.commands
    .filter((command) => !command.internal)
    .map((command) => `${planemoCliMeta.program}/${command.name}`),
]);

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
  result.warnings.push(...validateTagCoherence(data));
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

function validateTagCoherence(data: Frontmatter): string[] {
  const tags = data.tags;
  const noteType = data.type;
  const subtype = data.subtype;
  if (!Array.isArray(tags) || typeof noteType !== "string") return [];
  const key = `${noteType}|${typeof subtype === "string" ? subtype : ""}`;
  const expected = TYPE_TAG_MAP[key] ?? TYPE_TAG_MAP[`${noteType}|`];
  if (!expected) return [];
  const matches = tags.some(
    (t) => typeof t === "string" && (t === expected || t.startsWith(expected + "/")),
  );
  if (matches) return [];
  return [
    `tags: expected '${expected}' tag for type=${noteType}${subtype ? `, subtype=${subtype}` : ""} but tags are ${JSON.stringify(tags)}`,
  ];
}

// ---- cross-file validation ----

interface CrossFileFinding {
  path: string;
  message: string;
  severity: "error" | "warning";
}

function buildSlugMap(files: FileMeta[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of files) {
    m.set(slugify(f.slug), f.path);
    if (
      f.meta.type === "cli-command" &&
      typeof f.meta.tool === "string" &&
      typeof f.meta.command === "string"
    ) {
      m.set(slugify(`${f.meta.tool} ${f.meta.command}`), f.path);
    }
  }
  return m;
}

function validateBidirectionalRelatedNotes(
  files: FileMeta[],
  slugMap: Map<string, string>,
): CrossFileFinding[] {
  const forward = new Map<string, Set<string>>();
  for (const f of files) {
    const targets = new Set<string>();
    const rns = f.meta.related_notes;
    if (Array.isArray(rns)) {
      for (const wl of rns) {
        const tp = resolveWikiLink(wl, slugMap);
        if (tp && tp !== f.path) targets.add(tp);
      }
    }
    forward.set(f.path, targets);
  }
  const slugByPath = new Map<string, string>();
  for (const f of files) slugByPath.set(f.path, f.slug);
  const findings: CrossFileFinding[] = [];
  for (const [a, targets] of forward) {
    for (const b of targets) {
      const back = forward.get(b);
      if (!back || back.has(a)) continue;
      const aSlug = slugByPath.get(a) ?? a;
      findings.push({
        path: b,
        severity: "warning",
        message: `related_notes: missing backlink to [[${aSlug}]] (declared in ${a})`,
      });
    }
  }
  return findings;
}

/**
 * For Mold typed-references, ensure wiki-link refs resolve to a note of the
 * expected type. (Schema-/example-/prompt-path checks deferred until those
 * kinds appear — matches `INITIAL_ARCHITECTURE.md` §6 sketch.)
 */
function validateMoldRefs(
  files: FileMeta[],
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
  contentRoot: string,
): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const checks: Array<{ field: string; expected: string }> = [
    { field: "related_patterns", expected: "pattern" },
    { field: "related_molds", expected: "mold" },
  ];
  for (const f of files) {
    if (f.meta.type !== "mold") continue;
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
  if (ref.evidence === "hypothesis" && typeof ref.verification !== "string") {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: evidence=hypothesis requires verification`,
    });
  }
  if (ref.load === "on-demand" && typeof ref.trigger !== "string") {
    findings.push({
      path: filePath,
      severity: "warning",
      message: `references[${index}]: load=on-demand should describe the trigger`,
    });
  }

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
  // Load the policy table lazily, only when a check actually needs to resolve a
  // license row, so license-free content trees validate without it.
  let policy: ReturnType<typeof loadLicensePolicy> | undefined;
  const getPolicy = () => (policy ??= loadLicensePolicy(repoRoot));

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
    const validatorSubcommand =
      typeof f.meta.validator_subcommand === "string" ? f.meta.validator_subcommand : "";
    // When a subcommand is declared, the bin owner is the foundry CLI package,
    // not the schema's `package` (which only points at the export source).
    const packageName = validatorSubcommand
      ? "@galaxy-foundry/foundry"
      : typeof f.meta.package === "string"
        ? f.meta.package
        : "";
    if (!packageName) {
      findings.push({
        path: f.path,
        severity: "error",
        message: `validator_bin '${validatorBin}' requires package frontmatter`,
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
 * Pipeline artifact binding ordering: every Mold-shaped phase's input_artifacts
 * must be produced by some prior phase in the same pipeline (Mold-shaped or via
 * branch/chain). Branch/chain phases are treated as the union of their inner
 * Molds' artifact contracts (any branch's output may satisfy a downstream
 * input — discover-or-author shape).
 */
function validatePipelineArtifactBindings(
  file: FileMeta,
  phases: ParsedPhase[],
  metaByPath: Map<string, Frontmatter>,
): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const phaseDecls: { out: Set<string>; in: { id: string; idx: number }[] }[] = [];

  phases.forEach((phase, idx) => {
    const out = new Set<string>();
    const inputs: { id: string; idx: number }[] = [];
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
            inputs.push({ id: (a as { id: string }).id, idx });
          }
        }
      }
    }
    phaseDecls.push({ out, in: inputs });
  });

  // Build cumulative produced ids, walking phases in order.
  const cumulative = new Set<string>();
  phaseDecls.forEach((decl, i) => {
    for (const inp of decl.in) {
      // Self-loop allowance: the same phase may produce and consume (loop phases re-feeding themselves).
      if (!cumulative.has(inp.id) && !decl.out.has(inp.id)) {
        findings.push({
          path: file.path,
          severity: "warning",
          message: `phases[${i}]: input_artifact '${inp.id}' has no prior phase producing it in this pipeline`,
        });
      }
    }
    for (const id of decl.out) cumulative.add(id);
  });

  return findings;
}

// Allowlisted top-level entries inside a Mold directory.
// Files with frontmatter rules apply to top-level .md files only;
// `refinements/` is the carve-out where journal entries carry frontmatter.
const MOLD_TOP_FILES = new Set([
  "index.md",
  "eval.md",
  "scenarios.md",
  "usage.md",
  "refinement.md",
  "casting.md",
  "cast-skill-verification.md",
  "changes.md",
  "README.md",
]);
const MOLD_TOP_DIRS = new Set(["examples", "refinements"]);

// Allowlisted top-level entries inside a Pipeline directory note.
// `eval.md` / `scenarios.md` are optional pipeline-level evaluation siblings.
const PIPELINE_TOP_FILES = new Set([
  "index.md",
  "eval.md",
  "scenarios.md",
  "usage.md",
  "README.md",
]);
// Allowlisted subdirectory: local scenario fixtures referenced by scenarios.md.
const PIPELINE_TOP_DIRS = new Set(["examples"]);

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

    for (const child of readdirSync(moldDir).sort()) {
      const childPath = path.join(moldDir, child);
      const isDir = statSync(childPath).isDirectory();
      if (isDir) {
        if (!MOLD_TOP_DIRS.has(child)) {
          findings.push({
            path: childPath,
            severity: "warning",
            message: `unexpected directory in mold source: ${child}`,
          });
        }
      } else if (!MOLD_TOP_FILES.has(child)) {
        findings.push({
          path: childPath,
          severity: "warning",
          message: `unexpected file in mold source: ${child}`,
        });
      }
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

    if (!existsSync(evalPath)) {
      findings.push({
        path: moldDir,
        severity: "warning",
        message: "mold source directory should contain eval.md",
      });
      continue;
    }

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
    if (!statSync(pdir).isDirectory()) {
      if (entry.endsWith(".md")) {
        findings.push({
          path: pdir,
          severity: "warning",
          message:
            "pipeline must be a directory note (content/pipelines/<slug>/index.md), not a flat file",
        });
      }
      continue;
    }

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

    for (const child of readdirSync(pdir).sort()) {
      const childPath = path.join(pdir, child);
      if (statSync(childPath).isDirectory()) {
        if (!PIPELINE_TOP_DIRS.has(child)) {
          findings.push({
            path: childPath,
            severity: "warning",
            message: `unexpected directory in pipeline source: ${child}`,
          });
        }
      } else if (!PIPELINE_TOP_FILES.has(child)) {
        findings.push({
          path: childPath,
          severity: "warning",
          message: `unexpected file in pipeline source: ${child}`,
        });
      }
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
          severity: "warning",
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
    if (typeof f.meta.upstream !== "string" || f.meta.upstream.length === 0) {
      findings.push({
        path: f.path,
        severity: "error",
        message: "cli-command must declare upstream for metadata-backed rendering",
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

function validatePromptFiles(files: FileMeta[]): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  for (const f of files) {
    if (f.meta.type !== "prompt") continue;
    const promptFile = typeof f.meta.prompt_file === "string" ? f.meta.prompt_file : "";
    if (!promptFile) continue;
    const fullPath = path.resolve(path.dirname(f.path), promptFile);
    if (!existsSync(fullPath)) {
      findings.push({
        path: f.path,
        severity: "error",
        message: `prompt_file: file does not exist: ${promptFile}`,
      });
      continue;
    }
    if (!statSync(fullPath).isFile()) {
      findings.push({
        path: f.path,
        severity: "error",
        message: `prompt_file: path is not a file: ${promptFile}`,
      });
    }
  }
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
  const repoRoot =
    path.basename(opts.directory) === "content" ? path.dirname(opts.directory) : opts.directory;
  const schema = buildNoteSchema({
    tags: loadTags(opts.tagsPath),
    contract: loadReferenceContract(),
    licensePolicy: loadLicensePolicy(repoRoot),
  });

  let errorCount = 0;
  let warningCount = 0;
  let filesChecked = 0;
  const validFiles: FileMeta[] = [];
  const printedHeaders = new Set<string>();

  const printHeader = (filePath: string): void => {
    if (printedHeaders.has(filePath)) return;
    printedHeaders.add(filePath);
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
  const slugMap = buildSlugMap(validFiles);
  const metaByPath = new Map<string, Frontmatter>();
  for (const f of validFiles) metaByPath.set(f.path, f.meta);

  const crossFindings: CrossFileFinding[] = [];
  crossFindings.push(...validateBidirectionalRelatedNotes(validFiles, slugMap));
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
  crossFindings.push(...validatePromptFiles(validFiles));
  crossFindings.push(...validateCompanionFiles(validFiles));
  crossFindings.push(...validatePatternVerificationEvidence(validFiles));
  crossFindings.push(...validateBodyWikiLinks(validFiles, slugMap));
  crossFindings.push(...validateMoldStubBody(validFiles));

  for (const f of crossFindings) {
    printHeader(f.path);
    if (f.severity === "error") {
      process.stdout.write(`  ERROR  ${f.message}\n`);
      errorCount++;
    } else {
      process.stdout.write(`  WARN   ${f.message}\n`);
      warningCount++;
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
