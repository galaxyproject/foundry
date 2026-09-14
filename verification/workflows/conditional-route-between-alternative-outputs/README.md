# Conditional: route between alternative outputs

Verifies `[[conditional-route-between-alternative-outputs]]`: `when`-gated peer branches merged by `pick_value`, and what `pick_style` does when the branches are not exclusive.

Two `cat1` branches are gated on independent booleans and both feed one `pick_value` step at `pick_style: first`. The first two cases route each way. The third turns both gates on — `first` returns the earlier `pick_from` slot and reports nothing, which is why a workflow that must take exactly one path wants `pick_style: only` instead.

`route_missing_pick_from` is the same merge with the `pick_from` entries left out of `tool_state` — connections only. The repeat is what creates the terminals, so the tool sees zero candidates, and `pick_style: first` returns null for that. The job goes green and the output dataset holds the text `null`.

The page carried a conceptual `tool_id: pick_value` snippet with bare `source:` entries. The real shape is the `style_cond` / `type_cond` / `pick_from` nest, connected through `style_cond|type_cond|pick_from_N|value`, on the toolshed `iuc/pick_value` the corpus actually installs.
