// Where the repository is, for every site module that reads something off disk outside `site/`.
//
// `astro:config/server` gives the project directory as Astro computed it, which is the one anchor
// that does not depend on where a module ended up. Counting `../` from `import.meta.url` does:
// `astro build` collapses pages, components and lib modules alike into one chunk directory, and a
// hop count written against a source path is right afterwards only by coincidence. Twice now that
// coincidence has not held — `MoldHealth.astro` reporting every Mold as missing its `eval.md`, and
// `casts.ts` reporting `Casts = 0` with 54 of them committed, costing 54 pages the build never
// mentioned. `tests/root-anchoring.test.ts` asserts the rule so there is no third time.
//
// This is a module of its own because the import only resolves inside an Astro build. Anything
// worth testing outside one should take a directory rather than reach for this — `./companions`
// is the model.

import { fileURLToPath } from 'node:url';

import { root } from 'astro:config/server';

/** Absolute path of the repository root. `root` is the site directory; the repo is its parent. */
export const REPO_ROOT = fileURLToPath(new URL('../', root));
