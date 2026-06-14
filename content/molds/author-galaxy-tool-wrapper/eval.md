# author-galaxy-tool-wrapper eval

This file is the **abstract oracle** for the `author-galaxy-tool-wrapper` Mold:
properties any authored Galaxy user-defined tool (UDT) must satisfy, independent
of fixture. Concrete fixtures and their expected values live in `scenarios.md`;
the oracle here is applied to whatever a scenario produces.

## Property: container or package evidence is faithfully carried

- bucket: requirements-fidelity
- check: deterministic
- assertion: when the source process summary carries container or conda
  evidence, the authored `GalaxyUserTool` YAML's container/package evidence
  matches that source spec; the `shell_command` preserves the source process
  command intent; and the UDT passes structural validation plus mandatory critic
  review.

## Property: container-only evidence is mapped, not fabricated

- bucket: requirements-fidelity
- check: llm-judged
- assertion: when only a container image is evidenced and no conda spec is given,
  the UDT derives a plausible conda-equivalent requirement set, preserves
  command-stanza fidelity, and records uncertainty where the container-to-conda
  mapping is not directly evidenced rather than inventing a confident mapping.

## Property: authoring does not duplicate discoverable wrappers

- bucket: discovery-guard
- check: llm-judged
- assertion: when the process need corresponds to a tool that wrapper discovery
  should normally satisfy, the Mold does not author a duplicate UDT unless the
  discovery evidence is unacceptable; when it does fall through, it explains why
  the fallthrough was justified and compares the authored UDT shape against the
  existing wrapper's behavior.
