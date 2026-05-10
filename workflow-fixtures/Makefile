.PHONY: all nextflow cwl iwc skeletons verify clean

all: nextflow cwl iwc skeletons

nextflow:
	scripts/fetch.sh

cwl:
	scripts/fetch-cwl.sh

iwc:
	scripts/build-iwc.sh

skeletons:
	cd .. && npx tsx workflow-fixtures/scripts/build-skeletons.ts

verify:
	VERIFY=1 scripts/fetch.sh
	VERIFY=1 scripts/fetch-cwl.sh
	VERIFY=1 scripts/build-iwc.sh

clean:
	rm -rf pipelines cwl iwc-src iwc-cleaned iwc-format2 iwc-skeletons
