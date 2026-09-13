---
"@galaxy-foundry/gxwf-foundry-note-schema": patch
---

Require `@galaxy-foundry/cast` 0.12.3, which stops a re-cast that records nothing
else from restamping `cast_at` and `mold.commit`. On 0.12.2 a no-op `cast-all`
sweep rewrote all 49 `_provenance.json` files.
