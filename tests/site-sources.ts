// The site's own source files, and their code with the prose taken out.
//
// Shared by the rules that read what this repo WROTE rather than what it built. They have to scan
// the same set: a rule enforced over a smaller set than the one it describes has a hole in it, and
// the hole is invisible from inside either test.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SCANNED_EXTENSIONS = [".ts", ".astro", ".mts", ".js", ".mjs"];

export const SITE_SRC = new URL("../site/src/", import.meta.url).pathname;
export const REPO_ROOT = new URL("../", import.meta.url).pathname;

export function siteSourceFiles(dir: string = SITE_SRC): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return siteSourceFiles(full);
    return SCANNED_EXTENSIONS.includes(path.extname(full)) ? [full] : [];
  });
}

// Comments come out first, so a module is free to DESCRIBE a mistake at length without committing
// it. Every rule that uses this file relies on that, and so do the modules they point at.
export function siteSourceCode(file: string): string {
  return readFileSync(file, "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** A path a failure message can be read against: relative to the repository root. */
export const repoRelative = (file: string): string => path.relative(REPO_ROOT, file);
