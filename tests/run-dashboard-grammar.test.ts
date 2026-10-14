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
        const phase = parseCommitSubject("phase 6: advance-galaxy-draft-step");
        expect(phase).toMatchObject({ phase: 6, step: null, kind: "phase" });

        const step = parseCommitSubject("phase 6 step 26: advance-galaxy-draft-step");
        expect(step).toMatchObject({ phase: 6, step: 26, kind: "step" });
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
});
