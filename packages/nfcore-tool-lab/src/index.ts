import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { TextDecoder } from "node:util";
import { parse, stringify } from "yaml";

import { inspectXml, prepareToolIdentity } from "./tool-identity.js";

export interface LabMetadata {
  description: string;
  categories: string[];
  homepage_url: string;
}

export interface PrepareLabToolOptions {
  inputDir: string;
  outputDir: string;
  metadata: LabMetadata;
  toolFilename?: string;
  assets?: string[];
  dryRun?: boolean;
}

export interface NfcoreSource {
  modules_repo: "nf-core/modules";
  module_path: string;
  git_sha: string;
  test_datasets_sha: string;
}

export interface LabPublicationRecord {
  schema_version: 1;
  prepared_by: { package: "@galaxy-foundry/nfcore-tool-lab"; version: string };
  source: NfcoreSource;
  destination_repository: "galaxyproject/tools-iwc-lab";
  destination_path: string;
  tool: { original_id: string; id: string; original_name: string; name: string };
  input_sha256: Record<string, string>;
  output_sha256: Record<string, string>;
  validation: { status: "not_run" };
}

interface FileEntry {
  bytes: Buffer;
  mode: number;
}

const manifest = createRequire(import.meta.url)("../package.json") as { version: string };
export const packageVersion: string = manifest.version;
const reservedNames = new Set([
  "tool.xml",
  "macros.xml",
  "_provenance.yml",
  ".shed.yml",
  "readme.md",
  "_publication.json",
]);
const hash = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const decode = (bytes: Buffer): string =>
  new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function line(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    throw new Error(`${label} must be a nonempty single-line string`);
  return value;
}

function validateMetadata(value: unknown): LabMetadata {
  const metadata = object(value, "metadata");
  for (const key of Object.keys(metadata)) {
    if (!["description", "categories", "homepage_url"].includes(key))
      throw new Error(`unsupported metadata field: ${key}`);
  }
  const description = line(metadata.description, "metadata.description");
  const homepage_url = line(metadata.homepage_url, "metadata.homepage_url");
  let url: URL;
  try {
    url = new URL(homepage_url);
  } catch (error) {
    throw new Error("metadata.homepage_url must be a valid HTTPS URL", { cause: error });
  }
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("metadata.homepage_url must be an HTTPS URL without credentials");
  if (!Array.isArray(metadata.categories) || !metadata.categories.length)
    throw new Error("metadata.categories must be a nonempty array");
  const categories = metadata.categories.map((value) => line(value, "metadata.categories"));
  if (new Set(categories).size !== categories.length)
    throw new Error("metadata.categories must be unique");
  return { description, homepage_url, categories };
}

function readSource(bytes: Buffer): { source: NfcoreSource; overrides: unknown[] } {
  let provenance: Record<string, unknown>;
  try {
    provenance = object(parse(decode(bytes)), "conversion provenance");
  } catch (error) {
    throw new Error("invalid conversion provenance YAML", { cause: error });
  }
  const input = object(provenance.nfcore_source, "conversion provenance.nfcore_source");
  if (input.modules_repo !== "nf-core/modules")
    throw new Error("conversion provenance must originate from nf-core/modules");
  const module_path = line(input.module_path, "conversion provenance.module_path");
  if (!/^modules\/nf-core\/[a-z0-9][a-z0-9_]*(?:\/[a-z0-9][a-z0-9_]*)*$/.test(module_path))
    throw new Error("invalid conversion provenance.module_path");
  for (const field of ["git_sha", "test_datasets_sha"] as const) {
    if (typeof input[field] !== "string" || !/^[a-f0-9]{40}$/.test(input[field]))
      throw new Error(`conversion provenance.${field} must be a full lowercase Git SHA`);
  }
  const generated = object(provenance.generated, "conversion provenance.generated");
  if (
    generated.by_mold !== "convert-nfcore-module-to-galaxy-tool" ||
    !Number.isSafeInteger(generated.mold_revision) ||
    Number(generated.mold_revision) < 1
  )
    throw new Error("conversion provenance must identify the converter and its revision");
  line(generated.cast_target, "conversion provenance.generated.cast_target");
  if (
    generated.cast_artifact_sha !== null &&
    (typeof generated.cast_artifact_sha !== "string" ||
      !/^[a-f0-9]{64}$/.test(generated.cast_artifact_sha))
  )
    throw new Error("conversion provenance.generated.cast_artifact_sha must be SHA-256 or null");
  if (!Array.isArray(provenance.overrides))
    throw new Error("conversion provenance.overrides must be an array");
  return {
    source: {
      modules_repo: "nf-core/modules",
      module_path,
      git_sha: input.git_sha as string,
      test_datasets_sha: input.test_datasets_sha as string,
    },
    overrides: provenance.overrides,
  };
}

function relativeFilename(value: string): void {
  if (!/^[A-Za-z0-9_-][A-Za-z0-9_.-]*(?:\/[A-Za-z0-9_-][A-Za-z0-9_.-]*)*$/.test(value))
    throw new Error(`unsafe input filename: ${value}`);
}

function safeInputPath(inputDir: string, filename: string): string {
  relativeFilename(filename);
  let current = inputDir;
  for (const segment of filename.split("/")) {
    current = path.join(current, segment);
    if (lstatSync(current).isSymbolicLink())
      throw new Error(`symbolic links are not accepted: ${filename}`);
  }
  return current;
}

function readFile(inputDir: string, filename: string): FileEntry {
  const absolutePath = safeInputPath(inputDir, filename);
  const stat = lstatSync(absolutePath);
  if (!stat.isFile()) throw new Error(`input is not a regular file: ${filename}`);
  return { bytes: readFileSync(absolutePath), mode: stat.mode & 0o111 ? 0o755 : 0o644 };
}

function collectAsset(inputDir: string, filename: string, entries: Map<string, FileEntry>): void {
  if (reservedNames.has(filename.split("/")[0]!.toLowerCase()))
    throw new Error(`asset filename collision: ${filename}`);
  const absolutePath = safeInputPath(inputDir, filename);
  if (lstatSync(absolutePath).isDirectory()) {
    for (const child of readdirSync(absolutePath).sort())
      collectAsset(inputDir, `${filename}/${child}`, entries);
    return;
  }
  if (
    reservedNames.has(filename.toLowerCase()) ||
    [...entries.keys()].some((name) => name.toLowerCase() === filename.toLowerCase())
  )
    throw new Error(`asset filename collision: ${filename}`);
  entries.set(filename, readFile(inputDir, filename));
}

function canonicalOutput(filename: string): string {
  if (existsSync(filename)) return realpathSync(filename);
  const parent = path.dirname(filename);
  if (parent === filename) return filename;
  return path.join(canonicalOutput(parent), path.basename(filename));
}

function readme(source: NfcoreSource, toolName: string, overrides: unknown[]): string {
  const url = `https://github.com/nf-core/modules/tree/${source.git_sha}/${source.module_path}`;
  const warnings = stringify(overrides);
  const fence = "`".repeat(
    Math.max(3, ...[...warnings.matchAll(/`+/g)].map((match) => match[0].length + 1)),
  );
  return `# ${toolName}\n\nAutomated conversion of [${source.module_path}](${url}) from nf-core/modules.\n\n- Module commit: ${source.git_sha}\n- Test dataset commit: ${source.test_datasets_sha}\n- Experimental Tool Shed owner: iwc-lab\n\nThis wrapper is not an IUC release or a guarantee of Nextflow compatibility. Packaging does not establish test coverage or license eligibility.\n\n## Validation\n\nFinal-package Planemo linting and tests have not been run by this preparation command. Run them before opening a publication PR.\n\n## Conversion divergences and coverage notes\n\nThe following is copied from the conversion provenance; no coverage-completion claim is inferred from an empty list.\n\n${fence}yaml\n${warnings}${fence}\n\nThe original conversion provenance is retained unchanged in _provenance.yml. The separate _publication.json records this preparation package and input/output SHA-256 hashes; it excludes its own hash to avoid self-reference.\n`;
}

export function prepareLabTool(options: PrepareLabToolOptions): LabPublicationRecord {
  const metadata = validateMetadata(options.metadata);
  const inputDir = path.resolve(options.inputDir);
  if (!lstatSync(inputDir).isDirectory())
    throw new Error("input must be a directory, not a symbolic link");
  const outputDir = canonicalOutput(path.resolve(options.outputDir));
  const insideInput = path.relative(realpathSync(inputDir), outputDir);
  if (
    !insideInput ||
    (!insideInput.startsWith(`..${path.sep}`) &&
      insideInput !== ".." &&
      !path.isAbsolute(insideInput))
  )
    throw new Error("output must not be inside the input directory");
  if (existsSync(outputDir)) throw new Error(`output directory already exists: ${outputDir}`);
  const toolFilename = options.toolFilename ?? "tool.xml";
  if (!/^[A-Za-z0-9_-][A-Za-z0-9_.-]*\.xml$/.test(toolFilename) || toolFilename === "macros.xml")
    throw new Error("toolFilename must name a tool XML file in the input directory");
  const originalTool = readFile(inputDir, toolFilename);
  const macros = readFile(inputDir, "macros.xml");
  inspectXml(decode(macros.bytes), "macros");
  const provenance = readFile(inputDir, "_provenance.yml");
  const { source, overrides } = readSource(provenance.bytes);
  const moduleName = source.module_path.slice("modules/nf-core/".length);
  const destination_path = `tool_collections/nf_core_modules/${moduleName}`;
  const id = `nfcore_compat_${moduleName.replaceAll("/", "_")}`;
  const identity = prepareToolIdentity(decode(originalTool.bytes), id);
  const entries = new Map<string, FileEntry>([
    ["tool.xml", { bytes: Buffer.from(identity.xml), mode: originalTool.mode }],
    ["macros.xml", macros],
    ["_provenance.yml", provenance],
  ]);
  for (const filename of [...(options.assets ?? [])].sort())
    collectAsset(inputDir, filename, entries);
  const input_sha256 = Object.fromEntries([
    [toolFilename, hash(originalTool.bytes)],
    ["macros.xml", hash(macros.bytes)],
    ["_provenance.yml", hash(provenance.bytes)],
    ...[...entries]
      .filter(([name]) => !reservedNames.has(name.toLowerCase()))
      .map(([name, entry]) => [name, hash(entry.bytes)]),
  ]);
  const repositoryUrl = `https://github.com/galaxyproject/tools-iwc-lab/tree/main/${destination_path}`;
  entries.set(".shed.yml", {
    bytes: Buffer.from(
      stringify({
        ...metadata,
        name: id,
        owner: "iwc-lab",
        type: "unrestricted",
        remote_repository_url: repositoryUrl,
        long_description: `Automated conversion of ${source.module_path} at nf-core/modules commit ${source.git_sha}. Experimental lab wrapper; not an IUC release.`,
      }),
    ),
    mode: 0o644,
  });
  entries.set("README.md", {
    bytes: Buffer.from(readme(source, identity.name, overrides)),
    mode: 0o644,
  });
  const record: LabPublicationRecord = {
    schema_version: 1,
    prepared_by: { package: "@galaxy-foundry/nfcore-tool-lab", version: packageVersion },
    source,
    destination_repository: "galaxyproject/tools-iwc-lab",
    destination_path,
    tool: {
      original_id: identity.originalId,
      id,
      original_name: identity.originalName,
      name: identity.name,
    },
    input_sha256,
    output_sha256: Object.fromEntries(
      [...entries]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([name, entry]) => [name, hash(entry.bytes)]),
    ),
    validation: { status: "not_run" },
  };
  entries.set("_publication.json", {
    bytes: Buffer.from(`${JSON.stringify(record, null, 2)}\n`),
    mode: 0o644,
  });
  if (options.dryRun) return record;
  mkdirSync(path.dirname(outputDir), { recursive: true });
  mkdirSync(outputDir);
  try {
    for (const [filename, entry] of entries) {
      const target = path.join(outputDir, filename);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, entry.bytes, { flag: "wx", mode: entry.mode });
    }
  } catch (error) {
    rmSync(outputDir, { recursive: true, force: true });
    throw error;
  }
  return record;
}
