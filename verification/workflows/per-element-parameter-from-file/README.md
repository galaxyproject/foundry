# Per-element parameter from file

Verifies the "Per-element parameters from `meta`" route in `[[nextflow-to-galaxy-channel-shape-mapping]]`: a mapped `param_value_from_file` gives each element of a mapped step its own parameter value.

`per-element-parameter.gxwf.yml` sets `Show beginning1`'s integer `lineNum`. The two elements carry 1 for `a` and 3 for `b`, so a step parameterized once for the whole collection fails one of the two assertions. Its second case passes the values in the opposite identifier order, and Galaxy pairs elements by position, so `a` gets 3 and `b` gets 1.

`per-element-select-boolean.gxwf.yml` covers the other target kinds on identical rows. Text values `C` and `D` choose `Cut1`'s `select` `delimiter`, so `a` keeps `y-z` and `b` keeps `z`. Booleans `true` and `false` set `wc_gnu`'s `include_header`, so only `a` gets the `#lines` header.

All cases pass the values as a separate input rather than computing them from the data.

On 2026-11-10, Planemo 0.75.48 ran all three cases against Galaxy `release_26.1` and all passed.
