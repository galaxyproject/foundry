# Tabular: relabel by row counter

This fixture checks three `tp_awk_tool` programs. The first two count every line of a two-column input, including its header, and replace each line with a one-column label. The third uses a separate one-column input so its preserved header has the same shape as the labels. It starts the data rows at `sample_0`. The output assertions check values and row counts, not merely job success.

Run `gxwf validate relabel-by-row-counter.gxwf.yml`, `gxwf validate-tests relabel-by-row-counter.gxwf-test.yml`, and `planemo test relabel-by-row-counter.gxwf.yml --galaxy_branch release_25.1` from this directory. The expected files can also be checked directly with awk when Galaxy is unavailable.

On 2026-09-30, Planemo ran this workflow against Galaxy `release_25.1` with `text_processing` revision `ab83aa685821`. All three jobs completed and the one test case passed its exact-output assertions. The pinned IWC source at commit `deafc4876f2c778aaf075e48bd8e95f3604ccc92` contains the observed `gsub` program at step 34. This fixture checks the direct-print alternatives, including the corrected header offset.
