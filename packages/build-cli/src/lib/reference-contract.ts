// Re-export shim: the canonical reference-contract loader lives in the shared
// @galaxy-foundry/note-schema package. Kept so existing `../lib/reference-contract.js`
// importers (and the scripts/lib alias) resolve without path churn.
export {
  loadReferenceContract,
  findReferenceContractPath,
  contractKeys,
  type ReferenceContract,
  type ReferenceContractTerm,
} from "@galaxy-foundry/note-schema";
