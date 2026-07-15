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

The controlled enums are injected at call time from the repo-root registries so
the schema and the registries can never diverge:

- `meta_tags.yml` → allowed `tags[]`
- `reference_contract.yml` → allowed `references[]` vocab
- `license-policy.yml` → allowed `license` ids

The registry loaders (`loadTags`, `loadReferenceContract`, `loadLicensePolicy`,
`resolveLicenseRow`, `isValidLicenseId`) are exported from here too, so the
validator, the caster, and the site's license UI share one implementation.
