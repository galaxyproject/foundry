---
"@galaxy-foundry/gxwf-foundry-note-schema": minor
---

`cli-command` names the document a page summarizes `source_url`, constrained to a URL, and owes
one exactly where the page really is a summary of something else.

The field is the sibling Foundry's name and constraint for the same idea, so one spelling now
means one thing across both instances rather than three fields sharing a stem and disagreeing.
It is distinct from the `schema` kind's `upstream`, which stays: there the field records where a
**vendored** artifact came from, and a cross-field rule keys off whether it points outside this
repository. Summarizing an external command is not vendoring it.

The accompanying validator rule replaces a blanket "must declare upstream" with the condition
that actually holds. A command this repository implements has no second place for a reader to
check, and eight pages pointed at one `program.ts` in this very tree; those now carry no
`source_url` and are rejected if they grow one. Every other cli-command page must declare one.
The split keys off `foundryCliMeta` — the same program metadata the corpus check already
imports — rather than a name pattern, so a command added to our own CLI is classified by the
thing that knows.
