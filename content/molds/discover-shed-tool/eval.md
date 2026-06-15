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
