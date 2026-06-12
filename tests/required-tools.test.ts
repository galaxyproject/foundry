import { describe, expect, it, vi } from "vitest";

import type { Frontmatter } from "../packages/build-cli/src/lib/types.js";
import {
  aggregateRequiredTools,
  moldCliRefs,
  type RequiredToolRef,
} from "../packages/build-cli/src/lib/required-tools.js";

// Synthetic content index: two cli-tool notes (gxwf, planemo), one cli-command
// note resolving to gxwf, and one cli-command note whose tool has no cli-tool note.
const metaByPath = new Map<string, Frontmatter>([
  [
    "content/cli/gxwf/index.md",
    {
      type: "cli-tool",
      tool: "gxwf",
      origin: "npm",
      package: "@galaxy-tool-util/cli",
      invoke: "gxwf",
    },
  ],
  [
    "content/cli/planemo/index.md",
    { type: "cli-tool", tool: "planemo", origin: "pypi", package: "planemo", invoke: "planemo" },
  ],
  ["content/cli/gxwf/validate.md", { type: "cli-command", tool: "gxwf", command: "validate" }],
  ["content/cli/orphan/run.md", { type: "cli-command", tool: "orphan", command: "run" }],
]);
const slugMap = new Map<string, string>([
  ["gxwf", "content/cli/gxwf/index.md"],
  ["planemo", "content/cli/planemo/index.md"],
]);

describe("aggregateRequiredTools", () => {
  it("dedups by tool slug and unions referenced + implied provenance", () => {
    const refs: RequiredToolRef[] = [
      { kind: "cli-tool", src: "content/cli/planemo/index.md" },
      { kind: "cli-command", src: "content/cli/gxwf/validate.md" },
      // Same tool reached twice: a second gxwf command must not duplicate the row.
      { kind: "cli-command", src: "content/cli/gxwf/validate.md" },
      // A direct cli-tool ref to gxwf must upgrade its source to "referenced".
      { kind: "cli-tool", src: "content/cli/gxwf/index.md" },
    ];
    const tools = aggregateRequiredTools(refs, metaByPath, slugMap);
    expect(tools.map((t) => t.tool)).toEqual(["gxwf", "planemo"]); // sorted, deduped
    const gxwf = tools.find((t) => t.tool === "gxwf")!;
    expect(gxwf.source).toBe("referenced");
    expect(gxwf.implied_by).toEqual(["gxwf validate"]); // no dup despite two refs
    expect(tools.find((t) => t.tool === "planemo")!.source).toBe("referenced");
  });

  it("warns and skips a cli-command whose tool has no cli-tool note", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const tools = aggregateRequiredTools(
      [{ kind: "cli-command", src: "content/cli/orphan/run.md" }],
      metaByPath,
      slugMap,
    );
    expect(tools).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("orphan run"));
    warn.mockRestore();
  });
});

describe("moldCliRefs", () => {
  it("resolves only cli-tool/cli-command refs to note paths", () => {
    const mold: Frontmatter = {
      references: [
        { kind: "schema", ref: "[[summary-nextflow]]" }, // ignored
        { kind: "cli-tool", ref: "[[planemo]]" },
        { kind: "research", ref: "[[whatever]]" }, // ignored
      ],
    };
    expect(moldCliRefs(mold, slugMap)).toEqual([
      { kind: "cli-tool", src: "content/cli/planemo/index.md" },
    ]);
  });

  it("drops cli refs that fail to resolve", () => {
    const mold: Frontmatter = { references: [{ kind: "cli-tool", ref: "[[missing]]" }] };
    expect(moldCliRefs(mold, slugMap)).toEqual([]);
  });

  it("tolerates a Mold with no references array", () => {
    expect(moldCliRefs({}, slugMap)).toEqual([]);
    expect(moldCliRefs(undefined, slugMap)).toEqual([]);
  });
});
