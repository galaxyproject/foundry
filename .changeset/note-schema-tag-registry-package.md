---
"@galaxy-foundry/gxwf-foundry-note-schema": minor
---

Consume the `meta_tags.yml` format from `@galaxy-foundry/tag-registry` instead of a
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
