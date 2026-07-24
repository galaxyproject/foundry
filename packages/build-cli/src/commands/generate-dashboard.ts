#!/usr/bin/env tsx

import {
  loadContentNotes,
  loadDashboardSections,
  markdownTable,
  sortByRevisedDesc,
  wikiLink,
  writeOrCheck,
} from "../lib/content-notes.js";

const OUTPUT = "content/Dashboard.md";

export function runGenerateDashboardCommand(argv = process.argv.slice(2)): void {
  const opts = parseGenerateDashboardArgs(argv);
  const notes = loadContentNotes(opts.contentRoot).filter((note) => note.status !== "archived");
  const sections = loadDashboardSections(opts.sectionsPath);

  const parts: string[] = [
    "# Dashboard",
    "",
    "Generated from `dashboard_sections.json` and content frontmatter. Do not edit by hand.",
    "",
  ];

  for (const section of sections) {
    const sectionNotes = sortByRevisedDesc(notes.filter((note) => note.type === section.type));
    if (sectionNotes.length === 0) continue;
    parts.push(`## ${section.label}`, "");
    parts.push(
      markdownTable([
        ["Name", "Summary", "Status", "Revised", "Rev"],
        ...sectionNotes.map((note) => [
          wikiLink(note),
          note.summary,
          note.status,
          note.revised,
          String(note.revision),
        ]),
      ]),
      "",
    );
  }

  writeOrCheck(opts.output, parts.join("\n"), opts.check);
}

interface GenerateDashboardArgs {
  check: boolean;
  contentRoot: string;
  output: string;
  sectionsPath: string;
}

function parseGenerateDashboardArgs(argv: string[]): GenerateDashboardArgs {
  const args: GenerateDashboardArgs = {
    check: false,
    contentRoot: "content",
    output: OUTPUT,
    sectionsPath: "dashboard_sections.json",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check") args.check = true;
    else if (a === "--content") args.contentRoot = argv[++i] ?? args.contentRoot;
    else if (a === "--output") args.output = argv[++i] ?? args.output;
    else if (a === "--sections") args.sectionsPath = argv[++i] ?? args.sectionsPath;
    else if (a?.startsWith("--content=")) args.contentRoot = a.slice("--content=".length);
    else if (a?.startsWith("--output=")) args.output = a.slice("--output=".length);
    else if (a?.startsWith("--sections=")) args.sectionsPath = a.slice("--sections=".length);
    else if (a === "--root") {
      const root = (argv[++i] ?? ".").replace(/\/$/, "");
      args.contentRoot = `${root}/content`;
      args.output = `${root}/${OUTPUT}`;
      args.sectionsPath = `${root}/dashboard_sections.json`;
    } else if (a?.startsWith("--root=")) {
      const root = a.slice("--root=".length).replace(/\/$/, "");
      args.contentRoot = `${root}/content`;
      args.output = `${root}/${OUTPUT}`;
      args.sectionsPath = `${root}/dashboard_sections.json`;
    }
  }
  return args;
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) runGenerateDashboardCommand();
