# Research Note

A **Research Note** captures a finding about the domain or its tooling — the grounding a Mold
cites instead of inventing. It is the loosest kind on purpose: research arrives before you know
what shape it wants, and forcing it into a stricter kind on arrival loses it.

The discipline is not in the frontmatter, it is in the grading: a research note is good enough
only if the target skill could be **rebuilt from the note alone** — no re-reading the source, no
model memory. Hold the numbers, thresholds, exact procedure, and named decision criteria.

## Why each required field is required

Only the **base envelope**. A research note is `type` plus the envelope; everything else is
optional, because the kind's job is to accept a finding, not to interrogate it.

`summary` still applies (20–160 characters), and it does the most work here: with no `title`
required, the summary is what a browsing reader has to go on.

## Optional fields

- **`component`** — the subsystem the finding is about, when it is about one.
- **`license`** / **`license_file`** — required *in practice* whenever the note redistributes
  someone else's text. The id resolves against `license-policy.yml`; where the policy row says
  the licence text travels with the content, `license_file` points at the vendored copy under
  `LICENSES/`.
- **`companions`** — sibling files the cast copies verbatim beside the note.
