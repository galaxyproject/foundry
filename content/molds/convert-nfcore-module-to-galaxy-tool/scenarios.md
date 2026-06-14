# convert-nfcore-module-to-galaxy-tool scenarios

Concrete cases for `convert-nfcore-module-to-galaxy-tool`, exercised against the abstract properties in `eval.md`. Each case binds a module-source fixture and states what its cast output is expected to contain; the `eval.md` oracle is applied to whatever the case produces.

## Case: generated wrapper readiness

- fixture: cast output for one nf-core module directory with `main.nf`, `meta.yml`, `environment.yml`, and at least one usable nf-test fixture.
- expect: generated tool directory contains a complete Galaxy wrapper, local macros, provenance, requirements, inputs, outputs, help, citations when source metadata provides them, and at least one runnable test; `planemo lint` and `planemo test --test_output_json` either pass or produce structured artifacts ready for focused repair.

## Case: module fidelity review

- fixture: same module source and generated Galaxy tool directory.
- expect: wrapper command, parameters, requirements, output declarations, test fixtures, and recorded provenance look faithful to the underlying Nextflow module. Any intentional divergence, unresolved mapping, or missing fixture is visible rather than silently papered over.
