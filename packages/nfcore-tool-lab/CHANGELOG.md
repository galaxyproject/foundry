# @galaxy-foundry/nfcore-tool-lab

## 0.1.1

### Patch Changes

- [#766](https://github.com/galaxyproject/foundry/pull/766) [`01d2b58`](https://github.com/galaxyproject/foundry/commit/01d2b587690616873ed400ae24fa2ccec2f58603) Thanks [@jmchilton](https://github.com/jmchilton)! - Pin planemo 0.75.48. The vendored CLI metadata and test-report schema are
  regenerated against it (command list and schema unchanged), the
  gxwf-pi-harness container installs it and its default image tag names it, and
  nfcore-tool-lab now requires it through the test-report schema pin.
- Updated dependencies [[`01d2b58`](https://github.com/galaxyproject/foundry/commit/01d2b587690616873ed400ae24fa2ccec2f58603)]:
  - @galaxy-foundry/planemo-test-report-schema@0.2.2

## 0.1.0

### Minor Changes

- [#544](https://github.com/galaxyproject/foundry/pull/544) [`4689f4e`](https://github.com/galaxyproject/foundry/commit/4689f4e8dc78f16dd169f86eb290b26c92327343) Thanks [@jmchilton](https://github.com/jmchilton)! - Add a standalone CLI and typed API to prepare converted nf-core Galaxy tools for tools-iwc-lab. Apply the experimental namespace and display-name suffix without reserializing XML, generate lab Tool Shed metadata and documentation, and retain conversion provenance separately from preparation file hashes. No model execution, GitHub writes, or Tool Shed deployment is performed.

- [#560](https://github.com/galaxyproject/foundry/pull/560) [`029ce33`](https://github.com/galaxyproject/foundry/commit/029ce334f7c75f59134992e514779a49175abaac) Thanks [@jmchilton](https://github.com/jmchilton)! - Add credential-free staging of converted nf-core tools, with strict final-payload Planemo lint/Shed metadata/Galaxy tests, converter-bundle and artifact consistency checks, destination collision checks, and explicit hash-bound licensing/coverage review gates. Emit a separate validation report and draft PR proposal without pushing to GitHub or enabling Tool Shed deployment.
