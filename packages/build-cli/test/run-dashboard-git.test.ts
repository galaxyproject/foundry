import { describe, expect, it } from "vitest";

import { parseCommitSubject, parseGitLog, readRunTimeline } from "../src/lib/run-git.js";

// These subjects are copied verbatim from a real checkpointed run. The harness documents
// `phase <n>: <skill>` and `phase <n> step <k>: <skill>`, and none of the interesting commits in
// that run obey it — which is the whole reason the parser is tolerant.
const REAL_SUBJECTS = [
  "phase 11: annotate 12 shed-tool steps with tool_shed_repository (load_shed_repos 0 -> 12)",
  "drop stray swap file; TRUE pre-pin workflow is at e6c602b",
  "phase 11 attempt 1: FAILED - no shed tools installed (planemo shed discovery finds no tool_shed_repository)",
  "phase 6 step 26: loop endstate + draft-extract -> galaxy-workflow.gxwf.yml",
  "phase 0: run setup (ledger, roster)",
];

describe("parseCommitSubject", () => {
  it("reads a plain phase commit", () => {
    const parsed = parseCommitSubject(REAL_SUBJECTS[0]!);
    expect(parsed.phase).toBe(11);
    expect(parsed.step).toBeNull();
    expect(parsed.kind).toBe("phase");
    expect(parsed.failed).toBe(false);
  });

  it("reads a loop iteration", () => {
    const parsed = parseCommitSubject(REAL_SUBJECTS[3]!);
    expect(parsed.phase).toBe(6);
    expect(parsed.step).toBe(26);
    expect(parsed.kind).toBe("step");
  });

  it("reads an attempt marker and notices the failure", () => {
    const parsed = parseCommitSubject(REAL_SUBJECTS[2]!);
    expect(parsed.phase).toBe(11);
    expect(parsed.attempt).toBe(1);
    expect(parsed.failed).toBe(true);
  });

  it("keeps a commit that matches no grammar rather than dropping it", () => {
    const parsed = parseCommitSubject(REAL_SUBJECTS[1]!);
    expect(parsed.kind).toBe("ad-hoc");
    expect(parsed.phase).toBeNull();
    expect(parsed.label).toBe(REAL_SUBJECTS[1]);
  });

  it("accepts phase zero", () => {
    expect(parseCommitSubject(REAL_SUBJECTS[4]!).phase).toBe(0);
  });

  it("flags a failure the subject announces, not one it merely mentions", () => {
    expect(parseCommitSubject("phase 12: run-workflow-test (1 of 2 cases FAILED)").failed).toBe(
      true,
    );
    expect(parseCommitSubject("phase 3: failed to resolve the wrapper").failed).toBe(true);
    expect(parseCommitSubject("fix failed test").failed).toBe(false);
    expect(parseCommitSubject("phase 9: rerun after the failure in phase 8").failed).toBe(false);
  });
});

describe("parseGitLog", () => {
  const FIELD = String.fromCharCode(31);
  const RECORD = String.fromCharCode(30);
  const TAB = String.fromCharCode(9);

  function commit(sha: string, date: string, subject: string, files: string[][]): string {
    const body = files.map((file) => file.join(TAB)).join("\n");
    return `${RECORD}${sha}${FIELD}${date}${FIELD}${subject}\n${body}\n`;
  }

  it("parses commits newest first with their file deltas", () => {
    const log = [
      commit("aaaa111", "2026-09-18T10:07:32Z", "phase 12: run-workflow-test", [
        ["1", "0", "workflow-test-result.json"],
      ]),
      commit("bbbb222", "2026-09-18T10:03:10Z", "phase 7 step 4: advance-galaxy-draft-step", [
        ["12", "3", "galaxy-workflow-draft.gxwf.yml"],
      ]),
    ].join("");

    const commits = parseGitLog(log);
    expect(commits).toHaveLength(2);
    expect(commits[0]!.sha).toBe("aaaa111");
    expect(commits[0]!.phase).toBe(12);
    expect(commits[1]!.step).toBe(4);
    expect(commits[1]!.files).toEqual([
      { path: "galaxy-workflow-draft.gxwf.yml", added: 12, deleted: 3 },
    ]);
  });

  it("treats a binary file's dashes as zero rather than NaN", () => {
    const log = commit("cccc333", "2026-09-18T10:00:00Z", "phase 1: summarize-nextflow", [
      ["-", "-", "test-data/reads.fastq.gz"],
    ]);
    expect(parseGitLog(log)[0]!.files[0]).toEqual({
      path: "test-data/reads.fastq.gz",
      added: 0,
      deleted: 0,
    });
  });

  it("survives a subject containing the field separator", () => {
    const log = commit("dddd444", "2026-09-18T10:00:00Z", `phase 2: odd${FIELD}subject`, []);
    const commits = parseGitLog(log);
    expect(commits).toHaveLength(1);
    expect(commits[0]!.phase).toBe(2);
  });
});

describe("readRunTimeline size series", () => {
  const FIELD = String.fromCharCode(31);
  const RECORD = String.fromCharCode(30);
  const LOG = [
    `${RECORD}ccc3333${FIELD}2026-09-18T10:03:00Z${FIELD}phase 7 step 2: advance-galaxy-draft-step\n`,
    `${RECORD}bbb2222${FIELD}2026-09-18T10:02:00Z${FIELD}phase 7 step 1: advance-galaxy-draft-step\n`,
    `${RECORD}aaa1111${FIELD}2026-09-18T10:01:00Z${FIELD}phase 1: summarize-nextflow\n`,
  ].join("");
  const SIZES: Record<string, string> = { bbb2222: "120", ccc3333: "345" };

  it("reads each commit's blob size from ls-tree, oldest first, skipping commits without it", () => {
    const calls: string[][] = [];
    const timeline = readRunTimeline("/unused", {
      tracked: [{ artifact_id: "galaxy-workflow-draft", filename: "draft.gxwf.yml" }],
      exec: (args) => {
        calls.push(args);
        if (args[0] === "log") return LOG;
        const size = SIZES[args[2]!];
        return size ? `100644 blob 0123abcd ${size.padStart(7)}\tdraft.gxwf.yml\n` : "";
      },
    })!;
    expect(calls.filter((args) => args[0] === "ls-tree")).toHaveLength(3);
    expect(timeline.size_series).toEqual([
      {
        artifact_id: "galaxy-workflow-draft",
        filename: "draft.gxwf.yml",
        points: [
          { sha: "bbb2222", short: "bbb2222", date: "2026-09-18T10:02:00Z", bytes: 120 },
          { sha: "ccc3333", short: "ccc3333", date: "2026-09-18T10:03:00Z", bytes: 345 },
        ],
      },
    ]);
  });

  it("drops a series with a single point, which shows no growth", () => {
    const timeline = readRunTimeline("/unused", {
      tracked: [{ artifact_id: "galaxy-workflow-draft", filename: "draft.gxwf.yml" }],
      exec: (args) => {
        if (args[0] === "log") return LOG;
        return args[2] === "ccc3333" ? "100644 blob 0123abcd 345\tdraft.gxwf.yml\n" : "";
      },
    })!;
    expect(timeline.size_series).toEqual([]);
  });
});
