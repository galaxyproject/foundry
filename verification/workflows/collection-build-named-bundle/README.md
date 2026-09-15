# Collection: build named bundle

Verifies `[[collection-build-named-bundle]]`: the three `id_select` settings and the `datasets` repeat that carries them.

Three `__BUILD_LIST__` steps consume the identical pair of extracted datasets and differ only in `id_cond.id_select`. `manual` uses the authored strings. `identifier` inherits `alpha` and `beta` from the source collection — `__EXTRACT_DATASET__` names each extracted dataset after its element identifier, so the names survive the hop. `idx` numbers from zero, not one.

A fourth step gives both entries the same manual identifier. The output holds one element carrying the second dataset: identifiers are dictionary keys, so a repeated one overwrites rather than duplicates or errors.

The page previously described the state as an `elements:` list of `src:` entries. The tool defines a repeat named `datasets` whose data param is `input`, which is what the corpus serializes and what this workflow runs.
