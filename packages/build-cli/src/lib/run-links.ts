// Deep links from a run back into the published Foundry site.
//
// Every link is existence-checked against the local checkout before it is emitted. A run made
// against an older Foundry names Molds that may since have been renamed, and a dashboard full of
// 404s is worse than one that renders those names as plain text. The check costs one stat per
// distinct target and is cached.

import { existsSync } from "node:fs";
import path from "node:path";

import type { SiteLinker } from "./run-manifest.js";

export const DEFAULT_SITE_BASE = "https://galaxyproject.github.io/foundry";

function stripWikiLink(value: string): string {
  const inner = value.replace(/^\[\[/, "").replace(/\]\]$/, "");
  const piped = inner.split("|")[0] ?? inner;
  return piped.trim();
}

export interface SiteLinkerOptions {
  repoRoot: string;
  /** Empty string disables every external link. */
  base: string;
}

export function createSiteLinker(options: SiteLinkerOptions): SiteLinker {
  const base = options.base.replace(/\/+$/, "");
  const repoRoot = options.repoRoot;
  const cache = new Map<string, string | null>();

  const link = (key: string, relativeNote: string, route: string): string | null => {
    if (!base) return null;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const resolved = existsSync(path.join(repoRoot, relativeNote)) ? `${base}${route}` : null;
    cache.set(key, resolved);
    return resolved;
  };

  return {
    // The artifact catalogue is generated from the whole corpus rather than from one file, so an
    // id that reached this model came from a committed provenance record and the page exists.
    artifact: (id) => (base ? `${base}/artifacts/${id}/` : null),
    mold: (slug) => link(`mold:${slug}`, `content/molds/${slug}/index.md`, `/molds/${slug}/`),
    pipeline: (slug) =>
      link(`pipeline:${slug}`, `content/pipelines/${slug}/index.md`, `/pipelines/${slug}/`),
    harness: (slug) =>
      link(`harness:${slug}`, `content/pipelines/${slug}/index.md`, `/pipelines/${slug}/harness/`),
    schema: (wikiLink) => {
      const name = stripWikiLink(wikiLink);
      return link(`schema:${name}`, `content/schemas/${name}.md`, `/schemas/${name}/`);
    },
    // A feedback entry's `subject.locator` is a repository path such as
    // `content/research/<slug>/index.md`; the site routes that note at its slugged id.
    note: (locator) => {
      const normalized = locator.replace(/\\/g, "/");
      if (!normalized.startsWith("content/")) return null;
      const id = normalized
        .slice("content/".length)
        .replace(/\/index\.md$/, "")
        .replace(/\.md$/, "");
      return link(`note:${id}`, normalized, `/${id}/`);
    },
  };
}
