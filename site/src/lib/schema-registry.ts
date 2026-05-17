// Registry of JSON Schemas, keyed by note `name` field.
// Most schemas come from two packages: producer-co-located
// (@galaxy-foundry/summarize-nextflow) or foundry-bundled
// (@galaxy-foundry/foundry). `cast-provenance` is Foundry-authored and
// repo-local — its contract lives in scripts/lib/schemas/, not a package.

import galaxyToolDiscoverySchema from '../../../packages/foundry/src/schemas/galaxy-tool-discovery/galaxy-tool-discovery.schema.json';
import galaxyToolSummarySchema from '../../../packages/foundry/src/schemas/galaxy-tool-summary/galaxy-tool-summary.schema.json';
import summaryCwlSchema from '../../../packages/foundry/src/schemas/summary-cwl/summary-cwl.schema.json';
import testsFormatSchema from '../../../packages/foundry/src/schemas/tests-format/tests.schema.json';
import castProvenanceSchema from '../../../scripts/lib/schemas/cast-provenance.schema.json';
import foundryPkg from '../../../packages/foundry/package.json';
import summaryNextflowSchema from '../../../packages/summarize-nextflow/src/schema/summary-nextflow.schema.json';
import summarizeNextflowPkg from '../../../packages/summarize-nextflow/package.json';

export interface SchemaEntry {
  schema: Record<string, unknown>;
  version: string;
}

const foundryVersion = (foundryPkg as { version?: string }).version ?? '';
const summarizeNextflowVersion = (summarizeNextflowPkg as { version?: string }).version ?? '';

export const schemaRegistry: Record<string, SchemaEntry> = {
  'tests-format': {
    schema: testsFormatSchema as unknown as Record<string, unknown>,
    version: foundryVersion,
  },
  'summary-nextflow': {
    schema: summaryNextflowSchema as unknown as Record<string, unknown>,
    version: summarizeNextflowVersion,
  },
  'summary-cwl': {
    schema: summaryCwlSchema as unknown as Record<string, unknown>,
    version: foundryVersion,
  },
  'galaxy-tool-discovery': {
    schema: galaxyToolDiscoverySchema as unknown as Record<string, unknown>,
    version: foundryVersion,
  },
  'galaxy-tool-summary': {
    schema: galaxyToolSummarySchema as unknown as Record<string, unknown>,
    version: foundryVersion,
  },
  'cast-provenance': {
    schema: castProvenanceSchema as unknown as Record<string, unknown>,
    version: foundryVersion,
  },
};
