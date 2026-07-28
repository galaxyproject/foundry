// Public surface for @galaxy-foundry/note-schema — the single source of truth
// for Foundry note frontmatter, shared by the validator and the Astro site.

export {
  buildNoteSchema,
  buildKindSchemas,
  type Assembled,
  type BuildNoteSchemaOptions,
  type KindSchemas,
  type NoteSchema,
} from "./note-schema.js";

export {
  COLLECTIONS,
  COLLECTION_NAMES,
  CONTENT_DIR,
  collectionOf,
  kindOf,
  matchesCollection,
  type CollectionDefinition,
  type CollectionName,
} from "./collections.js";

export {
  DEFINITIONS,
  KINDS,
  KINDS_BY_NAME,
  buildKindContext,
  defineKind,
  type KindContext,
  type KindDefinition,
  type KindShape,
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

// Same arrangement as the license table above, and for the same reason. The meta_tags.yml
// FORMAT is not ours: it ships in @galaxy-foundry/tag-registry, shared across Foundry
// instances. The facet VOCABULARY is ours and stays at our repo root — that package
// deliberately ships none, because facets are the browse axes of one domain. Only
// `TagRegistry` is re-exported, because a caller building the kind-context options has to
// name the type; loading a registry, parsing one, or asking it about a tag is imported
// from the package directly.
export type { TagRegistry } from "@galaxy-foundry/tag-registry";
