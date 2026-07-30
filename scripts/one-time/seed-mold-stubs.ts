#!/usr/bin/env tsx
// One-time: write minimal stub frontmatter for every Mold in the v1 inventory.
// Stubs satisfy the schema and let pipelines validate end-to-end.
// Real Mold authoring replaces these one at a time.
//
// Run: npx tsx scripts/one-time/seed-mold-stubs.ts
// Idempotent: skips Molds whose index.md already exists.

import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

interface Stub {
  slug: string;
  axis: "source-specific" | "target-specific" | "tool-specific" | "generic";
  source?: "paper" | "nextflow" | "cwl";
  target?: "galaxy" | "cwl";
  tool?: "gxwf" | "planemo";
  summary: string;
}

const STUBS: Stub[] = [
  // Source summarization
  { slug: "summarize-paper", axis: "source-specific", source: "paper", summary: "Extract methods, tools, sample data, and references from a paper." },
  { slug: "summarize-nextflow", axis: "source-specific", source: "nextflow", summary: "Enumerate processes, channels, conditionals, containers from an NF source tree." },
  { slug: "summarize-cwl", axis: "source-specific", source: "cwl", summary: "Surface CWL Workflow + CommandLineTool inputs, outputs, scatter, conditionals." },
  // Test-data derivation
  { slug: "paper-to-test-data", axis: "source-specific", source: "paper", summary: "Derive workflow test inputs and expected outputs from a paper." },
  { slug: "find-test-data", axis: "generic", summary: "Search IWC fixtures and public sources for test data matching a data-flow shape." },
  { slug: "nextflow-test-to-target-tests", axis: "source-specific", source: "nextflow", summary: "Translate NF test fixtures into a target workflow's test format." },
  { slug: "cwl-test-to-target-tests", axis: "source-specific", source: "cwl", summary: "Translate CWL test fixtures into a target workflow's test format." },
  // Data flow (target-specific)
  { slug: "summary-to-galaxy-data-flow", axis: "target-specific", target: "galaxy", summary: "Abstract DAG with Galaxy collection / scatter / branching idioms surfaced." },
  { slug: "summary-to-cwl-data-flow", axis: "target-specific", target: "cwl", summary: "Abstract DAG with CWL scatter / valueFrom / step idioms surfaced." },
  // Template generation (target-specific)
  { slug: "summary-to-galaxy-template", axis: "target-specific", target: "galaxy", summary: "gxformat2 skeleton with per-step TODOs from a data-flow summary." },
  { slug: "summary-to-cwl-template", axis: "target-specific", target: "cwl", summary: "CWL Workflow skeleton with per-step TODOs from a data-flow summary." },
  // Per-step tool work (Galaxy)
  { slug: "discover-shed-tool", axis: "target-specific", target: "galaxy", summary: "Search the Tool Shed for an existing wrapper; classify candidates and recommend." },
  { slug: "summarize-galaxy-tool", axis: "target-specific", target: "galaxy", summary: "Pull JSON schema, container, source, inputs/outputs for a Galaxy tool." },
  { slug: "author-galaxy-tool-wrapper", axis: "target-specific", target: "galaxy", summary: "Author a new Galaxy tool wrapper (XML) when discovery yields nothing acceptable." },
  { slug: "implement-galaxy-tool-step", axis: "target-specific", target: "galaxy", summary: "Convert an abstract step into a concrete gxformat2 step using a tool summary." },
  // Per-step tool work (CWL)
  { slug: "summarize-cwl-tool", axis: "target-specific", target: "cwl", summary: "Derive a CommandLineTool description (container, baseCommand, IO) for a CWL target." },
  { slug: "implement-cwl-tool-step", axis: "target-specific", target: "cwl", summary: "Convert an abstract step into a concrete CWL CommandLineTool + step." },
  // Test assembly
  { slug: "implement-galaxy-workflow-test", axis: "target-specific", target: "galaxy", summary: "Assemble Galaxy workflow test fixtures and assertions." },
  { slug: "implement-cwl-workflow-test", axis: "target-specific", target: "cwl", summary: "Assemble CWL job file(s) and expected-output assertions." },
  // Validation
  { slug: "validate-with-gxwf", axis: "target-specific", target: "galaxy", summary: "Run gxwf schema/lint, classify failures, recommend fixes; loop until clean." },
  { slug: "validate-cwl", axis: "target-specific", target: "cwl", summary: "Run cwltool --validate / schema lint, classify failures, recommend fixes." },
  // Run & debug
  { slug: "run-workflow-test", axis: "generic", summary: "Execute a workflow's tests via Planemo; emit structured pass/fail and outputs." },
  { slug: "debug-galaxy-workflow-output", axis: "target-specific", target: "galaxy", summary: "Triage failing Galaxy run outputs; classify failure modes; propose fixes." },
  { slug: "debug-cwl-workflow-output", axis: "target-specific", target: "cwl", summary: "Triage failing CWL run outputs; classify failure modes; propose fixes." },
  // Corpus grounding
  { slug: "compare-against-iwc-exemplar", axis: "target-specific", target: "galaxy", summary: "Find nearest IWC exemplar(s) and surface a structural diff against a draft." },
  // CLI Molds
  { slug: "gxwf-cli", axis: "tool-specific", tool: "gxwf", summary: "Whole-CLI Mold: gxwf design-time surface (validate, lint, convert, search, …)." },
  { slug: "planemo-cli", axis: "tool-specific", tool: "planemo", summary: "Whole-CLI Mold: Planemo runtime surface (test, run, lint, scaffolding, …)." },
];

const TODAY = "2026-04-30";
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

function tagsFor(s: Stub): string[] {
  const tags = ["mold"];
  if (s.source) tags.push(`source/${s.source}`);
  if (s.target) tags.push(`target/${s.target}`);
  if (s.tool) tags.push(`tool/${s.tool}`);
  return tags;
}

function frontmatterFor(s: Stub): string {
  const tags = tagsFor(s).map((t) => `  - ${t}`).join("\n");
  const lines = [
    "---",
    "type: mold",
    `name: ${s.slug}`,
    `axis: ${s.axis}`,
  ];
  if (s.source) lines.push(`source: ${s.source}`);
  if (s.target) lines.push(`target: ${s.target}`);
  if (s.tool) lines.push(`tool: ${s.tool}`);
  lines.push("tags:", tags);
  lines.push("status: draft");
  lines.push(`created: ${TODAY}`);
  lines.push(`revised: ${TODAY}`);
  lines.push("revision: 1");
  lines.push(`summary: ${JSON.stringify(s.summary)}`);
  lines.push("---", "");
  return lines.join("\n");
}

function bodyFor(s: Stub): string {
  return `# ${s.slug}\n\nStub. Replace with real Mold content per MOLD_SPEC once first walks are done.\n`;
}

let written = 0;
let skipped = 0;
for (const stub of STUBS) {
  const file = path.join(repoRoot, "content/molds", stub.slug, "index.md");
  if (existsSync(file)) {
    skipped++;
    continue;
  }
  writeFileSync(file, frontmatterFor(stub) + bodyFor(stub));
  written++;
}
process.stdout.write(`stubs: wrote ${written}, skipped ${skipped} (already existed)\n`);
