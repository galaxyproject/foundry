// File discovery for the validator and generators.
// See INITIAL_ARCHITECTURE.md §6 for skip rules.

import { readdirSync, statSync } from "node:fs";
import path from "node:path";

export const SKIP_DIRS = new Set([".obsidian", "casts"]);
export const SKIP_FILES = new Set(["Dashboard.md", "Index.md", "log.md", "glossary.md"]);
/** Note types that use directory-note semantics: only `<type>/<slug>/index.md` is validated. */
export const DIR_NOTE_TYPES = new Set(["molds", "pipelines"]);

/**
 * Walk a directory and yield .md file paths that should be validated.
 * Skips hidden dirs, SKIP_DIRS, SKIP_FILES, and non-`index.md` files inside DIR_NOTE_TYPES dirs.
 */
export function* findMdFiles(root: string): Generator<string> {
  yield* walk(root, root);
}

function* walk(dir: string, root: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir).sort();
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith(".") || SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      yield* walk(full, root);
      continue;
    }
    if (!entry.endsWith(".md")) continue;
    if (SKIP_FILES.has(entry)) continue;
    const rel = path.relative(root, full);
    const parts = rel.split(path.sep);
    if (parts.some((p) => DIR_NOTE_TYPES.has(p)) && entry !== "index.md") continue;
    yield full;
  }
}

/** Slug used for wiki-link resolution: `index.md` → parent dir name; otherwise basename without extension. */
export function fileSlug(filePath: string): string {
  const base = path.basename(filePath, ".md");
  if (base === "index") return path.basename(path.dirname(filePath));
  return base;
}
