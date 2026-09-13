---
"@galaxy-foundry/gxwf-foundry-note-schema": minor
---

Export wiki-link addressing beside `COLLECTIONS`: `readGalaxyContent` walks a content tree through
`@galaxy-foundry/content-reader`, `GALAXY_SLUG_ALIASES` names the second addresses a Galaxy note
answers to (`<tool> <command>` for a cli-command), and `collectionPrefix` gives the path segment a
collection publishes under — which is not its name for `cli-tools` and `cli-commands`, the two that
share one directory.

The rule already shipped in the reader; the vocabulary lived in the build CLI while the CLI was its
only reader, and the site resolved links by a second walk that disagreed. It belongs next to the
routing table both of them read from.

Requires `@galaxy-foundry/content-reader` ^0.4.0, whose index reports `duplicateAddresses` — the
addresses two or more routed notes claimed.
