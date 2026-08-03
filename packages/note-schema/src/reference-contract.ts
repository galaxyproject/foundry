// This Foundry's typed-reference vocabulary — the five controlled lists behind a note's
// `references[]` entries. The validator, the caster, and the site all read it here.
//
// Four of the five are not ours. `used_at`, `load`, `modes` and `evidence` describe the
// compilation machinery rather than any domain, so they are the same in every Foundry and
// ship as data in @galaxy-foundry/reference-contract (spec: galaxyproject/foundry-pattern,
// `content/pattern/anatomy-of-an-instance.md`). The fifth, `kinds`, is exactly what varies
// by domain — we author `cli-tool` and `schema` refs, a sibling Foundry authors neither —
// so it stays in reference_contract.yml at the repo root.
//
// What is left here is the composition, behind the signature callers already use.

import {
  buildReferenceContract,
  loadInstanceKinds,
  findReferenceContractPath,
  type ReferenceContract,
} from "@galaxy-foundry/reference-contract";

import { loadCastContract, type CastContract } from "./cast-contract.js";

export {
  contractKeys,
  findReferenceContractPath,
  type ReferenceContract,
  // The site names the type of a single vocabulary entry when it renders a pill.
  type ContractTerm as ReferenceContractTerm,
} from "@galaxy-foundry/reference-contract";

/**
 * The casting transforms this Foundry supports — the inherited `modes` minus `condense`.
 *
 * `condense` is not description, it is CAPACITY: it commits a Foundry to an LLM phase in its
 * caster, and with it the unfilled-slot bookkeeping, the prompt/model provenance a reproducible
 * cast needs, and the loss of byte-stable output that makes a `--check` gate possible at all.
 * This Foundry built that phase, ran it, and arrived at zero condense refs — the last became
 * verbatim in `convert-nfcore-module-to-galaxy-tool` rev 4 because "the prior condense was
 * always a verbatim passthrough". The machinery is now gone, so the vocabulary should stop
 * offering a mode the caster would refuse.
 *
 * Declined here rather than deleted from @galaxy-foundry/reference-contract, which is where the
 * plan for this change originally pointed. The shared vocabulary is the PATTERN's, and the
 * pattern's model names condensation as a transform mode; removing it would say no Foundry may
 * ever have an LLM phase, and would take a package release to reverse. `narrow` is the mechanism
 * the substrate provides for exactly this, and declining a capacity is what it is for.
 */
export const SUPPORTED_MODES = ["verbatim", "sidecar"] as const;

/**
 * The full contract: this repo's `kinds` composed with the four inherited vocabularies.
 *
 * Still takes a path to reference_contract.yml, unchanged from when that file held all
 * five vocabularies — every caller passes the repo root's copy, and the inherited half
 * needs no locating because it travels with the package.
 */
export function loadReferenceContract(
  contractPath = findReferenceContractPath(),
): ReferenceContract {
  return buildReferenceContract({
    kinds: loadInstanceKinds(contractPath),
    narrow: { modes: SUPPORTED_MODES },
  });
}

/**
 * The casting half of the same file — what the caster does with each kind.
 *
 * Separate entry point because the two halves have different readers: the site renders
 * `label`/`description`/`ref_shape` and has no use for a resolve strategy, while the
 * caster needs the strategy and never renders a pill. Both read one file, which is what
 * keeps them from disagreeing.
 */
export function loadCastReferenceContract(contractPath = findReferenceContractPath()): {
  contract: ReferenceContract;
  cast: CastContract;
} {
  const contract = loadReferenceContract(contractPath);
  return { contract, cast: loadCastContract(contractPath, Object.keys(contract.modes)) };
}
