// Public surface for @galaxy-foundry/note-schema — the single source of truth
// for Foundry note frontmatter, shared by the validator and the Astro site.

export { buildNoteSchema, type BuildNoteSchemaOptions, type NoteSchema } from "./note-schema.js";

export {
  KINDS,
  KINDS_BY_NAME,
  buildKindContext,
  type KindContext,
  type KindDefinition,
} from "./types/index.js";

export {
  buildKindManifest,
  describeFields,
  describeType,
  parseKindManifest,
  withRevision,
  KIND_MANIFEST_VERSION,
  MANIFEST_SOURCE,
  type BuildKindManifestOptions,
  type KindManifest,
  type ManifestField,
  type ManifestKind,
  type ManifestSource,
} from "./kind-manifest.js";

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

export {
  loadTagRegistry,
  tagRegistry,
  buildTagIndex,
  type TagRegistry,
  type TagRegistryFile,
  type Facet,
  type FacetInfo,
} from "./tags.js";
