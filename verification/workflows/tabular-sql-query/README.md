# Tabular SQL query verification

This workflow checks a named-table join and a window calculation against two small input tables. Both inputs have a header skipped before import. The query emits its own header and orders the three rows. The expected output checks values, cohort denominators, header, and row order exactly.

Run `gxwf validate sql-query.gxwf.yml`, `gxwf validate-tests sql-query.gxwf-test.yml`, and `planemo test sql-query.gxwf.yml --galaxy_branch release_25.1 --no_dependency_resolution` from this directory. The Tool Shed revision `cf4397560712` and tool version `3.3.2` come from the pinned MAPseq IWC workflow at commit `deafc4876f2c778aaf075e48bd8e95f3604ccc92`. The combined join and window query is a Foundry test case, not an IWC step copied verbatim.

On 2026-10-01, Planemo passed the exact-output test against Galaxy `release_25.1` with `--no_dependency_resolution`. This host already had a usable Python for the wrapper. The default Conda resolver repeatedly failed to install the wrapper's declared Python 3.7 dependency, so the passing run disabled that resolver.
