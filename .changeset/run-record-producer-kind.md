---
"@galaxy-foundry/gxwf-foundry-note-schema": minor
---

Allow a runtime artifact to declare an always-on `harness` producer alongside the
existing opt-in `runtime-mode` one. A `runtime-mode` artifact names the flag that
turns it on; a `harness` artifact is written on every run and must not name one.
Adds `runtimeProducerId` and `runtimeModeOption` so consumers read the producer
token and the flag name without narrowing the union themselves.

`RuntimeArtifactDefinition.producer` is now a union, so `producer.option` no
longer typechecks without narrowing on `producer.kind`. Read the flag with
`runtimeModeOption(artifact)`, which returns null for a `harness` artifact.
