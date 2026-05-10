.PHONY: validate test typecheck generated check-generated check fixtures fixtures-nextflow fixtures-cwl fixtures-iwc fixtures-skeletons fixtures-verify fixtures-clean

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
