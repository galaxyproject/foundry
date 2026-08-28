import path from "node:path";

export interface CommonPathEntry {
  path: string;
  repo?: string;
  ref?: string;
  path_prefix?: string;
}

export type CommonPaths = Record<string, CommonPathEntry>;

export interface Citation {
  name: string;
  entry: CommonPathEntry;
  relPath: string;
  lineStart?: number;
  lineEnd?: number;
}

export const CITATION_RE = /^\$([A-Z][A-Z0-9_]*)\/([^\s:]+)(?::(\d+)(?:-(\d+))?)?$/;

export function builtinPaths(repoRoot: string): CommonPaths {
  return {
    iwc_format2: { path: path.join(repoRoot, "workflow-fixtures", "iwc-format2") },
    iwc_skeletons: { path: path.join(repoRoot, "workflow-fixtures", "iwc-skeletons") },
  };
}

export function parseCitation(text: string, paths: CommonPaths): Citation | null {
  const m = CITATION_RE.exec(text.trim());
  if (!m) return null;
  const [, name, relPath, lineStart, lineEnd] = m;
  if (!name || !relPath) return null;
  const entry = paths[name.toLowerCase()];
  if (!entry) return null;
  return {
    name,
    entry,
    relPath,
    lineStart: lineStart ? Number(lineStart) : undefined,
    lineEnd: lineEnd ? Number(lineEnd) : undefined,
  };
}

export function citationGithubUrl(c: Citation): string | null {
  const { entry, relPath, lineStart, lineEnd } = c;
  if (!entry.repo) return null;
  const ref = entry.ref ?? "main";
  const fullPath = entry.path_prefix
    ? `${entry.path_prefix.replace(/\/$/, "")}/${relPath}`
    : relPath;
  let url = `https://github.com/${entry.repo}/blob/${ref}/${fullPath}`;
  if (lineStart) url += `#L${lineStart}${lineEnd ? `-L${lineEnd}` : ""}`;
  return url;
}

export function citationLocalPath(c: Citation): string {
  return path.join(c.entry.path, c.relPath);
}
