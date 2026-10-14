// Reads a run directory into a flat inventory, under budgets.
//
// The budgets are not a performance nicety. A real run directory holds a ~100 MB `test-data/`
// tree, a standalone `.git`, several hundred-KB Planemo logs and a third of a megabyte of Planemo
// HTML. A reader that walks all of it and hashes all of it takes minutes and produces a model
// nobody can render. So: dot-directories are excluded from the walk itself, directories are
// summarized at depth one, hashing stops above a size cap, and embedded text has both a per-file
// and a whole-run budget. Every skip is recorded rather than silently applied.

import { lstatSync, readFileSync, readdirSync, realpathSync, statSync, type Stats } from "node:fs";
import path from "node:path";

import { humanBytes } from "./html.js";
import { sha256File } from "./reconcile.js";

export interface ScanOptions {
  /** Above this, sha256 is skipped and the reason recorded. */
  maxHashBytes: number;
  /** Above this, a file's text is not embedded. */
  maxEmbedBytes: number;
  /** Across the whole run. Once spent, later files carry a skip reason. */
  totalEmbedBudget: number;
  /** Recurse into directories, listing every nested file, instead of summarizing them. */
  deepDirs: boolean;
  /** With `deepDirs`, nested files past this many are counted as ignored rather than listed. */
  maxDeepEntries: number;
}

export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  maxHashBytes: 8 * 1024 * 1024,
  maxEmbedBytes: 256 * 1024,
  totalEmbedBudget: 4 * 1024 * 1024,
  deepDirs: false,
  maxDeepEntries: 5000,
};

/**
 * Never walked, at any depth.
 *
 * `.git` is the run's own history and is read through `git log`, not by walking blobs. `.omc` is
 * agent session state that happens to sit in the directory. Both are large and neither is a run
 * artifact.
 */
const EXCLUDED_NAMES = new Set([".git", ".omc", "node_modules", ".DS_Store"]);

/** What `run-dashboard` writes beside the run; reading them back would count the reader as the run. */
const READER_OUTPUTS = new Set(["run-manifest.json", "dashboard.html"]);

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

function isExcluded(name: string): boolean {
  return EXCLUDED_NAMES.has(name) || name.startsWith(".") || name.endsWith(".swp");
}

function looksTextual(basename: string): boolean {
  const ext = path.extname(basename).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  // `galaxy-workflow.gxwf.yml.prepin.bak` and friends: the meaningful extension is not the last.
  return /\.(ya?ml|json|md|txt|log)(\.[^.]+)*$/i.test(basename);
}

/**
 * Stats for a path, following a symlink only when it resolves inside the run directory.
 *
 * A run directory is the user's, and a link out of it (to a home directory, a data store) must not
 * be hashed or embedded into a page that may be shared.
 */
function statInside(full: string, root: string): { stats: Stats; real: string } | null {
  try {
    const own = lstatSync(full);
    if (!own.isSymbolicLink()) return { stats: own, real: full };
    const real = realpathSync(full);
    if (real !== root && !real.startsWith(`${root}${path.sep}`)) return null;
    return { stats: statSync(real), real };
  } catch {
    return null;
  }
}

function posixRel(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join("/");
}

/** Depth-limited summary of a directory we decline to list. */
function summarizeDir(
  dir: string,
  root: string,
): { entry_count: number; total_bytes: number; sample: string[] } {
  let entryCount = 0;
  let totalBytes = 0;
  const sample: string[] = [];
  const walk = (current: string, depth: number): void => {
    let names: string[];
    try {
      names = readdirSync(current).sort();
    } catch {
      return;
    }
    for (const name of names) {
      if (isExcluded(name)) continue;
      const full = path.join(current, name);
      const found = statInside(full, root);
      if (!found) continue;
      if (found.stats.isDirectory()) {
        if (depth < 3) walk(full, depth + 1);
        continue;
      }
      if (!found.stats.isFile()) continue;
      entryCount += 1;
      totalBytes += found.stats.size;
      if (sample.length < 20) sample.push(posixRel(dir, full));
    }
  };
  walk(dir, 0);
  return { entry_count: entryCount, total_bytes: totalBytes, sample };
}

/** Embedded bytes spent so far, shared by every file read under one run-wide budget. */
export interface EmbedBudget {
  spent: number;
}

function entryOf(
  full: string,
  relpath: string,
  stats: Stats,
  opts: ScanOptions,
  budget?: EmbedBudget,
): ScannedEntry {
  const name = path.basename(full);
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
  } else if (budget && budget.spent + stats.size > opts.totalEmbedBudget) {
    textSkip = "run-wide embed budget exhausted";
  } else {
    try {
      const buffer = readFileSync(full);
      if (buffer.includes(0)) {
        textSkip = "binary content";
      } else {
        text = buffer.toString("utf8");
        if (budget) budget.spent += stats.size;
      }
    } catch (error) {
      textSkip = `unreadable: ${(error as Error).message}`;
    }
  }

  return {
    basename: name,
    relpath,
    type: "file",
    size_bytes: stats.size,
    mtime: stats.mtime.toISOString(),
    sha256,
    hash_skipped_reason: hashSkipped,
    dir_summary: null,
    text,
    text_truncated: false,
    text_skip_reason: textSkip,
  };
}

/**
 * One file, read the way `scanRunDir` reads each of its files, or null when it is not a file.
 *
 * Without a `budget` the run-wide embed budget does not apply; pass one to share it across calls.
 */
export function scanFile(
  full: string,
  relpath: string,
  options: Partial<ScanOptions> = {},
  budget?: EmbedBudget,
): ScannedEntry | null {
  let stats: Stats;
  try {
    stats = statSync(full);
  } catch {
    return null;
  }
  if (!stats.isFile()) return null;
  return entryOf(full, relpath, stats, { ...DEFAULT_SCAN_OPTIONS, ...options }, budget);
}

/**
 * Inventory the run directory.
 *
 * Only depth one is treated as run artifacts: every harness writes declared basenames flat into
 * the run directory, so anything nested is either tool output or input data. `deepDirs` lists
 * nested files too, under the same hash and embed budgets, without promoting them to artifacts.
 */
export function scanRunDir(dir: string, options: Partial<ScanOptions> = {}): ScanResult {
  const opts = { ...DEFAULT_SCAN_OPTIONS, ...options };
  const entries: ScannedEntry[] = [];
  let ignored = 0;
  let totalBytes = 0;
  let deepListed = 0;

  let root: string;
  let names: string[];
  try {
    root = realpathSync(dir);
    names = readdirSync(root).sort();
  } catch (error) {
    throw new Error(`cannot read run directory ${dir}`, { cause: error });
  }

  const budget: EmbedBudget = { spent: 0 };
  const fileEntry = (full: string, relpath: string, stats: Stats): ScannedEntry =>
    entryOf(full, relpath, stats, opts, budget);

  /** Lists every file under `current`; `seen` holds real directory paths, so a link cannot loop. */
  const walkNested = (current: string, seen: Set<string>): void => {
    let nestedNames: string[];
    try {
      nestedNames = readdirSync(current).sort();
    } catch {
      return;
    }
    for (const name of nestedNames) {
      if (isExcluded(name)) continue;
      const full = path.join(current, name);
      const found = statInside(full, root);
      if (!found) continue;
      if (found.stats.isDirectory()) {
        if (seen.has(found.real)) continue;
        seen.add(found.real);
        walkNested(full, seen);
        continue;
      }
      if (!found.stats.isFile()) continue;
      if (deepListed >= opts.maxDeepEntries) {
        ignored += 1;
        continue;
      }
      deepListed += 1;
      entries.push(fileEntry(full, posixRel(root, full), found.stats));
    }
  };

  for (const name of names) {
    if (isExcluded(name) || READER_OUTPUTS.has(name)) {
      ignored += 1;
      continue;
    }
    const full = path.join(root, name);
    const found = statInside(full, root);
    if (!found) {
      ignored += 1;
      continue;
    }
    const { stats } = found;

    if (stats.isDirectory()) {
      const summary = summarizeDir(full, root);
      totalBytes += summary.total_bytes;
      entries.push({
        basename: name,
        relpath: name,
        type: "dir",
        size_bytes: summary.total_bytes,
        mtime: stats.mtime.toISOString(),
        sha256: null,
        hash_skipped_reason: "directory",
        dir_summary: summary,
        text: null,
        text_truncated: false,
        text_skip_reason: null,
      });
      if (opts.deepDirs) walkNested(full, new Set([found.real]));
      continue;
    }

    if (!stats.isFile()) {
      ignored += 1;
      continue;
    }

    totalBytes += stats.size;
    entries.push(fileEntry(full, name, stats));
  }

  return { entries, ignored_count: ignored, total_bytes: totalBytes };
}
