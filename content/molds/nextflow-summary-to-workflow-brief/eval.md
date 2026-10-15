# Brief producer evaluation

## Property: source and expert intent determine scope

- check: llm-judged
- assertion: Every claimed source fact and requirement has supporting evidence or expert attribution. Ambiguous selection is a blocker; unselected analyses are not silently added.

## Property: brief authoring makes no Galaxy design choices

- check: llm-judged
- assertion: The agent invents no Galaxy datatypes, collections, labels, tool availability, step graph, tool state, or final test declarations. Expert-provided requirements remain attributed.

## Property: valid structure is distinct from declared blockers

- check: deterministic
- assertion: The emitted Markdown passes validate-workflow-brief. check-workflow-brief reports nonempty blockers in either parent without changing the file; a blocked brief remains available for review.

## Property: environment claims retain their evidence

- check: llm-judged
- assertion: Requested tooling and container preferences are distinguished from observed versions/usability and from unknown availability.
