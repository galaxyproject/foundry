# Collection: split identifier via rules

Verifies `[[collection-split-identifier-via-rules]]`: `__APPLY_RULES__` turns a flat `list` whose identifiers
encode two axes into a `list:list` keyed `sample -> replicate`.

Two steps consume the identical input and differ only in how the split is expressed:

- `split_two_rules` is the corpus shape — two `add_column_regex` rules over column 0, one per capture group,
  each with its own `replacement`.
- `split_group_count` is one `add_column_regex` with `group_count: 2` and no `replacement`.

Both are asserted against the same expected `list:list`, so the page's "use two regex rules, not one
`group_count: 2` rule" reads as a corpus-parity preference rather than a correctness requirement. It is: with a
`replacement` the rule appends one column from `match.expand`; with `group_count` it appends one column per
group. Two rules at one group each and one rule at two groups land the same columns 1 and 2.

Unmatched identifiers are not exercised here because the interesting branch cannot be asserted by a passing
test. `apply_regex` in `galaxy/util/rules_dsl.py` raises `RulesDSLError` when the expression does not match and
`allow_unmatched` is absent or false, so the default is a failed job rather than a silent empty nesting key.
The empty key the page warns about only appears once `allow_unmatched: true` is set, which no corpus instance
does.
