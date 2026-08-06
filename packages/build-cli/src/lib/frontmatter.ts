// Frontmatter loading + date-string normalization.
//
// js-yaml parses bare YAML dates (2026-04-30) as JS Date objects while the schema expects ISO
// strings, so reading a note and normalizing it are one operation rather than two.
//
// The implementation ships in @galaxy-foundry/cast, which has to read a note's frontmatter to
// cast it and would otherwise disagree with this file about what a note says. This module is the
// seam, so a call site that already imports `readMarkdown` from here does not have to name the
// package — same arrangement as reconcile.ts and target-layout.ts.

export {
  normalizeDates,
  readMarkdown,
  type Frontmatter,
  type ParsedFile,
} from "@galaxy-foundry/cast";
