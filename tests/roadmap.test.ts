import { describe, expect, it } from "vitest";

import {
  type RoadmapIssue,
  type RoadmapMetadata,
  validateRoadmap,
} from "../packages/build-cli/src/lib/roadmap.js";

const REPO = "galaxyproject/foundry";

function issue(
  number: number,
  label: "roadmap/main" | "roadmap/substep" | "roadmap/off",
  state: "open" | "closed" = "open",
): RoadmapIssue {
  return {
    number,
    title: `Issue ${number}`,
    state,
    labels: [label],
    repo: REPO,
    url: `https://github.com/${REPO}/issues/${number}`,
  };
}

function metadata(): RoadmapMetadata {
  const main10 = issue(10, "roadmap/main");
  const sub11 = issue(11, "roadmap/substep");
  const sub12 = issue(12, "roadmap/substep", "closed");
  const main20 = issue(20, "roadmap/main");
  const off30 = issue(30, "roadmap/off");
  return {
    issues: [main10, sub11, sub12, main20, off30],
    childrenByMain: new Map([
      [10, [sub11, sub12]],
      [20, []],
    ]),
  };
}

const link = (number: number) => `[Issue ${number}](https://github.com/${REPO}/issues/${number})`;

const VALID = `---
type: meta
---

## At a glance

- ${link(10)}.
- ${link(20)}.

## Work areas

### ${link(10)}

This is one descriptive paragraph for the first work area.

**Substeps**

- [ ] ${link(11)}
- [x] ${link(12)}

### ${link(20)}

This is one descriptive paragraph for the second work area.

**Substeps**

_No tracked substeps._
`;

describe("validateRoadmap", () => {
  it("accepts the two-region roadmap contract", () => {
    expect(validateRoadmap(VALID, metadata())).toEqual([]);
  });

  it("requires every main in both regions", () => {
    const markdown = VALID.replace(`- ${link(20)}.\n`, "");
    expect(validateRoadmap(markdown, metadata())).toContain(
      "roadmap: missing topline for main #20 (Issue 20)",
    );
  });

  it("requires matching editorial order", () => {
    const first = `- ${link(10)}.`;
    const second = `- ${link(20)}.`;
    const markdown = VALID.replace(`${first}\n${second}`, `${second}\n${first}`);
    expect(validateRoadmap(markdown, metadata())).toContain(
      "roadmap: main issue order differs between 'At a glance' and 'Work areas'",
    );
  });

  it("requires the live issue title as link text", () => {
    const markdown = VALID.replaceAll(link(11), link(11).replace("Issue 11", "Old title"));
    expect(
      validateRoadmap(markdown, metadata()).some((error) => error.includes("link text for #11")),
    ).toBe(true);
  });

  it("requires exactly one paragraph per main", () => {
    const markdown = VALID.replace(
      "This is one descriptive paragraph for the first work area.",
      "First paragraph.\n\nSecond paragraph.",
    );
    expect(
      validateRoadmap(markdown, metadata()).some((error) =>
        error.includes("main #10 needs exactly one descriptive paragraph"),
      ),
    ).toBe(true);
  });

  it("checks substep checkbox state", () => {
    const markdown = VALID.replace(`- [x] ${link(12)}`, `- [ ] ${link(12)}`);
    expect(
      validateRoadmap(markdown, metadata()).some((error) =>
        error.includes("substep #12 checkbox disagrees with closed state"),
      ),
    ).toBe(true);
  });

  it("checks native parent placement", () => {
    const markdown = VALID.replace(`- [ ] ${link(11)}\n`, "").replace(
      "_No tracked substeps._",
      `- [ ] ${link(11)}`,
    );
    const errors = validateRoadmap(markdown, metadata());
    expect(errors.some((error) => error.includes("not a native child of main #20"))).toBe(true);
    expect(errors.some((error) => error.includes("main #10 is missing native substep #11"))).toBe(
      true,
    );
  });

  it("rejects labeled substeps without a native main parent", () => {
    const data = metadata();
    data.childrenByMain.set(10, [issue(12, "roadmap/substep", "closed")]);
    expect(validateRoadmap(VALID, data)).toContain(
      "metadata: roadmap/substep #11 has no roadmap/main parent",
    );
  });

  it("rejects native children without the substep label", () => {
    const data = metadata();
    const child = { ...issue(99, "roadmap/off"), labels: ["enhancement"] };
    data.childrenByMain.set(20, [child]);
    expect(validateRoadmap(VALID, data)).toContain(
      "metadata: main #20 has native sub-issue #99 without roadmap/substep",
    );
  });

  it("rejects roadmap/off links anywhere on the page", () => {
    const markdown = `${VALID}\nSee ${link(30)}.\n`;
    expect(
      validateRoadmap(markdown, metadata()).some((error) =>
        error.includes("#30 is labeled roadmap/off"),
      ),
    ).toBe(true);
  });
});
