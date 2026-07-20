// Regenerate planemo CLI manual pages from `planemo cli_metadata --command NAME`.
//
// Usage:
//   tsx scripts/sync-planemo-cli.ts [--check] [--planemo-bin PATH] [command ...]
//
// With no command args, syncs the canonical seed set (commands referenced by
// existing Molds + the ones that close the convergence-loop gate). Pass one or
// more command names (`lint`, `test`, `workflow_test_init`, …) to scope.
//
// --check: exit non-zero if any file would change; do not write.
//
// Each output lives at content/cli/planemo/planemo-<command>.md, with
// hand-edited Examples / Gotchas sections preserved across regen via HTML
// comment markers. The slug is prefixed `planemo-` so cross-Mold wiki-links
// stay unambiguous (`[[planemo-lint]]`); the suffix preserves planemo's
// underscore-bearing CLI names verbatim (`workflow_test_init`, not
// `workflow-test-init`).

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const OUTPUT_DIR = path.join(REPO_ROOT, "content/cli/planemo");

const SEED_COMMANDS = [
  "lint",
  "test",
  "workflow_test_init",
  "workflow_test_on_invocation",
  "cli_metadata",
  "output_schema",
];

const PIN = {
  repo: "galaxyproject/planemo",
  ref: "0.75.45",
};

const AUTO_BEGIN = "<!-- planemo-cli-meta: BEGIN auto-generated -->";
const AUTO_END = "<!-- planemo-cli-meta: END auto-generated -->";

interface ClickParam {
  name: string;
  human_readable_name?: string | null;
  kind: "option" | "argument";
  opts: string[];
  secondary_opts: string[];
  type: { name: string; [k: string]: unknown } | string | null;
  is_flag: boolean;
  multiple: boolean;
  nargs: number;
  default: unknown;
  envvar: string | null;
  required: boolean;
  help: string | null;
  hidden?: boolean;
}

interface CliMetadata {
  name: string;
  module: string;
  usage: string;
  help: string | null;
  short_help: string | null;
  params: ClickParam[];
  hidden?: boolean;
  internal?: boolean;
}

interface Options {
  check: boolean;
  planemoBin: string;
  commands: string[];
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    check: false,
    planemoBin: process.env.PLANEMO_BIN ?? "planemo",
    commands: [],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--check") {
      opts.check = true;
    } else if (arg === "--planemo-bin") {
      const next = argv[++i];
      if (!next) usage(2);
      opts.planemoBin = next;
    } else if (arg === "-h" || arg === "--help") {
      usage(0);
    } else if (arg.startsWith("--")) {
      process.stderr.write(`unknown option: ${arg}\n`);
      usage(2);
    } else {
      opts.commands.push(arg);
    }
  }
  if (opts.commands.length === 0) opts.commands = SEED_COMMANDS;
  return opts;
}

function usage(exitCode: number): never {
  const out = exitCode === 0 ? process.stdout : process.stderr;
  out.write(
    "usage: tsx scripts/sync-planemo-cli.ts [--check] [--planemo-bin PATH] [command ...]\n",
  );
  process.exit(exitCode);
}

function fetchCliMetadata(bin: string, command: string): CliMetadata {
  let stdout: string;
  try {
    stdout = execFileSync(bin, ["cli_metadata", "--command", command], { encoding: "utf8" });
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: string };
    if (e.code === "ENOENT") {
      throw new Error(
        `failed to invoke '${bin}': not found. Install pinned planemo:\n` +
          `  uvx --from planemo==${PIN.ref} planemo --version`,
      );
    }
    const msg = e.stderr || e.message;
    throw new Error(`'${bin} cli_metadata --command ${command}' failed: ${msg}`);
  }
  return JSON.parse(stdout) as CliMetadata;
}

function paramDisplay(p: ClickParam): string {
  if (p.kind === "argument") {
    return p.human_readable_name || p.name.toUpperCase();
  }
  const labels = [...p.opts, ...p.secondary_opts];
  return labels.join(", ");
}

function paramType(p: ClickParam): string {
  if (p.is_flag) return "flag";
  if (p.type && typeof p.type === "object") return p.type.name;
  return typeof p.type === "string" ? p.type : "—";
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function paramDefault(p: ClickParam): string {
  if (p.default === null || p.default === undefined) return "—";
  if (typeof p.default === "string") {
    if (p.default === "Sentinel.UNSET" || p.default === "") return "—";
    return p.default;
  }
  return JSON.stringify(p.default);
}

function renderOptionsTable(params: ClickParam[]): string {
  const visible = params.filter((p) => !p.hidden && p.kind === "option");
  if (visible.length === 0) return "_No options._";
  const header = "| Option | Type | Default | Required | Help |";
  const sep = "|---|---|---|---|---|";
  const rows = visible.map((p) => {
    return [
      escapeCell(paramDisplay(p)),
      escapeCell(paramType(p)),
      escapeCell(paramDefault(p)),
      p.required ? "yes" : "—",
      escapeCell(p.help ?? "—"),
    ].join(" | ");
  });
  return [header, sep, ...rows.map((r) => `| ${r} |`)].join("\n");
}

function renderArgumentsTable(params: ClickParam[]): string {
  const args = params.filter((p) => !p.hidden && p.kind === "argument");
  if (args.length === 0) return "";
  const lines = ["", "## Arguments", "", "| Argument | Type | Required | Help |", "|---|---|---|---|"];
  for (const p of args) {
    lines.push(
      `| ${escapeCell(paramDisplay(p))} | ${escapeCell(paramType(p))} | ${p.required ? "yes" : "—"} | ${escapeCell(p.help ?? "—")} |`,
    );
  }
  return lines.join("\n") + "\n";
}

function escapeYamlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function renderFrontmatter(meta: CliMetadata, summary: string): string {
  const lines = [
    "---",
    "type: cli-command",
    "tool: planemo",
    `command: ${meta.name}`,
    'package: "planemo"',
    `upstream: "https://github.com/galaxyproject/planemo/blob/${PIN.ref}/${meta.module.replace(/\./g, "/")}.py"`,
    "tags:",
    "  - cli-command",
    "  - cli/planemo",
    "status: draft",
    "created: 2026-05-11",
    "revised: 2026-05-11",
    "revision: 1",
    "ai_generated: true",
    `summary: "${escapeYamlString(summary)}"`,
    "---",
  ];
  return lines.join("\n");
}

function deriveSummary(meta: CliMetadata): string {
  const raw = meta.short_help || (meta.help ?? "").split(/\r?\n\r?\n/)[0] || `${meta.name} CLI command.`;
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 155) return trimmed;
  return trimmed.slice(0, 152) + "...";
}

function renderAutoBlock(meta: CliMetadata): string {
  const headline = (meta.help ?? "").trim().split(/\r?\n\r?\n/)[0] ?? "";
  const synopsis = "```text\nplanemo " + meta.usage.trim() + "\n```";
  const parts = [
    AUTO_BEGIN,
    "",
    `# \`planemo ${meta.name}\``,
    "",
    headline || `Reference for the \`planemo ${meta.name}\` subcommand.`,
    "",
    "## Synopsis",
    "",
    synopsis,
    "",
    renderArgumentsTable(meta.params),
    "## Options",
    "",
    renderOptionsTable(meta.params),
    "",
    AUTO_END,
  ];
  return parts.join("\n");
}

const MANUAL_TEMPLATE = `
## Output

<!-- Hand-edited. Preserved across \`tsx scripts/sync-planemo-cli.ts\`. -->

_Describe stdout/stderr shape, exit-code contract, and any JSON-report flags here._

## Examples

<!-- Hand-edited. Preserved across \`tsx scripts/sync-planemo-cli.ts\`. -->

_Add canonical invocations here._

## Gotchas

<!-- Hand-edited. Preserved across \`tsx scripts/sync-planemo-cli.ts\`. -->

_Document non-obvious behavior and common failure modes here._
`;

function renderFile(meta: CliMetadata, existing: string | null): string {
  const summary = deriveSummary(meta);
  const fm = renderFrontmatter(meta, summary);
  const auto = renderAutoBlock(meta);
  let manual = MANUAL_TEMPLATE;
  if (existing) {
    const endIdx = existing.indexOf(AUTO_END);
    if (endIdx >= 0) {
      manual = existing.slice(endIdx + AUTO_END.length);
    }
  }
  if (!manual.startsWith("\n")) manual = "\n" + manual;
  const body = `${fm}\n\n${auto}${manual}`;
  return body.endsWith("\n") ? body : body + "\n";
}

function pageFor(command: string): string {
  return path.join(OUTPUT_DIR, `planemo-${command}.md`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  mkdirSync(OUTPUT_DIR, { recursive: true });
  let drift = 0;
  for (const command of opts.commands) {
    const meta = fetchCliMetadata(opts.planemoBin, command);
    if (meta.name !== command) {
      process.stderr.write(`warning: requested '${command}' but planemo returned '${meta.name}'\n`);
    }
    const target = pageFor(meta.name);
    const existing = existsSync(target) ? readFileSync(target, "utf8") : null;
    const next = renderFile(meta, existing);
    if (existing === next) {
      process.stdout.write(`${path.relative(REPO_ROOT, target)}: up to date\n`);
      continue;
    }
    if (opts.check) {
      process.stderr.write(`${path.relative(REPO_ROOT, target)}: drift\n`);
      drift += 1;
      continue;
    }
    writeFileSync(target, next);
    process.stdout.write(`${path.relative(REPO_ROOT, target)}: ${existing === null ? "created" : "updated"}\n`);
  }
  if (opts.check && drift > 0) {
    process.stderr.write(`\n${drift} planemo CLI page(s) out of date. Run without --check to regenerate.\n`);
    process.exit(1);
  }
}

main();
