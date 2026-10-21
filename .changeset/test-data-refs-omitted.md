---
"@galaxy-foundry/gxwf-foundry": minor
---

`test-data-refs` gains `omitted: true` for an optional input the test leaves
unset after every leg of the chain came up empty. An omitted ref stays
`resolved: false`, names the Mold that omitted it and why, and carries no data,
so a reader that doesn't know the field still sees a gap rather than a fixture.
