# discover-shed-tool eval

This file is the **abstract oracle** for the `discover-shed-tool` Mold:
properties any discovery recommendation must satisfy, independent of which step
need it ran on. Concrete fixtures and their expected pins live in
`scenarios.md`; the oracle here is applied to whatever a scenario produces.

## Property: unambiguous hit yields a fully pinnable quintuple

- check: deterministic
- assertion: when a step need resolves to a single dominant Tool Shed wrapper,
  the recommendation is an installable wrapper carrying owner, repo, tool id,
  version, and changeset revision.

## Property: ambiguous matches classify weak and surface alternates

- check: llm-judged
- assertion: when a step need matches multiple plausible wrappers across owners
  or similarly named repositories, the recommendation classifies the result as
  `weak`, explains the ambiguity, and surfaces alternates instead of silently
  pinning a low-confidence hit.

## Property: a wrapper that runs the named executable is never a miss

- check: llm-judged
- assertion: when a wrapper runs the executable or operation the need names,
  the result is `hit` or `weak` with that wrapper as `candidate`, even when the
  rationale doubts it fits the step. A `miss` that lists such a wrapper under
  `alternates` is a failure.

## Property: a miss survives query-variant normalization

- check: llm-judged
- assertion: a `miss` is not emitted on the strength of a single raw query when
  the need is a tool-id-shaped token (underscored or `owner/`-prefixed). Before
  falling through to authoring, the run tries lexical variants — strip the
  `owner/` prefix, split `_`/`-` into words, try the bare significant word — so a
  wrapper that exists under its human name (e.g. `integron finder` for an
  `integron_finder` token) is found rather than mistaken for absent. A `miss`
  that an obvious name-variant would have turned into a hit is a failure.

## Property: a substitution is applied by exact identity and stays reversible

- check: deterministic
- assertion: when the candidate replaces the tool the need names, its `owner`
  and `repo` equal the substitution table's row, `warnings` contains exactly one
  `efficient-substitution` entry naming the replaced tool, and `alternates`
  contains a resolved pin for the replaced tool. A candidate chosen from the
  table without that warning, or a swap whose original pin is missing, is a
  failure.

## Property: an applicable opt-out keeps the original tool

- check: llm-judged
- assertion: when the need states an input, setting, or downstream consumer
  that matches one of the row's opt-out conditions, the candidate is the
  original tool, no `efficient-substitution` warning is emitted, and `rationale`
  names the opt-out. Swapping despite a stated opt-out is a failure.
