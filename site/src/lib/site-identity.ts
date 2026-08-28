import type { SiteIdentity } from "@galaxy-foundry/site-kit";

// What makes this site THIS site, in one place.
//
// The shell itself is no longer here. Base, Header and Footer became byte-identical to the sibling
// instance's, one value at a time, and then moved to @galaxy-foundry/site-kit — so what is left in
// this repo is the composition point in `layouts/Base.astro` and the values below. The kit ships
// the shape; this file is the whole of the answer.
//
// The two names are not redundant. The wordmark and the <title> suffix want the short one, and
// the footer wants the full one — this instance is "Foundry" in its own header and "Galaxy
// Workflow Foundry" at the bottom of the page. The sibling happens to use one string for both,
// which is a fact about its name and not about the shape of this file.
//
// The container width used to live here and does not any more. Both instances had converged on the
// same measure before the shell moved, so the kit holds it and takes no prop for it; see CONTAINER
// there for why re-opening it as a parameter would be the wrong trade.

export const SITE_IDENTITY: SiteIdentity = {
  name: "Foundry",

  fullName: "Galaxy Workflow Foundry",

  description: "Galaxy Workflow Foundry — knowledge base + casting pipeline for Galaxy workflows.",

  repoUrl: "https://github.com/galaxyproject/foundry",

  /**
   * The primary navigation, in order.
   *
   * Active state is DERIVED from `path`: a link is active on its own page and on everything under
   * it. Every entry used to carry that rule as its own `match` closure, and fifteen of the sixteen
   * across the two instances were the same single line. The sixteenth — Pipelines, here — also
   * excluded any path containing `/molds`, and that pair of routes has never existed: the clause
   * dated to the first commit of the repo and matched none of the 374 pages the build emits. It is
   * gone rather than ported, because a shared header cannot take an exception it cannot express.
   */
  navLinks: [
    { path: "/story/", label: "Story" },
    { path: "/usage/", label: "Usage" },
    { path: "/molds/", label: "Molds" },
    { path: "/patterns/", label: "Patterns" },
    { path: "/pipelines/", label: "Pipelines" },
    { path: "/dashboard/", label: "Dashboard" },
    { path: "/index/", label: "Index" },
    { path: "/tags/", label: "Tags" },
    { path: "/external/", label: "External" },
  ],

  /**
   * How many of them stay on the bar. Everything after goes under "More".
   *
   * A count, not a claim about which sections matter — it is set by what fits, and what fits
   * differs between the two instances because the wordmark does. Measured against the built page at
   * the 1152px bound: this wordmark is 75px, and five links plus the search box leave 399px of
   * slack. The sibling's wordmark is 279px — 204px more, about four links' worth — so it carries
   * all six of its destinations on the bar and its "More" group never renders.
   *
   * Raise it while the bar has slack; lower it the moment a label wraps to a second row.
   */
  navVisible: 5,

  /**
   * Destinations the footer offers beside the repository, which it always links.
   *
   * Empty here, and one entry in the sibling. That is the whole of what the two footers disagreed
   * about once the copyright line went: an instance whose corpus has an obvious front door names it
   * twice, and this one does not have one.
   *
   * The list renders in order, before the repository link.
   */
  footerLinks: [],
};
