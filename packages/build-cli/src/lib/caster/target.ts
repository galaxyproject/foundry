// What a cast target declares about itself: where each kind's files land, which modes it will
// take, and what a finished bundle must contain.
//
// The loader takes the target DIRECTORY rather than a repo root and a target name, matching
// @galaxy-foundry/cast's placement functions. Where a Foundry keeps its targets is that
// Foundry's layout; what a target says about itself is not.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

export interface TargetKindConfig {
  dst_dir: string;
  dst_extension: string;
  modes: string[];
}

/**
 * What a `_target.yml` declares.
 *
 * Deliberately no `name`. A target is addressed by the directory holding this file — that is
 * what `--target=` names and what the site discovers — so a `name:` inside it could only be a
 * second answer to a question the directory already settled.
 *
 * Deliberately no `provenance_schema_version`. The record's shape is the CASTER's, not the
 * target's, so the version travels with the code that emits it — `PROVENANCE_SCHEMA_VERSION`
 * in @galaxy-foundry/cast. A target that declared its own could name a shape the caster does
 * not write, and the JSON Schema at scripts/lib/schemas/cast-provenance.schema.json stays the
 * contract of record: `make check-verify` validates every committed record against it, so the
 * two are cross-checked rather than merely restated.
 */
export interface TargetConfig {
  /** Where bundles sit under the target directory; see @galaxy-foundry/cast's target-layout. */
  bundle_path?: string;
  required_outputs: string[];
  kinds: Record<string, TargetKindConfig>;
  skill_constraints: {
    frontmatter_required: string[];
    forbidden_runtime_paths: string[];
  };
}

export function loadTargetConfig(targetDir: string): TargetConfig {
  const p = path.join(targetDir, "_target.yml");
  if (!existsSync(p)) throw new Error(`missing target config: ${p}`);
  const data = yaml.load(readFileSync(p, "utf8")) as TargetConfig;
  if (!data || typeof data !== "object") throw new Error(`invalid target config: ${p}`);
  return data;
}
