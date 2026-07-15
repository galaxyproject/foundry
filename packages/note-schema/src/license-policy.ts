// Loader for the canonical license → redistribution-policy table
// (`license-policy.yml` at the repo root). Source of truth is
// galaxyproject/foundry-pattern#4; see the file header for the cross-repo
// sync obligation. Canonical module: the validator, the caster, the schema
// grammar, and the site's license UI all import it here.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

export type CastMode = "verbatim" | "condense" | "sidecar";
export type RedistributionPolicy = "verbatim-ok" | "own-words-only";

export interface LicenseRow {
  name: string;
  policy: RedistributionPolicy;
  allowed_modes: CastMode[];
  license_file: boolean;
  copyleft: boolean;
  defect?: boolean;
  obligations: string;
}

export interface LicensePolicy {
  version: number;
  global_rules: Record<string, string>;
  licenses: Record<string, LicenseRow>;
  default: LicenseRow;
}

export const LICENSE_POLICY_FILE = "license-policy.yml";

/** `^LicenseRef-<slug>$` escape hatch for ids outside the curated SPDX set. */
export const LICENSE_REF_RE = /^LicenseRef-[A-Za-z0-9.-]+$/;

/** Walk up from `startDir` until `license-policy.yml` is found. */
export function findLicensePolicyPath(startDir = process.cwd()): string {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, LICENSE_POLICY_FILE);
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`${LICENSE_POLICY_FILE} not found`);
    dir = parent;
  }
}

export function loadLicensePolicy(repoRoot: string): LicensePolicy {
  const p = path.join(repoRoot, LICENSE_POLICY_FILE);
  if (!existsSync(p)) throw new Error(`missing license policy table: ${p}`);
  const data = yaml.load(readFileSync(p, "utf8")) as LicensePolicy;
  if (!data || typeof data !== "object" || !data.licenses || !data.default) {
    throw new Error(`invalid license policy table: ${p}`);
  }
  return data;
}

// Curated SPDX ids the table names explicitly (drives the schema grammar).
export function licenseIds(policy: LicensePolicy): string[] {
  return Object.keys(policy.licenses);
}

/** Whether a `license` frontmatter value is a valid id (curated SPDX or LicenseRef). */
export function isValidLicenseId(policy: LicensePolicy, id: string): boolean {
  return policy.licenses[id] !== undefined || LICENSE_REF_RE.test(id);
}

// Resolve a note's `license` id to its row. Unknown ids and a missing license
// fall through to the default row (own-words-only + defect) per default-deny.
export function resolveLicenseRow(
  policy: LicensePolicy,
  licenseId: string | undefined | null,
): LicenseRow {
  if (typeof licenseId === "string" && policy.licenses[licenseId]) {
    return policy.licenses[licenseId]!;
  }
  return policy.default;
}
