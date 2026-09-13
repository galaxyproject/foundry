// Maps committed artifact fixtures to the validators their casts declare.
//
// `make check` gates the corpus, the casts, and the generated notes; nothing
// gated the example artifacts committed beside a Mold. A fixture is a claim —
// "this is what that Mold emits" — and an unchecked claim is how a scenario ends
// up bound to evidence that cannot support it. The mapping needed to check them
// is already in the repo: every `_verify.json` entry carries the artifact's
// `default_filename` next to the `validator_bin` and `args` that validate it.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Package fixtures belong to their own unit tests, and those legitimately
// include deliberately invalid inputs.
export const EXCLUDED_PREFIXES = ["packages/"];

export interface ValidatorSpec {
  artifactId: string;
  bin: string;
  args: string[];
  declaredBy: string[];
}

interface VerifyEntry {
  artifact_id?: string;
  default_filename?: string;
  validator_bin?: string;
  args?: string[];
}

export function castVerifyManifests(repoRoot: string): string[] {
  const out: string[] = [];
  const castsRoot = path.join(repoRoot, "casts");
  if (!fs.existsSync(castsRoot)) return out;
  for (const target of fs.readdirSync(castsRoot)) {
    const skills = path.join(castsRoot, target, "skills");
    if (!fs.existsSync(skills)) continue;
    for (const slug of fs.readdirSync(skills)) {
      const verify = path.join(skills, slug, "_verify.json");
      if (fs.existsSync(verify)) out.push(verify);
    }
  }
  return out.sort();
}

// One filename maps to one command. Two Molds declaring the same artifact must
// agree on how it is validated; disagreement is a corpus bug, not something to
// resolve by picking a winner here.
export function buildValidatorRegistry(repoRoot: string): Map<string, ValidatorSpec> {
  const registry = new Map<string, ValidatorSpec>();
  for (const verifyPath of castVerifyManifests(repoRoot)) {
    const rel = path.relative(repoRoot, verifyPath);
    const parsed = JSON.parse(fs.readFileSync(verifyPath, "utf-8")) as { entries?: VerifyEntry[] };
    for (const entry of parsed.entries ?? []) {
      if (!entry.validator_bin || !entry.default_filename) continue;
      const spec: ValidatorSpec = {
        artifactId: entry.artifact_id ?? entry.default_filename,
        bin: entry.validator_bin,
        args: entry.args ?? [],
        declaredBy: [rel],
      };
      const existing = registry.get(entry.default_filename);
      if (!existing) {
        registry.set(entry.default_filename, spec);
        continue;
      }
      const same =
        existing.bin === spec.bin && JSON.stringify(existing.args) === JSON.stringify(spec.args);
      if (!same) {
        throw new Error(
          `${entry.default_filename} is declared with conflicting validators:\n` +
            `  ${existing.declaredBy[0]}: ${existing.bin} ${existing.args.join(" ")}\n` +
            `  ${rel}: ${spec.bin} ${spec.args.join(" ")}`,
        );
      }
      existing.declaredBy.push(rel);
    }
  }
  return registry;
}

// A cast names its validator the way a runtime sees it — a bare bin on PATH.
// In-repo there is no installed bin, so resolve it back to the workspace source
// and run it through tsx, the way every other repo script runs.
export function resolveValidatorSource(repoRoot: string, bin: string): string {
  const packagesRoot = path.join(repoRoot, "packages");
  if (!fs.existsSync(packagesRoot)) throw new Error(`No packages/ directory under ${repoRoot}`);
  for (const pkg of fs.readdirSync(packagesRoot)) {
    const manifest = path.join(packagesRoot, pkg, "package.json");
    if (!fs.existsSync(manifest)) continue;
    const declared = (JSON.parse(fs.readFileSync(manifest, "utf-8")) as { bin?: unknown }).bin;
    const target =
      typeof declared === "string"
        ? pkg === bin
          ? declared
          : undefined
        : declared && typeof declared === "object"
          ? (declared as Record<string, string>)[bin]
          : undefined;
    if (!target) continue;
    const source = path
      .join(packagesRoot, pkg, target)
      .replace(`${path.sep}dist${path.sep}`, `${path.sep}src${path.sep}`)
      .replace(/\.js$/, ".ts");
    if (!fs.existsSync(source)) {
      throw new Error(
        `validator bin "${bin}" resolves to ${path.relative(repoRoot, source)}, which does not exist`,
      );
    }
    return source;
  }
  throw new Error(`No workspace package declares a "${bin}" bin`);
}

export function trackedFiles(repoRoot: string): string[] {
  return execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf-8" })
    .split("\0")
    .filter(Boolean);
}

export interface FixtureTarget {
  file: string;
  spec: ValidatorSpec;
}

export function findFixtures(
  repoRoot: string,
  registry = buildValidatorRegistry(repoRoot),
  files = trackedFiles(repoRoot),
): FixtureTarget[] {
  const out: FixtureTarget[] = [];
  for (const file of files) {
    if (EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix))) continue;
    const spec = registry.get(path.basename(file));
    if (spec) out.push({ file, spec });
  }
  return out;
}
