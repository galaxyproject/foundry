// The checkpoint commit grammar is load-bearing the moment something parses it.
//
// The assembled harnesses tell an agent to write `phase <n>: <skill>` and
// `phase <n> step <k>: <skill>`, and `run-dashboard` reads those subjects back to reconstruct a
// timeline. Nothing else connects the two, so a reworded instruction would silently turn every
// checkpoint commit into an unattributed row. This test is that connection.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseCommitSubject } from "../packages/build-cli/src/lib/run-git.js";
import { parseRunRecord } from "../packages/build-cli/src/lib/run-record.js";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SKILLS = path.join(REPO_ROOT, "casts/claude/skills");

const harnesses = readdirSync(SKILLS)
  .filter((name) => name.startsWith("pipeline-"))
  .filter((name) => existsSync(path.join(SKILLS, name, "SKILL.md")))
  .sort();

describe("assembled harnesses and the timeline parser agree", () => {
  it("finds the harnesses to check", () => {
    expect(harnesses.length).toBeGreaterThan(0);
  });

  for (const harness of harnesses) {
    describe(harness, () => {
      const text = readFileSync(path.join(SKILLS, harness, "SKILL.md"), "utf8");

      it("still documents both commit subject templates", () => {
        expect(text).toContain('commit -m "phase <n>: <skill>"');
        expect(text).toContain("`phase <n> step <k>: <skill>`");
      });

      it("emits subjects the parser reads back", () => {
        // Every backticked or quoted template the harness gives, filled in as an agent would.
        const templates = [
          ...new Set(
            [...text.matchAll(/[`"](phase <n>(?: step <k>)?: <skill>)[`"]/g)].map((m) => m[1]!),
          ),
        ];
        expect(templates.sort()).toEqual(["phase <n> step <k>: <skill>", "phase <n>: <skill>"]);
        for (const template of templates) {
          const subject = template
            .replace("<n>", "6")
            .replace("<k>", "26")
            .replace("<skill>", "advance-galaxy-draft-step");
          const parsed = parseCommitSubject(subject);
          expect(parsed.phase).toBe(6);
          expect(parsed.step).toBe(template.includes("<k>") ? 26 : null);
          expect(parsed.kind).toBe(template.includes("<k>") ? "step" : "phase");
          expect(parsed.label).toBe("advance-galaxy-draft-step");
          expect(parsed.failed).toBe(false);
        }
      });

      it("still tells the agent to keep the grammar intact", () => {
        expect(text).toContain("because it is parsed");
      });

      it("keeps generated reader output out of the run's own history", () => {
        // Without this the next phase's `git add -A` commits the dashboard into the very history
        // the dashboard renders, and every regeneration adds a noise commit.
        expect(text).toContain("`.gitignore`");
        expect(text).toContain("`dashboard.html`");
        expect(text).toContain("`run-manifest.json`");
      });
    });
  }

  // The reader keys a phase row on `n`; an instruction that drifted to another key would lose
  // every phase while the record still parsed.
  for (const harness of harnesses) {
    it(`${harness} spells out the run-record phase row the reader parses`, () => {
      const text = readFileSync(path.join(SKILLS, harness, "SKILL.md"), "utf8");
      const start = text.indexOf("## Run record");
      expect(start).toBeGreaterThan(-1);
      const end = text.indexOf("\n## ", start + 1);
      const section = text.slice(start, end === -1 ? undefined : end);
      const example = /`(\{ n: \d+, kind: [^`]*\})`/.exec(section)?.[1];
      expect(example).toBeTruthy();
      const parsed = parseRunRecord(`phases:\n  - ${example}\n`, "foundry-run.yml");
      expect(parsed.warnings).toEqual([]);
      expect(parsed.record!.phases).toHaveLength(1);
    });
  }
});
