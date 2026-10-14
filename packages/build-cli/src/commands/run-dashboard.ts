// `foundry-build run-dashboard <run-dir>` — read a conversion run and render it.
//
// Writes two files: `run-manifest.json`, the normalized model, and `dashboard.html`, one
// self-contained page over it. Both are uncommitted output in a user's run directory, so unlike
// every other generator in this CLI there is deliberately no `--check` drift gate: there is
// nothing committed for them to drift against.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";

import { requireRuntimeArtifactRegistry } from "@galaxy-foundry/gxwf-foundry-note-schema";

import { foundryHead } from "../lib/foundry-head.js";
import { readOption } from "../lib/cli-args.js";
import { errorMessage } from "../lib/errors.js";
import { createSiteLinker, DEFAULT_SITE_BASE } from "../lib/run-links.js";
import {
  isTestPipelineRunDir,
  runModelFromTestPipeline,
} from "../lib/run-adapter-test-pipeline.js";
import { buildRunModel, RunRecordMissingError, serializeRunManifest } from "../lib/run-manifest.js";
import type { RunShape } from "../lib/run-model.js";
import type { GitExec } from "../lib/run-git.js";
import { PipelineUndeterminedError, type PipelineIndex } from "../lib/run-reconstruct.js";
import { renderRunDashboard, GENERATOR_MARKER } from "../render/run-dashboard-html.js";

const MANIFEST_FILE = "run-manifest.json";
const DASHBOARD_FILE = "dashboard.html";

export interface RunDashboardArgs {
  runDir: string;
  root: string;
  pipeline: string | null;
  out: string | null;
  manifestOnly: boolean;
  htmlOnly: boolean;
  reconstruct: boolean;
  siteBase: string;
  maxEmbedBytes: number | null;
  maxHashBytes: number | null;
  embedBudget: number | null;
  deepDirs: boolean;
  force: boolean;
  json: boolean;
  trial: number | null;
}

function parsePositiveInt(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

export function parseRunDashboardArgs(argv: string[]): RunDashboardArgs {
  const positional: string[] = [];
  const args: RunDashboardArgs = {
    runDir: "",
    root: ".",
    pipeline: null,
    out: null,
    manifestOnly: false,
    htmlOnly: false,
    reconstruct: false,
    siteBase: process.env.FOUNDRY_SITE_BASE ?? DEFAULT_SITE_BASE,
    maxEmbedBytes: null,
    maxHashBytes: null,
    embedBudget: null,
    deepDirs: false,
    force: false,
    json: false,
    trial: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const value = argv[i]!;
    if (value === "--manifest-only") {
      args.manifestOnly = true;
      continue;
    }
    if (value === "--html-only") {
      args.htmlOnly = true;
      continue;
    }
    if (value === "--reconstruct") {
      args.reconstruct = true;
      continue;
    }
    if (value === "--deep-dirs") {
      args.deepDirs = true;
      continue;
    }
    if (value === "--force") {
      args.force = true;
      continue;
    }
    if (value === "--json") {
      args.json = true;
      continue;
    }
    if (value === "--offline") {
      args.siteBase = "";
      continue;
    }
    let option = readOption(argv, i, "--root");
    if (option) {
      args.root = option.value;
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--pipeline");
    if (option) {
      args.pipeline = option.value;
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--out");
    if (option) {
      args.out = option.value;
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--site-base");
    if (option) {
      args.siteBase = option.value;
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--trial");
    if (option) {
      args.trial = parsePositiveInt(option.value, "--trial");
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--max-embed-bytes");
    if (option) {
      args.maxEmbedBytes = parsePositiveInt(option.value, "--max-embed-bytes");
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--max-hash-bytes");
    if (option) {
      args.maxHashBytes = parsePositiveInt(option.value, "--max-hash-bytes");
      i = option.lastIndex;
      continue;
    }
    option = readOption(argv, i, "--embed-budget");
    if (option) {
      args.embedBudget = parsePositiveInt(option.value, "--embed-budget");
      i = option.lastIndex;
      continue;
    }
    if (value.startsWith("--")) throw new Error(`unknown flag: ${value}`);
    positional.push(value);
  }

  if (positional.length !== 1) {
    throw new Error("usage: foundry-build run-dashboard <run-dir> [options]");
  }
  if (args.manifestOnly && args.htmlOnly) {
    throw new Error("--manifest-only and --html-only together would write nothing; pass one");
  }
  args.runDir = positional[0]!;
  return args;
}

/** Flags that are valid but mean nothing for this invocation, named so the user is not misled. */
export function runDashboardFlagWarnings(args: RunDashboardArgs, shape: RunShape): string[] {
  const warnings: string[] = [];
  const ignored = (flags: Array<[string, boolean]>, why: string): void => {
    const named = flags.filter(([, given]) => given).map(([flag]) => flag);
    if (named.length) warnings.push(`ignoring ${named.join(", ")}: ${why}`);
  };
  if (args.json) {
    ignored(
      [
        ["--out", args.out !== null],
        ["--force", args.force],
        ["--manifest-only", args.manifestOnly],
        ["--html-only", args.htmlOnly],
      ],
      "--json writes the manifest to stdout and no files",
    );
  }
  if (shape === "harness") {
    ignored([["--trial", args.trial !== null]], "only a test-pipeline run has trials");
  } else {
    ignored(
      [
        ["--pipeline", args.pipeline !== null],
        ["--reconstruct", args.reconstruct],
        ["--max-embed-bytes", args.maxEmbedBytes !== null],
        ["--max-hash-bytes", args.maxHashBytes !== null],
        ["--embed-budget", args.embedBudget !== null],
        ["--deep-dirs", args.deepDirs],
      ],
      "a test-pipeline run records its own pipeline and is not scanned",
    );
  }
  return warnings;
}

function packageVersion(repoRoot: string): string {
  const file = path.join(repoRoot, "packages", "build-cli", "package.json");
  if (!existsSync(file)) return "0.0.0";
  try {
    return (JSON.parse(readFileSync(file, "utf8")) as { version?: string }).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** Relative to `cwd` when inside it; absolute when a relative path would have to climb out. */
function displayPath(target: string, cwd: string): string {
  const rel = path.relative(cwd, target);
  if (!rel) return ".";
  return rel.startsWith("..") || path.isAbsolute(rel) ? target : rel;
}

/**
 * The invocation as the page's footer shows it.
 *
 * The page is meant to be shared, so absolute paths are shown relative to the working directory or
 * under `~` rather than spelling out a home directory.
 */
function footerCommandLine(argv: string[], cwd: string, home: string): string {
  const shown = (value: string): string => {
    if (!path.isAbsolute(value)) return value;
    const display = displayPath(value, cwd);
    if (!path.isAbsolute(display)) return display;
    const underHome = path.relative(home, display);
    return underHome && !underHome.startsWith("..") && !path.isAbsolute(underHome)
      ? `~/${underHome.split(path.sep).join("/")}`
      : display;
  };
  const tokens = argv.map((token) => {
    const inline = /^(--[^=]+)=(.*)$/.exec(token);
    return inline ? `${inline[1]}=${shown(inline[2]!)}` : shown(token);
  });
  return ["foundry-build", "run-dashboard", ...tokens].join(" ");
}

/**
 * Refuse to clobber a file this command did not write.
 *
 * A run directory belongs to the user, and `dashboard.html` is a plausible name for something they
 * put there themselves. Every file this command writes carries a marker; anything without one is
 * left alone unless `--force` says otherwise. Returns the refusal, or null.
 */
function guardOutput(file: string, marker: string, force: boolean): string | null {
  if (!existsSync(file) || force) return null;
  if (readFileSync(file, "utf8").includes(marker)) return null;
  return `${file} exists and was not written by run-dashboard; pass --force to overwrite it or --out to write elsewhere`;
}

export interface RunDashboardDeps {
  cwd: string;
  home: string;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  pipelineIndex?: PipelineIndex;
  gitExec?: GitExec;
  now?: () => Date;
}

/**
 * The command, returning its exit code: 0 written, 1 failed, 2 bad arguments or a refused
 * overwrite, 3 a pipeline that cannot be determined or a missing run record.
 */
export function runDashboard(argv: string[], deps: Partial<RunDashboardDeps> = {}): number {
  const cwd = deps.cwd ?? process.cwd();
  const home = deps.home ?? homedir();
  const stdout = deps.stdout ?? ((text: string) => process.stdout.write(text));
  const stderr = deps.stderr ?? ((text: string) => process.stderr.write(text));

  let args: RunDashboardArgs;
  try {
    args = parseRunDashboardArgs(argv);
  } catch (error) {
    stderr(`${errorMessage(error)}\n`);
    return 2;
  }

  const repoRoot = path.resolve(cwd, args.root);
  const runDir = path.resolve(cwd, args.runDir);
  const outDir = path.resolve(cwd, args.out ?? runDir);
  const manifestFile = path.join(outDir, MANIFEST_FILE);
  const dashboardFile = path.join(outDir, DASHBOARD_FILE);

  // Both outputs are checked before either is written, so a refusal leaves the directory as found.
  if (!args.json) {
    const refusals = [
      args.htmlOnly ? null : guardOutput(manifestFile, '"command": "run-dashboard"', args.force),
      args.manifestOnly ? null : guardOutput(dashboardFile, GENERATOR_MARKER, args.force),
    ].filter((refusal): refusal is string => refusal !== null);
    if (refusals.length) {
      for (const refusal of refusals) stderr(`${refusal}\n`);
      return 2;
    }
  }

  const linker = createSiteLinker({ repoRoot, base: args.siteBase });
  let model;
  try {
    const runtimeArtifacts = requireRuntimeArtifactRegistry(
      path.join(repoRoot, "runtime_artifacts.yml"),
    );
    const packageVersionValue = packageVersion(repoRoot);
    const foundryHeadValue = foundryHead(repoRoot);
    // The two run shapes never collide: an evaluation run carries `run.json` and no run record,
    // and a harness run carries the record and no `run.json`.
    const testPipeline = isTestPipelineRunDir(runDir);
    for (const warning of runDashboardFlagWarnings(
      args,
      testPipeline ? "test-pipeline" : "harness",
    )) {
      stderr(`warn: ${warning}\n`);
    }
    model = testPipeline
      ? runModelFromTestPipeline({
          runDir,
          repoRoot,
          trial: args.trial ?? undefined,
          runtimeArtifacts,
          linker,
          pipelineIndex: deps.pipelineIndex,
          now: deps.now,
          packageVersion: packageVersionValue,
          foundryHead: foundryHeadValue,
        })
      : buildRunModel({
          runDir,
          repoRoot,
          pipeline: args.pipeline ?? undefined,
          reconstruct: args.reconstruct,
          runtimeArtifacts,
          linker,
          pipelineIndex: deps.pipelineIndex,
          gitExec: deps.gitExec,
          now: deps.now,
          scan: {
            ...(args.maxEmbedBytes !== null ? { maxEmbedBytes: args.maxEmbedBytes } : {}),
            ...(args.maxHashBytes !== null ? { maxHashBytes: args.maxHashBytes } : {}),
            ...(args.embedBudget !== null ? { totalEmbedBudget: args.embedBudget } : {}),
            deepDirs: args.deepDirs,
          },
          packageVersion: packageVersionValue,
          foundryHead: foundryHeadValue,
        });
  } catch (error) {
    if (error instanceof PipelineUndeterminedError || error instanceof RunRecordMissingError) {
      stderr(`${error.message}\n`);
      return 3;
    }
    stderr(`${errorMessage(error)}\n`);
    return 1;
  }

  const manifest = serializeRunManifest(model);

  if (args.json) {
    stdout(manifest);
    return model.health.overall === "error" ? 1 : 0;
  }

  const written: string[] = [];
  try {
    mkdirSync(outDir, { recursive: true });
    if (!args.htmlOnly) {
      writeFileSync(manifestFile, manifest);
      written.push(MANIFEST_FILE);
    }
    if (!args.manifestOnly) {
      writeFileSync(
        dashboardFile,
        renderRunDashboard(model, {
          manifestJson: manifest,
          commandLine: footerCommandLine(argv, cwd, home),
          linker,
          runDir,
          outDir,
        }),
      );
      written.push(DASHBOARD_FILE);
    }
  } catch (error) {
    stderr(`${errorMessage(error)}\n`);
    return 1;
  }

  stdout(
    `${model.run.slug}: ${model.run.pipeline} (${model.run.provenance}) — ` +
      `${model.health.artifacts_present}/${model.health.artifacts_expected} artifacts, ` +
      `phase ${model.health.furthest_phase}/${model.health.total_phases}\n`,
  );
  for (const warning of model.warnings) {
    stdout(`  warn: ${warning.message}\n`);
  }
  stdout(`wrote ${written.join(", ")} in ${displayPath(outDir, cwd)}\n`);
  return 0;
}

export function runRunDashboardCommand(argv = process.argv.slice(2)): void {
  process.exitCode = runDashboard(argv);
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) runRunDashboardCommand();
