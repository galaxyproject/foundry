.PHONY: validate test typecheck generated check-generated check fixtures fixtures-nextflow fixtures-cwl fixtures-iwc fixtures-skeletons fixtures-verify fixtures-clean sync-planemo sync-planemo-cli sync-planemo-test-report-schema sync-planemo-cli-meta check-planemo-cli

validate:
	npm run validate

test:
	npm run test

typecheck:
	npm run typecheck

generated:
	npm run dashboard
	npm run index

check-generated:
	npm run check:dashboard
	npm run check:index

check: validate check-generated test

fixtures:
	$(MAKE) -C workflow-fixtures all

fixtures-nextflow:
	$(MAKE) -C workflow-fixtures nextflow

fixtures-cwl:
	$(MAKE) -C workflow-fixtures cwl

fixtures-iwc:
	$(MAKE) -C workflow-fixtures iwc

fixtures-skeletons:
	$(MAKE) -C workflow-fixtures skeletons

fixtures-verify:
	$(MAKE) -C workflow-fixtures verify

fixtures-clean:
	$(MAKE) -C workflow-fixtures clean

# --- Planemo vendored artifacts ---
# Requires `planemo` on PATH. Pin SHA lives in content/cli/planemo/index.md.
# Install with: uvx --from git+https://github.com/jmchilton/planemo@<sha> planemo --version

sync-planemo: sync-planemo-cli-meta sync-planemo-test-report-schema sync-planemo-cli

sync-planemo-cli:
	npm run sync:planemo-cli

check-planemo-cli:
	npm run check:planemo-cli

sync-planemo-test-report-schema:
	pnpm --filter @galaxy-foundry/planemo-test-report-schema run sync:from-planemo

sync-planemo-cli-meta:
	pnpm --filter @galaxy-foundry/planemo-cli-meta run sync:from-planemo
