// What makes this site THIS site, in one place.
//
// The shell — Base, Header, Footer — is within a handful of lines of the sibling instance's, and
// every one of those lines is a value rather than a decision: the name in the wordmark, the name
// in the footer, the description, the width of the column. Naming them here is worth doing on its
// own terms, and it is also what would have to happen first if the shell were ever to be shared:
// what remains after this is markup, and markup is the part that could move.
//
// The two names are not redundant. The wordmark and the <title> suffix want the short one, and
// the footer wants the full one — this instance is "Foundry" in its own header and "Galaxy
// Workflow Foundry" at the bottom of the page. The sibling happens to use one string for both,
// which is a fact about its name and not about the shape of this file.

/** Short name: the header wordmark and the `<title>` suffix. */
export const SITE_NAME = 'Foundry';

/** Full name: the footer, and the first words of the description. */
export const SITE_FULL_NAME = 'Galaxy Workflow Foundry';

/** Default `<meta name="description">`, and the og/twitter pair built from it. */
export const SITE_DESCRIPTION =
  'Galaxy Workflow Foundry — knowledge base + casting pipeline for Galaxy workflows.';

export const REPO_URL = 'https://github.com/galaxyproject/foundry';

/**
 * The measure of the reading column, as a Tailwind class.
 *
 * NOT this site's to choose, unlike everything above it — both instances now carry the same value.
 * The sibling used to sit one step narrower, and that difference was never decided: its shell was copied
 * from this one two months later, and the width changed in the same edit as the name and the
 * description. Neither repo touched it again.
 *
 * Nor does either corpus defend a value. The prose measure is set by narrowing locally on the
 * pages that want it — the sibling does that a dozen times, this instance once — so this is only
 * the outer bound for tables and grids, of which this instance has 117 pages' worth.
 *
 * It lives here because it has to live somewhere until the shell is shared, and it is the first
 * thing that should LEAVE this file when it is: a shared component can hold one measure and take
 * no prop for it.
 *
 * Two notes on spelling, one mechanism behind both: Tailwind finds utilities by scanning source
 * TEXT, comments included. So the value is written out in full rather than assembled — from
 * pieces (`max-w-${size}`) it would find nothing, emit no rule, and the page would build clean and
 * render full-bleed. And the widths above are described rather than named, because this file
 * briefly shipped a rule for a width nothing used, on the strength of a comment mentioning it.
 *
 * Base, Header and Footer each carried a copy of this, free to disagree —
 * `tests/built-shell.test.ts` asserts the three agree.
 */
export const CONTAINER = 'max-w-6xl';
