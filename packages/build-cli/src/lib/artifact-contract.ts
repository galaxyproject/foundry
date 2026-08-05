// The pipeline handoff a Galaxy cast records: what a Mold produces, what it consumes, and which
// Mold produces each thing it consumes.
//
// This is instance vocabulary, not casting vocabulary. `@galaxy-foundry/cast` carried these
// types until 0.5.0 and stopped: a shared record that names one Foundry's domain makes every
// other Foundry's record wrong by construction. The package now reserves a slot in the
// provenance record and lets whoever fills it say what goes in — so the words live here, beside
// the frontmatter they are read from.
//
// A Foundry of research notes declares none of this and its records simply have no `artifacts`
// key. That is the property the split exists to allow.

/** Something a Mold produces, and the schema that says whether it came out right. */
export interface ProvenanceArtifactOutput {
  id: string;
  kind: string;
  default_filename: string;
  schema?: string;
  description: string;
}

/**
 * Something a Mold expects to be handed.
 *
 * `producers` is resolved at cast time rather than declared: a consumer names an `id`, and the
 * cast records which Molds in the corpus currently claim to emit it, so a harness can wire a
 * prior step's output path to a stable name without reading every Mold.
 */
export interface ProvenanceArtifactInput {
  id: string;
  description: string;
  inherited_schema?: string;
  producers?: string[];
}

/** Both halves of the handoff, as they appear under a record's `artifacts` key. */
export interface ProvenanceArtifacts {
  produces: ProvenanceArtifactOutput[];
  consumes: ProvenanceArtifactInput[];
}
