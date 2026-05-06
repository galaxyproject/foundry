#!/usr/bin/env tsx
// Foundry frontmatter validator.
// See INITIAL_ARCHITECTURE.md §6 for the layered pipeline.

import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { ErrorObject } from "ajv";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
import { readMarkdown } from "../lib/frontmatter.js";
import { loadSchema, loadTags } from "../lib/schema.js";
import type { FileMeta, Frontmatter, JsonSchema, ValidationResult } from "../lib/types.js";
import { fileSlug, findMdFiles } from "../lib/walk.js";
import { resolveWikiLink, slugify, WIKI_LINK_RE } from "../lib/wiki-links.js";

type AjvValidator = {
  compile: (schema: unknown) => ((data: unknown) => boolean) & { errors?: ErrorObject[] | null };
};
const Ajv = AjvImport as unknown as new (opts: {
  allErrors: boolean;
  strict: boolean;
}) => AjvValidator;
const addFormats = addFormatsImport as unknown as (ajv: AjvValidator) => unknown;

interface CliArgs {
  directory: string;
  schemaPath: string;
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
};

/** Single-value vs array wiki-link fields. Schema's regex catches missing brackets; this catches whitespace-only inner text. */
const WIKI_LINK_FIELDS: Record<string, "single" | "array"> = {
  parent_pattern: "single",
  related_notes: "array",
  related_patterns: "array",
  related_molds: "array",
  implemented_by_patterns: "array",
};

// ---- per-file validation ----

export function validateData(data: Frontmatter, schema: JsonSchema): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };
  result.errors.push(...validateSchema(data, schema));
  result.errors.push(...validateDates(data));
  const wiki = validateWikiLinks(data);
  result.errors.push(...wiki.errors);
  result.warnings.push(...wiki.warnings);
  result.warnings.push(...validateTagCoherence(data));
  return result;
}

function validateSchema(data: Frontmatter, schema: JsonSchema): string[] {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (validate(data)) return [];
  const errors = (validate.errors ?? []).slice().sort((a: ErrorObject, b: ErrorObject) => {
    return (a.instancePath || "").localeCompare(b.instancePath || "");
  });
  return errors.map((e: ErrorObject) => {
    const loc = e.instancePath.replace(/^\//, "").replace(/\//g, ".") || "(root)";
    const params = e.params as Record<string, unknown> | undefined;
    const extra = params?.additionalProperty ? ` ('${String(params.additionalProperty)}')` : "";
    if (
      e.keyword === "additionalProperties" &&
      params?.additionalProperty === "schema" &&
      /^input_artifacts\.\d+$/.test(loc)
    ) {
      return `${loc}: 'schema' is producer-owned — declare it on the producer Mold's output_artifacts[].schema (consumers inherit via id). For a runtime-validation hint without a producer commitment, list the schema in the top-level 'input_schemas' array.`;
    }
    return `${loc}: ${e.message ?? "validation failed"}${extra}`;
  });
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

interface PhaseRefs {
  /** Mold paths referenced in a Mold-shaped phase. */
  moldPaths: Set<string>;
  /** Mold paths referenced via [branch] inner wiki-links. */
  branchedMoldPaths: Set<string>;
}

function collectPhaseMoldRefs(
  phases: unknown[],
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
  filePath: string,
): { findings: CrossFileFinding[]; refs: PhaseRefs } {
  const findings: CrossFileFinding[] = [];
  const refs: PhaseRefs = { moldPaths: new Set(), branchedMoldPaths: new Set() };

  phases.forEach((phase, i) => {
    if (typeof phase !== "object" || phase === null || Array.isArray(phase)) {
      findings.push({
        path: filePath,
        severity: "error",
        message: `phases[${i}]: must be an object`,
      });
      return;
    }
    const p = phase as Record<string, unknown>;

    if ("mold" in p) {
      const tp = resolveWikiLink(p.mold, slugMap);
      if (!tp) {
        findings.push({
          path: filePath,
          severity: "error",
          message: `phases[${i}].mold: wiki link ${String(p.mold)} did not resolve`,
        });
      } else if (metaByPath.get(tp)?.type !== "mold") {
        findings.push({
          path: filePath,
          severity: "error",
          message: `phases[${i}].mold: ${String(p.mold)} resolves to type=${String(metaByPath.get(tp)?.type)}, expected mold`,
        });
      } else {
        refs.moldPaths.add(tp);
      }
      return;
    }

    if ("branch" in p) {
      // Walk `branches` array of wiki-link strings or { fallthrough: <wiki> } objects;
      // and `chain` array of wiki-link strings or terminal sentinels (e.g. "user-supplied").
      const collectFromList = (list: unknown, locTag: string): void => {
        if (!Array.isArray(list)) return;
        list.forEach((item, j) => {
          let candidate: unknown = item;
          if (typeof item === "object" && item !== null && !Array.isArray(item)) {
            const obj = item as Record<string, unknown>;
            if ("fallthrough" in obj) candidate = obj.fallthrough;
            else return; // unknown shape — ignore for now (open-set)
          }
          if (typeof candidate !== "string") return;
          if (!WIKI_LINK_RE.test(candidate)) return; // sentinels like "user-supplied"
          const tp = resolveWikiLink(candidate, slugMap);
          if (!tp) {
            findings.push({
              path: filePath,
              severity: "error",
              message: `phases[${i}].${locTag}[${j}]: wiki link ${candidate} did not resolve`,
            });
          } else if (metaByPath.get(tp)?.type !== "mold") {
            findings.push({
              path: filePath,
              severity: "error",
              message: `phases[${i}].${locTag}[${j}]: ${candidate} resolves to type=${String(metaByPath.get(tp)?.type)}, expected mold`,
            });
          } else {
            refs.branchedMoldPaths.add(tp);
          }
        });
      };
      collectFromList(p.branches, "branches");
      collectFromList(p.chain, "chain");
      return;
    }

    // Open-set: unknown phase kind. Warn so we notice but don't fail.
    const knownKeys = Object.keys(p);
    findings.push({
      path: filePath,
      severity: "warning",
      message: `phases[${i}]: unknown phase kind (keys: ${knownKeys.join(",")}) — coin a tag if this is intentional`,
    });
  });

  return { findings, refs };
}

/**
 * Mold artifact handoff validation.
 *   - Every `input_artifacts[].id` must resolve to some `output_artifacts[].id`
 *     declared by another Mold (multi-producer is allowed; same id can come
 *     from a discover-or-author branch).
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
  for (const f of files) {
    if (f.meta.type !== "mold") continue;
    const out = f.meta.output_artifacts;
    if (!Array.isArray(out)) continue;
    for (const a of out) {
      if (a && typeof a === "object" && typeof (a as { id?: unknown }).id === "string") {
        producerIds.add((a as { id: string }).id);
      }
    }
  }
  for (const f of files) {
    if (f.meta.type !== "mold") continue;
    const out = f.meta.output_artifacts;
    if (Array.isArray(out)) {
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
        const targetType = metaByPath.get(tp)?.type;
        if (targetType !== "schema") {
          findings.push({
            path: f.path,
            severity: "error",
            message: `output_artifacts[${i}].schema: wiki link ${schema} resolves to type=${targetType ?? "(none)"}, expected schema`,
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
  for (const f of files) {
    if (f.meta.type !== "schema") continue;
    const upstream = typeof f.meta.upstream === "string" ? f.meta.upstream : "";
    if (!upstream || upstream.includes("github.com/jmchilton/foundry/")) continue;
    if (typeof f.meta.license !== "string") {
      findings.push({
        path: f.path,
        severity: "error",
        message: "vendored schema with external upstream must declare license",
      });
    }
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

function validatePipelinePhases(
  files: FileMeta[],
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const moldsReferenced = new Set<string>();
  for (const f of files) {
    if (f.meta.type !== "pipeline") continue;
    const phases = f.meta.phases;
    if (!Array.isArray(phases)) continue;
    const r = collectPhaseMoldRefs(phases, slugMap, metaByPath, f.path);
    findings.push(...r.findings);
    for (const p of r.refs.moldPaths) moldsReferenced.add(p);
    for (const p of r.refs.branchedMoldPaths) moldsReferenced.add(p);
    findings.push(...validatePipelineArtifactBindings(f, phases, slugMap, metaByPath));
  }
  // Inventory coverage warning: non-draft Molds should appear in at least one pipeline.
  const orphans: string[] = [];
  for (const f of files) {
    if (f.meta.type !== "mold") continue;
    if (f.meta.status === "draft") continue;
    if (!moldsReferenced.has(f.path)) orphans.push(f.slug);
  }
  if (orphans.length > 0) {
    findings.push({
      path: "(inventory)",
      severity: "warning",
      message: `Molds with zero pipeline membership: ${orphans.sort().join(", ")}`,
    });
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
  phases: unknown[],
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const phaseDecls: { out: Set<string>; in: { id: string; idx: number }[] }[] = [];

  const collectMoldPathsFromPhase = (phase: unknown): string[] => {
    const out: string[] = [];
    const visit = (n: unknown) => {
      if (typeof n === "string") {
        if (WIKI_LINK_RE.test(n)) {
          const tp = resolveWikiLink(n, slugMap);
          if (tp && metaByPath.get(tp)?.type === "mold") out.push(tp);
        }
        return;
      }
      if (!n || typeof n !== "object") return;
      const obj = n as Record<string, unknown>;
      if (typeof obj.mold === "string") visit(obj.mold);
      if (typeof obj.fallthrough === "string") visit(obj.fallthrough);
      if (Array.isArray(obj.branches)) obj.branches.forEach(visit);
      if (Array.isArray(obj.chain)) obj.chain.forEach(visit);
    };
    visit(phase);
    return out;
  };

  phases.forEach((phase, idx) => {
    const out = new Set<string>();
    const inputs: { id: string; idx: number }[] = [];
    for (const moldPath of collectMoldPathsFromPhase(phase)) {
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
  "usage.md",
  "refinement.md",
  "casting.md",
  "cast-skill-verification.md",
  "changes.md",
  "README.md",
]);
const MOLD_TOP_DIRS = new Set(["examples", "refinements"]);

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

    if (!existsSync(evalPath)) {
      findings.push({
        path: moldDir,
        severity: "warning",
        message: "mold source directory should contain eval.md",
      });
      continue;
    }

    const evalBody = readMarkdown(evalPath).body;
    if (!/^##\s+Case:/m.test(evalBody)) {
      findings.push({
        path: evalPath,
        severity: "warning",
        message: "eval.md should declare at least one '## Case:' section",
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
  const requiredSections = ["Install", "Synopsis", "Output", "Exit codes", "Examples", "Gotchas"];
  for (const f of files) {
    if (f.meta.type !== "cli-command") continue;
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
    schemaPath: "meta_schema.yml",
    tagsPath: "meta_tags.yml",
    root: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--schema") args.schemaPath = argv[++i] ?? args.schemaPath;
    else if (a === "--tags") args.tagsPath = argv[++i] ?? args.tagsPath;
    else if (a === "--root") args.root = argv[++i] ?? ".";
    else if (a?.startsWith("--root=")) args.root = a.slice("--root=".length);
    else if (a && !a.startsWith("--")) args.directory = a;
  }
  return args;
}

export interface ValidateOptions {
  directory: string;
  schemaPath: string;
  tagsPath: string;
}

export function validateDirectory(opts: ValidateOptions): {
  errors: number;
  warnings: number;
  filesChecked: number;
} {
  const tags = loadTags(opts.tagsPath);
  const schema = loadSchema(opts.schemaPath, tags);

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
  crossFindings.push(
    ...validateMoldSourceLayout(
      opts.directory,
      validFiles.filter((f) => f.meta.type === "mold"),
    ),
  );
  crossFindings.push(...validateCliCommandDocs(validFiles));
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
