// What a kind says belongs beside one of its notes, for the pages that report on it.
//
// `eval.md` and `scenarios.md` were written as literals in three site files, and the `mold`
// kind declares nine companions with a requirement and a purpose each. A page restating two of
// them is a copy that can disagree, and the health panel's help text already did — it described
// eval.md as "fixture-independent property checks" where the kind says "the properties any cast
// of this Mold must satisfy".
//
// Everything here takes a directory rather than finding one. Where `content/` is belongs to
// `content-files.ts`, which has to ask Astro; keeping that out of this module is what lets the
// layout rules be tested against a real Mold directory from the root test suite.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  checkCompanions,
  companionsOf,
  type CompanionCheck,
  type DirectoryEntry,
  type NormalizedCompanion,
} from '@galaxy-foundry/kind-schema';
import { CONTENT_DIR, DEFINITIONS, kindOf } from '@galaxy-foundry/note-schema';

export type NoteKind = keyof typeof DEFINITIONS;

/**
 * A companion of `kind`, by the name a directory listing reports.
 *
 * Throws when the kind does not declare it. A page reporting on a companion its kind has
 * dropped is the failure worth making loud: the alternative is a panel that says "not written
 * yet" forever about a file nothing expects any more.
 */
export function companionOf(kind: NoteKind, name: string): NormalizedCompanion {
  const companion = companionsOf(DEFINITIONS[kind]).get(name);
  if (!companion) {
    throw new Error(`${String(kind)} does not declare a companion named ${name}`);
  }
  return companion;
}

/** The contents of a companion inside `dir`, or `undefined` when it is not there. */
export function readCompanionIn(dir: string, companion: NormalizedCompanion): string | undefined {
  const file = path.join(dir, companion.name);
  return existsSync(file) ? readFileSync(file, 'utf8') : undefined;
}

/**
 * What sits in a note's directory, measured against what its kind declares.
 *
 * `id` is the note's collection-prefixed entry id, needed only to ask the collection table
 * whether a sibling is itself a note — never inferred from the extension, the same rule the
 * validator follows and for the same reason: a `cli-tool`'s directory is full of markdown that
 * is other notes rather than companions.
 *
 * A declared companion DIRECTORY is checked as a whole and its contents are its own business.
 * `refinements/` entries carry frontmatter by declaration, and the recursive frontmatter scan
 * this replaced would have counted every one of them as a layout error.
 */
export function checkDirectoryLayout(dir: string, id: string, kind: NoteKind): CompanionCheck {
  const entries: DirectoryEntry[] = existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => !entry.name.startsWith('.'))
        .map((entry) => ({
          name: entry.name,
          directory: entry.isDirectory(),
          note: kindOf(`${CONTENT_DIR}/${id}/${entry.name}`) !== undefined,
        }))
    : [];
  return checkCompanions(entries, DEFINITIONS[kind]);
}
