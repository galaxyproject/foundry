#!/usr/bin/env tsx
// Process-based artifact validator runner. Exit code is the contract; stdout and
// stderr are captured as diagnostic evidence without requiring a JSON shape.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { VerifyManifest, VerifyManifestEntry } from "./cast-mold.js";

interface Args {
  artifactId: string;
  artifactPath: string;
  verifyPath: string;
  provenancePath?: string;
  root: string | null;
}

export interface ProcessValidationResult {
  artifact_id: string;
  path: string;
  validator_bin: string;
  status: "passed" | "failed" | "error";
  exit_code: number | null;
  artifact_hash?: string;
  stdout: string;
  stderr: string;
  stdout_hash: string;
  stderr_hash: string;
  error?: string;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  let verifyPath = "_verify.json";
  let provenancePath: string | undefined;
  let root: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--verify=")) verifyPath = a.slice("--verify=".length);
    else if (a === "--verify") verifyPath = argv[++i] ?? verifyPath;
    else if (a.startsWith("--provenance=")) provenancePath = a.slice("--provenance=".length);
    else if (a === "--provenance") provenancePath = argv[++i];
    else if (a.startsWith("--root=")) root = a.slice("--root=".length);
    else if (a === "--root") root = argv[++i] ?? ".";
    else if (!a.startsWith("--")) positional.push(a);
    else throw new Error(`unknown flag: ${a}`);
  }
  if (positional.length !== 2) {
    throw new Error(
      "usage: foundry-build validate-artifact <artifact-id> <path> [--verify _verify.json] [--provenance _provenance.json]",
    );
  }
  return {
    artifactId: positional[0]!,
    artifactPath: positional[1]!,
    verifyPath,
    provenancePath,
    root,
  };
}

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function loadVerifyEntry(verifyPath: string, artifactId: string): VerifyManifestEntry {
  const manifest = JSON.parse(readFileSync(verifyPath, "utf8")) as VerifyManifest;
  if (manifest.verify_schema_version !== 1 || !Array.isArray(manifest.entries)) {
    throw new Error(`${verifyPath}: invalid verify manifest`);
  }
  const entry = manifest.entries.find((candidate) => candidate.artifact_id === artifactId);
  if (!entry) throw new Error(`${verifyPath}: no validator for artifact id '${artifactId}'`);
  return entry;
}

function withArtifactPath(args: string[], artifactPath: string): string[] {
  return args.length
    ? args.map((arg) => arg.replaceAll("{artifact_path}", artifactPath))
    : [artifactPath];
}

export function runProcessValidation(
  entry: VerifyManifestEntry,
  artifactPath: string,
  cwd = process.cwd(),
): ProcessValidationResult {
  const artifact_hash = existsSync(artifactPath) ? sha256File(artifactPath) : undefined;
  const result = spawnSync(entry.validator_bin, withArtifactPath(entry.args, artifactPath), {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const exitCode = typeof result.status === "number" ? result.status : null;
  const status = result.error ? "error" : exitCode === 0 ? "passed" : "failed";
  return {
    artifact_id: entry.artifact_id,
    path: artifactPath,
    validator_bin: entry.validator_bin,
    status,
    exit_code: exitCode,
    artifact_hash,
    stdout,
    stderr,
    stdout_hash: sha256Text(stdout),
    stderr_hash: sha256Text(stderr),
    error: result.error?.message,
  };
}

function recordProvenanceValidation(
  provenancePath: string,
  validation: ProcessValidationResult,
): void {
  const provenance = JSON.parse(readFileSync(provenancePath, "utf8")) as Record<string, unknown>;
  const existing = Array.isArray(provenance.validation_results)
    ? (provenance.validation_results as ProcessValidationResult[])
    : [];
  provenance.validation_results = [
    ...existing.filter(
      (entry) =>
        entry.artifact_id !== validation.artifact_id ||
        entry.path !== validation.path ||
        entry.validator_bin !== validation.validator_bin,
    ),
    validation,
  ];
  writeFileSync(provenancePath, JSON.stringify(provenance, null, 2) + "\n");
}

function displayPath(filePath: string, cwd: string): string {
  const abs = path.resolve(filePath);
  const rel = path.relative(cwd, abs);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? rel : filePath;
}

export function runValidateArtifactCommand(argv = process.argv.slice(2)): void {
  const args = parseArgs(argv);
  if (args.root) process.chdir(args.root);
  const verifyPath = path.resolve(args.verifyPath);
  const artifactPath = args.artifactPath;
  const entry = loadVerifyEntry(verifyPath, args.artifactId);
  const validation = runProcessValidation(entry, artifactPath);
  validation.path = displayPath(artifactPath, process.cwd());
  if (args.provenancePath)
    recordProvenanceValidation(path.resolve(args.provenancePath), validation);
  if (validation.stdout) process.stdout.write(validation.stdout);
  if (validation.stderr) process.stderr.write(validation.stderr);
  if (validation.error) process.stderr.write(`${validation.error}\n`);
  process.exit(validation.status === "passed" ? 0 : 1);
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) {
  try {
    runValidateArtifactCommand();
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
