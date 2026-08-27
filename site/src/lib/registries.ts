// The controlled registries the frontmatter contract is built from, loaded once
// for the whole site build. The loaders and the schema factory live in the
// shared @galaxy-foundry/note-schema package — the single source of truth the
// validator also uses — so the site and the validator can no longer drift.
import path from "node:path";

import { bundledPolicy } from "@galaxy-foundry/license-policy";
import { loadReferenceContract, requireRuntimeArtifactRegistry } from "@galaxy-foundry/note-schema";
import { loadTagRegistry } from "@galaxy-foundry/tag-registry";

// Astro builds run from the site/ directory; the registries live at the repo root.
const repoRoot = path.resolve("..");

// The license table is the exception: it is shared across Foundry instances rather than
// authored here, so it ships in @galaxy-foundry/license-policy instead of at our root.
export const licensePolicy = bundledPolicy();

// Only `kinds` is at our root — the other four vocabularies ship in
// @galaxy-foundry/reference-contract and note-schema composes the two halves.
//
// That package is a direct dependency of site/ even though nothing here imports it by
// name, and it has to be. It reads its shipped YAML relative to `import.meta.url`; reached
// only through the linked workspace package, Vite inlines it into an SSR chunk, and the
// path resolves against site/dist/chunks/ instead of node_modules — an ENOENT that only
// appears in `astro build`, never in tests or typecheck. Declaring it keeps it external.
export const referenceContract = loadReferenceContract(
  path.join(repoRoot, "reference_contract.yml"),
);
export const runtimeArtifacts = requireRuntimeArtifactRegistry(
  path.join(repoRoot, "runtime_artifacts.yml"),
);
// The facet vocabulary is ours, but the format is not: @galaxy-foundry/tag-registry parses
// and validates it. The registry answers membership itself (declared by its facets, never
// parsed off the `/` prefix) and carries the facet labels/descriptions the /tags pages
// group and render by.
export const tags = loadTagRegistry(path.join(repoRoot, "meta_tags.yml"));
