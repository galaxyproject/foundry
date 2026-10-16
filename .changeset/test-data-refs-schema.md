---
"@galaxy-foundry/gxwf-foundry": minor
---

Add the `test-data-refs` schema and `foundry validate-test-data-refs`. The
test-data-resolution chain (a source-specific Mold, then `find-test-data`)
writes one ref per workflow input, each either resolved, naming the Mold that
resolved it, or an honest gap with a reason, so whether the chain is done can
be read from the file. A ref's `fixture` is the test plan's `Fixture` shape.
Exports `testDataRefsSchema` and `testDataRefsValidator`.
