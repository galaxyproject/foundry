// Loader for reference_contract.yml — the controlled vocabulary behind a note's
// `references[]` entries (kinds, used_at, load, modes, evidence). Canonical
// source of truth; the validator, the caster, and the site all import it here.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

export interface ReferenceContractTerm {
  label: string;
  description: string;
  href: string;
  ref_shape?: "wiki-link" | "path";
}

export interface ReferenceContract {
  kinds: Record<string, ReferenceContractTerm>;
  used_at: Record<string, ReferenceContractTerm>;
  load: Record<string, ReferenceContractTerm>;
  modes: Record<string, ReferenceContractTerm>;
  evidence: Record<string, ReferenceContractTerm>;
}

export function findReferenceContractPath(startDir = process.cwd()): string {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, "reference_contract.yml");
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("reference_contract.yml not found");
    dir = parent;
  }
}

export function loadReferenceContract(
  contractPath = findReferenceContractPath(),
): ReferenceContract {
  const data = yaml.load(readFileSync(contractPath, "utf8")) as ReferenceContract | null;
  if (!data) throw new Error(`empty reference contract: ${contractPath}`);
  return data;
}

export function contractKeys(
  contract: ReferenceContract,
  group: keyof ReferenceContract,
): string[] {
  return Object.keys(contract[group]);
}
