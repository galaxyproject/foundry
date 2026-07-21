import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import YAML from "yaml";
import { normalizeGitUrl } from "./git-url.js";

interface SampleSheetColumn {
  name: string;
  type: "string" | "integer" | "number" | "boolean";
  kind: "data" | "meta";
  format: string | null;
  required: boolean;
  default?: unknown;
  description: string | null;
  enum: unknown[];
  pattern: string | null;
  exists: boolean | null;
  mimetype: string | null;
}

interface SampleSheet {
  param: string;
  schema_path: string | null;
  discovered_via: "nf-schema" | "samplesheetToList" | "splitCsv" | "ad-hoc";
  format: "csv" | "tsv" | "csv-or-tsv" | null;
  header: boolean | null;
  columns: SampleSheetColumn[];
}

interface Summary {
  source: Record<string, unknown>;
  params: Param[];
  sample_sheets: SampleSheet[];
  profiles: string[];
  tools: Tool[];
  processes: Process[];
  subworkflows: Subworkflow[];
  workflow: { name: string; channels: Channel[]; edges: Edge[]; conditionals: Conditional[] };
  reference_assets: ReferenceAsset[];
  reference_rebuilds: ReferenceRebuildRule[];
  test_fixtures: { profile: string; inputs: TestDataRef[]; outputs: unknown[] };
  nf_tests: NfTest[];
  warnings: string[];
}

interface InvocationBinding {
  take: string;
  argument: string;
}

interface SubworkflowInvocation {
  caller: string;
  caller_path: string | null;
  arguments: string[];
  bindings: InvocationBinding[];
}

interface Subworkflow {
  name: string;
  path: string;
  kind: "pipeline" | "utility";
  calls: string[];
  inputs?: ChannelIO[];
  outputs?: ChannelIO[];
  invocations?: SubworkflowInvocation[];
  tests: NfTest[];
}

interface ParsedWorkflow extends Subworkflow {
  body: string;
}

type ChannelConstruct =
  | "fromPath"
  | "fromFilePairs"
  | "fromList"
  | "samplesheetToList"
  | "splitCsv"
  | "file"
  | "files"
  | "of"
  | "value"
  | "empty"
  | "topic"
  | "other";

interface Channel {
  name: string;
  source: string;
  shape: string;
  construct: ChannelConstruct;
  from_param: string | null;
  required_runtime: boolean;
}

interface Edge {
  from: string;
  to: string;
  via?: string[];
}

interface Conditional {
  guard: string;
  branch: "default" | "alternate";
  affects: string[];
}

interface Evidence {
  source_path: string | null;
  confidence: "high" | "medium" | "low";
  evidence: string[];
}

interface ReferenceAsset {
  param: string;
  asset_kind: string;
  format_hint?: string | null;
  required: boolean;
  source_kind?: ParamSourceKind | null;
  source_expression?: string | null;
  schema_group?: string | null;
  used_by: string[];
  evidence: Evidence;
}

interface ReferenceRebuildRule {
  asset_param: string;
  guard: string;
  guard_params?: string[];
  builder: string;
  builder_outputs: string[];
  fallback_for?: string | null;
  evidence: Evidence;
}

type ParamSourceKind = "nextflow_schema" | "params_block" | "getGenomeAttribute" | "computed";

interface Param {
  name: string;
  type: string;
  default?: unknown;
  description?: string;
  required: boolean;
  enum?: unknown[];
  format?: string | null;
  hidden?: boolean | null;
  mimetype?: string | null;
  schema_group?: string | null;
  fa_icon?: string | null;
  source_kind?: ParamSourceKind | null;
  source_expression?: string | null;
  source_path?: string | null;
}

interface ParamProvenance {
  source_kind: ParamSourceKind;
  source_expression: string;
  source_path: string;
}

interface Tool {
  name: string;
  version: string;
  version_constraint: string | null;
  biocontainer: string | null;
  bioconda: string | null;
  docker: string | null;
  singularity: string | null;
  wave: string | null;
  mulled_components?: ToolSpec[];
  versions?: string[];
}

interface ToolSpec {
  name: string;
  version: string;
  bioconda: string;
}

interface ChannelIO {
  name: string;
  shape: string;
  description?: string;
  topic: string | null;
}

interface Process {
  name: string;
  aliases: string[];
  in_subworkflows: string[];
  module_path: string;
  meta: ModuleMeta | null;
  module_tests: NfTest[];
  tool: string | null;
  container: string | null;
  conda: string | null;
  inputs: ChannelIO[];
  outputs: ChannelIO[];
  when: string | null;
  script_summary: string;
  publish_dir: string | null;
}

interface ModuleMeta {
  description?: string;
  keywords: string[];
  authors: string[];
  maintainers: string[];
  tools: ModuleMetaEntry[];
  input: ModuleMetaEntry[];
  output: ModuleMetaEntry[];
}

interface ModuleMetaEntry {
  name: string;
  description?: string;
  homepage?: string;
  documentation?: string;
  tool_dev_url?: string;
  doi?: string;
  licence?: string[];
  identifier?: string;
  type?: string;
  pattern?: string;
}

interface TestDataRef {
  role: string;
  path: string | null;
  url: string | null;
  sha1: string | null;
  filetype: string | null;
  description: string | null;
}

interface NfTest {
  name: string;
  path: string;
  profiles: string[];
  params_overrides: Record<string, unknown>;
  assert_workflow_success: boolean;
  snapshot: {
    captures: string[];
    helpers: string[];
    ignore_files: string[];
    ignore_globs: string[];
    snap_path: string | null;
    parsed_content: SnapshotContent[];
  } | null;
  prose_assertions: string[];
}

interface SnapshotContent {
  name: string;
  channels: SnapshotChannel[];
}

interface SnapshotChannel {
  key: string | null;
  files: SnapshotFile[];
  values: unknown[];
}

interface SnapshotFile {
  path: string;
  basename: string;
  md5: string;
  stub: boolean;
}

interface SnapshotParts {
  files: SnapshotFile[];
  values: unknown[];
}

const MAX_SNAPSHOT_SIDECAR_BYTES = 200_000;

export interface ResolveOptions {
  profile: string;
  withNextflow: boolean;
  fetchTestData: boolean;
  testDataDir?: string;
  mulledIndexPath?: string;
}

export async function resolveNextflowSummary(
  pipelineRoot: string,
  options: ResolveOptions,
): Promise<Summary> {
  const root = detectPipelineRoot(pipelineRoot);
  pipelineRoot = root.path;

  const configPath = join(pipelineRoot, "nextflow.config");
  const config = existsSync(configPath) ? readText(configPath) : "";
  const workflowName = parseWorkflowName(config);
  const processFiles = discoverProcessFiles(pipelineRoot);
  const processes = processFiles.flatMap((path) => parseProcessFile(pipelineRoot, path));
  const aliases = discoverProcessAliases(pipelineRoot);
  const warnings =
    options.mulledIndexPath && !existsSync(options.mulledIndexPath)
      ? [`mulled index path not found: ${options.mulledIndexPath}`]
      : [];
  const {
    tools,
    perProcessSingleton,
    warnings: toolWarnings,
  } = buildTools(pipelineRoot, processes, options.mulledIndexPath);
  warnings.push(...toolWarnings);
  const workflows = parseWorkflows(
    pipelineRoot,
    processes.map((process) => process.name),
  );
  const primaryWorkflow = selectPrimaryWorkflow(
    workflows,
    processes.map((process) => process.name),
  );
  warnings.push(...buildWarnings(processes, workflows));

  const aliasToCanonical = new Map<string, string>();
  for (const [canonical, aliasList] of aliases.entries()) {
    for (const alias of aliasList) aliasToCanonical.set(alias, canonical);
  }
  const invocationsByCallee = buildSubworkflowInvocations(workflows);

  const processNameSet = new Set(processes.map((process) => process.name));
  const inSubworkflows = new Map<string, string[]>();
  for (const workflow of workflows) {
    if (primaryWorkflow && workflow.name === primaryWorkflow.name) continue;
    for (const call of workflow.calls) {
      const canonical = aliasToCanonical.get(call) ?? call;
      if (!processNameSet.has(canonical)) continue;
      const list = inSubworkflows.get(canonical) ?? [];
      if (!list.includes(workflow.name)) list.push(workflow.name);
      inSubworkflows.set(canonical, list);
    }
  }

  const params = parseParams(pipelineRoot);

  const summary: Summary = {
    source: {
      ecosystem: workflowName.startsWith("nf-core/") ? "nf-core" : "nextflow",
      workflow: workflowName.split("/").at(-1) ?? basename(pipelineRoot),
      url: normalizeGitUrl(
        gitOutput(pipelineRoot, ["remote", "get-url", "origin"]) ??
          "https://example.invalid/unknown.git",
      ),
      version: gitOutput(pipelineRoot, ["rev-parse", "HEAD"]) ?? "unknown",
      license: existsSync(join(pipelineRoot, "LICENSE")) ? "MIT" : null,
      slug: workflowName.replace("/", "-"),
    },
    params,
    sample_sheets: parseSampleSheets(pipelineRoot),
    profiles: parseProfiles(config),
    tools,
    processes: processes.map((process) => ({
      ...process,
      aliases: aliases.get(process.name) ?? [],
      in_subworkflows: inSubworkflows.get(process.name) ?? [],
      tool: resolveProcessToolFk(process, tools, perProcessSingleton),
    })),
    subworkflows: workflows
      .filter((workflow) => workflow.name !== primaryWorkflow?.name)
      .map((workflow) => {
        const stripped = stripWorkflowBody(workflow);
        const invocations = invocationsByCallee.get(workflow.name);
        if (invocations && invocations.length > 0) stripped.invocations = invocations;
        return stripped;
      }),
    workflow: {
      name: primaryWorkflow?.name ?? workflowName.split("/").at(-1)?.toUpperCase() ?? "WORKFLOW",
      channels: primaryWorkflow ? parseWorkflowChannels(primaryWorkflow.body) : [],
      edges: primaryWorkflow ? parseWorkflowEdges(primaryWorkflow.body, primaryWorkflow.calls) : [],
      conditionals: primaryWorkflow
        ? parseWorkflowConditionals(primaryWorkflow.body, primaryWorkflow.calls)
        : [],
    },
    reference_assets: [],
    reference_rebuilds: detectReferenceRebuilds(workflows, invocationsByCallee, params),
    test_fixtures: parseTestFixtures(pipelineRoot, options.profile),
    nf_tests: parseNfTests(pipelineRoot),
    warnings: [...root.warnings, ...warnings],
  };

  summary.reference_assets = buildReferenceAssets(
    summary.params,
    workflows,
    summary.reference_rebuilds,
  );

  const entrypoint = selectEntrypoint(pipelineRoot);
  if (entrypoint) summary.warnings.push(`selected Nextflow entrypoint: ${entrypoint}`);

  if (options.withNextflow) mergeNextflowInspect(summary, pipelineRoot, options.profile);
  if (options.fetchTestData) await fetchTestData(summary, options.testDataDir);
  return summary;
}

function buildWarnings(processes: Process[], workflows: ParsedWorkflow[]): string[] {
  const warnings = ["workflow graph extraction is intentionally partial in resolver v1"];
  if (!processes.some((process) => process.module_path.startsWith(`modules${sep}`))) {
    warnings.push(
      "no module process files found under modules/; process extraction may be incomplete",
    );
  }
  if (workflows.length === 0) {
    warnings.push("no named workflow blocks found; summary uses manifest-derived workflow name");
  }
  return warnings;
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function gitOutput(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function commandOutput(command: string, args: string[], cwd: string): string | null {
  try {
    return execFileSync(command, args, { cwd, encoding: "utf8", timeout: 30_000 }).trim();
  } catch {
    return null;
  }
}

function mergeNextflowInspect(summary: Summary, pipelineRoot: string, profile: string): void {
  const output = commandOutput(
    "nextflow",
    ["inspect", pipelineRoot, "-profile", profile, "-format", "json"],
    pipelineRoot,
  );
  if (!output) {
    summary.warnings.push("nextflow inspect unavailable or failed; static container parsing used");
    return;
  }

  let data: unknown;
  try {
    data = JSON.parse(output);
  } catch {
    summary.warnings.push(
      "nextflow inspect returned non-JSON output; static container parsing used",
    );
    return;
  }

  const inspected =
    (data as { processes?: { name?: string; container?: string }[] }).processes ?? [];
  for (const inspectedProcess of inspected) {
    if (!inspectedProcess.name || !inspectedProcess.container) continue;
    const shortName = inspectedProcess.name.split(":").at(-1);
    const process = summary.processes.find(
      (candidate) => candidate.name === inspectedProcess.name || candidate.name === shortName,
    );
    if (process) process.container = inspectedProcess.container;
  }
}

function parseWorkflowName(config: string): string {
  return (
    matchOne(config, /manifest\s*\{[\s\S]*?name\s*=\s*['"]([^'"]+)['"]/u) ?? "nextflow/unknown"
  );
}

function parseProfiles(config: string): string[] {
  const block = extractNamedBlock(config, "profiles");
  if (!block) return [];
  return [...block.matchAll(/^\s*([A-Za-z0-9_]+)\s*\{/gmu)]
    .map((match) => match[1]!)
    .filter((name) => name && name !== "profiles");
}

function parseParams(pipelineRoot: string): Param[] {
  const schemaPath = join(pipelineRoot, "nextflow_schema.json");
  const params = new Map<string, Param>();
  if (existsSync(schemaPath)) {
    const schema = JSON.parse(readText(schemaPath)) as {
      $defs?: Record<
        string,
        {
          title?: string;
          fa_icon?: string;
          required?: string[];
          properties?: Record<string, Record<string, unknown>>;
        }
      >;
    };
    for (const section of Object.values(schema.$defs ?? {})) {
      const required = new Set(section.required ?? []);
      const schema_group = typeof section.title === "string" ? section.title : null;
      const fa_icon = typeof section.fa_icon === "string" ? section.fa_icon : null;
      for (const [name, property] of Object.entries(section.properties ?? {})) {
        const type = Array.isArray(property.type)
          ? String(property.type[0])
          : String(property.type ?? "string");
        params.set(name, {
          name,
          type,
          default: property.default ?? null,
          description: typeof property.description === "string" ? property.description : undefined,
          required: required.has(name),
          enum: Array.isArray(property.enum) ? property.enum : undefined,
          format: typeof property.format === "string" ? property.format : null,
          hidden: typeof property.hidden === "boolean" ? property.hidden : null,
          mimetype: typeof property.mimetype === "string" ? property.mimetype : null,
          schema_group,
          fa_icon,
          source_kind: "nextflow_schema",
          source_expression: null,
          source_path: "nextflow_schema.json",
        });
      }
    }
  }
  for (const entry of parseGetGenomeAttributeAssignments(pipelineRoot)) {
    const existing = params.get(entry.name);
    if (existing) {
      existing.source_kind = entry.provenance.source_kind;
      existing.source_expression = entry.provenance.source_expression;
      existing.source_path = entry.provenance.source_path;
    } else {
      params.set(entry.name, {
        name: entry.name,
        type: "string",
        default: null,
        required: false,
        format: "file-path",
        hidden: null,
        mimetype: null,
        schema_group: "Reference genome options",
        fa_icon: null,
        source_kind: entry.provenance.source_kind,
        source_expression: entry.provenance.source_expression,
        source_path: entry.provenance.source_path,
      });
    }
  }
  return [...params.values()];
}

const GENOME_ATTRIBUTE_CONFIG_CANDIDATES = [
  "nextflow.config",
  "conf/igenomes.config",
  "conf/genomes.config",
];

function parseGetGenomeAttributeAssignments(
  pipelineRoot: string,
): { name: string; provenance: ParamProvenance }[] {
  const results: { name: string; provenance: ParamProvenance }[] = [];
  for (const relPath of GENOME_ATTRIBUTE_CONFIG_CANDIDATES) {
    const fullPath = join(pipelineRoot, relPath);
    if (!existsSync(fullPath)) continue;
    const text = readText(fullPath);
    const pattern =
      /(?:params\s*\.\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(getGenomeAttribute\s*\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\))/gu;
    for (const match of text.matchAll(pattern)) {
      const lhs = match[1]!;
      const rhs = match[2]!.replace(/\s+/gu, "");
      results.push({
        name: lhs,
        provenance: {
          source_kind: "getGenomeAttribute",
          source_expression: rhs,
          source_path: relPath,
        },
      });
    }
  }
  return results;
}

function parseSampleSheets(pipelineRoot: string): SampleSheet[] {
  const schemaPath = join(pipelineRoot, "nextflow_schema.json");
  if (!existsSync(schemaPath)) return [];
  const schema = JSON.parse(readText(schemaPath)) as {
    $defs?: Record<string, { properties?: Record<string, Record<string, unknown>> }>;
  };
  const sheets: SampleSheet[] = [];
  for (const section of Object.values(schema.$defs ?? {})) {
    for (const [paramName, property] of Object.entries(section.properties ?? {})) {
      const rowSchemaRef = typeof property.schema === "string" ? property.schema : null;
      if (!rowSchemaRef) continue;
      const rowSchemaPath = join(pipelineRoot, rowSchemaRef);
      if (!existsSync(rowSchemaPath)) continue;
      const mimetype = typeof property.mimetype === "string" ? property.mimetype : null;
      const format =
        mimetype === "text/csv" ? "csv" : mimetype === "text/tab-separated-values" ? "tsv" : null;
      sheets.push({
        param: paramName,
        schema_path: rowSchemaRef,
        discovered_via: "nf-schema",
        format,
        header: true,
        columns: parseSampleSheetColumns(rowSchemaPath),
      });
    }
  }
  return sheets;
}

function parseSampleSheetColumns(rowSchemaPath: string): SampleSheetColumn[] {
  const rowSchema = JSON.parse(readText(rowSchemaPath)) as {
    items?: { properties?: Record<string, Record<string, unknown>>; required?: string[] };
  };
  const items = rowSchema.items ?? {};
  const required = new Set(items.required ?? []);
  const columns: SampleSheetColumn[] = [];
  for (const [name, raw] of Object.entries(items.properties ?? {})) {
    const property = collapseAnyOf(raw);
    const declaredType = pickScalarType(property.type);
    const type: SampleSheetColumn["type"] =
      declaredType === "integer" || declaredType === "number" || declaredType === "boolean"
        ? declaredType
        : "string";
    const format = typeof property.format === "string" ? property.format : null;
    const isMeta = Array.isArray(property.meta);
    const isPathFormat = format === "file-path" || format === "directory-path" || format === "path";
    const kind: SampleSheetColumn["kind"] = isMeta || !isPathFormat ? "meta" : "data";
    columns.push({
      name,
      type,
      kind,
      format,
      required: required.has(name),
      default: property.default ?? null,
      description: typeof property.description === "string" ? property.description : null,
      enum: Array.isArray(property.enum) ? property.enum : [],
      pattern: typeof property.pattern === "string" ? property.pattern : null,
      exists: typeof property.exists === "boolean" ? property.exists : null,
      mimetype: typeof property.mimetype === "string" ? property.mimetype : null,
    });
  }
  return columns;
}

function collapseAnyOf(property: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(property.anyOf)) return property;
  const merged: Record<string, unknown> = { ...property };
  for (const branch of property.anyOf as Record<string, unknown>[]) {
    for (const [key, value] of Object.entries(branch)) {
      if (merged[key] === undefined && value !== undefined) merged[key] = value;
    }
  }
  return merged;
}

function pickScalarType(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const nonNull = value.find((entry) => typeof entry === "string" && entry !== "null");
    return typeof nonNull === "string" ? nonNull : null;
  }
  return null;
}

function detectPipelineRoot(path: string): { path: string; warnings: string[] } {
  const requestedRoot = resolve(path);
  if (existsSync(join(requestedRoot, "nextflow.config"))) {
    return { path: requestedRoot, warnings: [] };
  }

  const configRoots = walk(requestedRoot, { maxDepth: 2 })
    .filter((candidate) => basename(candidate) === "nextflow.config")
    .map(dirname)
    .sort((left, right) =>
      relative(requestedRoot, left).localeCompare(relative(requestedRoot, right)),
    );
  if (configRoots[0]) {
    const sharedProcessFiles = discoverProcessFiles(requestedRoot).filter(
      (path) => !configRoots.some((configRoot) => path.startsWith(`${configRoot}${sep}`)),
    );
    if (sharedProcessFiles.length > 0) {
      return {
        path: requestedRoot,
        warnings: [
          `detected child Nextflow configs but kept repository root because shared process files exist outside child roots`,
          `multiple Nextflow pipeline roots found; selected .`,
        ],
      };
    }

    const warnings = [
      `auto-detected Nextflow pipeline root: ${relative(requestedRoot, configRoots[0]) || "."}`,
    ];
    if (configRoots.length > 1) {
      warnings.push(
        `multiple Nextflow pipeline roots found; selected ${relative(requestedRoot, configRoots[0]) || "."}`,
      );
    }
    return {
      path: configRoots[0],
      warnings,
    };
  }

  const workflowFiles = walk(requestedRoot)
    .filter(isNextflowSourceFile)
    .filter((candidate) => extractWorkflowBlocks(readText(candidate)).length > 0)
    .sort((left, right) => compareEntrypointCandidates(requestedRoot, left, right));
  if (workflowFiles[0]) {
    const detectedRoot = dirname(workflowFiles[0]);
    return {
      path: detectedRoot,
      warnings: [
        `auto-detected Nextflow pipeline root from workflow block: ${relative(requestedRoot, detectedRoot) || "."}`,
      ],
    };
  }

  throw new Error(`not a Nextflow pipeline root: ${path}`);
}

function discoverProcessFiles(pipelineRoot: string): string[] {
  return walk(pipelineRoot)
    .filter(isNextflowSourceFile)
    .filter((path) => /\bprocess\s+[A-Za-z0-9_]+\s*\{/u.test(readText(path)));
}

function walk(root: string, options: { maxDepth?: number } = {}, depth = 0): string[] {
  if (!existsSync(root)) return [];
  const paths: string[] = [];
  for (const entry of readdirSync(root).sort()) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) {
      if (!shouldSkipDir(entry) && (options.maxDepth === undefined || depth < options.maxDepth)) {
        paths.push(...walk(path, options, depth + 1));
      }
    } else paths.push(path);
  }
  return paths;
}

function shouldSkipDir(name: string): boolean {
  return [
    ".git",
    ".nextflow",
    "work",
    "node_modules",
    "BioNextflow",
    "external-modules",
    "vendor",
    "vendors",
    "third_party",
  ].includes(name);
}

function isNextflowSourceFile(path: string): boolean {
  return path.endsWith(".nf");
}

function parseProcessFile(pipelineRoot: string, path: string): Process[] {
  const text = readText(path);
  return [...text.matchAll(/\bprocess\s+([A-Za-z0-9_]+)\s*\{/gu)].flatMap((match) => {
    const openIndex = match.index + match[0].lastIndexOf("{");
    const body = extractBlockAt(text, openIndex);
    if (body === null) return [];
    const name = match[1]!;
    const moduleDir = dirname(path);
    const modulePath = relative(pipelineRoot, path);
    const isLocalModule = modulePath.startsWith(`modules${sep}local${sep}`);
    const container = normalizeDirective(
      matchOne(
        body,
        /container\s+"([\s\S]*?)"\s*(?:\n\s*input:|\n\s*output:|\n\s*when:|\n\s*script:)/u,
      ) ?? matchOne(body, /container\s+([^\n]+)/u),
    );
    // Modern form is `conda "<spec>"`; the pre-environment.yml idiom wrapped it
    // in a ternary, `conda (params.enable_conda ? "<spec>" : null)`.
    const conda = normalizeDirective(
      matchOne(body, /conda\s+"([\s\S]*?)"/u) ??
        matchOne(body, /conda\s*\([^)\n]*?\?\s*"([\s\S]*?)"/u),
    );
    return {
      name,
      aliases: [],
      in_subworkflows: [],
      module_path: modulePath,
      meta: isLocalModule ? null : parseModuleMeta(join(moduleDir, "meta.yml")),
      module_tests: isLocalModule ? [] : parseNfTestsInDir(pipelineRoot, join(moduleDir, "tests")),
      tool: null,
      container,
      conda,
      inputs: parseIoBlock(body, "input"),
      outputs: parseIoBlock(body, "output"),
      when: normalizeDirective(matchOne(body, /when:\s*\n([\s\S]*?)\n\s*script:/u)),
      script_summary: summarizeScript(name),
      publish_dir: normalizeDirective(matchOne(body, /publishDir\s+([^\n]+)/u)),
    };
  });
}

function parseModuleMeta(path: string): ModuleMeta | null {
  if (!existsSync(path)) return null;
  const data = YAML.parse(readText(path)) as Record<string, unknown> | null;
  if (!data || typeof data !== "object") return null;
  return {
    description: typeof data.description === "string" ? data.description : undefined,
    keywords: stringArray(data.keywords),
    authors: stringArray(data.authors),
    maintainers: stringArray(data.maintainers),
    tools: parseNamedMetaEntries(data.tools),
    input: parseNamedMetaEntries(data.input),
    output: parseNamedMetaEntries(data.output),
  };
}

function parseNamedMetaEntries(value: unknown): ModuleMetaEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    return Object.entries(item as Record<string, unknown>).flatMap(([name, details]) => {
      if (!details || typeof details !== "object" || Array.isArray(details)) return [];
      const record = details as Record<string, unknown>;
      return {
        name,
        description: stringValue(record.description),
        homepage: stringValue(record.homepage),
        documentation: stringValue(record.documentation),
        tool_dev_url: stringValue(record.tool_dev_url),
        doi: stringValue(record.doi),
        licence: stringArray(record.licence),
        identifier: stringValue(record.identifier),
        type: stringValue(record.type),
        pattern: stringValue(record.pattern),
      };
    });
  });
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function selectEntrypoint(pipelineRoot: string): string | null {
  const candidates = walk(pipelineRoot)
    .filter(isNextflowSourceFile)
    .filter((candidate) => extractWorkflowBlocks(readText(candidate)).length > 0)
    .sort((left, right) => compareEntrypointCandidates(pipelineRoot, left, right));
  return candidates[0] ? relative(pipelineRoot, candidates[0]) : null;
}

function compareEntrypointCandidates(root: string, left: string, right: string): number {
  const leftBlocks = extractWorkflowBlocks(readText(left));
  const rightBlocks = extractWorkflowBlocks(readText(right));
  const leftAnonymousScore = leftBlocks.some((block) => block.name === null) ? 0 : 1;
  const rightAnonymousScore = rightBlocks.some((block) => block.name === null) ? 0 : 1;
  const leftNameScore = basename(left) === "main.nf" ? 0 : 1;
  const rightNameScore = basename(right) === "main.nf" ? 0 : 1;
  const leftDepth = relative(root, dirname(left)).split(sep).filter(Boolean).length;
  const rightDepth = relative(root, dirname(right)).split(sep).filter(Boolean).length;
  return (
    leftAnonymousScore - rightAnonymousScore ||
    leftNameScore - rightNameScore ||
    leftDepth - rightDepth ||
    relative(root, left).localeCompare(relative(root, right))
  );
}

function discoverProcessAliases(pipelineRoot: string): Map<string, string[]> {
  const aliases = new Map<string, Set<string>>();
  for (const path of walk(pipelineRoot).filter((candidate) => candidate.endsWith(".nf"))) {
    for (const include of parseIncludeItems(readText(path))) {
      if (!include.alias || include.alias === include.name) continue;
      const existing = aliases.get(include.name) ?? new Set<string>();
      existing.add(include.alias);
      aliases.set(include.name, existing);
    }
  }
  return new Map([...aliases.entries()].map(([name, values]) => [name, [...values].sort()]));
}

function parseWorkflows(pipelineRoot: string, processNames: string[]): ParsedWorkflow[] {
  const workflows = new Map<string, ParsedWorkflow>();
  const knownProcesses = new Set(processNames);
  for (const path of walk(pipelineRoot).filter((candidate) => candidate.endsWith(".nf"))) {
    const text = readText(path);
    const blocks = extractWorkflowBlocks(text);
    const localWorkflowNames = blocks.flatMap((block) => (block.name ? [block.name] : []));
    const importedNames = new Set(
      parseIncludeItems(text).map((include) => include.alias ?? include.name),
    );
    for (const block of blocks) {
      if (!block.name) continue;
      const calls = parseWorkflowCalls(
        block.body,
        new Set([...knownProcesses, ...importedNames, ...localWorkflowNames]),
      );
      workflows.set(block.name, {
        name: block.name,
        path: relative(pipelineRoot, path),
        kind: calls.length > 0 ? "pipeline" : "utility",
        calls,
        inputs: parseWorkflowIoBlock(block.body, "take"),
        outputs: parseWorkflowIoBlock(block.body, "emit"),
        tests: parseNfTestsInDir(pipelineRoot, join(dirname(path), "tests")),
        body: block.body,
      });
    }
  }
  return [...workflows.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function selectPrimaryWorkflow(
  workflows: ParsedWorkflow[],
  processNames: string[],
): ParsedWorkflow | null {
  if (workflows.length === 0) return null;
  const knownProcesses = new Set(processNames);
  const byName = new Map(workflows.map((workflow) => [workflow.name, workflow]));
  const reach = new Map<string, Set<string>>();

  function transitiveReach(name: string, visiting: Set<string>): Set<string> {
    const cached = reach.get(name);
    if (cached) return cached;
    if (visiting.has(name)) return new Set();
    visiting.add(name);
    const result = new Set<string>();
    const workflow = byName.get(name);
    if (workflow) {
      for (const call of workflow.calls) {
        if (knownProcesses.has(call)) {
          result.add(call);
        } else if (byName.has(call)) {
          for (const reached of transitiveReach(call, visiting)) result.add(reached);
        }
      }
    }
    visiting.delete(name);
    reach.set(name, result);
    return result;
  }

  for (const workflow of workflows) transitiveReach(workflow.name, new Set());

  const tiebreak = (left: ParsedWorkflow, right: ParsedWorkflow): number => {
    const pathDiff =
      Number(right.path.startsWith("workflows/")) - Number(left.path.startsWith("workflows/"));
    if (pathDiff !== 0) return pathDiff;
    const callDiff = right.calls.length - left.calls.length;
    if (callDiff !== 0) return callDiff;
    return left.name.localeCompare(right.name);
  };

  const reachSizes = workflows.map((workflow) => reach.get(workflow.name)!.size);
  const maxReach = Math.max(...reachSizes);
  if (maxReach === 0) {
    return [...workflows].sort(tiebreak)[0] ?? null;
  }

  const reachCandidates = workflows.filter(
    (workflow) => reach.get(workflow.name)!.size === maxReach,
  );
  const workflowsPrefixed = reachCandidates.filter((candidate) =>
    candidate.path.startsWith("workflows/"),
  );
  const candidates = workflowsPrefixed.length > 0 ? workflowsPrefixed : reachCandidates;
  const candidateNames = new Set(candidates.map((candidate) => candidate.name));
  const terminal = candidates.filter(
    (candidate) => !candidate.calls.some((call) => candidateNames.has(call)),
  );
  const finalists = terminal.length > 0 ? terminal : candidates;
  return [...finalists].sort(tiebreak)[0] ?? null;
}

function stripWorkflowBody(workflow: ParsedWorkflow): Subworkflow {
  const { body: _body, ...summaryWorkflow } = workflow;
  return summaryWorkflow;
}

function extractWorkflowBlocks(text: string): { name: string | null; body: string }[] {
  const blocks: { name: string | null; body: string }[] = [];
  const regex = /\bworkflow(?:\s+([A-Za-z0-9_]+))?\s*\{/gu;
  for (const match of text.matchAll(regex)) {
    const openIndex = match.index + match[0].lastIndexOf("{");
    const body = extractBlockAt(text, openIndex);
    if (body !== null) blocks.push({ name: match[1] ?? null, body });
  }
  return blocks;
}

function parseWorkflowCalls(body: string, knownNames: Set<string>): string[] {
  const calls = new Set<string>();
  // Match call positions anywhere on a line (not just line-start) so that tuple
  // destructures like `(a, b) = setup(reads)` register `setup` as a call. The
  // knownNames filter keeps false positives (random `name(`) out.
  for (const match of body.matchAll(/(?:^|[^A-Za-z0-9_.])([A-Za-z_][A-Za-z0-9_]*)\s*\(/gmu)) {
    const name = match[1]!;
    if (knownNames.has(name)) calls.add(name);
  }
  return [...calls].sort();
}

function parseWorkflowChannels(body: string): Channel[] {
  const channels = new Map<string, Channel>();
  const mainBlock = extractMainBlock(body);
  for (const assignment of extractChannelAssignments(mainBlock)) {
    setPreferredChannel(channels, channelFromSource(assignment.name, assignment.source));
  }
  for (const destructure of extractTupleDestructures(mainBlock)) {
    setPreferredChannel(channels, channelFromSource(destructure.name, destructure.source));
  }
  for (const setChain of extractSetChains(body)) {
    setPreferredChannel(channels, channelFromSource(setChain.name, setChain.source));
  }
  return [...channels.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function extractMainBlock(body: string): string {
  const mainMatch = /\bmain:\s*\n([\s\S]*?)(?=\n\s*emit:|$)/u.exec(body);
  return mainMatch ? mainMatch[1]! : body;
}

const CHANNEL_OPERATOR_PATTERN =
  /\.(?:branch|collect|combine|concat|cross|dump|filter|first|flatMap|flatten|groupTuple|ifEmpty|join|last|map|merge|mix|multiMap|set|spread|tap|toList|toSortedList|transpose|unique)\s*[({]/u;

function isChannelShapedSource(source: string): boolean {
  if (/^\s*[Cc]hannel\./u.test(source)) return true;
  if (/^\s*files?\s*\(/u.test(source)) return true;
  if (/\.out\.[A-Za-z_]/u.test(source)) return true;
  if (CHANNEL_OPERATOR_PATTERN.test(source)) return true;
  return false;
}

function setPreferredChannel(channels: Map<string, Channel>, candidate: Channel): void {
  const existing = channels.get(candidate.name);
  if (
    !existing ||
    parseOperators(candidate.source).length > parseOperators(existing.source).length
  ) {
    channels.set(candidate.name, candidate);
  }
}

function extractChannelAssignments(body: string): { name: string; source: string }[] {
  const assignments: { name: string; source: string }[] = [];
  const lines = body.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const start = /^\s*(?:def\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/u.exec(lines[index]!);
    if (!start) continue;
    const name = start[1]!;
    const sourceLines = [start[2]!];
    for (let next = index + 1; next < lines.length; next += 1) {
      const line = lines[next]!;
      if (!/^\s*\./u.test(line)) break;
      sourceLines.push(line.trim());
      index = next;
    }
    const source = normalizeWorkflowExpression(sourceLines.join(" "));
    if (!name.startsWith("ch_") && !isChannelShapedSource(source)) continue;
    assignments.push({ name, source });
  }
  return assignments;
}

function extractTupleDestructures(body: string): { name: string; source: string }[] {
  const destructures: { name: string; source: string }[] = [];
  for (const match of body.matchAll(
    /^[ \t]*(?:def\s+)?\(\s*([A-Za-z_][A-Za-z0-9_, \t]*)\s*\)\s*=\s*([A-Za-z_][A-Za-z0-9_]*\s*\([^\n]*\))\s*$/gmu,
  )) {
    const names = match[1]!
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    if (names.length < 2) continue;
    const source = normalizeWorkflowExpression(match[2]!);
    if (!isChannelShapedSource(source) && !/^[A-Za-z_][A-Za-z0-9_]*\s*\(/u.test(source)) continue;
    names.forEach((name, position) => {
      destructures.push({ name, source: `${source}[${position}]` });
    });
  }
  return destructures;
}

function extractSetChains(body: string): { name: string; source: string }[] {
  const chains: { name: string; source: string }[] = [];
  const lines = body.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\s*(?:ch_|Channel\.)/u.test(lines[index]!)) continue;
    const sourceLines: string[] = [];
    for (let next = index; next < lines.length; next += 1) {
      const line = lines[next]!;
      if (
        next > index &&
        (/^\s*(?:take|main|emit):/u.test(line) ||
          /^\s*(?:if|else|[A-Z][A-Z0-9_]+\s*\()/u.test(line))
      ) {
        break;
      }
      sourceLines.push(line.trim());
      const setMatch = /\.set\s*\{\s*(ch_[A-Za-z0-9_]+)\s*\}/u.exec(line);
      if (setMatch) {
        const rawSource = sourceLines
          .join(" ")
          .replace(/\.set\s*\{\s*ch_[A-Za-z0-9_]+\s*\}.*/u, "");
        chains.push({ name: setMatch[1]!, source: normalizeWorkflowExpression(rawSource) });
        index = next;
        break;
      }
      if (next - index > 80) break;
    }
  }
  return chains;
}

function channelFromSource(name: string, source: string): Channel {
  const operators = parseOperators(source);
  const construct = classifyChannelConstruct(source);
  return {
    name,
    source,
    shape: operators.length > 0 ? operators.join("|") : "channel",
    construct,
    from_param: resolveDirectFromParam(source, construct),
    required_runtime: detectIfEmptyError(source),
  };
}

function classifyChannelConstruct(source: string): ChannelConstruct {
  if (/\bsamplesheetToList\s*\(/u.test(source)) return "samplesheetToList";
  if (/\bsplitCsv\s*\(/u.test(source)) return "splitCsv";
  if (/\b[Cc]hannel\.fromPath\b/u.test(source)) return "fromPath";
  if (/\b[Cc]hannel\.fromFilePairs\b/u.test(source)) return "fromFilePairs";
  if (/\b[Cc]hannel\.fromList\b/u.test(source)) return "fromList";
  if (/\b[Cc]hannel\.empty\b/u.test(source)) return "empty";
  if (/\b[Cc]hannel\.of\b/u.test(source)) return "of";
  if (/\b[Cc]hannel\.value\b/u.test(source)) return "value";
  if (/\b[Cc]hannel\.topic\b/u.test(source)) return "topic";
  if (/^\s*file\s*\(/u.test(source)) return "file";
  if (/^\s*files\s*\(/u.test(source)) return "files";
  return "other";
}

const DATA_BEARING_CONSTRUCTS = new Set<ChannelConstruct>([
  "fromPath",
  "fromFilePairs",
  "fromList",
  "samplesheetToList",
  "file",
  "files",
]);

function resolveDirectFromParam(source: string, construct: ChannelConstruct): string | null {
  if (!DATA_BEARING_CONSTRUCTS.has(construct)) return null;
  const match = /\bparams\.([A-Za-z_][A-Za-z_0-9]*)/u.exec(source);
  return match ? match[1]! : null;
}

function detectIfEmptyError(source: string): boolean {
  return /\.ifEmpty\s*\{[^{}]*\berror\b/u.test(source);
}

function parseOperators(source: string): string[] {
  return [...source.matchAll(/\.(branch|cross|dump|filter|join|map|mix|multiMap)\b/gu)].map(
    (match) => match[1]!,
  );
}

function normalizeWorkflowExpression(source: string): string {
  return source
    .replace(/\s+/gu, " ")
    .replace(/\s+\./gu, ".")
    .replace(/\s*,\s*/gu, ", ")
    .trim();
}

function parseWorkflowEdges(body: string, calls: string[]): Edge[] {
  const callNames = new Set(calls);
  const edges: Edge[] = [];
  for (const invocation of extractCallInvocations(body)) {
    if (!callNames.has(invocation.name)) continue;
    for (const argument of invocation.arguments) {
      edges.push({ from: argument, to: invocation.name, via: [] });
    }
  }
  return edges;
}

function buildReferenceAssets(
  params: Param[],
  workflows: ParsedWorkflow[],
  rebuilds: ReferenceRebuildRule[],
): ReferenceAsset[] {
  const paramsByName = new Map(params.map((param) => [param.name, param]));
  const usedBy = collectParamCallers(workflows);
  const rebuildParams = new Set<string>();
  for (const rule of rebuilds) {
    rebuildParams.add(rule.asset_param);
    if (rule.fallback_for) rebuildParams.add(rule.fallback_for);
  }
  const assets: ReferenceAsset[] = [];
  const seen = new Set<string>();
  const candidateNames = new Set<string>([
    ...params.filter(isPathTypedParam).map((param) => param.name),
    ...rebuildParams,
  ]);
  for (const name of candidateNames) {
    if (seen.has(name)) continue;
    seen.add(name);
    if (!rebuildParams.has(name) && isNonReferenceParam(name)) continue;
    const param = paramsByName.get(name);
    if (!param) continue;
    // A switch is never an asset, however it was nominated — the rebuild path
    // must not smuggle one past the candidate filters above.
    if (isToggleParam(name, paramsByName)) continue;
    const callers = [...(usedBy.get(name) ?? [])].sort();
    const hasRebuild = rebuildParams.has(name);
    const sourcePath = param.source_path ?? null;
    const confidence: Evidence["confidence"] =
      callers.length > 0 && param.source_kind ? "high" : "medium";
    assets.push({
      param: name,
      asset_kind: classifyAssetKind(name),
      format_hint: param.format ?? null,
      required: param.required && !hasRebuild,
      source_kind: param.source_kind ?? null,
      source_expression: param.source_expression ?? null,
      schema_group: param.schema_group ?? null,
      used_by: callers,
      evidence: {
        source_path: sourcePath,
        confidence,
        evidence: [],
      },
    });
  }
  return assets.sort((left, right) => left.param.localeCompare(right.param));
}

// nf-core convention: path-typed params that drive execution, reporting, or
// registry lookup rather than naming a reference asset.
const NON_REFERENCE_PARAMS = new Set([
  "input",
  "samplesheet",
  "outdir",
  "tracedir",
  "multiqc_config",
  "multiqc_logo",
  "multiqc_methods_description",
  "email",
  "email_on_fail",
  "plaintext_email",
  "hook_url",
  "custom_config_base",
  "igenomes_base",
]);

function isNonReferenceParam(name: string): boolean {
  return NON_REFERENCE_PARAMS.has(name);
}

function isToggleName(name: string): boolean {
  return /^(skip|no|disable|disabled)_/u.test(name);
}

// nf-core subworkflows rename take slots (`val_skip_fastqc`), so a name test on
// the raw guard identifier misses these; the declared type is the reliable
// signal, with the name test covering params absent from nextflow_schema.json.
function isToggleParam(name: string, paramsByName: Map<string, Param>): boolean {
  return paramsByName.get(name)?.type === "boolean" || isToggleName(name);
}

function isPathTypedParam(param: Param): boolean {
  return (
    param.format === "file-path" ||
    param.format === "directory-path" ||
    param.format === "path" ||
    param.format === "file-path-pattern" ||
    param.source_kind === "getGenomeAttribute"
  );
}

function collectParamCallers(workflows: ParsedWorkflow[]): Map<string, Set<string>> {
  const usedBy = new Map<string, Set<string>>();
  for (const workflow of workflows) {
    const mainBlock = extractMainBlock(workflow.body);
    const boundHere = new Set<string>();
    for (const invocation of extractCallInvocations(mainBlock)) {
      for (const argument of invocation.arguments) {
        const paramName = paramNameFromArgument(argument);
        if (!paramName) continue;
        boundHere.add(paramName);
        const set = usedBy.get(paramName) ?? new Set<string>();
        set.add(invocation.name);
        usedBy.set(paramName, set);
      }
    }
    // Pipelines commonly thread reference params into a channel inside the body
    // rather than passing them as call arguments; attribute those to the
    // enclosing workflow so the asset is not left unattributed. Params already
    // bound to a callee here keep that more precise attribution instead.
    for (const match of mainBlock.matchAll(/\bparams\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)/gu)) {
      const paramName = match[1]!;
      if (boundHere.has(paramName)) continue;
      const set = usedBy.get(paramName) ?? new Set<string>();
      set.add(workflow.name);
      usedBy.set(paramName, set);
    }
  }
  return usedBy;
}

function classifyAssetKind(name: string): string {
  const lower = name.toLowerCase();
  // Checked first: a sheet naming many references would otherwise match on the
  // asset token it carries (e.g. `fasta_sheet` -> fasta).
  if (lower.endsWith("_sheet") || lower.endsWith("_sheets")) return "reference_sheet";
  if (/(^|_)fai($|_)/u.test(lower) || lower.endsWith("_fai")) return "fasta_index";
  if (lower === "dict" || lower.endsWith("_dict")) return "sequence_dictionary";
  if (/bwamem2/u.test(lower)) return "bwamem2_index";
  if (/(^|_)bwa($|_)/u.test(lower)) return "bwa_index";
  if (/(^|_)tbi($|_)/u.test(lower)) return "tabix_index";
  if (lower === "fasta" || lower.endsWith("_fasta")) return "fasta";
  if (lower === "gtf" || lower.endsWith("_gtf")) return "gtf";
  if (lower === "gff" || lower.endsWith("_gff")) return "gff";
  if (/(^|_)bed($|_)/u.test(lower)) return "bed";
  if (/(^|_)vcf($|_)/u.test(lower) || lower.endsWith("_vcf")) return "vcf";
  if (lower.endsWith("_db") || lower.endsWith("_database")) return "database";
  return "other";
}

function detectReferenceRebuilds(
  workflows: ParsedWorkflow[],
  invocationsByCallee: Map<string, SubworkflowInvocation[]>,
  params: Param[],
): ReferenceRebuildRule[] {
  const paramsByName = new Map(params.map((param) => [param.name, param]));
  const paramNames = new Set(paramsByName.keys());
  const rules: ReferenceRebuildRule[] = [];
  for (const workflow of workflows) {
    const takeNames = new Set((workflow.inputs ?? []).map((entry) => entry.name));
    const invocations = invocationsByCallee.get(workflow.name) ?? [];
    const mainBlock = extractMainBlock(workflow.body);
    for (const block of extractIfBlocks(mainBlock)) {
      const negation = /^\s*!\s*(?:[A-Za-z_][A-Za-z0-9_]*\s*\.\s*)*([A-Za-z_][A-Za-z0-9_]*)/u.exec(
        block.guard,
      );
      if (!negation) continue;
      const negated = negation[1]!;
      if (isToggleName(negated)) continue;
      const rebuild = analyzeRebuildBody(block.defaultBody, negated);
      if (!rebuild) continue;
      // Compute-if-missing convention: the assignment LHS or the negated identifier
      // must correspond to a workflow-level `take:` slot. Filters generic
      // `if (!something) { LHS = BUILDER.out... }` shapes (e.g. nf-core/rnaseq's
      // alignment branches in the primary workflow body).
      const takeMatches = [`${rebuild.lhs}_in`, rebuild.lhs, negated, `${negated}_in`].some(
        (candidate) => takeNames.has(candidate),
      );
      if (!takeMatches) continue;
      const assetParam = resolveAssetParam(
        rebuild.lhs,
        negated,
        takeNames,
        invocations,
        paramNames,
      );
      if (isToggleParam(assetParam.name, paramsByName)) continue;
      const guardParams = collectGuardParams(block.guard, takeNames, invocations);
      const confidence: Evidence["confidence"] =
        assetParam.resolvedFromBinding && guardParams.allFromTakes ? "high" : "medium";
      rules.push({
        asset_param: assetParam.name,
        guard: block.guard,
        guard_params: guardParams.params,
        builder: rebuild.builder,
        builder_outputs: rebuild.builderOutputs,
        fallback_for: resolveFallbackFor(negated, takeNames, invocations),
        evidence: {
          source_path: workflow.path ?? null,
          confidence,
          evidence: rebuild.snippets,
        },
      });
    }
  }
  return rules;
}

function analyzeRebuildBody(
  body: string,
  negated: string,
): { builder: string; builderOutputs: string[]; lhs: string; snippets: string[] } | null {
  // A guard body may both prepare an input and build the asset. Prefer the
  // fused assignment that names the guarded asset; otherwise let the
  // standalone-call form below answer, since a prep call is the more likely
  // first fused assignment.
  const fused = collectAssignedCalls(body);
  const related = fused.find((call) => namesAsset(call.lhs, negated));
  if (related) return asRebuild(related);

  const snippets: string[] = [];
  let builder: string | null = null;
  let lhs: string | null = null;
  const outputs = new Set<string>();
  for (const invocation of extractCallInvocations(body)) {
    if (!/^[A-Z]/u.test(invocation.name)) continue;
    builder = invocation.name;
    snippets.push(`${invocation.name}(${invocation.arguments.join(", ")})`);
    break;
  }
  if (!builder) return fused.length === 1 ? asRebuild(fused[0]!) : null;
  const assignmentPattern = new RegExp(
    `([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*${builder}\\s*\\.\\s*out(?:\\s*\\.\\s*([A-Za-z_][A-Za-z0-9_]*))?`,
    "gu",
  );
  for (const match of body.matchAll(assignmentPattern)) {
    lhs ??= match[1]!;
    if (match[2]) outputs.add(match[2]);
    snippets.push(match[0]);
  }
  if (!lhs) return fused.length === 1 ? asRebuild(fused[0]!) : null;
  return { builder, builderOutputs: [...outputs], lhs, snippets };
}

interface AssignedCall {
  builder: string;
  output: string | null;
  lhs: string;
  snippet: string;
}

// Fused form: `ch_fai = SAMTOOLS_FAIDX ( ch_ref, [[], []] ).fai.map{ ... }`,
// which extractCallInvocations skips because the call is not the whole line.
function collectAssignedCalls(body: string): AssignedCall[] {
  const calls: AssignedCall[] = [];
  const opener = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Z][A-Za-z0-9_]*)\s*\(/gu;
  for (const match of body.matchAll(opener)) {
    const end = findMatchingParen(body, match.index + match[0].length - 1);
    if (end < 0) continue;
    const output = /^\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)/u.exec(body.slice(end + 1));
    calls.push({
      builder: match[2]!,
      output: output?.[1] ?? null,
      lhs: match[1]!,
      snippet: `${body.slice(match.index, end + 1)}${output ? `.${output[1]!}` : ""}`,
    });
  }
  return calls;
}

function asRebuild(call: AssignedCall): {
  builder: string;
  builderOutputs: string[];
  lhs: string;
  snippets: string[];
} {
  return {
    builder: call.builder,
    builderOutputs: call.output ? [call.output] : [],
    lhs: call.lhs,
    snippets: [call.snippet],
  };
}

// Channel locals conventionally carry a `ch_` prefix, and take slots holding a
// caller-supplied asset conventionally carry an `_in` suffix.
function namesAsset(lhs: string, negated: string): boolean {
  const local = lhs.replace(/^ch_/u, "");
  const asset = negated.replace(/_in$/u, "");
  return local === asset || lhs === negated || local === negated;
}

function resolveAssetParam(
  lhs: string,
  negated: string,
  takeNames: Set<string>,
  invocations: SubworkflowInvocation[],
  paramNames: Set<string>,
): { name: string; resolvedFromBinding: boolean } {
  const candidates = [`${lhs}_in`, lhs, negated];
  for (const candidate of candidates) {
    if (!takeNames.has(candidate)) continue;
    for (const invocation of invocations) {
      const binding = invocation.bindings.find((entry) => entry.take === candidate);
      const paramName = binding ? paramNameFromArgument(binding.argument) : null;
      if (paramName) return { name: paramName, resolvedFromBinding: true };
    }
  }
  // Callers often forward their own take slots rather than `params.x`, so no
  // binding resolves. Fall back to whichever local name is itself a param.
  for (const candidate of [negated, lhs.replace(/^ch_/u, ""), lhs]) {
    if (paramNames.has(candidate)) return { name: candidate, resolvedFromBinding: false };
  }
  return { name: lhs, resolvedFromBinding: false };
}

function resolveFallbackFor(
  negated: string,
  takeNames: Set<string>,
  invocations: SubworkflowInvocation[],
): string | null {
  if (!takeNames.has(negated)) return null;
  for (const invocation of invocations) {
    const binding = invocation.bindings.find((entry) => entry.take === negated);
    const paramName = binding ? paramNameFromArgument(binding.argument) : null;
    if (paramName) return paramName;
  }
  return null;
}

function collectGuardParams(
  guard: string,
  takeNames: Set<string>,
  invocations: SubworkflowInvocation[],
): { params: string[]; allFromTakes: boolean } {
  const identifiers = [...guard.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\b/gu)].map((m) => m[1]!);
  const reserved = new Set(["true", "false", "null", "params"]);
  const params = new Set<string>();
  let allFromTakes = true;
  for (const match of guard.matchAll(/params\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)/gu)) {
    params.add(match[1]!);
  }
  for (const id of identifiers) {
    if (reserved.has(id) || /^[0-9]/u.test(id)) continue;
    if (takeNames.has(id)) {
      for (const invocation of invocations) {
        const binding = invocation.bindings.find((entry) => entry.take === id);
        const paramName = binding ? paramNameFromArgument(binding.argument) : null;
        if (paramName) params.add(paramName);
      }
    } else if (!params.has(id)) {
      // identifier was not a take-name and not a params.X access; treat as a
      // non-param local (e.g. step / tools / aligner) — downgrade confidence.
      allFromTakes = false;
    }
  }
  return { params: [...params], allFromTakes };
}

function paramNameFromArgument(argument: string): string | null {
  const match = /^params\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/u.exec(argument);
  return match ? match[1]! : null;
}

function parseWorkflowConditionals(body: string, calls: string[]): Conditional[] {
  const conditionals: Conditional[] = [];
  const callNames = new Set(calls);
  for (const block of extractIfBlocks(body)) {
    const defaultAffects = parseWorkflowCalls(block.defaultBody, callNames);
    if (defaultAffects.length > 0) {
      conditionals.push({ guard: block.guard, branch: "default", affects: defaultAffects });
    }
    const alternateAffects = block.alternateBody
      ? parseWorkflowCalls(block.alternateBody, callNames)
      : [];
    if (alternateAffects.length > 0) {
      conditionals.push({ guard: block.guard, branch: "alternate", affects: alternateAffects });
    }
  }
  return conditionals;
}

function extractIfBlocks(
  body: string,
): { guard: string; defaultBody: string; alternateBody: string | null }[] {
  const blocks: { guard: string; defaultBody: string; alternateBody: string | null }[] = [];
  const pattern = /\bif\s*\(/gu;
  for (const match of body.matchAll(pattern)) {
    const guardStart = match.index + match[0].length;
    const guardEnd = findMatchingParen(body, guardStart - 1);
    if (guardEnd === -1) continue;
    const guard = body.slice(guardStart, guardEnd);
    const braceMatch = /^\s*\{/u.exec(body.slice(guardEnd + 1));
    if (!braceMatch) continue;
    const openIndex = guardEnd + 1 + braceMatch[0].length - 1;
    const defaultBody = extractBlockAt(body, openIndex);
    if (defaultBody === null) continue;
    const closeIndex = openIndex + defaultBody.length + 1;
    const elseMatch = /^\s*else\s*\{/u.exec(body.slice(closeIndex + 1));
    const alternateBody = elseMatch
      ? extractBlockAt(body, closeIndex + 1 + elseMatch[0].lastIndexOf("{"))
      : null;
    blocks.push({ guard: normalizeWorkflowExpression(guard), defaultBody, alternateBody });
  }
  return blocks;
}

function findMatchingParen(text: string, openIndex: number): number {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    const ch = text[index];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function buildSubworkflowInvocations(
  workflows: ParsedWorkflow[],
): Map<string, SubworkflowInvocation[]> {
  const result = new Map<string, SubworkflowInvocation[]>();
  const calleesByName = new Map(workflows.map((workflow) => [workflow.name, workflow]));
  for (const caller of workflows) {
    const mainBlock = extractMainBlock(caller.body);
    for (const invocation of extractCallInvocations(mainBlock)) {
      const callee = calleesByName.get(invocation.name);
      if (!callee) continue;
      const takes = callee.inputs ?? [];
      const limit = Math.min(takes.length, invocation.arguments.length);
      const bindings: InvocationBinding[] = [];
      for (let index = 0; index < limit; index += 1) {
        bindings.push({ take: takes[index]!.name, argument: invocation.arguments[index]! });
      }
      const list = result.get(callee.name) ?? [];
      list.push({
        caller: caller.name,
        caller_path: caller.path ?? null,
        arguments: invocation.arguments,
        bindings,
      });
      result.set(callee.name, list);
    }
  }
  return result;
}

function extractCallInvocations(body: string): { name: string; arguments: string[] }[] {
  const invocations: { name: string; arguments: string[] }[] = [];
  const lines = body.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const singleLine = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*$/u.exec(lines[index]!);
    if (singleLine) {
      invocations.push({
        name: singleLine[1]!,
        arguments: splitCallArguments(singleLine[2]!),
      });
      continue;
    }
    const start = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*$/u.exec(lines[index]!);
    if (!start) continue;
    const args: string[] = [];
    for (index += 1; index < lines.length; index += 1) {
      const line = lines[index]!.trim();
      if (line === ")") break;
      const argument = line.replace(/,$/u, "").trim();
      if (argument && !argument.startsWith("//")) args.push(argument);
    }
    invocations.push({ name: start[1]!, arguments: args });
  }
  return invocations;
}

function splitCallArguments(text: string): string[] {
  return text
    .split(",")
    .map((argument) => argument.trim())
    .filter(Boolean);
}

function parseWorkflowIoBlock(text: string, blockName: "take" | "emit"): ChannelIO[] {
  const block = matchOne(
    text,
    new RegExp(`${blockName}:\\s*\\n([\\s\\S]*?)(?:\\n\\s*(?:take|main|emit):|$)`, "u"),
  );
  if (!block) return [];
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"))
    .map((line) => {
      const commentMatch = /\s\/\/\s*(.*?)\s*$/u.exec(line);
      const code = commentMatch ? line.slice(0, commentMatch.index).trim() : line;
      const description = commentMatch ? commentMatch[1]! : undefined;
      const io: ChannelIO = {
        name:
          matchOne(code, /^([A-Za-z0-9_]+)\s*=/u) ??
          matchOne(code, /^([A-Za-z0-9_]+)/u) ??
          `io_${Math.abs(hash(code))}`,
        shape: code.replace(/\s+/gu, " "),
        topic: null,
      };
      if (description) io.description = description;
      return io;
    });
}

function parseIncludeItems(text: string): { name: string; alias: string | null }[] {
  const items: { name: string; alias: string | null }[] = [];
  for (const match of text.matchAll(/include\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/gu)) {
    for (const item of match[1]!.split(";")) {
      const include = /^\s*([A-Za-z0-9_]+)(?:\s+as\s+([A-Za-z0-9_]+))?\s*$/u.exec(item);
      if (include) items.push({ name: include[1]!, alias: include[2] ?? null });
    }
  }
  return items;
}

function normalizeDirective(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/\s+/gu, " ").trim();
}

function parseIoBlock(text: string, blockName: "input" | "output"): ChannelIO[] {
  const block = matchOne(
    text,
    new RegExp(
      `${blockName}:\\s*\\n([\\s\\S]*?)(?:\\n\\s*(?:input|output|when|script|stub):|\\n\\})`,
      "u",
    ),
  );
  if (!block) return [];
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"))
    .map((line) => ({
      name: parseIoName(line, blockName),
      shape: line.replace(/\s+/gu, " "),
      topic: matchOne(line, /topic:\s*([A-Za-z0-9_]+)/u),
    }));
}

function parseIoName(line: string, blockName: "input" | "output"): string {
  return (
    matchOne(line, /emit:\s*([A-Za-z0-9_]+)/u) ??
    matchOne(line, /path\(?([A-Za-z0-9_]+)/u) ??
    matchOne(line, /val\(([A-Za-z0-9_]+)/u) ??
    `${blockName}_${Math.abs(hash(line))}`
  );
}

const UNKNOWN_VERSION = "unknown";

interface CondaDependency {
  name: string;
  version: string;
  version_constraint: string | null;
  spec: string;
}

interface CondaResolution {
  dependencies: CondaDependency[];
  /** Specs the parser could not read, kept so a partial resolution can be flagged. */
  unresolved: string[];
}

function normalizeToolToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function resolveProcessToolFk(
  process: Process,
  tools: Tool[],
  perProcessSingleton: Map<string, string>,
): string | null {
  const haystack = normalizeToolToken(process.name);
  let best: Tool | undefined;
  let bestLength = 0;
  for (const tool of tools) {
    const needle = normalizeToolToken(tool.name);
    if (needle.length === 0 || !haystack.startsWith(needle)) continue;
    if (needle.length > bestLength) {
      best = tool;
      bestLength = needle.length;
    }
  }
  return best?.name ?? perProcessSingleton.get(process.name) ?? process.tool;
}

function buildTools(
  pipelineRoot: string,
  processes: Process[],
  mulledIndexPath?: string,
): { tools: Tool[]; perProcessSingleton: Map<string, string>; warnings: string[] } {
  const tools = new Map<string, Tool>();
  const perProcessSingleton = new Map<string, string>();
  const declaredVersions = new Map<string, Set<string>>();
  const warnings: string[] = [];
  const mulledIndex = loadMulledIndex(
    mulledIndexPath ?? process.env.BIOCONTAINERS_MULTI_PACKAGE_TSV,
  );
  for (const process of processes) {
    const envPath = join(pipelineRoot, dirname(process.module_path), "environment.yml");
    const containerStrings = [...(process.container ?? "").matchAll(/'([^']+)'/gu)]
      .map((match) => match[1]!)
      .filter((value) => value.includes(":") || value.includes("/"));
    const mulledComponents = mulledComponentsForContainers(containerStrings, mulledIndex);
    const { dependencies, unresolved } = existsSync(envPath)
      ? parseBiocondaDependencies(readText(envPath))
      : parseLiteralCondaDirective(process.conda);
    if (process.conda && dependencies.length === 0) {
      warnings.push(`unresolved conda directive in ${process.name}: ${process.conda}`);
    }
    // A directive that resolves in part is neither resolved nor flagged by the
    // check above, so name each spec that was dropped.
    if (dependencies.length > 0) {
      for (const spec of unresolved) {
        warnings.push(
          `unparsed conda spec in ${process.name}: ${spec} (directive: ${process.conda})`,
        );
      }
    }
    if (dependencies.length === 1) {
      perProcessSingleton.set(process.name, dependencies[0]!.name);
    }
    for (const dependency of dependencies) {
      // tools[].name is the processes[].tool foreign key, so the registry holds
      // one entry per name and a later process overwrites the record. nf-core
      // modules pin independently, so keep every declared version alongside it.
      const declared = declaredVersions.get(dependency.name) ?? new Set<string>();
      declared.add(dependency.version);
      declaredVersions.set(dependency.name, declared);
      tools.set(dependency.name, {
        name: dependency.name,
        version: dependency.version,
        version_constraint: dependency.version_constraint,
        biocontainer: containerStrings.find((value) => value.includes("biocontainers/")) ?? null,
        bioconda: dependency.spec,
        docker: containerStrings.find((value) => !isKnownContainer(value)) ?? null,
        singularity:
          containerStrings.find(
            (value) =>
              value.includes("depot.galaxyproject.org/singularity") ||
              value.includes("community-cr-prod.seqera.io"),
          ) ?? null,
        wave: containerStrings.find((value) => value.includes("community.wave.seqera.io")) ?? null,
        mulled_components: mulledComponents.length > 0 ? mulledComponents : undefined,
      });
    }
  }
  for (const tool of tools.values()) {
    // The sentinel is the absence of a version, not a version, so it must not
    // sort into the authoritative set alongside real ones.
    const declared = [...(declaredVersions.get(tool.name) ?? [])].filter(
      (version) => version !== UNKNOWN_VERSION,
    );
    if (declared.length > 1) tool.versions = declared.sort();
  }
  return { tools: [...tools.values()], perProcessSingleton, warnings };
}

// Legacy literal form: conda "bioconda::malt=0.61 bioconda::hops=0.35".
// A path-shaped directive is the modern environment.yml reference, handled above.
function parseLiteralCondaDirective(directive: string | null): CondaResolution {
  if (!directive) return { dependencies: [], unresolved: [] };
  const trimmed = directive.trim();
  if (trimmed.length === 0 || /\.ya?ml$/u.test(trimmed) || trimmed.includes("/"))
    return { dependencies: [], unresolved: [] };
  return resolveCondaSpecs(trimmed.split(/\s+/u).filter((token) => token.length > 0));
}

function loadMulledIndex(path: string | undefined): Map<string, ToolSpec[]> {
  if (!path || !existsSync(path)) return new Map();
  return parseMulledIndex(readText(path));
}

function parseMulledIndex(text: string): Map<string, ToolSpec[]> {
  const index = new Map<string, ToolSpec[]>();
  for (const line of text.split("\n")) {
    const normalized = line.trim();
    if (!normalized || normalized.startsWith("#")) continue;
    const id = /\b(mulled-v2-[A-Za-z0-9_.-]+(?::[A-Za-z0-9_.-]+)?)/u.exec(normalized)?.[1];
    const columns = normalized.split("\t");
    const targets = id ? (columns.at(-1) ?? normalized) : columns[0]!;
    const components = parseMulledTargetSpecs(targets);
    if (components.length === 0) continue;
    for (const imageName of id ? [id] : mulledImageNames(components, columns[2])) {
      index.set(imageName, components);
    }
  }
  return index;
}

function parseMulledTargetSpecs(text: string): ToolSpec[] {
  return text
    .split(",")
    .map((target) => target.trim())
    .flatMap((target) => {
      const match = /^(?:bioconda::)?([A-Za-z0-9_.-]+)(?:={1,2}([^=,\s]+))?(?:=[^=,\s]+)?$/u.exec(
        target,
      );
      if (!match) return [];
      return {
        name: match[1]!,
        version: match[2] ?? "unknown",
        bioconda: `bioconda::${match[1]!}${match[2] ? `=${match[2]}` : ""}`,
      };
    });
}

function mulledImageNames(components: ToolSpec[], imageBuild: string | undefined): string[] {
  if (components.length < 2) return [];
  const sorted = [...components].sort((left, right) => left.name.localeCompare(right.name));
  const packageHash = sha1(sorted.map((component) => component.name).join("\n"));
  const versions = sorted.map((component) =>
    component.version === "unknown" ? "null" : component.version,
  );
  if (versions.every((version) => version === "null")) {
    const suffix = imageBuild ? `:${imageBuild}` : "";
    return [`mulled-v2-${packageHash}${suffix}`];
  }
  const versionHash = sha1(versions.join("\n"));
  const buildSuffix = imageBuild ? `-${imageBuild}` : "";
  return [`mulled-v2-${packageHash}:${versionHash}${buildSuffix}`];
}

function mulledComponentsForContainers(
  containerStrings: string[],
  mulledIndex: Map<string, ToolSpec[]>,
): ToolSpec[] {
  for (const container of containerStrings) {
    const id = /\b(mulled-v2-[A-Za-z0-9_.-]+(?::[A-Za-z0-9_.-]+)?)/u.exec(container)?.[1];
    if (!id) continue;
    const exact = mulledIndex.get(id);
    if (exact) return exact;
    const byName = mulledIndex.get(id.split(":")[0]!);
    if (byName) return byName;
  }
  return [];
}

function parseBiocondaDependencies(text: string): CondaResolution {
  const data = YAML.parse(text) as { dependencies?: unknown[] } | null;
  const specs = (data?.dependencies ?? []).filter(
    (dependency): dependency is string => typeof dependency === "string",
  );
  return resolveCondaSpecs(specs);
}

function resolveCondaSpecs(specs: string[]): CondaResolution {
  const dependencies: CondaDependency[] = [];
  const unresolved: string[] = [];
  for (const spec of specs) {
    const dependency = parseBiocondaDependency(spec);
    if (dependency) dependencies.push(dependency);
    else unresolved.push(spec);
  }
  return { dependencies, unresolved };
}

function parseBiocondaDependency(spec: string): CondaDependency | null {
  const match = /^(?:[A-Za-z0-9_-]+::)?([A-Za-z0-9_.-]+)(.*)$/u.exec(spec.trim());
  if (!match) return null;
  const name = match[1]!;
  const rest = match[2]!.trim();
  if (rest.length === 0) return { name, version: UNKNOWN_VERSION, version_constraint: null, spec };
  // `=1.0` and `==1.0` pin exactly; a trailing `=<build>` is a conda build
  // string, not part of the version. `name 1.0` is the space-separated form.
  const exact = /^(?:={1,2}\s*|\s*)([^=\s<>!~,|]+)(?:=[^\s]+)?$/u.exec(rest);
  if (exact) return { name, version: exact[1]!, version_constraint: null, spec };
  // A range or inequality declares no single version; keep it verbatim so the
  // constraint is not silently flattened into the unknown sentinel.
  if (/^[<>!~]=?/u.test(rest))
    return { name, version: UNKNOWN_VERSION, version_constraint: rest, spec };
  return null;
}

function isKnownContainer(value: string): boolean {
  return (
    value.includes("biocontainers/") ||
    value.includes("depot.galaxyproject.org/singularity") ||
    value.includes("community.wave.seqera.io") ||
    value.includes("community-cr-prod.seqera.io")
  );
}

function parseTestFixtures(pipelineRoot: string, profile: string): Summary["test_fixtures"] {
  const configPath = join(pipelineRoot, "conf", `${profile}.config`);
  const text = existsSync(configPath) ? readText(configPath) : "";
  const baseParams = parseParamAssignments(
    existsSync(join(pipelineRoot, "nextflow.config"))
      ? readText(join(pipelineRoot, "nextflow.config"))
      : "",
    new Map(),
  );
  const profileParams = parseParamAssignments(text, baseParams);
  const remoteInputs = [...profileParams.entries()]
    .filter(([name]) => isFixtureParam(name))
    .map(([name, value]) => ({ name, url: normalizeTestDataUrl(value) }))
    .filter((input): input is { name: string; url: string } => Boolean(input.url));
  return {
    profile,
    inputs: remoteInputs.map(({ name, url }) => ({
      role: inferParamRole(name, url),
      path: null,
      url,
      sha1: null,
      filetype: inferFiletype(url),
      description: `${name} from conf/${profile}.config`,
    })),
    outputs: [],
  };
}

function parseParamAssignments(
  text: string,
  baseParams: Map<string, string>,
  options: { changedOnly?: boolean } = {},
): Map<string, string> {
  const params = new Map(baseParams);
  const changed = new Map<string, string>();
  const block = extractNamedBlock(text, "params");
  if (!block) return options.changedOnly ? changed : params;
  for (const match of block.matchAll(/^\s*([A-Za-z0-9_]+)\s*=\s*([^\n]+)$/gmu)) {
    const value = resolveParamExpression(match[2]!.trim(), params);
    if (value) {
      params.set(match[1]!, value);
      changed.set(match[1]!, value);
    }
  }
  return options.changedOnly ? changed : params;
}

function isFixtureParam(name: string): boolean {
  return name === "input" || /(^reference_|_fasta$|_gff$|_gtf$|_bed$|_proteins$)/u.test(name);
}

function resolveParamExpression(expression: string, params: Map<string, string>): string | null {
  const literal = matchOne(expression, /^['"]([^'"]*)['"]/u);
  if (literal !== null) return literal;
  const concat = /^params\.([A-Za-z0-9_]+)\s*\+\s*['"]([^'"]+)['"]/u.exec(expression);
  if (!concat) return null;
  const prefix = params.get(concat[1]!);
  if (!prefix) return null;
  return joinUrlParts(prefix, concat[2]!);
}

function joinUrlParts(prefix: string, suffix: string): string {
  if (!/^https?:\/\//u.test(prefix)) return `${prefix}${suffix}`;
  const separator = prefix.endsWith("/") || suffix.startsWith("/") ? "" : "/";
  return `${prefix}${separator}${suffix}`;
}

function normalizeTestDataUrl(value: string): string | null {
  if (!/^https?:\/\//u.test(value)) return null;
  const nfCoreRaw =
    /^https:\/\/raw\.githubusercontent\.com\/nf-core\/test-datasets\/(?!refs\/heads\/)([^/]+)\/(.+)$/u.exec(
      value,
    );
  if (nfCoreRaw) {
    return `https://raw.githubusercontent.com/nf-core/test-datasets/refs/heads/${nfCoreRaw[1]}/${nfCoreRaw[2]}`;
  }
  return value;
}

async function fetchTestData(summary: Summary, testDataDir?: string): Promise<void> {
  const urls = new Set<string>();
  for (const input of summary.test_fixtures.inputs) {
    if (input.url) urls.add(input.url);
  }

  for (const input of summary.test_fixtures.inputs) {
    if (!input.url) continue;
    try {
      const content = await fetchText(input.url);
      input.sha1 = sha1(content);
      if (testDataDir) input.path = writeFetchedTestData(testDataDir, input.url, content);
      for (const url of extractRemoteUrls(content)) urls.add(url);
    } catch (err) {
      summary.warnings.push(`failed to fetch test fixture ${input.url}: ${formatError(err)}`);
    }
  }

  for (const url of urls) {
    if (
      summary.test_fixtures.inputs.some(
        (input) => input.url === url && input.role !== "samplesheet",
      )
    ) {
      continue;
    }
    if (summary.test_fixtures.inputs.some((input) => input.url === url && input.sha1)) continue;
    try {
      const bytes = await fetchBytes(url);
      summary.test_fixtures.inputs.push({
        role: inferTestDataRole(url),
        path: testDataDir ? writeFetchedTestData(testDataDir, url, bytes) : null,
        url,
        sha1: sha1(bytes),
        filetype: inferFiletype(url),
        description: "Referenced by fetched samplesheet",
      });
    } catch (err) {
      summary.warnings.push(`failed to fetch test data ${url}: ${formatError(err)}`);
    }
  }
}

function writeFetchedTestData(testDataDir: string, url: string, data: string | Uint8Array): string {
  const path = join(resolve(testDataDir), localTestDataPath(url));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  return path;
}

function localTestDataPath(url: string): string {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean).map(safePathPart);
  return join(safePathPart(parsed.hostname), ...parts);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return new Uint8Array(await response.arrayBuffer());
}

function extractRemoteUrls(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^,\s]+/gu)].map((match) => match[0]!);
}

function sha1(data: string | Uint8Array): string {
  return createHash("sha1").update(data).digest("hex");
}

function inferTestDataRole(url: string): string {
  if (/samplesheet\.(csv|tsv|ya?ml|json)$/u.test(url)) return "samplesheet";
  if (/fastq\.gz$/u.test(url)) return "reads";
  return "test_data";
}

function inferParamRole(name: string, _url: string): string {
  if (name === "input") return "samplesheet";
  return name;
}

function safePathPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]/gu, "_");
}

function inferFiletype(url: string): string | null {
  const name = url.split("/").at(-1) ?? "";
  if (name.endsWith(".tar.gz")) return "tar.gz";
  if (name.endsWith(".tgz")) return "tgz";
  if (name.endsWith(".gz")) {
    const stem = name.slice(0, -".gz".length);
    const extension = stem.split(".").at(-1);
    if (extension && extension !== stem && extension.length <= 8) return `${extension}.gz`;
    return "gz";
  }
  return name.includes(".") ? (name.split(".").at(-1) ?? null) : null;
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function parseNfTests(pipelineRoot: string): NfTest[] {
  return parseNfTestsInDir(pipelineRoot, join(pipelineRoot, "tests"));
}

function parseNfTestsInDir(pipelineRoot: string, testsRoot: string): NfTest[] {
  return walk(testsRoot)
    .filter((path) => path.endsWith(".nf.test"))
    .flatMap((path) => {
      const text = readText(path);
      const relPath = relative(pipelineRoot, path);
      const fileProfiles = parseNfTestFileProfiles(text);
      const blocks = extractNfTestBlocks(text);
      return blocks.map((block) => ({
        name: block.name,
        path: relPath,
        profiles: unique([...parseNfTestProfiles(block.body, block.name), ...fileProfiles]),
        params_overrides: parseParamsOverrides(block.body),
        assert_workflow_success: block.body.includes("workflow.success"),
        snapshot: parseSnapshot(path, relPath, block.body, block.name),
        prose_assertions: parseProseAssertions(block.body),
      }));
    });
}

function parseNfTestFileProfiles(text: string): string[] {
  return unique([...text.matchAll(/^\s*profile\s+["']([^"']+)["']/gmu)].map((match) => match[1]!));
}

function extractNfTestBlocks(text: string): { name: string; body: string }[] {
  const blocks: { name: string; body: string }[] = [];
  for (const match of text.matchAll(/\btest\(\s*(["'])(.*?)\1\s*\)\s*\{/gu)) {
    const openIndex = match.index + match[0].lastIndexOf("{");
    const body = extractBlockAt(text, openIndex);
    if (body !== null) blocks.push({ name: match[2]!, body });
  }
  return blocks.length > 0 ? blocks : [{ name: "unnamed", body: text }];
}

function parseNfTestProfiles(text: string, name: string): string[] {
  const profiles = new Set<string>();
  for (const source of [text, name]) {
    for (const match of source.matchAll(/-profile\s+(?:["']([^"']+)["']|([A-Za-z0-9_,.-]+))/gu)) {
      for (const profile of (match[1] ?? match[2]!).split(",")) {
        const trimmed = profile.trim();
        if (trimmed) profiles.add(trimmed);
      }
    }
    for (const match of source.matchAll(/(?:^|[^-])\bprofile\s+["']([^"']+)["']/gu)) {
      profiles.add(match[1]!);
    }
  }
  return [...profiles];
}

function parseParamsOverrides(text: string): Record<string, unknown> {
  const block = extractNamedBlock(text, "params");
  const values: Record<string, unknown> = {};
  for (const match of block?.matchAll(/^\s*([A-Za-z0-9_]+)\s*=\s*(.+?)\s*$/gmu) ?? []) {
    values[match[1]!] = parseNfTestParamValue(match[2]!);
  }
  return values;
}

function parseNfTestParamValue(value: string): unknown {
  const quoted = /^(?:"([^"]*)"|'([^']*)')$/u.exec(value);
  if (quoted !== null) return quoted[1] ?? quoted[2]!;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/u.test(value)) return Number(value);
  return value;
}

function parseSnapshot(
  path: string,
  relPath: string,
  text: string,
  name: string,
): NfTest["snapshot"] {
  if (!text.includes("snapshot(")) return null;
  const snapPath = existsSync(`${path}.snap`) ? `${relPath}.snap` : null;
  return {
    captures: parseSnapshotCaptures(text),
    helpers: unique(
      [...text.matchAll(/\b([A-Za-z0-9_]+)\(/gu)]
        .map((match) => match[1]!)
        .filter((value) => ["getAllFilesFromDir", "removeNextflowVersion"].includes(value)),
    ),
    ignore_files: [...text.matchAll(/ignoreFile:\s*['"]([^'"]+)['"]/gu)].map((match) => match[1]!),
    ignore_globs: [...text.matchAll(/ignore:\s*\[([^\]]+)\]/gu)].flatMap((match) =>
      [...match[1]!.matchAll(/['"]([^'"]+)['"]/gu)].map((inner) => inner[1]!),
    ),
    snap_path: snapPath,
    parsed_content: snapPath === null ? [] : parseSnapshotSidecar(`${path}.snap`, name),
  };
}

function parseSnapshotSidecar(path: string, name: string): SnapshotContent[] {
  try {
    if (statSync(path).size > MAX_SNAPSHOT_SIDECAR_BYTES) return [];
    const parsed: unknown = JSON.parse(readText(path));
    if (!isRecord(parsed)) return [];
    const entries = Object.entries(parsed);
    const matching = entries.filter(([entryName]) => entryName === name);
    return (matching.length > 0 ? matching : entries).flatMap(([entryName, entry]) =>
      parseSnapshotContent(entryName, entry),
    );
  } catch {
    return [];
  }
}

function parseSnapshotContent(name: string, entry: unknown): SnapshotContent[] {
  const content = isRecord(entry) && "content" in entry ? entry["content"] : entry;
  if (content === undefined) return [];
  const items = Array.isArray(content) ? content : [content];
  return [{ name, channels: items.flatMap(parseSnapshotContentItem) }];
}

function parseSnapshotContentItem(item: unknown): SnapshotChannel[] {
  if (Array.isArray(item)) return [snapshotChannel(null, item)];
  if (typeof item === "string") return [snapshotChannel(null, [item])];
  if (!isRecord(item)) return [snapshotChannel(null, [item])];
  return Object.entries(item).map(([key, value]) =>
    snapshotChannel(key, Array.isArray(value) ? value : [value]),
  );
}

function snapshotChannel(key: string | null, values: unknown[]): SnapshotChannel {
  const parts = values.map(parseSnapshotParts);
  return {
    key,
    files: parts.flatMap((part) => part.files),
    values: parts.flatMap((part) => part.values),
  };
}

function parseSnapshotParts(value: unknown): SnapshotParts {
  if (typeof value === "string") {
    const match = /^(.*):md5,([a-fA-F0-9]{32})$/u.exec(value);
    if (match === null) return { files: [], values: [value] };
    const path = match[1]!;
    const md5 = match[2]!;
    return {
      files: [
        {
          path,
          basename: path.split(/[\\/]/u).pop() ?? path,
          md5,
          stub: md5 === "d41d8cd98f00b204e9800998ecf8427e",
        },
      ],
      values: [],
    };
  }
  if (Array.isArray(value)) {
    const parts = value.map(parseSnapshotParts);
    const files = parts.flatMap((part) => part.files);
    if (files.length === 0) return { files: [], values: [value] };
    return {
      files,
      values: parts.flatMap((part) => part.values),
    };
  }
  return { files: [], values: [value] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSnapshotCaptures(text: string): string[] {
  const captures: string[] = [];
  if (/workflow\.trace\.succeeded\(\)\.size\(\)/u.test(text)) captures.push("succeeded_task_count");
  if (/removeNextflowVersion\(/u.test(text)) captures.push("versions_yml");
  for (const match of text.matchAll(/\b(stable_[A-Za-z0-9_]+)\b/gu)) {
    const capture = match[1]!
      .replace(/^stable_name$/u, "stable_names")
      .replace(/^stable_path$/u, "stable_paths");
    captures.push(capture);
  }
  return unique(captures);
}

function parseProseAssertions(text: string): string[] {
  return [...text.matchAll(/assert\s+(?!workflow\.success\b)([^}\n]+)/gu)]
    .map((match) => match[1]!.trim())
    .filter((assertion) => !assertion.startsWith("snapshot("));
}

function summarizeScript(name: string): string {
  const tool = name.toLowerCase().replace(/_/gu, " ");
  return `Run ${tool} and emit declared Nextflow outputs.`;
}

function extractNamedBlock(text: string, name: string): string | null {
  const startMatch = new RegExp(`\\b${name}\\s*\\{`, "u").exec(text);
  if (!startMatch) return null;
  const openIndex = text.indexOf("{", startMatch.index);
  const block = extractBlockAt(text, openIndex);
  return block === null ? null : text.slice(startMatch.index, openIndex + block.length + 2);
}

function extractBlockAt(text: string, openIndex: number): string | null {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex + 1, index);
    }
  }
  return null;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function matchOne(text: string, regex: RegExp): string | null {
  return regex.exec(text)?.[1] ?? null;
}

function hash(value: string): number {
  let result = 0;
  for (const char of value) result = (result << 5) - result + char.charCodeAt(0);
  return result;
}
