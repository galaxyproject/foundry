// The document shell's contract, asserted on what the build actually emitted.
//
// Base.astro, Header.astro and Footer.astro have no unit behaviour worth testing — they are
// markup. What they DO have is a contract with the reader that no other check can see: a skip
// link that lands somewhere, a theme applied before first paint, and a stylesheet that actually
// carries the utilities the markup names. Every one of those fails green. The page builds, the
// HTML is well-formed, and the site is broken.
//
// This exists ahead of any attempt to share these components. A test written after a swap proves
// nothing about what the swap changed, so it is written against the hand-rolled components first
// and is expected to pass unaltered afterwards. If sharing them never happens, this is still the
// only thing standing between the shell and a silent regression.
//
// The stylesheet assertion is the one to understand before editing. Tailwind 4 emits a utility
// only where it finds the class in a source file it was told to scan. Move the markup somewhere
// unscanned — a package under node_modules, say — and the class disappears from the CSS while
// every page still references it. Nothing errors. The page renders unstyled. `min-h-dvh` is the
// canary because Base.astro is the only file in the repo that names it, so its presence in the
// emitted CSS is evidence that the layout specifically was scanned.
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

import { beforeAll, describe, expect, it } from "vitest";

const REPO_ROOT = new URL("../", import.meta.url).pathname;
const SITE = path.join(REPO_ROOT, "site");
const DIST = path.join(SITE, "dist");

/** A utility class named by the layout and by nothing else — see the header comment. */
const LAYOUT_ONLY_UTILITY = "min-h-dvh";

function newestMtime(dir: string): number {
  return readdirSync(dir).reduce((newest, entry) => {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    return Math.max(newest, stat.isDirectory() ? newestMtime(full) : stat.mtimeMs);
  }, 0);
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
    existsSync(landmark) &&
    statSync(landmark).mtimeMs > newestMtime(path.join(SITE, "src"));
  if (fresh) return;
  execFileSync("pnpm", ["run", "build"], { cwd: SITE, stdio: "inherit" });
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
const read = (file: string) => readFileSync(file, "utf-8");

let pages: string[];
let home: string;

beforeAll(() => {
  ensureBuilt();
  pages = builtPages();
  home = read(path.join(DIST, "index.html"));
}, 600_000);

describe("the document shell, on every page the build emitted", () => {
  it("emits enough pages to be worth asserting about", () => {
    // Guards the guard: an empty dist/ would make every test below vacuously true.
    expect(pages.length).toBeGreaterThan(300);
  });

  it("offers a skip link that lands on a target that exists", () => {
    const broken = pages.filter((file) => {
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
    const broken = pages.filter((file) => {
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

describe("the stylesheet the shell depends on", () => {
  it("emits a utility that only the layout names", () => {
    const css = readdirSync(path.join(DIST, "_astro"))
      .filter((entry) => entry.endsWith(".css"))
      .map((entry) => read(path.join(DIST, "_astro", entry)))
      .join("\n");

    expect(css).not.toHaveLength(0);
    expect(
      css.includes(LAYOUT_ONLY_UTILITY),
      `\n\`${LAYOUT_ONLY_UTILITY}\` is referenced by the built markup but has no rule in any` +
        ` emitted stylesheet. Tailwind did not scan the file that declares it — see the header` +
        ` comment. The pages will render unstyled, and nothing else reports this.`
    ).toBe(true);
  });
});

describe("the container width", () => {
  // Base, Header and Footer each hardcode this, and until now nothing checked that the three
  // agreed — a width changed in one place reads as a subtly misaligned page and as nothing else.
  // It is one decision, so it is asserted as one.
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
