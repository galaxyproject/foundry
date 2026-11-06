# Conditional: route between alternative outputs

Verifies `[[conditional-route-between-alternative-outputs]]`: `when`-gated peer branches merged by `pick_value`, and what `pick_style` does when the branches are not exclusive.

Two `cat1` branches are gated on independent booleans and both feed one `pick_value` step at `pick_style: first`. The first two cases route each way. The third turns both gates on — `first` returns the earlier `pick_from` slot and reports nothing, which is why a workflow that must take exactly one path wants `pick_style: only` instead.

`route_missing_pick_from` is the same merge with the `pick_from` entries left out of `tool_state` — connections only. The repeat is what creates the terminals, so the tool sees zero candidates, and `pick_style: first` returns null for that. The job goes green and the output dataset holds the text `null`.

The page carried a conceptual `tool_id: pick_value` snippet with bare `source:` entries. The real shape is the `style_cond` / `type_cond` / `pick_from` nest, connected through `style_cond|type_cond|pick_from_N|value`, on the toolshed `iuc/pick_value` the corpus actually installs.

## Mapped branches

`route-mapped-fan-in` gates arms mapped over collections and merges them each way. Each test case turns one side on.

- `same_arms_tool_shed_pick_value` and `same_arms_builtin_pick_value` merge arms mapped over one list. Each gives one element per input, with identifiers kept and the live arm's content.
- `different_arms_filter_then_merge` merges arms mapped over two lists of different lengths through `__FILTER_NULL__` and `__MERGE_COLLECTION__`. It holds only the live arm's elements.
- `same_arms_direct_merge` merges the same-list arms directly. It always has one element per input, taken from the first arm.
- `different_arms_direct_merge` merges the different-list arms directly. It holds all five elements, nulls included, and `different_arms_direct_merge_live` shows how many are live.

Built-in `pick_value` over the different-length arms fails the invocation with `Cannot match collection types`. A Planemo test can't hold a failed invocation, so this workflow doesn't include that shape.

Planemo can't read a null element's content, so the test filters the nulls out and counts what's left. It can't check a count of zero either, because `element_count: 0` is skipped as falsy. `same_arms_direct_merge_live_plus_right_samples` merges the filtered result with `right_samples`, so a count of 3 means the direct merge had no live elements.
