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

// The license table is not ours: it ships in @galaxy-foundry/license-policy, shared
// across Foundry instances. Only `LicensePolicy` is re-exported, because a caller
// building the options object below has to name the type. Everything else about
// licenses — resolving a row, validating an id, reading the table — is imported from
// that package directly, so there is one place to look and nothing here to drift.
export type { LicensePolicy } from "@galaxy-foundry/license-policy";

export {
  loadTagRegistry,
  tagRegistry,
  buildTagIndex,
  type TagRegistry,
  type TagRegistryFile,
  type Facet,
  type FacetInfo,
} from "./tags.js";
