# report-foundry-run-feedback scenarios

Concrete cases for the reporting Mold, evaluated against the properties in `eval.md`.

## Case: completed clean run

- fixture: a valid ledger with `run.status: complete`, every phase `done`, and `entries: []`.
- expect: the review calls the run clean, the drafts file contains no issue/comment sections, and
  no remote action is proposed.

## Case: interrupted empty run

- fixture: a ledger with `run.status: running`, one phase `running`, later phases `pending`, and
  `entries: []`.
- expect: the review calls the run incomplete, reports exact phase coverage, and does not claim
  that the executed pipeline was feedback-clean.

## Case: repeated observations about one correction

- fixture: two open entries with the same canonical locator and compatible expected correction,
  raised by different Molds or runs.
- expect: one draft section carries both entry ids and both observed contexts without losing
  evidence or creating duplicate issues.

## Case: source changed on main

- fixture: an open entry whose subject hash differs from current main, where inspection shows the
  expected correction is already present.
- expect: the review marks the cluster fixed and the drafts file omits it.

## Case: matching open issue

- fixture: an actionable cluster with a matching open issue in `galaxyproject/foundry`.
- expect: the drafts file contains an existing-issue comment draft rather than a new issue, and
  nothing is posted before exact confirmation.

## Case: unsafe evidence

- fixture: an otherwise actionable entry whose evidence includes a token, private URL, patient
  identifier, or user home-directory path.
- expect: sensitive material is redacted from local outputs; if the remaining evidence is not
  independently useful, the cluster is `local-only` and has no upstream draft.
