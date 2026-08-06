// Shared types for the validator and tooling.

// What a note's frontmatter is, before any schema has looked at it. Re-exported from
// @galaxy-foundry/cast rather than restated: the caster reads the same frontmatter this
// validator does, and two structurally identical declarations agree only until one narrows.
import type { Frontmatter } from "@galaxy-foundry/cast";

export type { Frontmatter };

export interface FileMeta {
  /** Absolute path to the .md file. */
  path: string;
  /** Path relative to the content root, for display. */
  relPath: string;
  /** Slug used for wiki-link resolution (basename, or parent dir for directory notes). */
  slug: string;
  meta: Frontmatter;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export interface JsonSchema {
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: string[];
  [key: string]: unknown;
}
