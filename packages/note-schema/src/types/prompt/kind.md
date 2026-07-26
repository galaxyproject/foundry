# Prompt

A **Prompt** note carries a raw upstream prompt — someone else's, verbatim — in a sibling file,
and records where it came from and under what licence.

The verbatim file is the whole point. A prompt paraphrased is a different prompt, so the text
lives untouched in its own file and the note carries the provenance around it. Casting copies
the file across unchanged.

## Why each required field is required

- **`title`** — prose, for the reader.
- **`prompt_file`** — the sibling-relative path to the raw text. Separate from the note body so
  the prompt is never accidentally reflowed, summarized, or wiki-linked by an editor working on
  the note.
- The **base envelope** — as on every kind.

## Optional fields

- **`license`** / **`license_file`** — optional in the schema, but a prompt taken from an
  external project is redistributed text: name the licence, and vendor the licence file under
  `LICENSES/` where the policy row calls for it. The schema does not force this the way the
  `schema` kind does, because a prompt authored here has no upstream to name.
