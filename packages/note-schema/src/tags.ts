// Loader for meta_tags.yml — the controlled tag vocabulary. Every note's
// `tags[]` entry must be a top-level key here.

import { readFileSync } from "node:fs";

import yaml from "js-yaml";

export function loadTags(tagsPath: string): string[] {
  const data = yaml.load(readFileSync(tagsPath, "utf8")) as Record<string, unknown> | null;
  return data ? Object.keys(data) : [];
}
