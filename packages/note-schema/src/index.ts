// Public surface for @galaxy-foundry/note-schema — the single source of truth
// for Foundry note frontmatter, shared by the validator and the Astro site.

export { buildNoteSchema, type BuildNoteSchemaOptions, type NoteSchema } from "./note-schema.js";

export {
  loadReferenceContract,
  findReferenceContractPath,
  contractKeys,
  type ReferenceContract,
  type ReferenceContractTerm,
} from "./reference-contract.js";

export {
  loadLicensePolicy,
  findLicensePolicyPath,
  licenseIds,
  isValidLicenseId,
  resolveLicenseRow,
  LICENSE_POLICY_FILE,
  LICENSE_REF_RE,
  type LicensePolicy,
  type LicenseRow,
  type CastMode,
  type RedistributionPolicy,
} from "./license-policy.js";

export { loadTags } from "./tags.js";
