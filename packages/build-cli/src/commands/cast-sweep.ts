#!/usr/bin/env tsx
// This Foundry's `cast-all` command: every Mold, checked or written, in one run.
//
// The sweep itself is @galaxy-foundry/cast. It used to be two shell loops in the Makefile, and
// the reason it moved is not tidiness — a loop in a Makefile cannot be tested, and the second
// Foundry had written its own with different answers to every question this one had already
// settled. The package now owns the loop and the report; what stays here is the LIST.
//
// Every Mold, not a representative one, and not only the ones already cast. A verbatim ref's
// guarantee is src_hash == dst_hash, and a bundle whose source moved on satisfies it against a
// note that no longer exists — self-consistent and stale. Only re-hashing the source against the
// record catches that, and only over the whole corpus: seven bundles carried a dead doc path for
// two weeks while the one Mold CI checked stayed green.
//
// That is a policy about THIS corpus, which is why the caster takes the list rather than deriving
// it. The second Foundry sweeps its bundles instead, because an uncast Mold there is a decision.
//
// Usage:
//   foundry-build cast-all [--check] [--target=claude] [--root=.]

import { readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { castSweep, sweepReport } from "@galaxy-foundry/cast/command";

import { GALAXY_CAST_SPEC } from "./cast-mold.js";

/** Every Mold in the corpus, by slug, in a stable order. */
function moldSlugs(repoRoot: string): string[] {
  return readdirSync(path.join(repoRoot, "content", "molds"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function flagValue(argv: readonly string[], flag: string): string | undefined {
  const joined = argv.find((a) => a.startsWith(`${flag}=`));
  if (joined) return joined.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

export async function runCastSweepCommand(argv = process.argv.slice(2)): Promise<void> {
  const check = argv.includes("--check");
  const root = path.resolve(flagValue(argv, "--root") ?? ".");
  const target = flagValue(argv, "--target");

  const result = await castSweep(GALAXY_CAST_SPEC, {
    molds: moldSlugs(root),
    root,
    check,
    ...(target === undefined ? {} : { target }),
  });

  const verdict = sweepReport(result, {
    repoRoot: root,
    check,
    remediation: [
      "Drift is fixed by 'make casts' + commit;",
      "an error (unresolved ref, bad declaration) is fixed at the source.",
    ],
  });

  for (const line of verdict.err) console.error(line);
  for (const line of verdict.out) console.log(line);
  if (verdict.exitCode !== 0) process.exitCode = verdict.exitCode;
}
