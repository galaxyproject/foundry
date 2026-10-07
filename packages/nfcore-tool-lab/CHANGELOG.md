# @galaxy-foundry/nfcore-tool-lab

## 0.1.0

### Minor Changes

- [#544](https://github.com/galaxyproject/foundry/pull/544) [`4689f4e`](https://github.com/galaxyproject/foundry/commit/4689f4e8dc78f16dd169f86eb290b26c92327343) Thanks [@jmchilton](https://github.com/jmchilton)! - Add a standalone CLI and typed API to prepare converted nf-core Galaxy tools for tools-iwc-lab. Apply the experimental namespace and display-name suffix without reserializing XML, generate lab Tool Shed metadata and documentation, and retain conversion provenance separately from preparation file hashes. No model execution, GitHub writes, or Tool Shed deployment is performed.

- [#560](https://github.com/galaxyproject/foundry/pull/560) [`029ce33`](https://github.com/galaxyproject/foundry/commit/029ce334f7c75f59134992e514779a49175abaac) Thanks [@jmchilton](https://github.com/jmchilton)! - Add credential-free staging of converted nf-core tools, with strict final-payload Planemo lint/Shed metadata/Galaxy tests, converter-bundle and artifact consistency checks, destination collision checks, and explicit hash-bound licensing/coverage review gates. Emit a separate validation report and draft PR proposal without pushing to GitHub or enabling Tool Shed deployment.
