import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  loadLicensePolicy,
  licenseIds,
  isValidLicenseId,
  resolveLicenseRow,
  type CastMode,
} from "../packages/build-cli/src/lib/license-policy.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const CAST_MODES: CastMode[] = ["verbatim", "condense", "sidecar"];

describe("license-policy table", () => {
  const policy = loadLicensePolicy(repoRoot);

  it("the schema license grammar accepts exactly the table's ids (plus LicenseRef)", () => {
    // The frontmatter contract derives its `license` grammar from this table via
    // isValidLicenseId (no separate hand-written enum to keep in lockstep). Every
    // table id must be accepted; a LicenseRef-<slug> escape hatch too; nothing else.
    for (const id of licenseIds(policy)) {
      expect(isValidLicenseId(policy, id), id).toBe(true);
    }
    expect(isValidLicenseId(policy, "LicenseRef-example-thing")).toBe(true);
    expect(isValidLicenseId(policy, "Not-A-Real-License")).toBe(false);
  });

  it("every row's allowed_modes are valid cast modes", () => {
    for (const [id, row] of Object.entries(policy.licenses)) {
      expect(row.allowed_modes.length, `${id} has no allowed_modes`).toBeGreaterThan(0);
      for (const m of row.allowed_modes) {
        expect(CAST_MODES, `${id} mode ${m}`).toContain(m);
      }
    }
  });

  it("own-words-only rows forbid verbatim carry and require no license_file", () => {
    for (const [id, row] of Object.entries(policy.licenses)) {
      if (row.policy !== "own-words-only") continue;
      expect(row.allowed_modes, `${id}`).not.toContain("verbatim");
      expect(row.allowed_modes, `${id}`).not.toContain("sidecar");
      expect(row.license_file, `${id}`).toBe(false);
    }
  });

  it("verbatim-ok rows permit verbatim carry and require a license_file", () => {
    for (const [id, row] of Object.entries(policy.licenses)) {
      if (row.policy !== "verbatim-ok") continue;
      expect(row.allowed_modes, `${id}`).toContain("verbatim");
      expect(row.license_file, `${id}`).toBe(true);
    }
  });

  it("unknown and missing license ids resolve to the default (own-words + defect)", () => {
    for (const id of [undefined, null, "Nonexistent-1.0"]) {
      const row = resolveLicenseRow(policy, id);
      expect(row.policy).toBe("own-words-only");
      expect(row.defect).toBe(true);
    }
  });
});
