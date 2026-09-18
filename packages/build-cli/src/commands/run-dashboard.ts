// `foundry-build run-dashboard <run-dir>` — read a conversion run and render it.
//
// Writes two files: `run-manifest.json`, the normalized model, and `dashboard.html`, one
// self-contained page over it. Both are uncommitted output in a user's run directory, so unlike
// every other generator in this CLI there is deliberately no `--check` drift gate: there is
// nothing committed for them to drift against.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { requireRuntimeArtifactRegistry } from "@galaxy-foundry/gxwf-foundry-note-schema";

import { readOption } from "../lib/cli-args.js";
import { errorMessage } from "../lib/errors.js";
import { createSiteLinker, DEFAULT_SITE_BASE } from "../lib/run-links.js";
import {
  isTestPipelineRunDir,
  runModelFromTestPipeline,
} from "../lib/run-adapter-test-pipeline.js";
import { buildRunModel, RunRecordMissingError, serializeRunManifest } from "../lib/run-manifest.js";
import { PipelineUndeterminedError } from "../lib/run-reconstruct.js";
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
  args.runDir = positional[0]!;
  return args;
}

function foundryHead(repoRoot: string): string | null {
  const headFile = path.join(repoRoot, ".git", "HEAD");
  if (!existsSync(headFile)) return null;
  try {
    const head = readFileSync(headFile, "utf8").trim();
    if (!head.startsWith("ref:")) return head;
    const refPath = path.join(repoRoot, ".git", head.slice(4).trim());
    return existsSync(refPath) ? readFileSync(refPath, "utf8").trim() : null;
  } catch {
    return null;
  }
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

/**
 * Refuse to clobber a file this command did not write.
 *
 * A run directory belongs to the user, and `dashboard.html` is a plausible name for something they
 * put there themselves. Every file this command writes carries a marker; anything without one is
 * left alone unless `--force` says otherwise.
 */
function guardOutput(file: string, marker: string, force: boolean): void {
  if (!existsSync(file) || force) return;
  const existing = readFileSync(file, "utf8");
  if (existing.includes(marker)) return;
  throw new Error(
    `${file} exists and was not written by run-dashboard; pass --force to overwrite it or --out to write elsewhere`,
  );
}

export function runRunDashboardCommand(argv = process.argv.slice(2)): void {
  let args: RunDashboardArgs;
  try {
    args = parseRunDashboardArgs(argv);
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exit(2);
  }

  const repoRoot = path.resolve(args!.root);
  const runDir = path.resolve(args!.runDir);
  const outDir = path.resolve(args!.out ?? runDir);

  const runtimeArtifacts = requireRuntimeArtifactRegistry(
    path.join(repoRoot, "runtime_artifacts.yml"),
  );

  const linker = createSiteLinker({ repoRoot, base: args!.siteBase });
  const packageVersionValue = packageVersion(repoRoot);
  const foundryHeadValue = foundryHead(repoRoot);

  let model;
  try {
    // The two run shapes never collide: an evaluation run carries `run.json` and no run record,
    // and a harness run carries the record and no `run.json`.
    model = isTestPipelineRunDir(runDir)
      ? runModelFromTestPipeline({
          runDir,
          repoRoot,
          trial: args!.trial ?? undefined,
          runtimeArtifacts,
          linker,
          packageVersion: packageVersionValue,
          foundryHead: foundryHeadValue,
        })
      : buildRunModel({
          runDir,
          repoRoot,
          pipeline: args!.pipeline ?? undefined,
          reconstruct: args!.reconstruct,
          runtimeArtifacts,
          linker,
          scan: {
            ...(args!.maxEmbedBytes !== null ? { maxEmbedBytes: args!.maxEmbedBytes } : {}),
            ...(args!.maxHashBytes !== null ? { maxHashBytes: args!.maxHashBytes } : {}),
            ...(args!.embedBudget !== null ? { totalEmbedBudget: args!.embedBudget } : {}),
            deepDirs: args!.deepDirs,
          },
          packageVersion: packageVersionValue,
          foundryHead: foundryHeadValue,
        });
  } catch (error) {
    if (error instanceof PipelineUndeterminedError || error instanceof RunRecordMissingError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(3);
    }
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exit(1);
  }

  const manifest = serializeRunManifest(model!);

  if (args!.json) {
    process.stdout.write(manifest);
    if (model!.health.overall === "error") process.exitCode = 1;
    return;
  }

  mkdirSync(outDir, { recursive: true });
  const written: string[] = [];

  if (!args!.htmlOnly) {
    const file = path.join(outDir, MANIFEST_FILE);
    guardOutput(file, '"command": "run-dashboard"', args!.force);
    writeFileSync(file, manifest);
    written.push(MANIFEST_FILE);
  }

  if (!args!.manifestOnly) {
    const file = path.join(outDir, DASHBOARD_FILE);
    guardOutput(file, GENERATOR_MARKER, args!.force);
    writeFileSync(
      file,
      renderRunDashboard(model!, {
        siteBase: args!.siteBase,
        manifestJson: manifest,
        commandLine: `foundry-build run-dashboard ${argv.join(" ")}`,
      }),
    );
    written.push(DASHBOARD_FILE);
  }

  const relOut = path.relative(process.cwd(), outDir) || ".";
  process.stdout.write(
    `${model!.run.slug}: ${model!.run.pipeline} (${model!.run.provenance}) — ` +
      `${model!.health.artifacts_present}/${model!.health.artifacts_expected} artifacts, ` +
      `phase ${model!.health.furthest_phase}/${model!.health.total_phases}\n`,
  );
  for (const warning of model!.warnings) {
    process.stdout.write(`  warn: ${warning.message}\n`);
  }
  process.stdout.write(`wrote ${written.join(", ")} in ${relOut}\n`);
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) runRunDashboardCommand();
