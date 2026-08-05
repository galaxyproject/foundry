---
"@galaxy-foundry/note-schema": minor
---

Stop erasing three shapes on the way out of the package: a Mold's typed references, a Mold's
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
consumer that was *asserting* any of these shapes can drop the assertion.
