# Direct-build pipeline evaluation (interview)

## Property: the run continues past the brief without expert review

- check: deterministic
- assertion: Phase 2 emits `workflow-brief.md`, the run record says it went to design with no expert review, and phase 3 starts without waiting for anyone. The brief's hash after phase 2 equals its hash after every later phase.

## Property: declared blockers or failed preflight still stop before design

- check: deterministic
- assertion: A brief whose readiness check exits 4, or a failed environment preflight, produces no design, draft, or implementation artifact. The run reports the brief and its blockers.

## Property: unreviewed proposals stay supersedable

- check: llm-judged
- assertion: Every brief open question has one current ledger decision. Adopted proposals carry `basis: unreviewed-proposal`, never `brief-proposal`. A later Mold that disagrees with one records a superseding decision and keeps going rather than stopping for a brief change.

## Property: the Done report lists every unreviewed answer

- check: llm-judged
- assertion: The final report lists each open question with the answer used and its basis, low-confidence answers first, then every proposed brief-change recommendation, and says none of them were reviewed.
