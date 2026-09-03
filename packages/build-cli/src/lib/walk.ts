// File discovery for the validator and generators.
//
// Which files are notes is decided by ONE table: COLLECTIONS in @galaxy-foundry/gxwf-foundry-note-schema.
// This module used to answer that question a second time — SKIP_FILES named the generated
// files at the content root, DIR_NOTE_TYPES re-stated "molds and pipelines are directory
// notes", and between them they approximated the site's globs closely enough to look
// deliberate. They were never held to it: the two rules disagreed about `content/prompts/**`
// for as long as it existed.
//
// This module now traverses and routes. It does not decide.

import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { CONTENT_DIR, collectionOf } from "@galaxy-foundry/gxwf-foundry-note-schema";

/**
 * Walk a content root and yield the files COLLECTIONS claims as notes, in sorted depth-first
 * order.
 *
 * `contentRoot` is the content directory itself — absolute or relative, and under any name a
 * checkout gives it. What it is called on disk does not route anything: paths are matched as
 * `CONTENT_DIR`-relative, because that is the form COLLECTIONS states its bases in.
 */
export function* findMdFiles(contentRoot: string): Generator<string> {
  yield* walk(contentRoot, contentRoot);
}

function* walk(dir: string, root: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir).sort();
  } catch {
    return;
  }
  for (const entry of entries) {
    // Dotfiles are the one exclusion the table cannot express: `.obsidian/` holds markdown
    // that is editor state rather than content, and no glob would tell it apart from a note.
    if (entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full, root);
      continue;
    }
    // Routing subsumes the extension check — every pattern in the table ends in `.md`.
    if (!collectionOf(routablePath(root, full))) continue;
    yield full;
  }
}

/**
 * A path in the repo-relative form COLLECTIONS matches against.
 *
 * Exported because routing is not only the walker's business: anything asking "is this entry a
 * note?" — the companion-layout check, for one — has to ask it in this frame or the table claims
 * nothing and every note beside a note reads as a stray.
 */
export function routablePath(root: string, full: string): string {
  return `${CONTENT_DIR}/${path.relative(root, full).split(path.sep).join("/")}`;
}

/**
 * Every file under `dir`, recursively, as paths relative to `relativeTo` with `/` separators.
 * A missing directory yields nothing rather than throwing.
 *
 * Unrelated to `findMdFiles`: that one routes, this one just lists. Both the caster (pruning a
 * bundle down to what provenance claims) and the verifier (asking what actually sits beside a
 * note) need the raw listing, and neither wants the collection table involved.
 *
 * The implementation ships in @galaxy-foundry/cast, where the pruning that needs it lives.
 * Re-exported rather than re-imported at each call site so the verifier keeps naming the module
 * it already names.
 */
export { listFilesUnder } from "@galaxy-foundry/cast";

/**
 * Slug used for wiki-link resolution: `index.md` → parent dir name; otherwise basename without
 * extension.
 *
 * Ships in @galaxy-foundry/wiki-links, beside the `slugify` it has to agree with — the map is
 * built with this and queried with that, and held apart the pair can drift into a link that
 * stops resolving for reasons neither file can show. Re-exported rather than re-imported at
 * each call site, same as `listFilesUnder` above.
 */
export { fileSlug } from "@galaxy-foundry/wiki-links";
