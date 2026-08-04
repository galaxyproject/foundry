---
"@galaxy-foundry/note-schema": minor
---

Stop erasing two shapes on the way out of the package: a Mold's typed references, and a
pipeline's phase grammar. Adds `KindReference`, `PipelinePhase` and `PhaseBranchItem`.

Both were declared `z.ZodType<unknown>` while the schemas beside them built the exact
object. A consumer that wanted to RENDER either had to describe it again from the outside,
and two of them did — a nine-field interface copied from the reference schema by reading it,
and a component prop typed `any[]` for phases.

All three types are `z.infer` of the schema rather than hand-written, which is the part that
matters. An interface beside a schema does not fail against it: most of these fields are
optional, so dropping `trigger` from the reference object leaves the output still assignable
to an interface that declares `trigger?`, everything compiles, and the Trigger row silently
stops rendering. `referenceShape` is hoisted out of `buildKindContext` so the schema and the
type are one description.

`branchItem` also loses a `z.lazy` wrapper that was never doing anything — the union does not
refer to itself, so there was nothing to defer.

The reference vocabularies stay `string` rather than the contract's enums: they come from
`reference_contract.yml` at runtime, and a compile-time literal union would be a second,
staler copy of a registry that is already the authority.

Not breaking: `unknown` accepted everything, so every existing annotation still holds. A
consumer that was *asserting* either shape can drop the assertion.
