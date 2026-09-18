// Reads a checkpointed run's git history.
//
// `--checkpoint` makes the run directory a standalone repository with one commit per phase and per
// loop iteration. That history is the only record of a loop: a per-step loop writes the same
// basename once per iteration, so after twenty-six iterations the filesystem holds one file and
// the other twenty-five exist only as commits.
//
// The exec is injectable because the tests then drive a captured `git log` transcript instead of a
// committed nested `.git` directory, which is a packaging hazard in a repository that is itself a
// git repository.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import type { RunCommit, RunTimeline } from "./run-model.js";

export type GitExec = (args: string[]) => string;

/**
 * ASCII unit and record separators, built from char codes rather than written as literals.
 *
 * `git log --format` accepts any delimiter, and these two cannot occur in a commit subject. They
 * are constructed rather than typed because a literal control character in source survives a
 * formatter pass invisibly and reads as an empty string to anyone looking at the file.
 */
const FIELD = String.fromCharCode(31);
const RECORD = String.fromCharCode(30);

export const GIT_LOG_ARGS = [
  "log",
  `--format=${RECORD}%H${FIELD}%aI${FIELD}%s`,
  "--numstat",
  "--no-color",
];

/**
 * The documented checkpoint subject grammar, read permissively.
 *
 * The harness emits `phase <n>: <skill>` and `phase <n> step <k>: <skill>`, and a real run's
 * history contains neither of those exactly — it has `phase 11 attempt 1: FAILED - ...`, subjects
 * with free-text tails, and unprefixed commits like `drop stray swap file`. Those unparsed commits
 * are where a failed run's story lives, so they are kept as `ad-hoc` rather than dropped.
 */
const SUBJECT = /^phase\s+(\d+)(?:\s+step\s+(\d+))?(?:\s+attempt\s+(\d+))?\s*:\s*(.*)$/i;

export function parseCommitSubject(
  subject: string,
): Pick<RunCommit, "phase" | "step" | "attempt" | "label" | "kind" | "failed"> {
  const failed = /\bfail(ed|ure|s)?\b/i.test(subject);
  const match = SUBJECT.exec(subject.trim());
  if (!match) {
    return {
      phase: null,
      step: null,
      attempt: null,
      label: subject.trim(),
      kind: "ad-hoc",
      failed,
    };
  }
  const step = match[2] ? Number(match[2]) : null;
  return {
    phase: Number(match[1]),
    step,
    attempt: match[3] ? Number(match[3]) : null,
    label: (match[4] ?? "").trim() || subject.trim(),
    kind: step === null ? "phase" : "step",
    failed,
  };
}

/** Parse the combined format plus numstat transcript into commits, newest first. */
export function parseGitLog(logText: string): RunCommit[] {
  const commits: RunCommit[] = [];
  for (const block of logText.split(RECORD)) {
    if (!block.trim()) continue;
    const newline = block.indexOf("\n");
    const header = newline === -1 ? block : block.slice(0, newline);
    const body = newline === -1 ? "" : block.slice(newline + 1);
    const [sha, date, ...subjectParts] = header.split(FIELD);
    if (!sha || !date) continue;
    const subject = subjectParts.join(FIELD);

    const files: RunCommit["files"] = [];
    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const columns = trimmed.split("\t");
      if (columns.length < 3) continue;
      const [added, deleted, file] = columns;
      files.push({
        path: file!,
        added: added === "-" ? 0 : Number(added),
        deleted: deleted === "-" ? 0 : Number(deleted),
      });
    }

    commits.push({
      sha,
      short: sha.slice(0, 7),
      date,
      subject,
      files,
      ...parseCommitSubject(subject),
    });
  }
  return commits;
}

function defaultExec(runDir: string): GitExec {
  return (args) =>
    execFileSync("git", ["-C", runDir, ...args], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
}

/**
 * Bytes of one tracked file at each commit that carried it.
 *
 * This is what makes "how did the draft grow" answerable. It costs one `ls-tree` per commit per
 * tracked artifact, which on a forty-commit run with a couple of artifacts is negligible.
 */
function sizeSeries(
  exec: GitExec,
  commits: RunCommit[],
  tracked: Array<{ artifact_id: string; filename: string }>,
): RunTimeline["size_series"] {
  const ordered = [...commits].reverse();
  return tracked
    .map(({ artifact_id, filename }) => {
      const points: RunTimeline["size_series"][number]["points"] = [];
      for (const commit of ordered) {
        let bytes: number | null;
        try {
          const entry = exec(["ls-tree", "-l", commit.sha, "--", filename]).trim();
          if (!entry) continue;
          const size = entry.split(/\s+/)[3];
          bytes = size && size !== "-" ? Number(size) : null;
        } catch {
          continue;
        }
        if (bytes === null || Number.isNaN(bytes)) continue;
        points.push({ sha: commit.sha, short: commit.short, date: commit.date, bytes });
      }
      return { artifact_id, filename, points };
    })
    .filter((series) => series.points.length > 1);
}

export interface ReadTimelineOptions {
  exec?: GitExec;
  /** Artifacts worth a size series, normally the draft and the extracted workflow. */
  tracked?: Array<{ artifact_id: string; filename: string }>;
}

export function readRunTimeline(
  runDir: string,
  options: ReadTimelineOptions = {},
): RunTimeline | null {
  const exec = options.exec ?? (existsSync(path.join(runDir, ".git")) ? defaultExec(runDir) : null);
  if (!exec) return null;

  let logText: string;
  try {
    logText = exec(GIT_LOG_ARGS);
  } catch {
    return null;
  }
  const commits = parseGitLog(logText);
  if (commits.length === 0) return null;

  let series: RunTimeline["size_series"] = [];
  if (options.tracked?.length) {
    try {
      series = sizeSeries(exec, commits, options.tracked);
    } catch {
      series = [];
    }
  }

  return {
    head: commits[0]!.sha,
    commit_count: commits.length,
    commits,
    size_series: series,
  };
}
