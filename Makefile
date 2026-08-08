.PHONY: validate test typecheck generated check-generated check casts check-casts check-verify assemble-pipelines check-assemble-pipelines fixtures fixtures-nextflow fixtures-cwl fixtures-iwc fixtures-skeletons fixtures-verify fixtures-clean sync-planemo sync-planemo-cli sync-planemo-test-report-schema sync-planemo-cli-meta check-planemo-cli

FOUNDRY_BUILD := npx tsx packages/build-cli/src/bin/foundry-build.ts
PIPELINE_SLUGS := $(patsubst content/pipelines/%/index.md,%,$(wildcard content/pipelines/*/index.md))
MOLD_SLUGS := $(patsubst content/molds/%/index.md,%,$(wildcard content/molds/*/index.md))

validate:
	npm run validate

test:
	npm run test

typecheck:
	npm run typecheck

generated:
	npm run dashboard
	npm run index
	npm run readme

check-generated:
	npm run check:dashboard
	npm run check:index
	npm run check:readme

# Both sweeps are one command. The loop and the report are @galaxy-foundry/cast;
# which Molds to sweep, and what to tell a reader who finds drift, are ours and
# are arguments. The rationale for sweeping every Mold rather than a
# representative one moved to the command, beside the enumeration it explains.
casts:
	@$(FOUNDRY_BUILD) cast-all --root .

check-casts:
	@$(FOUNDRY_BUILD) cast-all --root . --check

# The other half of the same lesson, and it went unlearned twice. `cast --check`
# re-derives a bundle from its sources; the verifier asks a different question —
# is the committed bundle internally consistent, does its provenance still
# satisfy the JSON Schema, does it honour the target's constraints. Nothing ran
# it over the corpus: it lived in two tests against one Mold, so the schema the
# provenance is contracted to was enforced on 1 of 47 records.
check-verify:
	@fail=0; for m in $(MOLD_SLUGS); do \
	  out=$$(npx tsx scripts/cast-skill-verify.ts $$m --target=claude 2>&1) || { \
	    echo "$$m:"; echo "$$out" | sed 's/^/  /'; fail=1; }; \
	done; \
	if [ $$fail -ne 0 ]; then \
	  echo "cast-skill-verify failed above. A schema or constraint failure is fixed"; \
	  echo "at the source; a hash mismatch means 'make casts' + commit."; \
	  exit 1; \
	fi

assemble-pipelines:
	@for p in $(PIPELINE_SLUGS); do echo "assemble $$p"; $(FOUNDRY_BUILD) assemble-pipeline --root . $$p || exit 1; done

check-assemble-pipelines:
	@for p in $(PIPELINE_SLUGS); do $(FOUNDRY_BUILD) assemble-pipeline --root . $$p --check || exit 1; done

check: validate check-generated check-casts check-verify check-assemble-pipelines test

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
# Requires `planemo` on PATH. Pin version lives in content/cli/planemo/index.md.
# Install with: uvx --from planemo==<version> planemo --version

sync-planemo: sync-planemo-cli-meta sync-planemo-test-report-schema sync-planemo-cli

sync-planemo-cli:
	npm run sync:planemo-cli

check-planemo-cli:
	npm run check:planemo-cli

sync-planemo-test-report-schema:
	pnpm --filter @galaxy-foundry/planemo-test-report-schema run sync:from-planemo

sync-planemo-cli-meta:
	pnpm --filter @galaxy-foundry/planemo-cli-meta run sync:from-planemo
