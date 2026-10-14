---
"@galaxy-foundry/gxwf-foundry-note-schema": minor
---

Export the pipeline harness assembly contract: `AssemblyManifest`, the
`AssemblyPhase` union of `AssemblyMoldPhase` and `AssemblyBranchPhase`, the
`ASSEMBLY_FILE` name, and `loadAssemblyManifest(file, pipeline)`, which reads an
`_assembly.json` and throws when it is missing or is not that pipeline's
assembly. The assembler, the build CLI's readers and the site now share these
instead of each declaring the shape.
