// The controlled registries the frontmatter contract is built from, loaded once
// for the whole site build. The loaders and the schema factory live in the
// shared @galaxy-foundry/note-schema package — the single source of truth the
// validator also uses — so the site and the validator can no longer drift.
import path from 'node:path';

import { loadLicensePolicy, loadReferenceContract, loadTags } from '@galaxy-foundry/note-schema';

// Astro builds run from the site/ directory; the registries live at the repo root.
const repoRoot = path.resolve('..');

export const licensePolicy = loadLicensePolicy(repoRoot);
export const referenceContract = loadReferenceContract(path.join(repoRoot, 'reference_contract.yml'));
export const tags = loadTags(path.join(repoRoot, 'meta_tags.yml'));
