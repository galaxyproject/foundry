# author-galaxy-tool-wrapper eval

This file is the **abstract oracle** for the `author-galaxy-tool-wrapper` Mold:
properties any authored Galaxy user-defined tool (UDT) must satisfy, independent
of fixture. Concrete fixtures and their expected values live in `scenarios.md`;
the oracle here is applied to whatever a scenario produces.

## Property: dependency evidence yields a permitted container

- bucket: requirements-fidelity
- check: deterministic
- assertion: source container and Conda evidence remains visible, while an
  emitted `container` satisfies the target Galaxy allowlist. Without explicit
  target evidence, it is a pinned image below `quay.io/biocontainers/`. The
  `shell_command` preserves the source process command intent, and the UDT
  passes the container-policy check, structural validation and mandatory critic
  review.

## Property: container-only evidence is mapped, not fabricated

- bucket: requirements-fidelity
- check: llm-judged
- assertion: when the source image is outside the target allowlist, the UDT uses
  a verified `recommend_biocontainer` result derived from source or command
  package evidence. If no permitted result is established, authoring stops with
  an unresolved container requirement rather than emitting the source image or
  inventing a tag.

## Property: container incompatibility is reported before testing

- bucket: deployment-policy
- check: deterministic
- assertion: under Galaxy's default UDT container policy, any emitted image has
  registry `quay.io`, a repository below `biocontainers/`, and a pinned tag or
  digest. Docker Hub, Wave and other registry images cannot pass from source
  evidence directly into the artifact.

## Property: target policy uses Galaxy matching and deny precedence

- bucket: deployment-policy
- check: deterministic
- assertion: target-specific policy evidence carries both allowed and denied
  entries. Namespace, image, tag and digest entries are compared using Galaxy's
  canonical matching rules, and any denied match wins. Under the default, a
  scheme-prefixed, tagless or non-BioContainers reference fails before schema
  validation.

## Property: recommender outcomes do not silently weaken requirements

- bucket: requirements-fidelity
- check: deterministic
- assertion: every required package is submitted in one recommendation request;
  exact-version results are policy-checked, name-only substitutions require
  confirmation, and absent, malformed, out-of-policy or verified-false results
  emit no UDT. The author never drops packages merely to obtain a container.

## Property: the emitted definition passes executable static validation

- bucket: structural-validity
- check: deterministic
- assertion: `gxwf validate-tool-source galaxy-user-tool.yml --json` exits zero
  without `--schema-only` after drafting and after critique. A missing validator
  is reported as `validation-not-run`, never treated as a pass.

## Property: policy discovery leaves no probe tool

- bucket: deployment-policy
- check: deterministic
- assertion: the author does not create a disposable UDT to discover policy. A
  400 from creating the requested tool may update policy evidence and trigger
  reselection, but an unrelated probe is never registered.

## Property: authoring does not duplicate discoverable wrappers

- bucket: discovery-guard
- check: llm-judged
- assertion: the Mold emits a UDT only when the [[discover-shed-tool]] result
  is `miss`, or `weak` with a candidate the caller's confirmation rejected. On
  `hit`, or a `weak` candidate the caller accepted, emitting
  `galaxy-user-tool.yml` is a failure.
