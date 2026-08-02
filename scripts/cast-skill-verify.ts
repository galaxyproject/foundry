#!/usr/bin/env tsx
// Deterministic verifier for a generated Claude skill cast.
//
// Verifies a cast bundle is internally consistent against the Mold's manifest
// and the target's constraints — without re-running the deterministic copy.
// Agentic verification (when a Mold ships cast-skill-verification.md) is run
// by the /cast slash command, not from this CLI.
//
// Usage:
//   tsx scripts/cast-skill-verify.ts <mold-name> [--target=claude]

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
import yaml from "js-yaml";

import { NEVER_PACKAGED } from "../packages/build-cli/src/lib/dispositions.js";
import { listFilesUnder } from "../packages/build-cli/src/lib/walk.js";
import { readMarkdown } from "./lib/frontmatter.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv = ((AjvImport as any).default ?? AjvImport) as typeof AjvImport;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats = ((addFormatsImport as any).default ??
  addFormatsImport) as typeof addFormatsImport;

interface Args {
  moldName: string;
  target: string;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  let target = "claude";
  for (const a of argv) {
    if (a.startsWith("--target=")) target = a.slice("--target=".length);
    else if (!a.startsWith("--")) positional.push(a);
    else throw new Error(`unknown flag: ${a}`);
  }
  if (positional.length !== 1) {
    throw new Error("usage: cast-skill-verify <mold-name> [--target=claude]");
  }
  return { moldName: positional[0]!, target };
}

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Markdown with fenced code blocks removed, line count preserved.
 *
 * Blank-lines rather than deletes so any message quoting a line number still points at the
 * line the reader sees. Opening fence is 3+ backticks or tildes; a fence closes on the same
 * character at the same length or longer, which is what lets a ```` ```` ```` block hold a
 * ``` one.
 */
function stripFencedBlocks(markdown: string): string {
  const lines = markdown.split("\n");
  let fence: { char: string; length: number } | null = null;
  return lines
    .map((line) => {
      const opener = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
      if (fence === null) {
        if (opener) {
          fence = { char: opener[1]![0]!, length: opener[1]!.length };
          return "";
        }
        return line;
      }
      if (opener && opener[1]![0] === fence.char && opener[1]!.length >= fence.length) {
        fence = null;
      }
      return "";
    })
    .join("\n");
}

interface TargetConfig {
  name: string;
  required_outputs: string[];
  skill_constraints: {
    frontmatter_required: string[];
    forbidden_runtime_paths: string[];
  };
}

interface ProvenanceRefEntry {
  kind: string;
  mode: string;
  ref?: string;
  src: string;
  dst: string;
  used_at: string;
  load: string;
  trigger?: string;
  src_hash: string | null;
  dst_hash: string | null;
  source: "deterministic";
  companion_of?: string;
}

interface Provenance {
  provenance_schema_version: number;
  cast_target: string;
  mold: { name: string; path: string; content_hash: string };
  refs: ProvenanceRefEntry[];
}

interface VerifyManifest {
  verify_schema_version: number;
  entries: Array<{
    artifact_id?: unknown;
    direction?: unknown;
    schema?: unknown;
    validator_bin?: unknown;
    args?: unknown;
  }>;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();

  const targetCfgPath = path.join(repoRoot, "casts", args.target, "_target.yml");
  if (!existsSync(targetCfgPath)) fail(`missing target config: ${targetCfgPath}`);
  const target = yaml.load(readFileSync(targetCfgPath, "utf8")) as TargetConfig;

  // Claude target casts live under skills/ (plugin layout).
  const bundleRoot =
    args.target === "claude"
      ? path.join(repoRoot, "casts", args.target, "skills", args.moldName)
      : path.join(repoRoot, "casts", args.target, args.moldName);
  if (!existsSync(bundleRoot)) fail(`missing bundle: ${bundleRoot}`);

  const errors: string[] = [];

  // Provenance must exist and validate against the schema.
  const provenancePath = path.join(bundleRoot, "_provenance.json");
  if (!existsSync(provenancePath)) {
    fail(`missing _provenance.json in ${bundleRoot}`);
  }
  const prov = JSON.parse(readFileSync(provenancePath, "utf8")) as Provenance;
  const schemaPath = path.join(
    repoRoot,
    "scripts",
    "lib",
    "schemas",
    "cast-provenance.schema.json",
  );
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validateProv = ajv.compile(JSON.parse(readFileSync(schemaPath, "utf8")));
  if (!validateProv(prov)) {
    for (const err of validateProv.errors ?? []) {
      errors.push(`_provenance.json: ${err.instancePath || "(root)"} ${err.message}`);
    }
  }

  const verifyOutputCommands: string[] = [];
  const verifyPath = path.join(bundleRoot, "_verify.json");
  if (!existsSync(verifyPath)) {
    errors.push("missing _verify.json in cast bundle");
  } else {
    try {
      const verify = JSON.parse(readFileSync(verifyPath, "utf8")) as VerifyManifest;
      if (verify.verify_schema_version !== 1) {
        errors.push("_verify.json: verify_schema_version must be 1");
      }
      if (!Array.isArray(verify.entries)) {
        errors.push("_verify.json: entries must be an array");
      } else {
        verify.entries.forEach((entry, index) => {
          if (typeof entry.artifact_id !== "string") {
            errors.push(`_verify.json: entries[${index}].artifact_id must be a string`);
          }
          if (entry.direction !== "input" && entry.direction !== "output") {
            errors.push(`_verify.json: entries[${index}].direction must be input or output`);
          }
          if (typeof entry.schema !== "string") {
            errors.push(`_verify.json: entries[${index}].schema must be a string`);
          }
          if (typeof entry.validator_bin !== "string") {
            errors.push(`_verify.json: entries[${index}].validator_bin must be a string`);
          }
          if (!Array.isArray(entry.args) || !entry.args.every((arg) => typeof arg === "string")) {
            errors.push(`_verify.json: entries[${index}].args must be a string array`);
          } else if (entry.direction === "output" && typeof entry.validator_bin === "string") {
            const sub = entry.args.filter((arg) => arg !== "{artifact_path}").join(" ");
            if (sub) verifyOutputCommands.push(`${entry.validator_bin} ${sub}`);
          }
        });
      }
    } catch (e) {
      errors.push(`_verify.json does not parse as JSON: ${(e as Error).message}`);
    }
  }

  // Required outputs.
  for (const rel of target.required_outputs) {
    const abs = path.join(bundleRoot, rel);
    if (!existsSync(abs)) errors.push(`missing required output: ${rel}`);
  }

  // SKILL.md frontmatter.
  const skillPath = path.join(bundleRoot, "SKILL.md");
  let skillBody = "";
  if (existsSync(skillPath)) {
    const parsed = readMarkdown(skillPath);
    if (!parsed.hasFrontmatter) errors.push("SKILL.md: missing frontmatter");
    for (const f of target.skill_constraints.frontmatter_required) {
      if (typeof parsed.meta[f] !== "string" || (parsed.meta[f] as string).trim() === "") {
        errors.push(`SKILL.md: frontmatter requires non-empty '${f}'`);
      }
    }
    skillBody = parsed.body;
    // Forbid leakage of Foundry source paths into runtime instructions.
    for (const forbidden of target.skill_constraints.forbidden_runtime_paths) {
      if (skillBody.includes(forbidden)) {
        errors.push(`SKILL.md: contains forbidden runtime path '${forbidden}'`);
      }
    }
    // Forbid raw wiki-links in SKILL.md.
    if (/\[\[[^\]]+\]\]/.test(skillBody)) {
      errors.push("SKILL.md: contains raw [[wiki-link]] (must be resolved or stripped)");
    }
  }

  // The Validation section must name each output validator's full `bin subcommand`
  // invocation, so the human-facing SKILL text can't drift from the machine-facing
  // _verify.json contract (F1: the renderer once dropped the subcommand).
  const validationSection = (skillBody.match(/## Validation[\s\S]*?(?=\n## |$)/) ?? [""])[0];
  for (const cmd of verifyOutputCommands) {
    if (!validationSection.includes(cmd)) {
      errors.push(`SKILL.md: Validation section omits '${cmd}' from _verify.json (renderer dropped the validator subcommand)`);
    }
  }

  // Per-ref checks.
  for (const r of prov.refs ?? []) {
    // Was a check for unfilled condense entries. The LLM phase is gone, so the guard is now
    // the stronger statement it was always standing in for: every byte in a committed bundle
    // was produced deterministically, and provenance has to say so.
    if (r.source !== "deterministic") {
      errors.push(`ref ${r.src}: source=${r.source} — a committed cast must be deterministic`);
      continue;
    }
    const dstAbs = path.join(bundleRoot, r.dst);
    if (!existsSync(dstAbs)) {
      errors.push(`ref ${r.src}: dst missing at ${r.dst}`);
      continue;
    }
    const dstHash = sha256(dstAbs);
    if (r.dst_hash && r.dst_hash !== dstHash) {
      errors.push(
        `ref ${r.src}: dst hash drift (recorded ${r.dst_hash.slice(0, 12)}, actual ${dstHash.slice(0, 12)})`,
      );
    }
    // For verbatim deterministic refs, src and dst hashes must match.
    if (r.source === "deterministic" && r.mode === "verbatim" && r.src_hash !== r.dst_hash) {
      errors.push(`ref ${r.src}: verbatim copy mismatch (src vs dst hashes differ)`);
    }
    // Bundled JSON schemas must parse.
    if (r.kind === "schema") {
      try {
        JSON.parse(readFileSync(dstAbs, "utf8"));
      } catch (e) {
        errors.push(`ref ${r.src}: bundled schema does not parse as JSON: ${(e as Error).message}`);
      }
    }
    // CLI sidecars must parse as JSON.
    if (r.kind === "cli-command" && r.mode === "sidecar") {
      try {
        JSON.parse(readFileSync(dstAbs, "utf8"));
      } catch (e) {
        errors.push(`ref ${r.src}: sidecar does not parse as JSON: ${(e as Error).message}`);
      }
    }
    // on-demand refs should have trigger text represented in SKILL.md (best-effort: filename basename appears).
    if (r.load === "on-demand" && r.used_at !== "cast-time" && skillBody) {
      const dstBase = path.basename(r.dst);
      if (!skillBody.includes(dstBase) && !skillBody.includes(r.dst)) {
        errors.push(
          `ref ${r.src}: on-demand runtime ref not referenced in SKILL.md (looked for '${dstBase}')`,
        );
      }
    }
  }

  // Backstop: a bundled note must not tell an agent to read a file that is not in the bundle.
  //
  // This is the enforcement arm of `companions:`, not a substitute for it. The declaration is
  // what decides membership; this is what notices when a note's prose and its declaration
  // disagree — the class of bug where the cast `.md` names a sibling that never shipped.
  //
  // Driven by the note's SOURCE DIRECTORY, not by a naming guess. It used to look for
  // `<stem>.<ext>` — files sharing the note's basename — which meant it could only ever see
  // companions whose names happened to pair. `gxformat2-schema/index.md` names
  // `gxformat2.schema.json`, one hyphen away from pairing, and went unseen through the whole
  // life of the check; `cwl-v1.2-schemas` names seven files in a subdirectory and could not
  // pair by construction. Listing the directory answers for every name at once, and it is a
  // fact rather than a heuristic: these are the files that ARE next to the note.
  for (const r of prov.refs ?? []) {
    if (r.companion_of) continue;
    if (r.kind !== "research" && r.kind !== "pattern") continue;
    if (!r.dst.endsWith(".md")) continue;
    const dstAbs = path.join(bundleRoot, r.dst);
    if (!existsSync(dstAbs)) continue; // already reported above
    if (typeof r.src !== "string") continue;
    const srcDir = path.dirname(path.join(repoRoot, r.src));
    if (!existsSync(srcDir)) continue;

    // Fenced blocks are payload, not instruction. This repo already draws that line — "a
    // backtick means the syntax, not a link" (AGENTS.md, content/meta/architecture.md §wiki links) —
    // and a fence is where a note carries site-render directives naming files casting is not
    // meant to ship. `galaxy-collection-semantics` is the case: its ```vendored-myst block
    // names the rendered upstream view, which is a site asset by design.
    //
    // INLINE code is deliberately still scanned. Every filename in this corpus is written in
    // backticks, so exempting inline code would retire the check rather than narrow it.
    const body = stripFencedBlocks(readFileSync(dstAbs, "utf8"));
    const bundleDir = path.dirname(dstAbs);

    for (const neighbour of listFilesUnder(srcDir, srcDir)) {
      if (neighbour === "index.md") continue; // the note itself
      // Cited by name, not merely a substring of some longer token.
      const cited = new RegExp(`(?<![A-Za-z0-9._/-])${escapeRegExp(neighbour)}(?![A-Za-z0-9_-])`);
      if (!cited.test(body)) continue;
      if (existsSync(path.join(bundleDir, neighbour))) continue;
      errors.push(
        `ref ${r.src}: bundled note ${r.dst} tells the agent to read '${neighbour}', which is beside the note in the Foundry but not in the bundle (declare it in the note's 'companions:' frontmatter, or stop naming it in the body)`,
      );
    }
  }

  // Companions that never travel — `eval.md` and the rest — must not be inside the bundle.
  //
  // Read from the kind declarations, not from the target: a disposition is a fact about the kind
  // ("this stays in the Foundry"), so a per-target list could only restate it, and the one that
  // used to live in `_target.yml` named two of the eight.
  //
  // A file some ref CLAIMS is exempt. Provenance is the record of what went through the ref
  // manifest, which already applied the owning note's own disposition rules; a research note whose
  // vendored sidecar happens to be called `README.md` is shipping its own file, not a mold's.
  // Without the exemption this check would reject it on the strength of a basename collision.
  const claimed = (prov.refs ?? []).map((r) => r.dst);
  for (const companion of NEVER_PACKAGED) {
    const matches = walkAndFind(bundleRoot, companion.name, companion.directory).filter((abs) => {
      const rel = path.relative(bundleRoot, abs).split(path.sep).join("/");
      return !claimed.some((dst) => dst === rel || dst.startsWith(`${rel}/`));
    });
    if (!matches.length) continue;
    errors.push(
      `forbidden file packaged: ${matches.join(", ")} — '${companion.file}' is declared ` +
        `${companion.disposition} by kind ${companion.declaredBy.join(", ")}`,
    );
  }

  if (errors.length) {
    for (const e of errors) console.error(`error: ${e}`);
    console.error(`verify failed: ${errors.length} error(s)`);
    process.exit(1);
  }
  console.log(`verify clean: ${(prov.refs ?? []).length} ref(s)`);
}

/**
 * Every entry named `basename` anywhere under `root`.
 *
 * `directory` selects which kind of entry counts. A declared companion is one or the other —
 * `refinements/` is a directory and `refinement.md` is a file — and a name matching the wrong
 * type is not that companion.
 */
function walkAndFind(root: string, basename: string, directory = false): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) stack.push(full);
      if (e === basename && st.isDirectory() === directory) out.push(full);
    }
  }
  return out;
}

function fail(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(2);
}

main();
