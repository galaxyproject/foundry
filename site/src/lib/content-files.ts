// Where `content/` is, for the pages that read a note's own directory off disk.
//
// It was `new URL('../../../content/…', import.meta.url)`, with the number of `../` counted
// from the source file's own depth. That count survives `astro dev`, where a module runs from
// its source path, and does not survive `astro build`, where it runs from a bundled chunk at
// some other depth. `MoldHealth.astro` resolved one level short of the repository root on every
// one of its 47 pages: every Mold reported "eval.md not written yet" while 33 had one, and the
// index page it links to served the same file correctly from a different `../` count that
// happened to land.
//
// `astro:config/server` gives the project root as Astro computed it, which is the one anchor
// that does not depend on where a module ended up. It is also why this is a module of its own:
// that import only resolves inside an Astro build, and the layout rules in `./companions` are
// worth testing outside one.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { root } from 'astro:config/server';
import type { NormalizedCompanion } from '@galaxy-foundry/kind-schema';
import { CONTENT_DIR } from '@galaxy-foundry/note-schema';

import {
  adjacentFiles,
  checkDirectoryLayout,
  readAdjacentIn,
  readCompanionIn,
  type NoteKind,
} from './companions';

export { companionOf } from './companions';

/** Absolute path of the corpus root — `root` is the site directory, `content/` its sibling. */
export const CONTENT_ROOT = fileURLToPath(new URL(`../${CONTENT_DIR}/`, root));

/** A note's own directory. `id` is the collection-prefixed entry id, e.g. `molds/find-test-data`. */
export function noteDir(id: string): string {
  return path.join(CONTENT_ROOT, id);
}

/** The contents of a note's companion, or `undefined` when it is not there. */
export function readCompanion(id: string, companion: NormalizedCompanion): string | undefined {
  return readCompanionIn(noteDir(id), companion);
}

/** What sits in a note's directory, measured against what its kind declares. */
export function checkNoteDirectory(id: string, kind: NoteKind) {
  return checkDirectoryLayout(noteDir(id), id, kind);
}

/** Every file beside a note that is not itself a note, relative to the note's directory. */
export function noteAdjacentFiles(id: string): string[] {
  return adjacentFiles(noteDir(id), id);
}

/** The contents of a file beside a note, or `undefined` when it is not there. */
export function readAdjacent(id: string, relativePath: string): string | undefined {
  return readAdjacentIn(noteDir(id), relativePath);
}
