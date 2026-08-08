// The document shell's contract, asserted on what the build actually emitted.
//
// The shell has no unit behaviour worth testing — it is markup. What it DOES have is a contract
// with the reader that no other check can see: a skip link that lands somewhere, a theme applied
// before first paint, and a stylesheet that actually carries the utilities the markup names. Every
// one of those fails green. The page builds, the HTML is well-formed, and the site is broken.
//
// This was written against the hand-rolled Base/Header/Footer, deliberately BEFORE they moved to
// @galaxy-foundry/site-kit, because a test written after a swap proves nothing about what the swap
// changed. It passed unaltered afterwards — the assertions below are the ones that were here, and
// the swap is what they were for.
//
// The stylesheet assertion is the one to understand before editing, and the move is what armed it.
// Tailwind 4 emits a utility only where it finds the class in a source file it was told to scan,
// and it does not look inside node_modules — which is exactly where the shell now lives. So the
// canary is no longer a hypothetical about markup that might one day move: `min-h-dvh` is named by
// the KIT and by nothing in this repo, and its presence in the emitted CSS is the only evidence
// that `@source` in global.css points where it claims to. Delete that line, or misspell it, and
// every page still references the class while no rule for it exists. Nothing errors.
//
// WHICH MEANS THIS FILE'S LOCATION IS LOAD-BEARING. Automatic source detection scans the Vite
// root, `site/`. This file sits above it, so naming the canary here does not create it. The
// sibling instance put its copy in `site/tests/`, where it DID create it — the assertion passed
// with the class deleted from the layout, because the test was keeping it alive by asserting on
// it. That repo now carries `@source not` for its test directory. Move this file under `site/`
// and the canary goes quiet in exactly the same way.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { licenseBadgeStyleGaps, licenseFileStyleGaps } from "@galaxy-foundry/site-kit";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { SITE_IDENTITY } from "../site/src/lib/site-identity";

// This file's assertions are ~100ms of disk reads on an idle machine and have still hit vitest's
// 5s default in a full run, where sibling suites spawn child builds on the same cores. The budget
// was never an assertion about speed; a genuine hang still fails, later.
vi.setConfig({ testTimeout: 30_000 });

const { footerLinks: FOOTER_LINKS, navLinks: NAV_LINKS, repoUrl: REPO_URL } = SITE_IDENTITY;

const REPO_ROOT = new URL("../", import.meta.url).pathname;
const SITE = path.join(REPO_ROOT, "site");
const DIST = path.join(SITE, "dist");

/** A utility class named by the kit and by nothing in this repo — see the header comment. */
const KIT_ONLY_UTILITY = "min-h-dvh";

function newestMtime(dir: string): number {
  return readdirSync(dir).reduce((newest, entry) => {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    return Math.max(newest, stat.isDirectory() ? newestMtime(full) : stat.mtimeMs);
  }, 0);
}

/**
 * The environment for the child build, with vitest's own removed.
 *
 * Vitest mirrors `import.meta.env` into `process.env` — `MODE`, `DEV`, `PROD`, `SSR`, and
 * `BASE_URL=/`. A child `astro build` inherits all five, and takes `BASE_URL` over the `base` in
 * `astro.config.mjs`: every link on every page comes out root-relative, and this suite asserts
 * against a site that is not the one being shipped. It built cleanly, all 374 pages, for as long
 * as this file has existed. Nothing noticed until an assertion read an href.
 */
function buildEnv(): NodeJS.ProcessEnv {
  const { BASE_URL, MODE, DEV, PROD, SSR, ...rest } = process.env;
  return rest;
}

/**
 * Build only when `dist/` is missing or older than the sources.
 *
 * Asserting against a stale `dist/` is worse than not asserting: it reports on a site nobody is
 * shipping, and it reports PASS. Reusing a fresh one keeps the suite quick on a repeat run.
 */
function ensureBuilt(): void {
  const landmark = path.join(DIST, "index.html");
  const fresh =
    existsSync(landmark) && statSync(landmark).mtimeMs > newestMtime(path.join(SITE, "src"));
  if (fresh) return;
  execFileSync("pnpm", ["run", "build"], { cwd: SITE, stdio: "inherit", env: buildEnv() });
}

function builtPages(dir: string = DIST): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (entry === "pagefind" || entry === "_astro") return [];
    if (statSync(full).isDirectory()) return builtPages(full);
    return entry.endsWith(".html") ? [full] : [];
  });
}

const rel = (file: string) => path.relative(DIST, file);

// Memoized because five assertions below each walk all 374 emitted pages. Nothing writes to dist/
// after beforeAll, so a page read twice is the same page.
const cache = new Map<string, string>();
const read = (file: string): string => {
  const hit = cache.get(file);
  if (hit !== undefined) return hit;
  const text = readFileSync(file, "utf-8");
  cache.set(file, text);
  return text;
};

/**
 * Pages that are one component in an empty document, on purpose.
 *
 * The gallery gives a page of its own to every specimen the kit marks `isolated` — its word for
 * valid markup carrying document-unique ids, which two of on one page leaves silently half-dead —
 * and the index shows them in frames. Wrapping those in the shell would put a header above the
 * header being demonstrated, and the frame would be a picture of the site rather than of the
 * component.
 *
 * Only the two assertions about the shell's own furniture skip these. The theme script is NOT
 * excused: a framed header that ignores the theme the reader chose is wrong exactly the way any
 * other page would be.
 */
const COMPONENT_PAGES = [
  "gallery/site-header/active-below-a-section/index.html",
  "gallery/site-header/active-under-more/index.html",
  "gallery/site-header/everything-fits/index.html",
  "gallery/site-header/long-wordmark/index.html",
  "gallery/site-header/overflows/index.html",
  "gallery/site-header/sibling-prefix/index.html",
];

let pages: string[];
let sitePages: string[];
let home: string;

beforeAll(() => {
  ensureBuilt();
  pages = builtPages();
  sitePages = pages.filter((file) => !COMPONENT_PAGES.includes(rel(file)));
  home = read(path.join(DIST, "index.html"));
}, 600_000);

describe("the document shell, on every page the build emitted", () => {
  it("emits enough pages to be worth asserting about", () => {
    // Guards the guard: an empty dist/ would make every test below vacuously true.
    expect(pages.length).toBeGreaterThan(300);
  });

  it("excuses only routes the build still emits", () => {
    // An entry left behind after its route is renamed excuses a page that no longer exists, and
    // goes on excusing whatever takes its path later.
    const emitted = new Set(pages.map(rel));
    expect(
      COMPONENT_PAGES.filter((page) => !emitted.has(page)),
      "\nstale exemptions",
    ).toEqual([]);
  });

  it("offers a skip link that lands on a target that exists", () => {
    const broken = sitePages.filter((file) => {
      const html = read(file);
      return !html.includes('href="#main"') || !html.includes('id="main"');
    });
    expect(broken.map(rel), "\npages missing the skip link or its target").toEqual([]);
  });

  it("applies the theme before first paint, and tells pagefind which one", () => {
    // Scoped to <head> deliberately. Inline and in <head> is the whole point: run this after the
    // browser has painted and the reader watches the page flash white on the way to dark.
    //
    // The first version of this searched the WHOLE page, and passed with the pre-paint script
    // deleted — the theme TOGGLE in the header sets the same two things on click, so the strings
    // were still there while the behaviour was gone. Two scripts, one contract each; only this
    // one runs before paint.
    const broken = pages.filter((file) => {
      const head = read(file).split("</head>")[0] ?? "";
      return (
        !head.includes("localStorage.theme") ||
        !head.includes("pfTheme") ||
        !head.includes("matchMedia")
      );
    });
    expect(broken.map(rel), "\npages with no pre-paint theme script in <head>").toEqual([]);
  });

  it("carries a header and a footer", () => {
    const broken = sitePages.filter((file) => {
      const html = read(file);
      return !html.includes("<header") || !html.includes("<footer");
    });
    expect(broken.map(rel), "\npages missing the header or the footer").toEqual([]);
  });
});

describe("the document skeleton", () => {
  it("declares a language, a title and the social metadata", () => {
    expect(home).toContain('<html lang="en"');
    expect(home).toMatch(/<title>[^<]+ - Foundry<\/title>/);
    expect(home).toContain('property="og:title"');
    expect(home).toContain('property="og:description"');
  });
});

/** Every stylesheet the build emitted, concatenated. The shell's styles are split across several. */
const emittedCss = (): string =>
  readdirSync(path.join(DIST, "_astro"))
    .filter((entry) => entry.endsWith(".css"))
    .map((entry) => read(path.join(DIST, "_astro", entry)))
    .join("\n");

/**
 * The `:root` declarations alone — the light theme, and the only place a "did this token survive"
 * question can be asked honestly.
 *
 * `.dark` is a class, and a class is not tree-shaken. A token declared under it emits whether or
 * not anything reads it, so the same token missing from `:root` is invisible to any search of the
 * whole file. Both assertions that ask about tokens go through here.
 */
const rootCss = (): string => (emittedCss().match(/:root[^{]*\{[^}]*\}/g) ?? []).join("");

describe("the stylesheet the shell depends on", () => {
  it("emits a utility that only the kit names", () => {
    const css = emittedCss();

    expect(css).not.toHaveLength(0);
    expect(
      css.includes(KIT_ONLY_UTILITY),
      `\n\`${KIT_ONLY_UTILITY}\` is referenced by the built markup but has no rule in any` +
        ` emitted stylesheet. Tailwind did not scan the package that declares it — check the` +
        ` \`@source\` line in global.css, and see the header comment. The pages will render` +
        ` unstyled, and nothing else reports this.`,
    ).toBe(true);
  });
});

// Here rather than in a file of its own because it asserts on the same built `dist/`, and a second
// suite that spawns its own `astro build` would double the slowest thing in this repo's test run.
describe("the palette this stylesheet declares", () => {
  // Tailwind 4 emits an `@theme` token ONLY where it finds a reference, so a token nothing uses
  // reaches no stylesheet and costs no bytes. Which is exactly why they accumulate: six had, and
  // the one that mattered was `--color-surface-dark`, a semantic name holding #2c3143 — the colour
  // the header bar has always used — under the surfaces heading, well away from the brand token
  // that was actually doing the work. A dead token is not waste, it is a wrong answer waiting for
  // a reader in a hurry.
  //
  // `:root` is the load-bearing part, and it is what found two of the six. A token redeclared under
  // `.dark` emits from THAT rule whichever way, because a class is not tree-shaken — so a search of
  // the whole stylesheet reports it alive while the light value is referenced by nothing.
  // `--color-rail-on` and `--color-tag-bg-hover` were both exactly that: present in the file, absent
  // from `:root`, used nowhere.
  it("declares no token that reaches no stylesheet", () => {
    const source = read(path.join(SITE, "src/styles/global.css"));
    const block = source.slice(
      source.indexOf("@theme"),
      source.indexOf("\n}", source.indexOf("@theme")),
    );
    const declared = [...block.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]!);

    const dead = declared.filter((token) => !rootCss().includes(`${token}:`));

    expect(
      declared.length,
      "\nno tokens parsed out of @theme — has the block moved?",
    ).toBeGreaterThan(20);
    expect(
      dead,
      "\nthese are declared in `@theme` and referenced by nothing, so Tailwind emitted no" +
        " declaration for them. Delete them, or use them. A token carrying a value that is also" +
        " some other token's is the worst kind: it reads as the right name for a colour that is" +
        " actually spelled elsewhere.\n\n  " +
        dead.join("\n  ") +
        "\n",
    ).toEqual([]);
  });
});

describe("the tokens the licence components name", () => {
  // The same failure the shell's `@source` line has, one layer in. `LicenseBadge` and
  // `LicenseFileBody` bring their own scoped styles, so there are no classes to declare — but their
  // rules read custom properties that this repo has to supply, and a property nothing declares
  // resolves to nothing inside `color-mix()`. The chip renders with no background at all: legible
  // text, no colour, and a page that looks designed rather than broken.
  //
  // Worth asserting here rather than trusting the move, because these three used to be literals
  // INSIDE the component — `#16a34a`, `#d97706`, `#dc2626`. Nothing had to be declared for them to
  // work, and the adoption is exactly the moment that stops being true.
  it("declares every one where the light theme can reach it", () => {
    // `:root`, for the reason the palette block above spells out, and this is the second time that
    // trap has been walked into rather than the first. Asked of the whole emitted stylesheet, this
    // passes with a token declared ONLY under `.dark`: the class is not tree-shaken, so the search
    // finds the dark value and reports the light one healthy. Every chip on the site then renders
    // backgroundless in light mode and correct in dark, which is close to the least likely
    // combination to be noticed in review.
    const root = rootCss();

    expect(root).not.toHaveLength(0);
    expect(
      licenseBadgeStyleGaps(root),
      "\ntokens the badge reads and this site never declares",
    ).toEqual([]);
    expect(
      licenseFileStyleGaps(root),
      "\ntokens the licence-file body reads and this site never declares",
    ).toEqual([]);
  });
});

const region = (html: string, open: string, close: string): string =>
  html.slice(html.indexOf(open), html.indexOf(close) + close.length);
const hrefsIn = (nav: string): string[] =>
  [...nav.matchAll(/<a\s[^>]*href="([^"]+)"/g)].flatMap((m) => (m[1] ? [m[1]] : []));
const activeIn = (nav: string): string[] =>
  [...nav.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*aria-current="page"/g)].flatMap((m) =>
    m[1] ? [m[1]] : [],
  );
/** The wordmark is the first link in the header, and it points at the site root. */
const baseFrom = (html: string): string =>
  (/<a\s[^>]*href="([^"]+)"/.exec(region(html, "<header", "</header>"))?.[1] ?? "/").replace(
    /\/$/,
    "",
  );

describe("the navigation", () => {
  // `NAV_LINKS` is data: a path and a label, nothing callable. Which link is active is DERIVED
  // from the path rather than declared per entry, and one derivation now stands in for ten
  // hand-written matchers — so the derivation is what gets asserted, against built pages.
  //
  // Both halves fail quietly. A destination that points at no route renders as a perfectly good
  // link to a 404, and a section that never lights up looks like a page the reader navigated to
  // some other way. Neither shows up in a build log.
  it("emits links under the base the site is configured to deploy at", () => {
    // The assertion that found the `BASE_URL` leak above, stated directly so the next one names
    // itself instead of surfacing as "no section is ever marked active". The pages are served
    // from a subpath; a build that forgets it produces links that all 404 on the deployed site
    // and all resolve locally.
    const configured = /\bbase\s*[:=]\s*["']([^"']+)["']/.exec(
      read(path.join(SITE, "astro.config.mjs")),
    )?.[1];

    expect(configured, "\nno base in astro.config.mjs — has the config moved?").toBeTruthy();
    expect(baseFrom(home)).toBe(configured);
  });

  it("points every destination at a section the build emitted", () => {
    const missing = NAV_LINKS.filter(
      (link) => !existsSync(path.join(DIST, link.path, "index.html")),
    );
    expect(
      missing.map((link) => link.path),
      "\nnav destinations with no built index",
    ).toEqual([]);
  });

  it("renders every destination it declares, on the bar or under More", () => {
    // The bar is a slice of the list, so a wrong cut point drops links off the end of the header
    // rather than erroring. Count and membership both, since a duplicate would satisfy the count.
    const rendered = new Set(hrefsIn(region(home, "<nav", "</nav>")));
    const declared = NAV_LINKS.map((link) => `${baseFrom(home)}${link.path}`);

    expect(
      declared.filter((href) => !rendered.has(href)),
      "\ndeclared but not rendered",
    ).toEqual([]);
    expect(rendered.size).toBe(NAV_LINKS.length);
  });

  it("marks the section the reader is in, and marks no other", () => {
    const base = baseFrom(home);
    const wrong = NAV_LINKS.flatMap((link) => {
      const href = `${base}${link.path}`;
      const under = pages.filter((file) => rel(file).startsWith(link.path.slice(1)));
      // The section index and the last page under it. The rule is "this page or anything beneath
      // it", and the second sample is the half a plain equality check would get wrong.
      return [under[0], under[under.length - 1]]
        .filter((file): file is string => Boolean(file))
        .map((file) => ({
          page: rel(file),
          marked: activeIn(region(read(file), "<nav", "</nav>")),
        }))
        .filter((seen) => seen.marked.length !== 1 || seen.marked[0] !== href);
    });
    expect(wrong, "\npages whose header does not mark exactly their own section").toEqual([]);
  });
});

describe("the footer", () => {
  it("links to the repository and to every extra destination it declares", () => {
    const links = hrefsIn(region(home, "<footer", "</footer>"));
    const declared = FOOTER_LINKS.map((link) => `${baseFrom(home)}${link.path}`);

    expect(links, "\nthe repository link is missing from the footer").toContain(REPO_URL);
    expect(
      declared.filter((href) => !links.includes(href)),
      "\ndeclared but not rendered",
    ).toEqual([]);
    expect(
      FOOTER_LINKS.filter((link) => !existsSync(path.join(DIST, link.path, "index.html"))).map(
        (link) => link.path,
      ),
      "\nfooter destinations with no built index",
    ).toEqual([]);
  });

  it("puts no clock in the output", () => {
    // The copyright line used to read `© ${new Date().getFullYear()}`, which runs at BUILD time:
    // the page reported when it was last deployed, and the same commit rendered differently on
    // either side of a new year. Every check this shell has is a diff against built output, and a
    // build that is not reproducible from its source makes those diffs unreadable.
    const stamped = pages.filter((file) =>
      /\b(19|20)\d{2}\b/.test(region(read(file), "<footer", "</footer>")),
    );
    expect(stamped.map(rel), "\npages whose footer carries a year").toEqual([]);
  });
});

describe("the container width", () => {
  // One decision, so it is asserted as one: the three regions have to agree, and a width that
  // disagrees in one of them reads as a subtly misaligned page and as nothing else. The kit now
  // holds the measure as a single constant, which is what makes them agree — so what this catches
  // is a region that lost the class on the way to the page, not three copies drifting apart.
  const widthsIn = (html: string, open: string, close: string): string[] => {
    const region = html.slice(html.indexOf(open), html.indexOf(close) + close.length);
    return [...region.matchAll(/max-w-(\d?xl|none|full)/g)].map((m) => m[0]);
  };

  it("is the same in the header, the main column and the footer", () => {
    const main = /<main[^>]*\bclass="([^"]*)"/.exec(home)?.[1] ?? "";
    const mainWidth = /max-w-\S+/.exec(main)?.[0];

    expect(mainWidth, "\nno max-w-* on <main>").toBeDefined();
    expect(new Set(widthsIn(home, "<header", "</header>"))).toEqual(new Set([mainWidth]));
    expect(new Set(widthsIn(home, "<footer", "</footer>"))).toEqual(new Set([mainWidth]));
  });
});

/**
 * Pages the search box will never return, on purpose.
 *
 * Empty is a claim, not a stub: every route on this site is worth finding. The list exists because
 * an absence has to be a DECISION — without one, "deliberately out of the index" and "nobody
 * thought about this route" are the same observation, which is how 132 of them accumulated.
 */
const UNSEARCHABLE: string[] = [
  // The gallery. Its pages are the kit's components rendered against invented props — a contract
  // with two made-up kinds, a nav of seven links that go nowhere, a note that moved. Every word on
  // them is bait: a reader searching "trimming reads" wants the note, not the card that demonstrates
  // what a card looks like. So the gallery index and the specimens that get a route of their own
  // stay out of the site's own index.
  //
  // `gallery/site-shell/searchable` is deliberately NOT here. That specimen's whole case is that a
  // searchable shell marks its column, and the way to be sure it does is that Pagefind finds it.
  "gallery/index.html",
  "gallery/site-header/active-below-a-section/index.html",
  "gallery/site-header/active-under-more/index.html",
  "gallery/site-header/everything-fits/index.html",
  "gallery/site-header/long-wordmark/index.html",
  "gallery/site-header/overflows/index.html",
  "gallery/site-header/sibling-prefix/index.html",
  "gallery/site-shell/unsearchable/index.html",
];

describe("what the search box can find", () => {
  // The contract nothing checked, and the one place where reading the source tells you nothing.
  //
  // Pagefind's rule is all-or-nothing and runs BACKWARDS from what the attribute looks like. Mark
  // no page with `data-pagefind-body` and every page is indexed from its `<body>`. Mark ONE and
  // every unmarked page leaves the index entirely. So an annotation that reads as "index this
  // page" means "index only pages like this one", and putting it on a single route is strictly
  // worse for the rest of the site than never adding it.
  //
  // Which is exactly what had happened here. One route carried it, and the index held 242 of these
  // 374 pages — missing every artifact page, every tag page, the glossary, the dashboard and 48
  // generated skill pages. The routes a reader is likeliest to arrive at by searching.
  //
  // Nothing reported it, and this is the part worth remembering: the build log prints
  // "Pagefind indexed 374 pages" in BOTH states, because it counts pages processed rather than
  // pages indexed. There is no warning, no diff and no page that looks wrong. The only symptom is
  // a search answering "no results" for words plainly on the page.
  //
  // So this asserts on the emitted INDEX rather than on the markup. A source-level check would
  // confirm the attribute is written; only the index confirms a reader can find the page.
  const indexedPageCount = (): number => {
    const entry = JSON.parse(read(path.join(DIST, "pagefind/pagefind-entry.json"))) as {
      languages: Record<string, { page_count: number }>;
    };
    return Object.values(entry.languages).reduce((total, lang) => total + lang.page_count, 0);
  };

  it("holds every page the build emitted, less the ones declared unsearchable", () => {
    expect(indexedPageCount()).toBe(pages.length - UNSEARCHABLE.length);
  });

  it("marks the main column rather than falling back to the whole body", () => {
    // `<body>` is Pagefind's default when nothing is marked, and it pulls the nav and footer into
    // every result's excerpt. Narrower is better, but narrower is also what makes the all-or-
    // nothing rule apply at all — so having marked anything, every page has to be marked.
    const unmarked = pages.filter((file) => !read(file).includes("data-pagefind-body"));
    expect(unmarked.map(rel).sort(), "\nemitted but unfindable").toEqual(UNSEARCHABLE);
  });

  it("puts the attribute on <main>, so chrome stays out of the excerpt", () => {
    expect(home).toMatch(/<main[^>]*\sdata-pagefind-body/);
  });
});

describe("the gallery", () => {
  // The one route on this site that nothing generates a link to. Every other page hangs off a
  // collection, a tag or the nav, so an unreachable one would have to be built by hand — which is
  // exactly what this is. It went out with no inbound link at all and looked completely finished:
  // the routes emit, the frames render, and the only symptom is that no reader ever arrives.
  const galleryIndex = () => read(path.join(DIST, "gallery/index.html"));

  it("is linked from a page a reader can get to", () => {
    const href = `${baseFrom(home)}/gallery/`;
    const design = read(path.join(DIST, "design/index.html"));
    expect(hrefsIn(design), "\nthe design record no longer links the gallery").toContain(href);
  });

  it("frames only routes the build emitted", () => {
    // A frame whose src is a 404 renders as an empty box, which is indistinguishable from a
    // specimen whose case is "renders nothing" — the ambiguity the specimens exist to remove.
    const base = baseFrom(home);
    const framed = [...galleryIndex().matchAll(/<iframe\s[^>]*src="([^"]+)"/g)].flatMap((m) =>
      m[1] ? [m[1]] : [],
    );

    expect(framed.length, "\nno frames on the gallery index").toBeGreaterThan(0);
    const missing = framed.filter(
      (src) => !existsSync(path.join(DIST, src.slice(base.length), "index.html")),
    );
    expect(missing, "\nframed routes the build never emitted").toEqual([]);
  });
});

describe("the tag chips", () => {
  // Every note page carries a chip per tag, archived notes included, and the chip is a link. What
  // decides whether that link lands is `getStaticPaths` in tags/[...tag].astro, which builds from
  // every note — while the tags index counts only the ones that are not archived. The two rules
  // are already different and the difference is currently harmless; make getStaticPaths agree with
  // the index, which reads like a correction, and every chip on an archived note 404s. The build
  // stays green either way, because a page nothing generates is indistinguishable from a page
  // nothing wants.
  //
  // Asserted from the emitted HTML rather than from the corpus: the question is whether the links
  // the site SHIPS have destinations, and re-deriving the expected tag set here would ask the
  // corpus the same question the pages already answered.
  it("link to tag pages the build emitted", () => {
    const base = baseFrom(home);
    const emitted = new Set(pages.map(rel));
    const linked = new Set(
      pages
        .flatMap((file) => hrefsIn(read(file)))
        .filter((href) => href.startsWith(`${base}/tags/`))
        .map((href) => href.slice(base.length + 1).replace(/\/$/, "")),
    );

    expect(linked.size, "\nno links to tag pages in the built site").toBeGreaterThan(0);
    const missing = [...linked].filter((route) => !emitted.has(`${route}/index.html`)).sort();
    expect(missing, `\nlinked tag routes with no built page: ${missing.join(", ")}`).toEqual([]);
  });
});
