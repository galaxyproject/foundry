// The planemo version is written down in more places than anyone can hold in their head, and
// nothing used to compare them. #359 bumped 0.75.44 → 0.75.45 and missed the copy in
// content/schemas/planemo-test-report.md; it surfaced by grep, not by a gate.
//
// The fix is not to teach every writer to read one pin — it is to let the note state the
// intent, let the sync scripts stamp what they actually observed, and check the two agree.
// These tests are that check's contract: the pin is one value, and every file that repeats
// it is wrong the moment it disagrees.

import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  findPlanemoPinDrift,
  PLANEMO_PIN_NOTE,
  readPinnedPlanemoVersion,
} from "../scripts/lib/planemo-pin.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const COPIED = [
  "content/cli/planemo",
  "content/schemas/planemo-test-report.md",
  "packages/planemo-cli-meta/src/cli-meta.provenance.json",
  "packages/planemo-test-report-schema/src/test-report.provenance.json",
];

/** A throwaway repo root holding only the files the gate reads. */
function fixture(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "planemo-pin-"));
  for (const rel of COPIED) {
    const dst = path.join(dir, rel);
    mkdirSync(path.dirname(dst), { recursive: true });
    cpSync(path.join(repoRoot, rel), dst, { recursive: true });
  }
  return dir;
}

function edit(dir: string, rel: string, from: string, to: string): void {
  const file = path.join(dir, rel);
  const before = readFileSync(file, "utf8");
  expect(before, `${rel} should contain ${from}`).toContain(from);
  writeFileSync(file, before.replaceAll(from, to));
}

describe("readPinnedPlanemoVersion", () => {
  it("reads package_version from the cli-tool note", () => {
    expect(readPinnedPlanemoVersion(fixture())).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("findPlanemoPinDrift", () => {
  it("reports nothing when every copy agrees", () => {
    expect(findPlanemoPinDrift(fixture())).toEqual([]);
  });

  it("reports nothing for the real repository", () => {
    expect(findPlanemoPinDrift(repoRoot)).toEqual([]);
  });

  it("catches a note bumped without re-syncing the vendored artifacts", () => {
    const dir = fixture();
    const pinned = readPinnedPlanemoVersion(dir);
    edit(dir, PLANEMO_PIN_NOTE, pinned, "0.75.99");

    const drift = findPlanemoPinDrift(dir);
    const files = new Set(drift.map((d) => d.file));
    expect(files).toContain("packages/planemo-cli-meta/src/cli-meta.provenance.json");
    expect(files).toContain("packages/planemo-test-report-schema/src/test-report.provenance.json");
    expect(files).toContain("content/schemas/planemo-test-report.md");
    expect(files).toContain("content/cli/planemo/planemo-test.md");
    for (const item of drift) expect(item.expected).toBe("0.75.99");
  });

  it("catches provenance synced against the wrong binary", () => {
    const dir = fixture();
    const rel = "packages/planemo-cli-meta/src/cli-meta.provenance.json";
    edit(
      dir,
      rel,
      `"planemo_version": "${readPinnedPlanemoVersion(dir)}"`,
      '"planemo_version": "0.75.1"',
    );

    const drift = findPlanemoPinDrift(dir);
    expect(drift.map((d) => d.file)).toEqual([rel]);
    expect(drift[0]?.found).toBe("0.75.1");
  });

  it("catches one stale generated source_url", () => {
    const dir = fixture();
    const rel = "content/cli/planemo/planemo-lint.md";
    edit(dir, rel, `blob/${readPinnedPlanemoVersion(dir)}/`, "blob/0.75.2/");

    const drift = findPlanemoPinDrift(dir);
    expect(drift.map((d) => d.file)).toEqual([rel]);
    expect(drift[0]?.found).toBe("0.75.2");
  });

  it("catches a stale version left in prose", () => {
    const dir = fixture();
    const rel = "content/schemas/planemo-test-report.md";
    edit(dir, rel, `planemo==${readPinnedPlanemoVersion(dir)}`, "planemo==0.75.3");

    const drift = findPlanemoPinDrift(dir);
    expect(drift.map((d) => d.file)).toEqual([rel]);
    expect(drift[0]?.found).toBe("0.75.3");
  });
});
