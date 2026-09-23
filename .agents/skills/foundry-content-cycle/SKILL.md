---
name: foundry-content-cycle
description: Run a recurring, review-driven cycle to improve one stale Foundry content page and refine the repository's writing guidance when a reusable lesson emerges. Use when asked to continue the content improvement loop, not for a one-off documentation edit.
---

# Foundry content cycle

Improve one authored page per iteration. Keep at most one cycle PR open. A later invocation resumes that PR before selecting another page, so the cycle can continue across sessions without a running agent or a separate state file.

## Resume or select

1. Check for an open PR from this cycle, identified by a `docs/content-cycle/<page-slug>` branch and a `<!-- foundry-content-cycle -->` marker in its PR body. If one exists, read its current diff, reviews, and comments, then continue at **Review and merge** below. Do not open another cycle PR yet.
2. Otherwise, choose an authored page under `content/` that has gone a long time without revision. Use its `revised` frontmatter and Git history to find candidates. Prefer a page whose content would benefit a present reader from a careful rewrite, rather than changing an old page solely to refresh its date. Exclude generated files, fixtures, and pages with an active rewrite PR.
3. Read the chosen page, its relevant neighbors, `content/meta/glossary.md`, `content/meta/guiding-principles.md`, `content/meta/architecture.md`, and the focused architecture record that owns the page's subject. Read `.agents/skills/foundry-documentation/SKILL.md`. Confirm the current implementation or other primary evidence for behavioral claims.

## Rewrite and review

4. Create a dedicated `docs/content-cycle/<page-slug>` branch or worktree for this one page. Ask a subagent to review and rewrite it using the Foundry documentation skill and the design and architecture sources above. Give the subagent the page, audience, relevant source paths, and the instruction to preserve supported claims and required frontmatter. Ask it to identify specific inaccuracies, obscurities, and omissions before rewriting.
5. Ask the subagent separately whether any change to the writing skill or project documentation would have materially helped this rewrite. It should recommend a change only when it can name the observed problem, show why existing guidance did not cover it, and explain how the proposed rule would help future pages. A one-page preference or a new slogan is not enough.
6. Review the subagent's rewrite yourself. Check claims against the sources, compare it with the original for lost qualifications, and apply the documentation skill as the intended reader. Accept a guidance change only if you independently agree it is reusable. Put an accepted change in the smallest authoritative source, rather than copying it across files. It is normal to make no guidance change.
7. Update the page's `revised` date and increment `revision` when the page changes. Regenerate affected indexes instead of hand-editing them. Run `npm run validate`, relevant checks for any other changed files, and `git diff --check`. Open one PR with the page rewrite and any accepted guidance change. Start the PR body with one visible sentence for reviewers: "This PR is part of the Foundry content improvement loop, which revises one page at a time." Then explain what improved and what you verified, and include `<!-- foundry-content-cycle -->` in the PR body so the next run can find it. Do not merge it yet.

## Review and merge

8. Read the user's PR comments and review. Revise the page until the concerns are resolved, checking each substantive change against the documentation skill and relevant project sources. Consider whether the feedback reveals a general rule or a gap in the project documentation. Add it only when it clears the same reusable-evidence bar as step 5. Revalidate and push the PR updates.
9. Wait for the user's explicit approval. Silence, resolved comments, and passing checks do not count. If the user merges the PR, record that and skip merging it yourself. Otherwise merge after their approval and passing required checks. If approval is withdrawn or new concerns appear, return to step 8.
10. After the PR is merged, begin another iteration if the session is still active. On a later invocation, check for an existing cycle PR first. Never create a stream of PRs while one is awaiting review.
