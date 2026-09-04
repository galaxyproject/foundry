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
  CAST_BLOCK_KEY,
  loadCastReferenceContract as loadBothHalves,
  type CastContract,
} from "@galaxy-foundry/cast";
import {
  buildReferenceContract,
  loadInstanceKinds,
  findReferenceContractPath,
  type ReferenceContract,
} from "@galaxy-foundry/reference-contract";

export {
  contractKeys,
  findReferenceContractPath,
  type ReferenceContract,
  // The site names the type of a single vocabulary entry when it renders a pill.
  type ContractTerm as ReferenceContractTerm,
} from "@galaxy-foundry/reference-contract";

/**
 * The full contract: this repo's `kinds` composed with the four inherited vocabularies.
 *
 * No `narrow`. This Foundry renders every mode the substrate ships — `verbatim` copies, and
 * `sidecar` is the cli-command renderer the caster already runs — so there is nothing to
 * decline. A narrow that names the whole vocabulary reads as a policy and enforces nothing;
 * add one back the day the substrate ships a mode with no renderer here.
 *
 * Still takes a path to reference_contract.yml, unchanged from when that file held all
 * five vocabularies — every caller passes the repo root's copy, and the inherited half
 * needs no locating because it travels with the package.
 *
 * `cast` is delegated because it HAS a reader in this repo — @galaxy-foundry/cast parses it,
 * on the other entry point below. Whether the block has a reader is a fact about this Foundry
 * rather than about which loader was called, so both loaders say the same thing; a Foundry
 * that runs no caster delegates nothing, and a `cast:` block in its contract is refused for
 * being a declaration nothing acts on.
 */
export function loadReferenceContract(
  contractPath = findReferenceContractPath(),
): ReferenceContract {
  return buildReferenceContract({
    kinds: loadInstanceKinds(contractPath, { delegatedFields: [CAST_BLOCK_KEY] }),
  });
}

/**
 * The casting half of the same file — what the caster does with each kind.
 *
 * Composed in @galaxy-foundry/cast, which is the only place that knows a kind has two readers:
 * the site renders `label`/`description`/`ref_shape` and has no use for a resolve strategy,
 * while the caster needs the strategy and never renders a pill. Behind the signature callers
 * here already use, same as `loadReferenceContract` above.
 */
export function loadCastReferenceContract(contractPath = findReferenceContractPath()): {
  contract: ReferenceContract;
  cast: CastContract;
} {
  return loadBothHalves(contractPath);
}
