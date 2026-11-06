# Conditional: route between alternative outputs

Verifies `[[conditional-route-between-alternative-outputs]]`: `when`-gated peer branches merged by `pick_value`, and what `pick_style` does when the branches are not exclusive.

Two `cat1` branches are gated on independent booleans and both feed one `pick_value` step at `pick_style: first`. The first two cases route each way. The third turns both gates on — `first` returns the earlier `pick_from` slot and reports nothing, which is why a workflow that must take exactly one path wants `pick_style: only` instead.

`route_missing_pick_from` is the same merge with the `pick_from` entries left out of `tool_state` — connections only. The repeat is what creates the terminals, so the tool sees zero candidates, and `pick_style: first` returns null for that. The job goes green and the output dataset holds the text `null`.

The page carried a conceptual `tool_id: pick_value` snippet with bare `source:` entries. The real shape is the `style_cond` / `type_cond` / `pick_from` nest, connected through `style_cond|type_cond|pick_from_N|value`, on the toolshed `iuc/pick_value` the corpus actually installs.

## Mapped branches

Each shape of arm has its own workflow. Each test case sets which arms run.

`route-mapped-same-arms` merges arms mapped over one list.

- `tool_shed_pick_value` and `builtin_pick_value` each give one element per input, with identifiers kept and the live arm's content.
- `direct_merge` always has one element per input, taken from the first arm.
- `direct_merge_live_plus_sentinel` shows how many of those are live. A count of 1 means none: `element_count: 0` is skipped as falsy, so the test filters the nulls, merges the result with a one-element list and counts.

`route-mapped-different-arms` merges arms mapped over two lists of different lengths that share one identifier.

- `filter_then_merge` holds only the live arm's elements. With both arms on, it holds both arms' elements and keeps the first arm's `shared`.
- `direct_merge` and `direct_merge_live` show why the filters come first. With the right arm on, the live `shared` loses to the left arm's null, and filtering afterwards can't get it back.
- `equal_length_pick_value` runs built-in `pick_value` over arms of equal length with different identifiers. It succeeds, and the right arm's data comes out as `a1` and `shared`. Its mode is `first_non_null`, so the both-on case can run.

## What these tests don't hold

Planemo can't expect a failed invocation, so these are cited or were run by hand:

- Arms of different lengths: Galaxy's `test_lists_of_different_cardinality_do_not_match`. A manual run of built-in `pick_value` over the 2- and 3-element arms on `release_26.1` failed with `Cannot match collection types`. The Tool Shed spelling wasn't run; it goes through the same matching code.
- More than one live input under `the_only_non_null`: Galaxy's `test_pick_value_the_only_non_null_error_multiple`, which is unmapped.

Gates here are workflow-level booleans, so an arm's elements all run or all skip. Galaxy's `pick_value_mapped_mixed_skip_pja`, on `dev`, covers mixed skips within one arm for the built-in module.

Neither arm on isn't tested: an empty result can't be asserted, and `the_only_non_null` and `first_non_null` would fail the invocation.
