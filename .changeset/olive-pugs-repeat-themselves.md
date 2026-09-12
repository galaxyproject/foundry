---
"@galaxy-foundry/planemo-cli-meta": minor
"@galaxy-foundry/planemo-test-report-schema": minor
---

Drop `source.release` from both provenance records. It duplicated a hand-maintained pin that
could silently disagree with `planemo_version`, the version the sync actually observed from the
binary it invoked. `planemo_version` is now the single version field; the intended pin lives in
`content/cli/planemo/index.md` and `make check-planemo-pin` compares the two.

Breaking for anything reading `provenance.source.release` — read `provenance.planemo_version`.
