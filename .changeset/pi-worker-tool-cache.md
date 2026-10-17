---
"@galaxy-foundry/gxwf-pi-harness": minor
---

`runPiSkill` accepts `cacheDir`, a writable tool cache that outlives the worker. A local worker is told its path; a container worker gets it bind-mounted at `/tool-cache`. The run record names it as `invocation.cache_dir`.
