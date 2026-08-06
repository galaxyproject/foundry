import { contractKeys } from "@galaxy-foundry/reference-contract";
import type { ReferenceContractProps } from "@galaxy-foundry/site-kit";
import type { Specimen, SpecimenGroup } from "@galaxy-foundry/site-kit/specimens";

import { referenceContract } from "./registries";

/**
 * This instance's own specimens, in the shape the kit ships.
 *
 * The kit's specimens are authored against a contract of their own, and they have to be: half of
 * them are about terms no real instance declares. What they cannot show is OUR vocabulary — and
 * the accent bar on a reference card is the one part of that component this repo styles, in
 * `global.css`, by naming three of our seven kinds.
 *
 * Three of seven is not a fact this repo checks anywhere. It is two lists — the kinds in
 * `reference_contract.yml` and the selectors in a stylesheet — that nothing compares, and a kind
 * added to the contract gets the brand fallback with nobody deciding that. So this group renders
 * every kind we declare, derived from the contract rather than listed here, and the page shows
 * which ones a rule reaches.
 *
 * That is what a per-instance gallery is FOR. The kit's specimens are the same everywhere; these
 * are only true here.
 */
const kindSpecimen = (kind: string): Specimen<ReferenceContractProps> => {
  const term = referenceContract.kinds[kind];
  return {
    id: kind,
    name: term?.label ?? kind,
    why: term?.description ?? `The \`${kind}\` kind.`,
    props: {
      contract: referenceContract,
      // No `resolveRef`: the ref below names no note in this corpus, and a resolver would render
      // it as a dangling link — a defect of the specimen rather than a case worth showing. Left
      // unresolved, the card prints the ref as an author wrote it, which is the other real state.
      references: [
        {
          kind,
          ref: `[[a-${kind}-reference]]`,
          used_at: "runtime",
          load: "upfront",
          mode: "verbatim",
          evidence: "corpus-observed",
        },
      ],
    },
  };
};

export const KIND_TINT_SPECIMENS: SpecimenGroup<ReferenceContractProps> = {
  // Not the kit group's `reference-contract`: same component, different group, and `id` is the
  // address both sections and both route prefixes are built from.
  id: "foundry-kinds",
  component: "ReferenceContract",
  importPath: "@galaxy-foundry/site-kit/ReferenceContract.astro",
  summary:
    "Every kind this instance declares, one card each. The accent bar is ours — `global.css` names three of them, and the rest take the brand fallback. Which is which is visible here and nowhere else.",
  surface: "inline",
  specimens: contractKeys(referenceContract, "kinds").map(kindSpecimen),
};
