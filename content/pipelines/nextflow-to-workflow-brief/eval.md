# Source-to-brief pipeline evaluation

## Property: source evidence reaches the brief without expanded scope

- check: llm-judged
- assertion: The source is identified, uncertainties survive, and the brief covers the caller's selected scientific work without invented Galaxy design choices.

## Property: production stops before design

- check: llm-judged
- assertion: The terminal artifact is an expert-editable brief. The pipeline does not choose Galaxy mappings, create a draft workflow, or cross the review boundary.

## Property: structural validity and blockers are reported independently

- check: deterministic
- assertion: The brief passes its structural validator; the static check accurately reports blockers under both parents. Known missing evidence and environment failures remain visible.
