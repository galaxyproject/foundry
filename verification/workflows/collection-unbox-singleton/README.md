# Collection: unbox singleton

Verifies `[[collection-unbox-singleton]]`: `__EXTRACT_DATASET__` with `which: first` turns a one-element collection into a plain dataset that dataset-consuming steps and workflow outputs can take.

The fixture runs the same step twice. `unbox_singleton` is the attested shape. `unbox_multi` feeds a two-element list to the identical step and asserts the output is the *first* element, which is the page's central pitfall: `which: first` does not fail or warn when the collection is not actually a singleton, so the step is an unchecked assertion about upstream.

Both outputs are datasets, not collections, which is the other half of the claim.
