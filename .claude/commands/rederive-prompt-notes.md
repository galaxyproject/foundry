---
description: Re-derive the Foundry-authored notes distilled from vendored upstream prompts after those prompts drift.
argument-hint: "[note-slug]  (default: all derived prompt notes)"
---

# Re-derive a note from its vendored upstream prompts

Foundry does not cast upstream prompts. It vendors them for provenance and casts a **derived** note written against them. When upstream churns, the vendored copy moves and the derived note goes stale silently — this command is how it catches up.

Target: `$1` if given, otherwise every pair below.

## The pairs

| Derived note | Vendored sources |
| --- | --- |
| `content/research/galaxy-user-tool-authoring/` | [[custom-tool-structured]], [[custom-tool-container-critic]] |
| `content/research/galaxy-user-tool-critique/` | [[custom-tool-critic]] |

## 1. Establish what moved

```sh
npm run check:vendored
```

This compares each vendored file against the *checkout* named in `common_paths.yml`, not against `pinned_ref` — so it reports drift only when your clone is on the ref you intend to vendor. Put the Galaxy clone on that ref first, or read the diff directly:

```sh
git -C <galaxy> diff <old-sha> <new-sha> -- lib/galaxy/agents/prompts/
```

Read that diff in full before touching the derived note. It is the whole input to this operation.

## 2. Re-vendor

`npm run sync:vendored` copies from the checkout's working tree and rewrites **every** entry's `pinned_ref` and framing SHA to that checkout's HEAD. On a clone sitting on some other branch it will churn unrelated vendored files. Either put the clone on the intended ref, or copy the prompts by hand and set the SHAs yourself:

```sh
git -C <galaxy> show <sha>:lib/galaxy/agents/prompts/<file>.md > content/prompts/galaxy/<slug>/upstream.prompt
```

Then update, in each affected prompt note: `sources:` URL, the pinned SHA in the "Vendored from upstream" blockquote, `revised:`, `revision:`, and the matching entries in `vendored_upstreams.yml`.

## 3. Rewrite the derived note

The derived note is not a paraphrase and not a copy. It is the upstream prompt with the host harness removed and everything else preserved.

**Strip — assumptions that hold only inside Galaxy's agent runtime:**

- Output grammars. Upstream constrains generation with `output_type=UserToolSourceAuthoringView`, so its prose only nudges. A cast has no grammar, so every rule has to actually hold and be validated.
- Post-generation rewriting. Anything phrased as "Galaxy will fix this for you afterwards" is a promise the harness cannot keep.
- Pydantic wire formats — `CritiqueReport`, allowed `(target, attribute)` edit pairs, `needs_full_refine`. Keep the *criteria* behind them; drop the transport.
- Second-person agent framing ("You are a Galaxy tool generator").

**Keep — everything a draft can fail on:**

- Every literal constraint: types, list-vs-string, min lengths, id patterns, allowed keys, rejected keys.
- Every asymmetry that reads backwards (an input `format` list against an output `format` string).
- Every worked example that demonstrates a rule, and every CRITICAL rule, in substance.
- Every named decision criterion — inline-vs-configfile, text-level-vs-structural, when to say "I don't know".

**Section for lift-out.** Material that is not actually about the target — running a script, inferring dependencies from a command — goes in its own self-contained section, so a sibling target can lift it without a rewrite.

**Name the divergences.** Close the note with a section stating what the source prompt assumes that this harness does not. A silently dropped assumption is the failure this whole arrangement exists to prevent.

## 4. Keep the prompt wrappers honest

Each vendored `index.md` says when to consult it. When upstream moves a concern between prompts, that line goes stale first — it once told readers to critique container choice for a prompt that had come to forbid it. Point each wrapper at the derived note that now carries its content.

## 5. Gate

```sh
npm run validate     # 0 errors; warning count unchanged
make casts           # regenerate bundles
make check-casts     # byte-diff drift gate
```

Confirm the bundle actually changed shape — `casts/claude/skills/<mold>/references/notes/` should carry the derived notes, and no stale prompt should remain under `references/prompts/`.

## 6. Report

State the SHA range, what moved upstream, which rules were added or changed in the derived note, which upstream additions were deliberately *not* carried and why, and any wrapper framing that had gone stale.
