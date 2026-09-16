# @galaxy-foundry/gxwf-pi-harness

## 0.4.1

### Patch Changes

- [#542](https://github.com/galaxyproject/foundry/pull/542) [`b73ef1f`](https://github.com/galaxyproject/foundry/commit/b73ef1ffc5f803987daedd358250c0bbc60288e6) Thanks [@jmchilton](https://github.com/jmchilton)! - Supply the frozen cast bundle hash as worker runtime metadata and verify that conversion provenance records that same identity. Read cast provenance and artifact validators from the frozen bundle rather than the mutable source checkout.

## 0.4.0

### Minor Changes

- [#530](https://github.com/galaxyproject/foundry/pull/530) [`a256932`](https://github.com/galaxyproject/foundry/commit/a25693215c565bef2d2fd7fed6abd4fb1b2393bf) Thanks [@jmchilton](https://github.com/jmchilton)! - Install and record the pinned Planemo runtime in the clean-room worker image so Galaxy artifact skills can lint and test their outputs.

### Patch Changes

- Updated dependencies []:
  - @galaxy-foundry/gxwf-foundry@0.1.2

## 0.3.0

### Minor Changes

- [#498](https://github.com/galaxyproject/foundry/pull/498) [`4e910ae`](https://github.com/galaxyproject/foundry/commit/4e910ae19c1d9febf0b2fa8c0f1ba2b911a89f68) Thanks [@jmchilton](https://github.com/jmchilton)! - Allow Molds to declare optional input and output artifacts. Cast provenance now preserves
  optionality, and the harness permits declared optional outputs to be absent without failing a run.

## 0.2.0

### Minor Changes

- [#489](https://github.com/galaxyproject/foundry/pull/489) [`7e77059`](https://github.com/galaxyproject/foundry/commit/7e77059a07754409b866cb7317a66453fc80c151) Thanks [@jmchilton](https://github.com/jmchilton)! - Add isolated OpenAI/Codex OAuth management and opt-in local test-run authentication.

### Patch Changes

- [#495](https://github.com/galaxyproject/foundry/pull/495) [`9d98884`](https://github.com/galaxyproject/foundry/commit/9d98884264014dcec08849d1c01522c040d3de13) Thanks [@jmchilton](https://github.com/jmchilton)! - Resolve the packaged Foundry CLI directly when independently validating worker artifacts.

## 0.1.0

### Minor Changes

- [#488](https://github.com/galaxyproject/foundry/pull/488) [`009a727`](https://github.com/galaxyproject/foundry/commit/009a7277a2ada12474cc5a1ce82238f0af4844a8) Thanks [@jmchilton](https://github.com/jmchilton)! - Add the initial Pi-backed single-skill worker runner and constrained Foundry subagent extension.
