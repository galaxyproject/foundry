import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

import {
  loadLicensePolicy,
  licenseIds,
  resolveLicenseRow,
  type CastMode,
} from "../packages/build-cli/src/lib/license-policy.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const CAST_MODES: CastMode[] = ["verbatim", "condense", "sidecar"];

function metaSchemaLicenseEnum(): string[] {
  const schema = yaml.load(readFileSync(path.join(repoRoot, "meta_schema.yml"), "utf8")) as {
    properties: { license: { anyOf: Array<{ enum?: string[] }> } };
  };
  const enumBranch = schema.properties.license.anyOf.find((b) => Array.isArray(b.enum));
  if (!enumBranch?.enum) throw new Error("meta_schema license has no enum branch");
  return enumBranch.enum;
}

describe("license-policy table", () => {
  const policy = loadLicensePolicy(repoRoot);

  it("meta_schema license enum matches the table's SPDX ids", () => {
    // The enum carries only SPDX ids; LicenseRef-* ids are covered by the
    // anyOf pattern branch, so they are excluded from the enum comparison.
    const spdxIds = licenseIds(policy)
      .filter((id) => !id.startsWith("LicenseRef-"))
      .sort();
    expect([...metaSchemaLicenseEnum()].sort()).toEqual(spdxIds);
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
