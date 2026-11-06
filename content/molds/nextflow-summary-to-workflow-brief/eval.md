# Brief producer evaluation

## Property: source and expert intent determine scope

- check: llm-judged
- assertion: Every claimed source fact and requirement has supporting evidence or expert attribution. Ambiguous selection is a blocker; a clear selection that conflicts with source behavior (no runnable defaults, a required parameter without a default, a branch gated on an optional input) is a cited open question, not a blocker; unselected analyses are not silently added.

## Property: brief authoring makes no Galaxy design choices

- check: llm-judged
- assertion: The agent invents no Galaxy datatypes, collections, labels, tool availability, step graph, tool state, or final test declarations. Expert-provided requirements remain attributed.

## Property: valid structure is distinct from declared blockers

- check: deterministic
- assertion: The emitted Markdown passes validate-workflow-brief. check-workflow-brief reports nonempty blockers in either parent without changing the file; a blocked brief remains available for review.

## Property: environment claims retain their evidence

- check: llm-judged
- assertion: Requested tooling and container preferences are distinguished from observed versions/usability and from unknown availability.

## Property: every open question carries a proposed answer

- check: llm-judged
- assertion: Each Open questions item has a proposed answer and the evidence for it. Where expert intent and source behavior conflict, the proposal follows the expert and cites the conflict. A proposal resting on thin evidence is marked low confidence and names the missing evidence rather than presenting a guess as settled.
