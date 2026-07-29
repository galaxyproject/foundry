// One answer to "does this file on disk match what we would write?", for every command that
// renders a deterministic artifact and offers a `--check` gate over it.
//
// The decision is four lines and it was written seven times: twice in assemble-pipeline, five
// times in cast-mold. Each copy independently got the same three things right — hash rather
// than string compare, distinguish MISSING from DRIFTED, and never write under `--check` — and
// worded the result differently, so the same fault reported as "content drifted", "content
// differs", "dst hash differs from src", or "content differs from deterministic render"
// depending on which artifact happened to be stale.
//
// Two things stay out of here on purpose:
//
//   - `writeOrCheck` in content-notes.ts, which is the OTHER dialect: one artifact, exits the
//     process on drift. The commands here reconcile many artifacts and report them together,
//     so they need drift as a VALUE rather than as an exit. Both are real; neither subsumes
//     the other, and collapsing them would mean giving one of the two callers a worse error.
//
//   - What to DO about drift. Whether stale means exit 1, and what else gets rolled into the
//     verdict, belongs to the command — cast-mold also fails on pending LLM refs, which is not
//     a file comparison at all.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export interface Drift {
  /** Why the file is out of sync, or undefined when it already matches. */
  reason?: string;
  /**
   * The hash on disk BEFORE reconciling — null when the file was absent.
   *
   * Returned rather than discarded because provenance records what a `--check` run actually
   * found, not what it wanted to find: a drifted entry keeps the stale hash so the record says
   * which bytes were on disk when the check failed.
   */
  currentHash: string | null;
  /** The hash the file is supposed to have — carried back so a caller that renders the content
   *  does not hash it a second time to record it. */
  expectedHash: string;
}

/**
 * Compare without touching the file.
 *
 * The read-only half, for an artifact whose write happens elsewhere in the command and under
 * different conditions than "not checking" — `_verify.json` is written with the provenance
 * record, after an error gate that can abort the whole cast.
 */
export function driftOf(filePath: string, expectedHash: string, label: string): Drift {
  const exists = existsSync(filePath);
  const currentHash = exists ? sha256File(filePath) : null;
  if (currentHash === expectedHash) return { currentHash, expectedHash };
  return {
    reason: exists ? `${label} content drifted` : `${label} missing`,
    currentHash,
    expectedHash,
  };
}

export interface ReconcileOptions {
  path: string;
  expectedHash: string;
  label: string;
  check: boolean;
  /**
   * How to produce the file. A callback rather than the content itself because not every
   * artifact is a string we hold — a verbatim ref is a file COPY, compared against the source's
   * hash and written with `copyFileSync`. Only the write differs; the decision above it does not.
   */
  write: () => void;
}

/** Compare, and bring the file into line unless this is a check run. */
export function reconcile(options: ReconcileOptions): Drift {
  const drift = driftOf(options.path, options.expectedHash, options.label);
  if (drift.reason && !options.check) options.write();
  return drift;
}

/**
 * The common case: the expected content is a string already in hand.
 *
 * Creates the parent directory, because a first cast writes into a bundle that does not exist
 * yet — and does so only on the write path, so `--check` on a never-cast mold leaves no
 * directory behind to make the next check pass for the wrong reason.
 */
export function reconcileText(options: {
  path: string;
  expected: string;
  label: string;
  check: boolean;
}): Drift {
  return reconcile({
    path: options.path,
    expectedHash: sha256Text(options.expected),
    label: options.label,
    check: options.check,
    write: () => {
      mkdirSync(path.dirname(options.path), { recursive: true });
      writeFileSync(options.path, options.expected);
    },
  });
}
