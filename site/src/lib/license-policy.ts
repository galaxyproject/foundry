import fs from 'node:fs';
import path from 'node:path';

import yaml from 'js-yaml';

// The canonical license → redistribution-policy table lives at the repo root,
// outside the Astro project (../license-policy.yml). Source of truth is
// galaxyproject/foundry-pattern#4. We read it here so the schema grammar and
// the license UI share one table.
const POLICY_FILE = path.resolve('../license-policy.yml');

export type CastMode = 'verbatim' | 'condense' | 'sidecar';
export type RedistributionPolicy = 'verbatim-ok' | 'own-words-only';

export interface LicenseRow {
  name: string;
  policy: RedistributionPolicy;
  allowed_modes: CastMode[];
  license_file: boolean;
  copyleft: boolean;
  defect?: boolean;
  obligations: string;
}

interface LicensePolicyFile {
  version: number;
  global_rules: Record<string, string>;
  licenses: Record<string, LicenseRow>;
  default: LicenseRow;
}

let cached: LicensePolicyFile | undefined;

function load(): LicensePolicyFile {
  if (!cached) cached = yaml.load(fs.readFileSync(POLICY_FILE, 'utf-8')) as LicensePolicyFile;
  return cached;
}

/** Curated SPDX ids named explicitly in the table (drives the schema grammar). */
export function licenseIds(): string[] {
  return Object.keys(load().licenses);
}

/** `^LicenseRef-<slug>$` escape hatch, mirrored from meta_schema.yml. */
export const LICENSE_REF_RE = /^LicenseRef-[A-Za-z0-9.-]+$/;

/** Whether a `license` frontmatter value is a valid id (enum or LicenseRef). */
export function isValidLicenseId(id: string): boolean {
  return load().licenses[id] !== undefined || LICENSE_REF_RE.test(id);
}

/** Resolve a `license` id to its row; unknown/missing → default (own-words + defect). */
export function resolveLicenseRow(id: string | undefined | null): LicenseRow {
  const table = load();
  if (typeof id === 'string' && table.licenses[id]) return table.licenses[id]!;
  return table.default;
}
