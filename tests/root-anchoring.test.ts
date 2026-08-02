// A site module may not find the repository root by counting `../` from its own source depth.
//
// `astro build` collapses every site module — page, component AND lib alike — into one bundled
// chunk directory. Measured on astro 7 / vite 8, that directory is:
//
//     site/dist/.prerender/chunks/
//
// which sits exactly four levels below the repository root. So a `../` count written against a
// module's source path is correct after the build only when that source happens to be four deep
// as well. `site/src/pages/molds/` is; `site/src/components/` and `site/src/lib/` are not, and
// resolve one level short — at `site/` rather than the repo root.
//
// That is not a hypothesis. `MoldHealth.astro` (`site/src/components/`, three hops) reported
// "eval.md not written yet" on all 47 Mold pages while 33 had one, and `content-files.ts` was
// written to fix it. `casts.ts` (`site/src/lib/`, three hops) then did the same thing to the
// Usage page: 54 skills on disk, `Casts = 0` rendered, and 54 pages never built — 47
// `/usage/claude/*` and 7 `/pipelines/*/harness`. Both builds were green, one at 316 pages and
// one at 370, and nothing compares those numbers to anything.
//
// One module was fixed each time. This asserts the RULE instead, because the failure is silent
// in every direction: no error, no missing file, just an empty list where content should be.
//
// The correct anchor is `root` from `astro:config/server` — see `site/src/lib/repo-root.ts`.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const SITE_SRC = new URL("../site/src/", import.meta.url).pathname;
const SCANNED_EXTENSIONS = [".ts", ".astro", ".mts", ".js", ".mjs"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return SCANNED_EXTENSIONS.includes(path.extname(full)) ? [full] : [];
  });
}

// Comments are stripped first, so a module is free to DESCRIBE the mistake — `content-files.ts`
// and this file both do, at length, and neither is a violation.
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// A fixed hop count. `package-version.ts` walks up one `dirname` at a time until it finds what it
// is looking for, which is depth-tolerant by construction and deliberately not matched here.
const PARENT_HOP = /(['"`])\.\.[\/'"`]/;

describe("anchoring a site module to the repository root", () => {
  it("never counts ../ from import.meta.url", () => {
    const offenders = sourceFiles(SITE_SRC)
      .filter((file) => {
        const code = stripComments(readFileSync(file, "utf-8"));
        return code.includes("import.meta.url") && PARENT_HOP.test(code);
      })
      .map((file) => path.relative(path.join(SITE_SRC, "../.."), file));

    expect(
      offenders,
      "\nThese resolve against a bundled chunk after `astro build`, not against their own source" +
        " path. Anchor on `root` from astro:config/server instead — see site/src/lib/repo-root.ts." +
        `\n\n  ${offenders.join("\n  ")}\n`
    ).toEqual([]);
  });
});
