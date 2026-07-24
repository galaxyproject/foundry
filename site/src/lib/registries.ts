// The controlled registries the frontmatter contract is built from, loaded once
// for the whole site build. The loaders and the schema factory live in the
// shared @galaxy-foundry/note-schema package — the single source of truth the
// validator also uses — so the site and the validator can no longer drift.
import path from 'node:path';

import { loadLicensePolicy, loadReferenceContract, loadTagRegistry } from '@galaxy-foundry/note-schema';

// Astro builds run from the site/ directory; the registries live at the repo root.
const repoRoot = path.resolve('..');

export const licensePolicy = loadLicensePolicy(repoRoot);
export const referenceContract = loadReferenceContract(path.join(repoRoot, 'reference_contract.yml'));
// The tag registry answers membership itself (declared by its facets, never parsed off the
// `/` prefix) and carries the facet labels/descriptions the /tags pages group and render by.
export const tags = loadTagRegistry(path.join(repoRoot, 'meta_tags.yml'));
