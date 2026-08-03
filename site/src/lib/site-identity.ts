// What makes this site THIS site, in one place.
//
// The shell — Base, Header, Footer — is within a handful of lines of the sibling instance's, and
// every one of those lines is a value rather than a decision: the name in the wordmark, the name
// in the footer, the description, the width of the column, where the nav goes. Naming them here is
// worth doing on its own terms, and it is also what would have to happen first if the shell were
// ever to be shared: what remains after this is markup, and markup is the part that could move.
//
// Base.astro and Header.astro are now byte-identical to the sibling's. That is the measure of how
// much of the shell was ever this site's: two files, and the difference between them was entirely
// the values below.
//
// The two names are not redundant. The wordmark and the <title> suffix want the short one, and
// the footer wants the full one — this instance is "Foundry" in its own header and "Galaxy
// Workflow Foundry" at the bottom of the page. The sibling happens to use one string for both,
// which is a fact about its name and not about the shape of this file.

/** Short name: the header wordmark and the `<title>` suffix. */
export const SITE_NAME = "Foundry";

/** Full name: the footer, and the first words of the description. */
export const SITE_FULL_NAME = "Galaxy Workflow Foundry";

/** Default `<meta name="description">`, and the og/twitter pair built from it. */
export const SITE_DESCRIPTION =
  "Galaxy Workflow Foundry — knowledge base + casting pipeline for Galaxy workflows.";

export const REPO_URL = "https://github.com/galaxyproject/foundry";

/**
 * A destination in the shell's chrome.
 *
 * `path` is site-absolute and carries no base — `BASE_URL` is applied where the link is rendered.
 * That keeps these plain lists: no closures, nothing an environment variable has to resolve, so
 * they can be serialized, read from a file, or handed to a shared component as props.
 */
export type ShellLink = { path: string; label: string };

/**
 * The primary navigation, in order.
 *
 * Active state is DERIVED from `path`: a link is active on its own page and on everything under
 * it. Every entry used to carry that rule as its own `match` closure, and fifteen of the sixteen
 * across the two instances were the same single line. The sixteenth — Pipelines, here — also
 * excluded any path containing `/molds`, and that pair of routes has never existed: the clause
 * dates to the first commit of the repo and matches none of the 374 pages the build emits. It is
 * gone rather than ported, because a shared header cannot take an exception it cannot express.
 */
export const NAV_LINKS: ShellLink[] = [
  { path: "/story/", label: "Story" },
  { path: "/usage/", label: "Usage" },
  { path: "/molds/", label: "Molds" },
  { path: "/patterns/", label: "Patterns" },
  { path: "/pipelines/", label: "Pipelines" },
  { path: "/dashboard/", label: "Dashboard" },
  { path: "/index/", label: "Index" },
  { path: "/tags/", label: "Tags" },
  { path: "/external/", label: "External" },
  { path: "/log/", label: "Log" },
];

/**
 * How many of them stay on the bar. Everything after goes under "More".
 *
 * A count, not a claim about which sections matter — it is set by what fits, and what fits differs
 * between the two instances because the wordmark does. Measured against the built page at the
 * 1152px bound: this wordmark is 75px, and five links plus the search box leave 399px of slack.
 * The sibling's wordmark is 279px — 204px more, about four links' worth — so it carries all six of
 * its destinations on the bar and its "More" group never renders.
 *
 * Raise it while the bar has slack; lower it the moment a label wraps to a second row.
 */
export const NAV_VISIBLE = 5;

/**
 * Destinations the footer offers beside the repository, which it always links.
 *
 * Empty here, and one entry in the sibling. That is the whole of what the two footers disagreed
 * about once the copyright line went: an instance whose corpus has an obvious front door names it
 * twice, and this one does not have one.
 *
 * The list renders in order, before the repository link.
 */
export const FOOTER_LINKS: ShellLink[] = [];

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
export const CONTAINER = "max-w-6xl";
