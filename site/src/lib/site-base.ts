import { shellBase } from '@galaxy-foundry/site-kit';

// Where this instance is deployed, normalized: no trailing slash, and the empty string at a domain
// root. Every href this repo builds hangs off it, and the environment is read exactly ONCE — here.
//
// The definition is the kit's rather than a local copy of it. The shell has to resolve the nav
// against the same base the pages link with, so `shellBase` is where that rule already lives, and
// taking it from there is what keeps the chrome and the corpus from answering the question
// differently. Thirty-eight files used to each answer it for themselves.
//
// Lowercase `base` on purpose: it is the name this value already travels under in every signature
// it reaches — `resolveWikiLink(wl, linkMap, base)`, `artifactHref(base, id)`. Naming it anything
// else here would rename it in places that are not about where the site is served from.

export const base = shellBase(import.meta.env.BASE_URL);
