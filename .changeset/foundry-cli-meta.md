---
"@galaxy-foundry/foundry": minor
---

Add browser-safe `./meta` subpath export (`foundryCliMeta`) so consumers can render per-subcommand documentation from static program metadata without invoking commander or shelling out to `foundry --help`. The bin is refactored: `buildProgram()` is now importable from `@galaxy-foundry/foundry`'s internal `program.ts`, and the bin entry point is a thin parse-argv shim.
