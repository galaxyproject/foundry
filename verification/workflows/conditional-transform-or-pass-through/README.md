# Conditional: transform or pass through

Verifies `[[conditional-transform-or-pass-through]]`: a `when`-gated transform merged with its own ungated input by `pick_value`, so downstream gets the transformed value when the transform runs and the original otherwise.

The transform is `tp_replace_in_line` adding `.H1` to every FASTA header, the same tool and pin the VGP Hi-C suffixing branch gates. It must change the bytes. With an identity transform such as `cat1`, the true case would pass even if `pick_value` returned the original.

`transformed_or_original` uses `pick_style: first` with the transform in `pick_from_0` and the original in `pick_from_1`.

- Gate on: `selected` equals `suffixed.fasta`. Both candidates are non-null here, so this shows the earlier slot wins.
- Gate off: `selected` equals `original.fasta`. The skipped step's output reaches `pick_value` as null and the original passes through. A merge that returned null would write the text `null` and fail this comparison.

`original_first` is the same merge with the slots reversed. With the gate on, it returns the original even though the transform ran, which is the ordering pitfall the page warns about.

Not covered here:

- `pick_style: only`. The original is always non-null, so `only` errors whenever the transform runs, and an errored dataset fails a Planemo test. The wrapper's expression in `iuc/pick_value` 0.2.0 shows the error path.
- Missing `pick_from` entries in `tool_state`. The route fixture `conditional-route-between-alternative-outputs` already covers that.
- Per-element gating. That needs a collection of booleans as the `when` source, which no small in-tree fixture here produces.

Run from this directory:

```sh
gxwf validate transform-or-pass-through.gxwf.yml
gxwf validate-tests transform-or-pass-through.gxwf-test.yml
planemo test transform-or-pass-through.gxwf.yml --galaxy_branch release_26.1 --galaxy_python_version 3.11
```

On 2026-10-21, Planemo 0.75.44 ran both tests against Galaxy `release_26.1` and both passed.
