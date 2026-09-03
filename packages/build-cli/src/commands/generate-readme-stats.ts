#!/usr/bin/env tsx

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { companionsOf } from "@galaxy-foundry/kind-schema";
import { DEFINITIONS } from "@galaxy-foundry/gxwf-foundry-note-schema";

import {
  loadContentNotes,
  markdownTable,
  replaceGeneratedRegion,
  writeOrCheck,
  type ContentNote,
} from "../lib/content-notes.js";

// The corpus counts the README states about itself.
//
// They were written by hand and both sentences carrying them said 45 Molds while 47 existed:
// two Molds were added and nothing told the README. The same paragraph also said every Mold is
// still `status: draft` when 27 of 47 had been reviewed — a claim about the project's maturity,
// wrong in the direction that undersells it, and wrong for however long it took anyone to check.
//
// Every one of these numbers was already derivable. The notes carry `type` and `status`, and the
// `mold` kind DECLARES `eval.md` and `scenarios.md`, so "how many Molds have an eval" is a
// question the declaration answers rather than a thing a person counts. The counts are read from
// those two sources here and from nowhere else, which is what makes the next two Molds update
// the README instead of silently invalidating it.

const OUTPUT = "README.md";
const REGION = "corpus";

/** The one kind whose companion coverage the README reports on. */
const COMPANION_KIND = "mold";

export function runGenerateReadmeStatsCommand(argv = process.argv.slice(2)): void {
  const opts = parseArgs(argv);
  const notes = loadContentNotes(opts.contentRoot).filter((note) => note.status !== "archived");
  const existing = readFileSync(opts.output, "utf8");
  const updated = replaceGeneratedRegion(existing, REGION, renderStats(notes));
  writeOrCheck(opts.output, updated, opts.check);
}

function renderStats(notes: ContentNote[]): string {
  const of = (type: string) => notes.filter((note) => note.type === type);
  const molds = of(COMPANION_KIND);

  const rows: string[][] = [
    ["", "count"],
    ["Pipelines", String(of("pipeline").length)],
    ["Molds", `${molds.length}${statusBreakdown(molds)}`],
  ];

  // Straight off the kind. A companion the declaration drops stops being reported the same day,
  // and one it gains starts — neither needs an edit here.
  for (const companion of companionsOf(DEFINITIONS[COMPANION_KIND]).values()) {
    if (companion.directory || !companion.name.endsWith(".md")) continue;
    if (companion.requirement === "optional") continue;
    rows.push([`… with \`${companion.name}\``, String(countWith(molds, companion.name))]);
  }

  rows.push(
    ["Pattern pages", String(of("pattern").length)],
    ["Source-pattern pages", String(of("source-pattern").length)],
    ["CLI tools", String(of("cli-tool").length)],
    ["CLI command pages", String(of("cli-command").length)],
    ["Schema notes", String(of("schema").length)],
    ["Research notes", String(of("research").length)],
  );

  return markdownTable(rows);
}

/** How many of these notes have a file of this name beside them. */
function countWith(notes: ContentNote[], filename: string): number {
  return notes.filter((note) => existsSync(path.join(path.dirname(note.path), filename))).length;
}

/**
 * `47 — 27 reviewed, 20 draft`, in the status enum's own order.
 *
 * Rendered from what the corpus actually says rather than asserted, because the sentence this
 * replaces asserted "every Mold is still draft" and had been wrong for 27 of them.
 */
function statusBreakdown(notes: ContentNote[]): string {
  const counts = new Map<string, number>();
  for (const note of notes) counts.set(note.status, (counts.get(note.status) ?? 0) + 1);
  const parts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([status, count]) => `${count} ${status}`);
  return parts.length > 1 ? ` — ${parts.join(", ")}` : "";
}

interface Args {
  check: boolean;
  contentRoot: string;
  output: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { check: false, contentRoot: "content", output: OUTPUT };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check") args.check = true;
    else if (a === "--content") args.contentRoot = argv[++i] ?? args.contentRoot;
    else if (a === "--output") args.output = argv[++i] ?? args.output;
    else if (a?.startsWith("--content=")) args.contentRoot = a.slice("--content=".length);
    else if (a?.startsWith("--output=")) args.output = a.slice("--output=".length);
    else if (a === "--root") {
      const root = (argv[++i] ?? ".").replace(/\/$/, "");
      args.contentRoot = `${root}/content`;
      args.output = `${root}/${OUTPUT}`;
    } else if (a?.startsWith("--root=")) {
      const root = a.slice("--root=".length).replace(/\/$/, "");
      args.contentRoot = `${root}/content`;
      args.output = `${root}/${OUTPUT}`;
    }
  }
  return args;
}
