// Registry of vendored JSON Schemas, keyed by note `name` field.
// Add a new entry when a new schema-type note lands.
//
// Each entry: { schema: <JSON Schema object>, version: <package version string> }.

import galaxyToolDiscoverySchema from '../../../packages/galaxy-tool-discovery-schema/src/galaxy-tool-discovery.schema.json';
import galaxyToolDiscoverySchemaPkg from '../../../packages/galaxy-tool-discovery-schema/package.json';
import summaryNextflowSchema from '../../../packages/summary-nextflow-schema/src/summary-nextflow.schema.json';
import summaryNextflowSchemaPkg from '../../../packages/summary-nextflow-schema/package.json';
import testsFormatSchema from '../../../packages/tests-format-schema/src/tests.schema.json';
import testsFormatSchemaPkg from '../../../packages/tests-format-schema/package.json';

export interface SchemaEntry {
  schema: Record<string, unknown>;
  version: string;
}

export const schemaRegistry: Record<string, SchemaEntry> = {
  'tests-format': {
    schema: testsFormatSchema as unknown as Record<string, unknown>,
    version: (testsFormatSchemaPkg as { version?: string }).version ?? '',
  },
  'summary-nextflow': {
    schema: summaryNextflowSchema as unknown as Record<string, unknown>,
    version: (summaryNextflowSchemaPkg as { version?: string }).version ?? '',
  },
  'galaxy-tool-discovery': {
    schema: galaxyToolDiscoverySchema as unknown as Record<string, unknown>,
    version: (galaxyToolDiscoverySchemaPkg as { version?: string }).version ?? '',
  },
};
