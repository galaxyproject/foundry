// One pin, checked rather than synchronised.
//
// The planemo version used to be hand-maintained in seven places: the cli-tool note, the
// schema note, both `sync-from-planemo.mjs` scripts and `sync-planemo-cli.ts` — plus every
// file those scripts generate. Nothing compared them, so a bump was a grep-and-hope.
//
// The relationship is inverted here. The note states the intent. The sync scripts stamp the
// version they actually observed from the binary they invoked, and no longer carry a pin of
// their own. This module asks the only question left: does what we intended match what we
// got, everywhere the answer was written down?
//
// It reads files and nothing else — no planemo on PATH, no network — so unlike
// `check:planemo-cli` it can run in the default `make check` on any contributor's machine.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { readMarkdown } from "./frontmatter.js";

export const PLANEMO_PIN_NOTE = "content/cli/planemo/index.md";
export const PLANEMO_SCHEMA_NOTE = "content/schemas/planemo-test-report.md";
export const PLANEMO_PROVENANCE = [
  "packages/planemo-cli-meta/src/cli-meta.provenance.json",
  "packages/planemo-test-report-schema/src/test-report.provenance.json",
];

const CLI_PAGE_DIR = "content/cli/planemo";

/** A file repeating a planemo version that disagrees with the note's pin. */
export interface PlanemoPinDrift {
  /** Repo-relative path of the disagreeing file. */
  file: string;
  /** Where in that file the version was found. */
  detail: string;
  found: string;
  expected: string;
}

/** The intended pin: `package_version` from the `cli-tool` note. */
export function readPinnedPlanemoVersion(repoRoot: string): string {
  const notePath = path.join(repoRoot, PLANEMO_PIN_NOTE);
  const parsed = readMarkdown(notePath);
  const version = parsed.meta?.package_version;
  if (typeof version !== "string" || !version) {
    throw new Error(`${PLANEMO_PIN_NOTE}: missing or non-string package_version`);
  }
  return version;
}

// A version that reaches a file does so as one of these: a pip-style spec, a GitHub blob URL
// pinned to the release tag, or the bare `planemo_version` field a sync script stamped. Each
// pattern captures the version so a mismatch can report what it actually found.
const SPEC_RE = /planemo==(\d+\.\d+\.\d+(?:[.\w]*))/g;
const BLOB_RE = /github\.com\/galaxyproject\/planemo\/blob\/(\d+\.\d+\.\d+(?:[.\w]*))\//g;

function scanText(
  file: string,
  text: string,
  expected: string,
  detail: string,
  patterns: { re: RegExp; label: string }[],
): PlanemoPinDrift[] {
  const drift: PlanemoPinDrift[] = [];
  const seen = new Set<string>();
  for (const { re, label } of patterns) {
    for (const match of text.matchAll(re)) {
      const found = match[1];
      if (!found || found === expected) continue;
      const key = `${label}:${found}`;
      if (seen.has(key)) continue;
      seen.add(key);
      drift.push({ file, detail: `${detail} ${label}`, found, expected });
    }
  }
  return drift;
}

const TEXT_PATTERNS = [
  { re: SPEC_RE, label: "planemo==<version>" },
  { re: BLOB_RE, label: "blob/<version> URL" },
];

function listCliPages(repoRoot: string): string[] {
  const dir = path.join(repoRoot, CLI_PAGE_DIR);
  return readdirSync(dir)
    .filter((name) => name.startsWith("planemo-") && name.endsWith(".md"))
    .sort()
    .map((name) => path.posix.join(CLI_PAGE_DIR, name));
}

/**
 * Every place the planemo version is written down, compared against the note's pin.
 *
 * Returns one entry per (file, distinct wrong version) pair — a file repeating the same stale
 * version three times is one problem to fix, not three lines of noise.
 */
export function findPlanemoPinDrift(repoRoot: string): PlanemoPinDrift[] {
  const expected = readPinnedPlanemoVersion(repoRoot);
  const drift: PlanemoPinDrift[] = [];

  // The note states the pin, then repeats it in `invoke_fallback` and in its install prose.
  drift.push(
    ...scanText(
      PLANEMO_PIN_NOTE,
      readFileSync(path.join(repoRoot, PLANEMO_PIN_NOTE), "utf8"),
      expected,
      "note",
      TEXT_PATTERNS,
    ),
  );

  for (const rel of [PLANEMO_SCHEMA_NOTE, ...listCliPages(repoRoot)]) {
    drift.push(
      ...scanText(
        rel,
        readFileSync(path.join(repoRoot, rel), "utf8"),
        expected,
        "note",
        TEXT_PATTERNS,
      ),
    );
  }

  // Provenance is the one place recording an observation rather than a repetition: the version
  // the sync script saw the binary report. Disagreement here means the artifacts were
  // regenerated against a planemo that is not the one the note asks for.
  for (const rel of PLANEMO_PROVENANCE) {
    const raw = JSON.parse(readFileSync(path.join(repoRoot, rel), "utf8")) as {
      planemo_version?: unknown;
    };
    const found = raw.planemo_version;
    if (typeof found !== "string" || !found) {
      drift.push({ file: rel, detail: "planemo_version", found: String(found), expected });
    } else if (found !== expected) {
      drift.push({ file: rel, detail: "planemo_version (observed at sync)", found, expected });
    }
  }

  return drift;
}
