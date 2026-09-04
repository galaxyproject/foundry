# Prompt

A **Prompt** note carries a raw upstream prompt — someone else's, verbatim — in a sibling file,
and records where it came from and under what licence.

The verbatim file is the whole point. A prompt paraphrased is a different prompt, so the text
lives untouched in its own file and the note carries the provenance around it. Casting copies
the file across unchanged.

## Shape

A prompt is a **directory**, not a file:

```
content/prompts/<area>/<slug>/
  index.md         the note — provenance, licence, usage framing
  upstream.prompt  the verbatim text, byte for byte
```

The name `upstream.prompt` is fixed. It was once a `prompt_file:` frontmatter field, which
meant every note restated a convention it could not vary usefully — and a restated convention
is a thing that can disagree with itself. The validator now asks whether the file is *there*,
which is the question worth asking; there is no declared path left to be wrong about.

This kind is **instance-specific**: it exists because this Foundry redistributes prompts it did
not author. A Foundry that writes all its own prompts has no upstream provenance to record.

## Why each required field is required

- **`title`** — prose, for the reader.
- The **base envelope** — as on every kind.

The raw text is deliberately not a frontmatter field and deliberately not the note body: kept
separate, it can never be reflowed, summarized, or wiki-linked by an editor working on the note.

## Optional fields

- **`license`** / **`license_file`** — optional in the schema, but a prompt taken from an
  external project is redistributed text: name the licence, and vendor the licence file under
  `LICENSES/` where the policy row calls for it. The schema does not force this the way the
  `schema` kind does, because a prompt authored here has no upstream to name.

`example.md` illustrates the frontmatter only. Neither the `license_file` it names nor the
`upstream.prompt` a real note sits beside is shipped next to the example — in the corpus the
validator resolves both and fails if either is missing.
