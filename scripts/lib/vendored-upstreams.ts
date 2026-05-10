import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { citationLocalPath, loadCommonPaths, parseCitation } from "./common-paths";

export interface VendoredBuildStep {
  command: string;
}

export interface VendoredUpstreamEntry {
  local: string;
  source: string;
  pinned_ref: string;
  framing?: string;
  build?: VendoredBuildStep;
}

export interface VendoredDrift {
  entry: VendoredUpstreamEntry;
  sourcePath: string;
  currentRef: string;
}

export function loadVendoredUpstreams(
  repoRoot: string,
  manifestPath = path.join(repoRoot, "vendored_upstreams.yml"),
): VendoredUpstreamEntry[] {
  if (!fs.existsSync(manifestPath)) return [];
  const raw = yaml.load(fs.readFileSync(manifestPath, "utf-8"));
  if (!Array.isArray(raw)) throw new Error(`${manifestPath} must contain an array`);
  return raw.map((entry, i) => {
    if (!entry || typeof entry !== "object")
      throw new Error(`vendored entry ${i + 1} must be an object`);
    const value = entry as Partial<VendoredUpstreamEntry>;
    if (!value.local || !value.source || !value.pinned_ref) {
      throw new Error(`vendored entry ${i + 1} requires local, source, and pinned_ref`);
    }
    let build: VendoredBuildStep | undefined;
    if (value.build !== undefined) {
      const b = value.build as Partial<VendoredBuildStep>;
      if (!b.command) throw new Error(`vendored entry ${i + 1} build requires command`);
      build = { command: b.command };
    }
    return {
      local: value.local,
      source: value.source,
      pinned_ref: value.pinned_ref,
      framing: value.framing,
      build,
    };
  });
}

function runBuild(repoPath: string, command: string, cache: Set<string>): void {
  const key = `${repoPath}::${command}`;
  if (cache.has(key)) return;
  cache.add(key);
  console.log(`Running build in ${repoPath}: ${command}`);
  execSync(command, { cwd: repoPath, stdio: "inherit" });
}

export function currentRepoRef(repoPath: string): string {
  return execFileSync("git", ["-C", repoPath, "rev-parse", "HEAD"], { encoding: "utf-8" }).trim();
}

export function resolveSource(
  repoRoot: string,
  source: string,
): { sourcePath: string; repoPath: string; currentRef: string } {
  const paths = loadCommonPaths(repoRoot);
  const citation = parseCitation(source, paths);
  if (!citation) throw new Error(`Cannot resolve source citation ${source}`);
  return {
    sourcePath: citationLocalPath(citation),
    repoPath: citation.entry.path,
    currentRef: currentRepoRef(citation.entry.path),
  };
}

function isUrl(source: string): boolean {
  return /^https?:\/\//.test(source);
}

function fetchUrl(source: string): string {
  return execFileSync("curl", ["-L", "--fail", "--silent", source], { encoding: "utf-8" });
}

export function findVendoredDrift(
  repoRoot: string,
  entries = loadVendoredUpstreams(repoRoot),
): VendoredDrift[] {
  const drift: VendoredDrift[] = [];
  const buildCache = new Set<string>();
  for (const entry of entries) {
    const localPath = path.join(repoRoot, entry.local);
    const source = isUrl(entry.source) ? null : resolveSource(repoRoot, entry.source);
    if (source && entry.build) runBuild(source.repoPath, entry.build.command, buildCache);
    if (!fs.existsSync(localPath)) throw new Error(`Missing vendored file ${entry.local}`);
    if (source && !fs.existsSync(source.sourcePath)) throw new Error(`Missing source file ${entry.source}`);
    const sourceText = source ? fs.readFileSync(source.sourcePath, "utf-8") : fetchUrl(entry.source);
    if (fs.readFileSync(localPath, "utf-8") !== sourceText) {
      drift.push({
        entry,
        sourcePath: source?.sourcePath ?? entry.source,
        currentRef: source?.currentRef ?? entry.pinned_ref,
      });
    }
  }
  return drift;
}

export function syncVendoredUpstreams(
  repoRoot: string,
  entries = loadVendoredUpstreams(repoRoot),
): VendoredDrift[] {
  const updated: VendoredDrift[] = [];
  const framingRefs = new Map<string, string>();
  const buildCache = new Set<string>();
  for (const entry of entries) {
    const localPath = path.join(repoRoot, entry.local);
    const source = isUrl(entry.source) ? null : resolveSource(repoRoot, entry.source);
    if (source && entry.build) runBuild(source.repoPath, entry.build.command, buildCache);
    if (source && !fs.existsSync(source.sourcePath)) throw new Error(`Missing source file ${entry.source}`);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    if (source) {
      fs.copyFileSync(source.sourcePath, localPath);
    } else {
      fs.writeFileSync(localPath, fetchUrl(entry.source));
    }
    updated.push({
      entry,
      sourcePath: source?.sourcePath ?? entry.source,
      currentRef: source?.currentRef ?? entry.pinned_ref,
    });
    if (entry.framing) framingRefs.set(entry.framing, source?.currentRef ?? entry.pinned_ref);
  }
  for (const [framing, ref] of framingRefs) updateFramingRef(path.join(repoRoot, framing), ref);
  return updated;
}

export function updateVendoredManifestRefs(
  manifestPath: string,
  updates: Map<string, string>,
): void {
  let currentLocal: string | null = null;
  const lines = fs.readFileSync(manifestPath, "utf-8").split("\n");
  const next = lines.map((line) => {
    const localMatch = /^-\s+local:\s*(\S+)\s*$/.exec(line);
    if (localMatch) currentLocal = localMatch[1] ?? null;
    if (currentLocal && updates.has(currentLocal)) {
      const pinMatch = /^(\s*pinned_ref:\s*).+$/.exec(line);
      if (pinMatch) return `${pinMatch[1]}${updates.get(currentLocal)}`;
    }
    return line;
  });
  fs.writeFileSync(manifestPath, next.join("\n"));
}

export function updateFramingRef(filePath: string, ref: string): void {
  const shortRef = ref.slice(0, 7);
  const text = fs.readFileSync(filePath, "utf-8");
  const next = text
    .replace(/pinned at SHA `[^`]+`/g, `pinned at SHA \`${shortRef}\``)
    .replace(/blob\/[0-9a-f]{7,40}\//g, `blob/${ref}/`)
    .replace(/^sha: [0-9a-f]{7,40}$/gm, `sha: ${shortRef}`)
    .replace(/revised: \d{4}-\d{2}-\d{2}/, `revised: ${new Date().toISOString().slice(0, 10)}`);
  fs.writeFileSync(filePath, next);
}
