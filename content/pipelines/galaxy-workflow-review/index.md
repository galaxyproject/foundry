---
type: pipeline
title: GALAXY WORKFLOW REVIEW
tags:
  - source/galaxy
  - lifecycle/review
status: draft
created: 2026-09-12
revised: 2026-09-12
revision: 1
summary: "Post-construction review journey: summarize, validate, and test an existing Galaxy workflow, then apply pinned IWC policy."
harness_notes:
  - "Resolve the pull request or local worktree first and record repository, pull request number, base and head SHAs, workflow directory, primary descriptor, and the matching workflow test file."
  - "The local worktree commit must equal the reviewed head SHA. On mismatch, stop before phase 3 rather than mixing test evidence from one revision with a review of another."
  - "Phase 3 executes the checkout, so require the caller's explicit confirmation that this checkout is trusted for Planemo execution, and record that decision, before phase 3 runs."
  - "v1 has no privileged hosted execution of arbitrary fork heads. A user may inspect such a pull request without this Pipeline; running phase 3 always needs the explicit trusted-worktree decision."
  - "Validation or test failure is evidence for the final review. Retain the result artifact and continue to the review phase rather than losing the review entirely."
  - "A missing or unrunnable test still reaches phase 4 as an explicit non-passing result — never as a pass, and never as an abort."
  - "Foundry provenance — an open-requirements ledger, an existing IWC exemplar comparison, source and design handoffs — is optional enrichment the harness supplies. Its absence never fails the IWC review."
  - "This Pipeline is local and on-demand. It does not post a GitHub review, approve, comment, label, push, mark ready, or merge."
phases:
  - mold: "[[summarize-galaxy-workflow]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[review-galaxy-workflow]]"
related_molds:
  - "[[mature-galaxy-workflow-for-iwc]]"
  - "[[apply-galaxy-workflow-changeset]]"
related_notes:
  - "[[workflow-pr-review-command]]"
---

# GALAXY WORKFLOW REVIEW

A post-construction review journey. An existing Galaxy workflow — normally the subject of a pull request — is summarized, structurally validated, and actually run, and only then reviewed against the pinned upstream IWC policy. The output is one advisory Markdown review.

## Why four phases

Phase 4 is the only new Mold. The three ahead of it already exist and already produce exactly the evidence a review needs, so the pipeline reuses them rather than teaching the reviewer to re-derive their answers:

1. [[summarize-galaxy-workflow]] normalizes the descriptor and inventories the interface, steps, labels, and existing tests.
2. [[validate-galaxy-workflow]] runs terminal structural validation and now hands on a citable result.
3. [[run-workflow-test]] executes the test and hands on an honest result — including when no test exists or none could run.
4. [[review-galaxy-workflow]] applies the pinned IWC policy, citing all three rather than inspecting its way to a verdict.

A red phase 2 or phase 3 does not end the journey. Losing the review because a test failed would discard exactly the finding a reviewer most needs, so the result is retained and the review reports it.

## Edit authority

The Pipeline and its Molds are read-only. They may recommend changes; they cannot apply one, and they cannot approve, comment, push, mark ready, or merge. When a human accepts a recommended workflow edit, that work belongs to the [[mature-galaxy-workflow-for-iwc]] harness and is routed through [[apply-galaxy-workflow-changeset]] where applicable. Nothing here grants this reviewer write authority.
