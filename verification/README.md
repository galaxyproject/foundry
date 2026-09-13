# Verified workflows

This tree holds small, checked-in Galaxy workflows used to verify Foundry pattern claims.

Each workflow is intentionally narrow: it should exercise one pattern operation end to end and keep all inputs plus expected outputs in-tree when they are byte-scale.

## Layout

Verified workflows live under `verification/workflows/<slug>/`.

Each workflow directory should contain:

- `README.md` explaining what is verified and why this workflow shape was chosen.
- One workflow file, usually `.gxwf.yml`.
- One Planemo workflow test file.
- `test-data/` with tiny inputs and expected baselines.

Pattern pages link directly to the workflow test case through `verification_paths` frontmatter.

## Asserting collection outputs

Planemo 0.75.47 checks a workflow output as a collection only when its test block carries an `element_tests` key. The newer `class: Collection` / `elements:` spelling used by Galaxy's own framework workflow tests is **silently ignored** here — the output falls back to a dataset comparison and the test fails with "No path specified for expected output file". Collection type and element count live under `attributes.type` and `element_count`; a top-level `collection_type` is dropped without complaint.

```yaml
outputs:
  flat:
    attributes:
      type: list
    element_count: 3
    element_tests:
      sampleA_seg1:
        file: test-data/a1.txt
```

Nest `element_tests` inside an element to reach into a `list:list`, and use `count` (not `element_count`) at that inner level.

## Local runs

From a workflow directory, run Planemo directly:

```sh
planemo lint *.gxwf.yml
planemo test *.gxwf.yml --galaxy_branch release_25.1
```

Use the exact workflow filename once a directory has more than one experimental file. Planemo 0.75.41 recognizes `.gxwf.yml` plus `.gxwf-test.yml` for these fixtures.

## Eligibility

A verified workflow should be committed only when it is deterministic, small, and explains what claim it verifies.

Prefer in-tree test data for tiny fixtures. Do not use Zenodo or remote fixtures for byte-scale inputs.

This v1 surface deliberately avoids generators, RO-Crate metadata, Dockstore wiring, scheduled Galaxy-version matrices, and IWC-style sharding.
