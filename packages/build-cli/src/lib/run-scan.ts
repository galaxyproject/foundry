// Reads a run directory into a flat inventory, under budgets.
//
// The budgets are not a performance nicety. A real run directory holds a ~100 MB `test-data/`
// tree, a standalone `.git`, several hundred-KB Planemo logs and a third of a megabyte of Planemo
// HTML. A reader that walks all of it and hashes all of it takes minutes and produces a model
// nobody can render. So: dot-directories are excluded from the walk itself, directories are
// summarized at depth one, hashing stops above a size cap, and embedded text has both a per-file
// and a whole-run budget. Every skip is recorded rather than silently applied.

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, type Stats } from "node:fs";
import path from "node:path";

export interface ScanOptions {
  /** Above this, sha256 is skipped and the reason recorded. */
  maxHashBytes: number;
  /** Above this, a file's text is not embedded. */
  maxEmbedBytes: number;
  /** Across the whole run. Once spent, later files carry a skip reason. */
  totalEmbedBudget: number;
  /** Recurse into directories instead of summarizing them at depth one. */
  deepDirs: boolean;
}

export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  maxHashBytes: 8 * 1024 * 1024,
  maxEmbedBytes: 256 * 1024,
  totalEmbedBudget: 4 * 1024 * 1024,
  deepDirs: false,
};

/**
 * Never walked, at any depth.
 *
 * `.git` is the run's own history and is read through `git log`, not by walking blobs. `.omc` is
 * agent session state that happens to sit in the directory. Both are large and neither is a run
 * artifact.
 */
const EXCLUDED_NAMES = new Set([".git", ".omc", "node_modules", ".DS_Store"]);

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".markdown",
  ".json",
  ".yml",
  ".yaml",
  ".txt",
  ".log",
  ".csv",
  ".tsv",
  ".mjs",
  ".js",
  ".ts",
  ".py",
  ".sh",
  ".nf",
  ".cfg",
  ".config",
  ".ga",
  ".cwl",
]);

export interface ScannedEntry {
  basename: string;
  relpath: string;
  type: "file" | "dir";
  size_bytes: number;
  mtime: string;
  sha256: string | null;
  hash_skipped_reason: string | null;
  dir_summary: { entry_count: number; total_bytes: number; sample: string[] } | null;
  text: string | null;
  text_truncated: boolean;
  text_skip_reason: string | null;
}

export interface ScanResult {
  entries: ScannedEntry[];
  ignored_count: number;
  total_bytes: number;
}

export function isExcluded(name: string): boolean {
  return EXCLUDED_NAMES.has(name) || name.startsWith(".") || name.endsWith(".swp");
}

function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function sha256File(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function looksTextual(basename: string): boolean {
  const ext = path.extname(basename).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  // `galaxy-workflow.gxwf.yml.prepin.bak` and friends: the meaningful extension is not the last.
  return /\.(ya?ml|json|md|txt|log)(\.[^.]+)*$/i.test(basename);
}

/** Depth-one summary of a directory we decline to walk. */
function summarizeDir(dir: string): { entry_count: number; total_bytes: number; sample: string[] } {
  let entryCount = 0;
  let totalBytes = 0;
  const sample: string[] = [];
  const walk = (current: string, depth: number): void => {
    let names: string[];
    try {
      names = readdirSync(current);
    } catch {
      return;
    }
    for (const name of names) {
      if (EXCLUDED_NAMES.has(name)) continue;
      const full = path.join(current, name);
      let stats: Stats;
      try {
        stats = statSync(full);
      } catch {
        continue;
      }
      if (stats.isDirectory()) {
        if (depth < 3) walk(full, depth + 1);
        continue;
      }
      entryCount += 1;
      totalBytes += stats.size;
      if (sample.length < 20) sample.push(path.relative(dir, full).split(path.sep).join("/"));
    }
  };
  walk(dir, 0);
  return { entry_count: entryCount, total_bytes: totalBytes, sample };
}

/**
 * Inventory the run directory.
 *
 * Only depth one is treated as run artifacts: every harness writes declared basenames flat into
 * the run directory, so anything nested is either tool output or input data.
 */
export function scanRunDir(dir: string, options: Partial<ScanOptions> = {}): ScanResult {
  const opts = { ...DEFAULT_SCAN_OPTIONS, ...options };
  const entries: ScannedEntry[] = [];
  let ignored = 0;
  let totalBytes = 0;
  let embedSpent = 0;

  let names: string[];
  try {
    names = readdirSync(dir).sort();
  } catch (error) {
    throw new Error(`cannot read run directory ${dir}`, { cause: error });
  }

  for (const name of names) {
    if (isExcluded(name)) {
      ignored += 1;
      continue;
    }
    const full = path.join(dir, name);
    let stats: Stats;
    try {
      stats = statSync(full);
    } catch {
      ignored += 1;
      continue;
    }
    const mtime = stats.mtime.toISOString();

    if (stats.isDirectory()) {
      const summary = summarizeDir(full);
      totalBytes += summary.total_bytes;
      entries.push({
        basename: name,
        relpath: name,
        type: "dir",
        size_bytes: summary.total_bytes,
        mtime,
        sha256: null,
        hash_skipped_reason: "directory",
        dir_summary: summary,
        text: null,
        text_truncated: false,
        text_skip_reason: null,
      });
      if (opts.deepDirs) {
        for (const nested of summary.sample) {
          const nestedFull = path.join(full, nested);
          let nestedStats: Stats;
          try {
            nestedStats = statSync(nestedFull);
          } catch {
            continue;
          }
          entries.push({
            basename: path.basename(nested),
            relpath: `${name}/${nested}`,
            type: "file",
            size_bytes: nestedStats.size,
            mtime: nestedStats.mtime.toISOString(),
            sha256: null,
            hash_skipped_reason: "nested under a summarized directory",
            dir_summary: null,
            text: null,
            text_truncated: false,
            text_skip_reason: "nested under a summarized directory",
          });
        }
      }
      continue;
    }

    if (!stats.isFile()) {
      ignored += 1;
      continue;
    }

    totalBytes += stats.size;

    let sha256: string | null = null;
    let hashSkipped: string | null = null;
    if (stats.size <= opts.maxHashBytes) {
      try {
        sha256 = sha256File(full);
      } catch (error) {
        hashSkipped = `unreadable: ${(error as Error).message}`;
      }
    } else {
      hashSkipped = `over the hash cap (${humanBytes(stats.size)})`;
    }

    let text: string | null = null;
    let textSkip: string | null = null;
    if (!looksTextual(name)) {
      textSkip = "not a text format";
    } else if (stats.size > opts.maxEmbedBytes) {
      textSkip = `over the per-file embed cap (${humanBytes(stats.size)})`;
    } else if (embedSpent + stats.size > opts.totalEmbedBudget) {
      textSkip = "run-wide embed budget exhausted";
    } else {
      try {
        const buffer = readFileSync(full);
        if (buffer.includes(0)) {
          textSkip = "binary content";
        } else {
          text = buffer.toString("utf8");
          embedSpent += stats.size;
        }
      } catch (error) {
        textSkip = `unreadable: ${(error as Error).message}`;
      }
    }

    entries.push({
      basename: name,
      relpath: name,
      type: "file",
      size_bytes: stats.size,
      mtime,
      sha256,
      hash_skipped_reason: hashSkipped,
      dir_summary: null,
      text,
      text_truncated: false,
      text_skip_reason: textSkip,
    });
  }

  return { entries, ignored_count: ignored, total_bytes: totalBytes };
}
