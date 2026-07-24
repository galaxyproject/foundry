---
description: Run (or refresh) an IWC corpus survey for a topic — operation family, single tool, domain, or workflow-shape concern. Produces a research note; does not make pattern decisions.
argument-hint: "<topic>  e.g. collections, conditionals, awk, apply_rules, genomic_conversion"
---

# IWC corpus survey: `$1`

Produce or refresh `content/research/iwc-$1-survey.md`. The survey **proposes candidate patterns** (with keep / drop / merge calls and corpus evidence) and surfaces open questions — that's its main deliverable. What it does *not* do is **decide** which candidates graduate to pattern pages, edit policy docs, or land anti-pattern calls. Those decisions happen out of band via `/iwc-survey-act`, with fresh eyes on the proposals.

## Load context first (in order)

1. **`content/meta/glossary.md`** — pinned vocabulary.
2. **`CLAUDE.md`** — authoring rules.
3. **`docs/PATTERNS.md`** — pattern-authorship policy. **Operation-anchored naming** is mandatory in candidate-pattern proposals; do not surface tool-anchored names. Corpus-first applies — no speculative candidates.
4. **`docs/ARCHITECTURE.md`** §3 (note types), §5 (frontmatter), §6 (validation).
5. **`packages/note-schema/src/note-schema.ts`** + **`meta_tags.yml`**.
6. **`common_paths.yml.sample`** — `$IWC_FORMAT2` is the cleaned `gxformat2` corpus root for grep work and full-workflow reads; `$IWC_SKELETONS` mirrors that tree with non-structural fields stripped (tool_ids + topology + control flow only) — cheap structural scans for step-pair / step-sequence patterns; `$IWC` is the upstream `.ga` source for permalinks. Write citations as `` `$IWC_FORMAT2/path:line` `` (or `` `$IWC_SKELETONS/path:line` `` when the structural view is what's evidenced).
7. **`content/research/iwc-shortcuts-anti-patterns.md`** — already-pinned "don't endorse" calls. Do not re-surface anything covered here as a recommendation.
8. **Existing surveys** under `content/research/iwc-*-survey.md` — for shape and tone, and to detect topic overlap.
9. **If `content/research/iwc-$1-survey.md` already exists** — load it. You are in **refresh mode** (see §Refresh mode below).

## Step 1 — Scope out loud, then pause

Before any heavy mining, post a short scoping plan (~2 minutes of work):

- What kind of topic this is (operation family / single tool / workflow concern / domain) and what that implies for the survey shape.
- **Evidence techniques you'll use, and roughly how much of each.** Three tiers: grep over `$IWC_FORMAT2` (cheap, blind to topology); skeleton scan over `$IWC_SKELETONS` (cheap, sees step-pair / step-sequence shape — all 120 fit in context); whole-workflow reads of `$IWC_FORMAT2` (expensive, parameter-level evidence). Different topics need different mixes:
    - Single-tool topics (`awk`, `apply_rules`) lean grep-heavy plus structured-block extraction; full reads on a few high-density files.
    - Operation-family topics (`tabular`) need grep for inventory **plus** skeleton scans for multi-tool recipes, with selective full reads to confirm parameter shapes.
    - Workflow-shape topics (`conditionals`, `collections`, harness routing) default to **skeleton scan first** to catalog topologies and recipes; full reads only on the few workflows that need parameter-level confirmation.
- **How much workflow reading.** Distinguish skeleton reads (cheap — feel free to scan dozens) from full `$IWC_FORMAT2` reads (expensive — gate explicitly: "the 5 highest-density," "every workflow that calls `__APPLY_RULES__`," "all 120 — yes I know it's expensive"). Full-read count is the main token-cost lever; surface it.
- The rough section skeleton you'll write (titles only — section *layout* is per-topic, not pre-specified; see §Required moves).
- What you are deliberately **not** covering (out-of-scope adjacencies, deferred follow-ups).
- Anything in `iwc-shortcuts-anti-patterns.md` or existing pattern pages that already constrains the surface.

**Stop and wait for redirect.** Do not start mining until the user confirms or course-corrects. This is the highest-leverage step in the whole flow — getting the framing right here saves a 20-minute wrong direction.

## Step 2 — Gather evidence

Once scope is confirmed, work through the techniques you committed to:

- **Grep / counts** over `$IWC_FORMAT2` for tool inventory and ranking.
- **Skeleton scan** over `$IWC_SKELETONS` to surface step-pair / step-sequence patterns and topology-shaped recipes — one tool's output feeding another in a recurring shape. Cheap enough to read dozens or all 120; the structural-only view is the right tier for "which workflows have a `__FILTER_EMPTY_DATASETS__` whose input is an `__APPLY_RULES__` output?" An `__APPLY_RULES__` followed by `__FILTER_EMPTY_DATASETS__` cleanup is a *recipe*, not a single-tool idiom, and it deserves to surface as such.
- **Structured-block extraction** from `$IWC_FORMAT2` for tools whose idioms live inside parameter blobs (`__APPLY_RULES__` rule sequences, `tp_awk_tool` `code:` programs, `column_maker` `expressions:` lists). Skeletons strip these; pull from full files.
- **Whole-workflow reading** of `$IWC_FORMAT2` files reserved for parameter-level confirmation on the recipes the skeleton scan flagged as promising.
- **Connection / shape inspection** for map-over, reduction, or collection-type transitions — visible at the workflow connection level, scannable from skeletons.

## Step 3 — Write the survey

Write `content/research/iwc-$1-survey.md` with frontmatter matching the existing surveys (`type: research`, `tags: [research/component, target/galaxy]`, `ai_generated: true`, `status: draft`, `created`/`revised` set, `summary` line).

### Required moves (rubric, not section layout)

The survey *must* support these moves; section titles and ordering are your call:

1. **Inventory** — what exists in the corpus on this topic. Counts are **supporting evidence in tables**, not the lead. Do not write a "Tool inventory" section as the first thing the reader hits.
2. **Redundancy / decision-points** — where the corpus shows multiple tools or shapes competing for the same job. This is where pattern boundaries get decided.
3. **Recurring idioms** — split into two kinds, both with file:line citations:
    - **Single-tool parameter idioms** — recurring parameter shapes within one tool (the `BEGIN{OFS="\t"}` awk ritual; the `add_name + one_header + place_name` `collapse_dataset` triad; `auto_col_types: true` for raw-`cN` arithmetic).
    - **Multi-step recipes** — sequences or topologies that span tools or workflow connections (`datamash collapse → tp_find_and_replace` to emulate "argmax"; `__APPLY_RULES__ → __FILTER_EMPTY_DATASETS__` cleanup; `__HARMONIZELISTS__ → __ZIP_COLLECTION__` for paired-end alignment). These are often the highest-value patterns and are invisible to grep — they only surface from workflow-level reading. Treat them as first-class.
4. **Candidate pattern boundaries** — operation-anchored names (per `docs/PATTERNS.md`). Each candidate carries: scope sketch, 2-3 corpus citations, and an explicit **keep / drop / merge** call with a reason. Drops and merges are equal in importance to keeps. **Candidates can be recipes**, not just single-tool patterns — a `multi-step:harmonize-then-zip-paired` pattern is as valid as a `tabular-filter-by-regex` pattern if the corpus shows the recipe recurring.
5. **Open questions** — things only the user can decide: prescriptive rules, redundancy tie-breaks, scope calls, deferral choices. Numbered, with the evidence each question needs to be answered.

### What the survey does **not** include

- **No `## Decisions` section.** Decisions migrate to `/iwc-survey-act`. The survey ends at open questions.
- **No speculative pattern proposals.** If the corpus shows zero uptake of a capability, document the gap inline and move on. Do not propose a candidate pattern for it. Zero uptake is not anti-pattern evidence by itself; call it "catalog capability, no corpus-backed candidate" unless corpus evidence or a user decision gives an explicit don't-endorse reason.
- **No tool-anchored candidate names.** `tp_grep_tool-page` is wrong; `tabular-filter-by-regex` is right.

### Style rules

- **Demote numbers.** Counts live inside operation/idiom sections as evidence, not as standalone inventories at the top.
- **Cite or strike.** Every claim about idiom shape or distribution carries a `$IWC_FORMAT2/path:line` citation. Unverifiable claims get cut.
- **No "Considerations" / "Trade-offs" prose.** Surface concrete idioms with citations, not abstract pros-and-cons.
- **Operation-anchored everywhere.** Even when an idiom is implemented via one tool, the framing is "this *operation* is done via this tool," not "this tool does these things."

## Refresh mode

If the survey note already exists:

- Re-run greps. Update inventory tables and prefer durable citations by workflow path plus step label/tool name; use line ranges only for stable snippets that need them.
- **Preserve everything below the open-questions section** — the act-command may have written into the anti-pattern note based on this survey's prior open Qs. Do not delete or rewrite §Open questions; *append* new questions surfaced this run.
- New idioms or new candidate patterns surfaced by the refresh go in their respective sections, marked with the revision date.
- Bump `revision:` and `revised:` in frontmatter.

## On finishing

1. `npm run validate` — schema + cross-file checks must pass.
2. Post a one-paragraph debrief summarizing: scope decided, candidate count (keep / drop / merge), idiom count, open-question count, anything that surprised you.
3. Suggest the user run `/iwc-survey-act content/research/iwc-$1-survey.md` next — but do not run it yourself. Fresh eyes on the act phase is the point.

## What this command does **not** do

- Decide which pattern pages to write or refine.
- Edit `iwc-shortcuts-anti-patterns.md`.
- Open GitHub issues.
- Write or edit pattern pages.

All of those belong to `/iwc-survey-act`. Surveying and acting are deliberately separated so the same agent isn't both the proposer and the decider.
