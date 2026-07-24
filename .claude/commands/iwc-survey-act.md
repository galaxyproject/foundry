---
description: Walk an IWC survey's findings, decide PR-local authoring vs deferred GitHub issues, and track new pages, refinements, merges, and anti-pattern calls.
argument-hint: "<path-to-survey-note>  e.g. content/research/iwc-collections-survey.md"
---

# Act on an IWC survey: `$1`

Read survey `$1` and walk its findings with the user via `AskUserQuestion`. Land "don't endorse" calls **inline** in the anti-pattern note as you go. Then decide from context whether to author pages/refinements in the current PR or defer the work into GitHub issues.

Default posture:

- If the user says this should stay in the current PR, asks not to lose tracking, or asks to build pages now: choose **PR-local authoring mode**.
- If the user asks for tracking issues, is not ready to author, or the candidate list is too large for the current turn: choose **deferred issue mode**.
- If unclear, ask one short `AskUserQuestion` with both modes. Recommend PR-local mode only when the current branch/PR is clearly already about the survey.

## Load context first (in order)

1. **`content/meta/glossary.md`** — pinned vocabulary.
2. **`docs/PATTERNS.md`** — authorship policy. Operation-anchored naming is mandatory; corpus-first is mandatory; legacy-tool footnote convention is mandatory.
3. **`docs/ARCHITECTURE.md`** §3 (note types).
4. **`common_paths.yml.sample`** — citation prefix vocabulary for any new entries you write.
5. **`content/research/iwc-shortcuts-anti-patterns.md`** — the live anti-pattern note. You will edit this inline. Read its full current state so additions match its shape and tone.
6. **All existing pattern pages** under `content/patterns/` — title, scope, related links. Anything already covered by an existing page is *not* a "create new" candidate; classify it as already-authored, refine existing, or merge into existing.
7. **The survey at `$1`** — full read.
8. **The survey's `related_notes`** — for cross-cutting context.

## Pre-flight: environment and dedupe

Before questions or edits:

- Check current branch/PR context if relevant (`gh pr view` when a PR is mentioned or branch looks PR-bound).
- Check needed generated fixture dirs exist before asking subagents to verify corpus evidence. For IWC work, prefer `workflow-fixtures/iwc-format2/` and `workflow-fixtures/iwc-skeletons/`; if missing, run `make fixtures-iwc fixtures-skeletons` unless the user asked not to.
- Check whether package scripts you plan to run point to existing files. If a script is stale, report it as repo drift and do not treat it as a user-caused failure.

Before asking the user anything, suppress questions covered by prior answers:

- Any candidate pattern whose scope overlaps an existing `content/patterns/*.md` page → classify as "already authored," "refine existing," or "merge into existing," not "create new."
- Any idiom or tool already called out in `iwc-shortcuts-anti-patterns.md` → do not re-surface as a recommendation candidate; cite the existing entry instead.
- Any naming-axis question (operation vs tool vs shape) → do not ask; `docs/PATTERNS.md` decides. Use operation-anchored names.
- Any "should we write a speculative page for this gap" question → do not ask; corpus-first decides. Document the gap, no page.

Build a compact classification table before user questions:

- `already-authored` — suppress unless the survey adds evidence.
- `new operation page` — candidate for issue or immediate `/iwc-survey-pattern` work.
- `refine existing` — existing page needs a section, citation, boundary change, or recommendation update.
- `merge into existing` — no standalone page; harvest useful mechanics into an existing page.
- `drop/gap/no page` — corpus-zero, too thin, or not a pattern by policy.
- `MOC/catalog follow-up` — page exists but navigation/backlinks may need updates.

If the dedupe pass leaves only `already-authored` and `drop/gap/no page`, post a debrief saying so and stop unless anti-pattern edits remain.

## Walk the findings

Use `AskUserQuestion` for each decision point, **batched in groups of 3-5 questions per round** to keep the user in flow. Group by kind:

### Round 1 — Open questions from the survey

The survey ends at numbered open questions. Walk them. Each question's answer either:

- Resolves a redundancy / posture / scope call → record the answer for issue-body context (no file edits yet).
- Names something as an anti-pattern → **edit `iwc-shortcuts-anti-patterns.md` inline now**, before moving on. Add a short entry: tool/idiom name, the call ("don't endorse" / "legacy alternative only" / "deprecated"), the reason in one sentence, and a corpus citation from the survey. Match the existing note's shape.

### Round 2 — Candidate pattern pages (new)

For each surveyed candidate the user marked **keep**, ask:

- Confirm operation-anchored name (propose one based on the survey; let the user rename).
- Confirm title family / MOC bucket (`Tabular:`, `Collection:`, bridge, Apply Rules cluster, etc.) so later pages browse coherently.
- Confirm scope sketch and the 2-3 anchor citations.
- Anything to flag for the eventual author (prescriptive rules surfaced in the survey, foot-guns, recommended-default tuples).

Before authoring or issue creation, assemble a compact candidate manifest: final slug, title prefix, keep/drop/merge call, nearest sibling pages, MOC bucket, anchor workflow paths plus step labels/tool names, and unresolved evidence questions.

Collect into a work manifest. Do not author or open issues yet.

### Round 3 — Existing pattern refinements

For each existing pattern page the survey turned up new evidence for:

- What changed (new idiom, new corpus citation, deprecated parameter, version-pin sprawl, …).
- Whether the change is "add a section" or "rework the recommendation."

Collect into a merge/refinement manifest grouped by target page. Do not author or open issues yet.

### Round 4 — Anti-pattern note review

Show the user the diff of edits you made to `iwc-shortcuts-anti-patterns.md` during the walk. Confirm or revise. This is the only writeback you do during the interview.

## Choose execution mode

After the walk is complete and the anti-pattern diff is confirmed, ask or infer one mode:

### PR-local authoring mode

Use this when the user wants the pages/refinements in the current PR.

1. Launch subagents for research **only** when there are multiple pages/refinements or the evidence needs corpus re-checking. Ask subagents to prepare writing/refinement reports, not to edit files.
2. For each new page, run the `/iwc-survey-pattern` workflow yourself using the subagent report as input.
3. For merge/refinement work, edit existing pages directly using the merge/refinement manifest.
4. Update survey `related_patterns` only if the survey is meant to track authored pages in frontmatter; otherwise report the expected backlink warnings.
5. Run `npm run validate` and the relevant test suite. If generator scripts are relevant and present, run their check/update commands; if package scripts point to missing files, report stale scripts explicitly.
6. Summarize files changed, candidate decisions, validation/test results, unresolved evidence questions, and suppressed candidates.
7. Commit/push only if the user asks.

### Deferred issue mode

Use this when the user wants tracking issues or fresh context later.

Open the issues after the walk is complete and the anti-pattern diff is confirmed.

1. **Per new pattern** — `gh issue create` with title `Pattern: <operation-anchored-name>`, body containing scope, anchor citations, prescriptive-rule notes, and a link to the survey section that motivated it.
2. **Per refinement** — `gh issue create` with title `Refine pattern: <existing-name>`, body containing what to change, evidence, and survey section link.
3. Use `gh` directly via Bash. Pass bodies via `--body-file` or HEREDOC. Label appropriately if labels exist (`gh label list` to check).

Issue-body skeleton (adapt per topic; this is a starting shape, not a template to follow rigidly):

```
## Source
Survey: <path>#<section-anchor>

## Scope
<one paragraph>

## Anchor citations
- `$IWC_FORMAT2/path:line`
- ...

## Prescriptive rules surfaced
<bullets, or "none surfaced">

## Notes for the author
<anything the user flagged in the walk>
```

## Commit the anti-pattern note

After issues are open, or after PR-local authoring is complete if anti-pattern edits were made:

- `git add content/research/iwc-shortcuts-anti-patterns.md`
- Commit with a message naming the survey and listing the additions in one line each.
- Do **not** push unless the user explicitly asks.

## Debrief

Post a final summary:

- Anti-pattern entries landed inline (count + one-line each).
- Pages authored/refined or issues opened (count + paths/URLs).
- Open questions from the survey that were resolved without a file change (briefly).
- Anything suppressed in the dedupe pass (count, with brief reasons).
- Validation/test/generator status, including any stale package scripts or advisory backlink warnings.

## What this command does **not** do

- Decide naming axis, corpus-first stance, or any policy already pinned in `docs/PATTERNS.md`.
- Push commits.
- Re-run the survey or update its citations.

The split between deciding and authoring is still deliberate, but this command may bridge them when the user explicitly wants same-PR follow-through.
