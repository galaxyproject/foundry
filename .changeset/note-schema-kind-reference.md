---
"@galaxy-foundry/note-schema": minor
---

Export `KindReference`, the shape of one entry in a Mold's typed reference manifest, and
give `KindContext.reference` that type instead of `z.ZodType<unknown>`.

The schema already built the exact object — `kind`, `ref`, `used_at`, `load`, `mode`,
`evidence`, and the optional `purpose` / `trigger` / `verification`. Declaring the field as
`unknown` threw that away at the package boundary, so a consumer that wanted to RENDER a
reference had to describe the nine fields again from the outside. One did, and nothing
compared the two descriptions.

The vocabularies stay `string` rather than the contract's enums. Those come from
`reference_contract.yml` at runtime; a compile-time literal union would be a second, staler
copy of a registry that is already the authority.

Not breaking: `unknown` accepted everything, so every existing annotation still holds. A
consumer that was *asserting* the shape can drop the assertion.
