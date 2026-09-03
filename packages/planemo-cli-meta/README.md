# @galaxy-foundry/planemo-cli-meta

Vendored `planemo cli_metadata` command list. Parallels `@galaxy-tool-util/cli/meta` for gxwf and feeds the Foundry validator's cli-command coverage check (Foundry's `cli-command` notes must describe a command that planemo actually exposes).

Only command names + modules + hidden/internal flags are vendored — the per-command param tables stay in upstream planemo and the per-page generator (`scripts/sync-planemo-cli.ts`) reads them live.

## Install

```sh
pnpm add @galaxy-foundry/planemo-cli-meta
```

```ts
import {
  planemoCliMeta,
  planemoCliMetaProvenance,
} from "@galaxy-foundry/planemo-cli-meta";

const publicCommands = planemoCliMeta.commands.filter(
  ({ hidden, internal }) => !hidden && !internal,
);
```

The package also exports the vendored files directly as
`@galaxy-foundry/planemo-cli-meta/cli-meta.json` and
`@galaxy-foundry/planemo-cli-meta/provenance.json`.

## Sync

```sh
# 1. Pull cli_metadata from planemo (requires planemo on PATH).
pnpm sync:from-planemo

# 2. Regenerate the TS mirror from the JSON (no planemo needed).
pnpm sync
```
