#!/usr/bin/env tsx

import {
  loadContentNotes,
  sortByTitle,
  wikiLink,
  writeOrCheck,
  type ContentNote,
} from "../lib/content-notes.js";

const OUTPUT = "content/Index.md";

const TYPE_LABELS: Record<string, string> = {
  pipeline: "Pipelines",
  mold: "Molds",
  pattern: "Patterns",
  "source-pattern": "Source Patterns",
  "cli-command": "CLI Commands",
  schema: "Schemas",
  research: "Research",
};

export function runGenerateIndexCommand(argv = process.argv.slice(2)): void {
  const opts = parseGenerateIndexArgs(argv);
  const notes = loadContentNotes(opts.contentRoot).filter((note) => note.status !== "archived");
  const grouped = groupByType(notes);
  const orderedKeys = Object.keys(TYPE_LABELS).filter((key) => grouped.has(key));
  const remainingKeys = [...grouped.keys()].filter((key) => !TYPE_LABELS[key]).sort();

  const parts: string[] = [
    "# Index",
    "",
    "Generated from content frontmatter. Do not edit by hand.",
    "",
  ];

  for (const key of [...orderedKeys, ...remainingKeys]) {
    const sectionNotes = sortByTitle(grouped.get(key) ?? []);
    parts.push(`## ${TYPE_LABELS[key] ?? titleFromKey(key)}`, "");
    for (const note of sectionNotes) {
      const status = note.status === "draft" ? "" : ` *(${note.status})*`;
      parts.push(`- ${wikiLink(note)} — ${note.summary}${status}`);
    }
    parts.push("");
  }

  writeOrCheck(opts.output, parts.join("\n"), opts.check);
}

interface GenerateIndexArgs {
  check: boolean;
  contentRoot: string;
  output: string;
}

function parseGenerateIndexArgs(argv: string[]): GenerateIndexArgs {
  const args: GenerateIndexArgs = { check: false, contentRoot: "content", output: OUTPUT };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check") args.check = true;
    else if (a === "--content") args.contentRoot = argv[++i] ?? args.contentRoot;
    else if (a === "--output") args.output = argv[++i] ?? args.output;
    else if (a?.startsWith("--content=")) args.contentRoot = a.slice("--content=".length);
    else if (a?.startsWith("--output=")) args.output = a.slice("--output=".length);
    else if (a === "--root") {
      const root = argv[++i] ?? ".";
      args.contentRoot = `${root.replace(/\/$/, "")}/content`;
      args.output = `${root.replace(/\/$/, "")}/${OUTPUT}`;
    } else if (a?.startsWith("--root=")) {
      const root = a.slice("--root=".length).replace(/\/$/, "");
      args.contentRoot = `${root}/content`;
      args.output = `${root}/${OUTPUT}`;
    }
  }
  return args;
}

function groupByType(notes: ContentNote[]): Map<string, ContentNote[]> {
  const grouped = new Map<string, ContentNote[]>();
  for (const note of notes) {
    const key = note.type;
    const bucket = grouped.get(key) ?? [];
    bucket.push(note);
    grouped.set(key, bucket);
  }
  return grouped;
}

function titleFromKey(key: string): string {
  return key.replace(/[/-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) runGenerateIndexCommand();
