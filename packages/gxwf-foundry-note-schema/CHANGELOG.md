# @galaxy-foundry/gxwf-foundry-note-schema

## 0.1.0

### Minor Changes

- [#449](https://github.com/galaxyproject/foundry/pull/449) [`1ead2a7`](https://github.com/galaxyproject/foundry/commit/1ead2a7b83c58b2b1ee796567acf23c1eef5341e) Thanks [@jmchilton](https://github.com/jmchilton)! - `cli-command` names the document a page summarizes `source_url`, constrained to a URL, and owes
  one exactly where the page really is a summary of something else.

  The field is the sibling Foundry's name and constraint for the same idea, so one spelling now
  means one thing across both instances rather than three fields sharing a stem and disagreeing.
  It is distinct from the `schema` kind's `upstream`, which stays: there the field records where a
  **vendored** artifact came from, and a cross-field rule keys off whether it points outside this
  repository. Summarizing an external command is not vendoring it.

  The accompanying validator rule replaces a blanket "must declare upstream" with the condition
  that actually holds. A command this repository implements has no second place for a reader to
  check, and eight pages pointed at one `program.ts` in this very tree; those now carry no
  `source_url` and are rejected if they grow one. Every other cli-command page must declare one.
  The split keys off `foundryCliMeta` — the same program metadata the corpus check already
  imports — rather than a name pattern, so a command added to our own CLI is classified by the
  thing that knows.

- [#439](https://github.com/galaxyproject/foundry/pull/439) [`75b5c46`](https://github.com/galaxyproject/foundry/commit/75b5c469e0e79f11043800343047db122c22826a) Thanks [@jmchilton](https://github.com/jmchilton)! - Stop erasing three shapes on the way out of the package: a Mold's typed references, a Mold's
  declared artifacts, and a pipeline's phase grammar. Adds `KindReference`, `OutputArtifact`,
  `InputArtifact`, `PipelinePhase` and `PhaseBranchItem`.

  The references and the phase grammar were declared `z.ZodType<unknown>` while the schemas
  beside them built the exact object; the artifact declarations were simply unexported. A
  consumer that wanted to RENDER any of them had to describe it again from the outside, and
  three did — a nine-field interface copied from the reference schema by reading it, two more
  copied from the mold schema, and a component prop typed `any[]` for phases.

  Every one of these is `z.infer` of its schema rather than hand-written, which is the part
  that matters. An interface beside a schema does not fail against it when the fields are
  optional: drop `trigger` from the reference object, or `schema` from the output artifact, and
  the output stays assignable to an interface that declares them optional — everything
  compiles, and a row quietly stops rendering. `referenceShape` is hoisted out of
  `buildKindContext` so the schema and the type are one description.

  `branchItem` also loses a `z.lazy` wrapper that was never doing anything: the union does not
  refer to itself, so there was nothing to defer.

  The reference vocabularies stay `string` rather than the contract's enums. They come from
  `reference_contract.yml` at runtime, and a compile-time literal union would be a second,
  staler copy of a registry that is already the authority.

  Not breaking: `unknown` accepted everything, so every existing annotation still holds. A
  consumer that was _asserting_ any of these shapes can drop the assertion.

- [#387](https://github.com/galaxyproject/foundry/pull/387) [`a10e1d6`](https://github.com/galaxyproject/foundry/commit/a10e1d613c16db4d1b8fe40334f3519e32420be6) Thanks [@jmchilton](https://github.com/jmchilton)! - Consume the shared license table from `@galaxy-foundry/license-policy` instead of loading a
  repo-local `license-policy.yml`.

  **Breaking for importers.** The barrel no longer re-exports `loadLicensePolicy`,
  `findLicensePolicyPath`, `licenseIds`, `isValidLicenseId`, `resolveLicenseRow`,
  `LICENSE_POLICY_FILE`, `LICENSE_REF_RE`, `LicenseRow`, `CastMode`, or
  `RedistributionPolicy`. Import them from `@galaxy-foundry/license-policy` directly. Only
  the `LicensePolicy` type is still re-exported, since callers must name it to build the
  `buildNoteSchema` options object.

  `buildNoteSchema` is unchanged — it still takes a `licensePolicy`. Callers that used to
  pass `loadLicensePolicy(repoRoot)` now pass `bundledPolicy()`.

- [#389](https://github.com/galaxyproject/foundry/pull/389) [`bf39a96`](https://github.com/galaxyproject/foundry/commit/bf39a9669d5c3a98c66c4cbebd27d539ffa8efb3) Thanks [@jmchilton](https://github.com/jmchilton)! - Consume the `meta_tags.yml` format from `@galaxy-foundry/tag-registry` instead of a
  repo-local loader. `src/tags.ts` is deleted; the facet vocabulary stays at our repo root,
  because that package deliberately ships none — facets are the browse axes of one domain.

  **Breaking for importers.** The barrel no longer re-exports `loadTagRegistry`,
  `tagRegistry`, `buildTagIndex`, `TagRegistryFile`, `Facet`, or `FacetInfo`. Import them
  from `@galaxy-foundry/tag-registry` directly. Only the `TagRegistry` type is still
  re-exported, since callers must name it to build the kind-context options — the same
  arrangement as `LicensePolicy`.

  `buildNoteSchema` and `buildKindContext` are unchanged: both still take a `tags` registry
  of the same shape.

  The package validates what neither loader did. `loadTagRegistry` now refuses a registry
  with no `facets` block, a facet missing `label`/`description`, a tag with no gloss, or a
  tag two facets both declare — naming the file. Previously these arrived as an `undefined`
  somewhere downstream.

- [#483](https://github.com/galaxyproject/foundry/pull/483) [`d9e6f1a`](https://github.com/galaxyproject/foundry/commit/d9e6f1af7f90021ff5033a1d9c32541cd2ae2cdc) Thanks [@jmchilton](https://github.com/jmchilton)! - Publish the gxwf-specific Foundry CLI and note schema under names that leave
  room in the `@galaxy-foundry` scope for other Foundry implementations.

### Patch Changes

- [#453](https://github.com/galaxyproject/foundry/pull/453) [`e9bd4b6`](https://github.com/galaxyproject/foundry/commit/e9bd4b6a86adc87e2321be12019420ed014adad4) Thanks [@jmchilton](https://github.com/jmchilton)! - Take `@galaxy-foundry/license-policy` 0.4, which renames `licenseIdFromFilePath` to
  `licenseFileIdFromPath` and `LicenseFile.licenseId` to `LicenseFile.id`.

  Nothing this package imports was renamed — `bundledPolicy`, `isValidLicenseId` and
  `resolveLicenseRow` are unchanged, and the only type re-exported from the barrel is still
  `LicensePolicy`. The bump is here because a caret range on a `0.x` version pins the minor, so an
  importer resolving both packages would otherwise be held at 0.3.

- [#482](https://github.com/galaxyproject/foundry/pull/482) [`c694e2a`](https://github.com/galaxyproject/foundry/commit/c694e2a1472a8b591b24fbecd2ca812384c2c8f1) Thanks [@jmchilton](https://github.com/jmchilton)! - Publish the vendored Planemo CLI command inventory and test-report schema with
  their typed APIs, raw JSON exports, validators, and upstream provenance.
