# @galaxy-foundry/planemo-cli-meta

Vendored `planemo cli_metadata` command list. Parallels `@galaxy-tool-util/cli/meta` for gxwf and feeds the Foundry validator's cli-command coverage check (Foundry's `cli-command` notes must describe a command that planemo actually exposes).

Only command names + modules + hidden/internal flags are vendored — the per-command param tables stay in upstream planemo and the per-page generator (`scripts/sync-planemo-cli.ts`) reads them live.

## Sync

```sh
# 1. Pull cli_metadata from planemo (requires planemo on PATH).
pnpm sync:from-planemo

# 2. Regenerate the TS mirror from the JSON (no planemo needed).
pnpm sync
```
