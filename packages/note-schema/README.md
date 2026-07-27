# @galaxy-foundry/note-schema

Single source of truth for Galaxy Workflow Foundry **note frontmatter**.

One zod schema, built by `buildNoteSchema({ tags, contract, licensePolicy })`, is
shared by both consumers of the frontmatter contract:

- the validator (`@galaxy-foundry/build-cli` → `foundry-build validate`), and
- the Astro site's content collection (`site/src/content.config.ts`).

It replaces the former two-encoding pair — a hand-written `meta_schema.yml`
(ajv/JSON Schema) plus a parallel hand-written site zod schema — which had to be
kept in lockstep by hand and drifted (e.g. the `prompt` note type existed in one
encoding but not the other).

The controlled enums are injected at call time from the registries so the schema
and the registries can never diverge:

- `meta_tags.yml` → allowed `tags[]` (facets, each declaring its members and their glosses)
- `reference_contract.yml` → allowed `references[]` vocab
- the license table → allowed `license` ids

The first two are ours, at the repo root, and their loaders (`loadTagRegistry`,
`loadReferenceContract`) are exported from here.

The license table is not ours. It is shared across Foundry instances, so it ships
in [`@galaxy-foundry/license-policy`](https://www.npmjs.com/package/@galaxy-foundry/license-policy);
callers get it from `bundledPolicy()` and pass it in. Only the `LicensePolicy` type
is re-exported here, because you need to name it to build the options object —
`resolveLicenseRow`, `isValidLicenseId` and the rest come from that package
directly, so there is one place to look and no name list here to drift.

`loadTagRegistry` returns a registry object rather than a bare list: tag membership
is *declared* by a facet's `values`, never parsed off the `/` prefix, so callers ask
it (`isValidTag`, `facetOf`, `tagDescription`, `facets`) instead of matching strings.
