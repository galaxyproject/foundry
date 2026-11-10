# Per-element parameter from file

Verifies the "Per-element parameters from `meta`" route in `[[nextflow-to-galaxy-channel-shape-mapping]]`: a mapped `param_value_from_file` gives each element of a mapped `Show beginning1` step its own `lineNum`.

The two elements carry different values, 1 for `a` and 3 for `b`, so a step parameterized once for the whole collection fails one of the two assertions.

Both cases pass the values as a separate input rather than computing them from `reads`. The second case passes them in the opposite identifier order, and Galaxy pairs elements by position, so `a` gets 3 and `b` gets 1.

On 2026-11-10, Planemo 0.75.48 ran both cases against Galaxy `release_26.1` and both passed.
