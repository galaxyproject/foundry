import { describe, expect, it } from "vitest";

import { parseCommitSubject, parseGitLog } from "../src/lib/run-git.js";

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
