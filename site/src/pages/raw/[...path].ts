import { getAllNotes } from '../../lib/notes';
import { noteAdjacentFiles, readAdjacent } from '../../lib/note-directory';
import { DEFINITIONS } from '@galaxy-foundry/note-schema';
import type { APIRoute, GetStaticPaths } from 'astro';

// Raw text for everything in the corpus: every note, and every file sitting beside one.
//
// The set of siblings used to be a literal — `['eval.md', 'scenarios.md']` — while `mold`
// declares nine companions, so `refinement.md`, `changes.md`, the `refinements/` journal and
// every `examples/` fixture were present on disk and unreachable from the site. 48 files.
//
// The rule now is that there is no rule: a file adjacent to a note is served. Nothing here is
// secret — the repository is public, so withholding a file from `/raw/` hides it from an agent
// reading the site and from nobody else — and the route's whole purpose is to make the corpus
// consumable without a checkout. Which files those are is `adjacentFiles`' answer, read off the
// directory rather than off a declaration, so a kind with an open companion set (`research`
// allows undeclared sidecars) is served too.
//
// This file is `[...path].ts` and not `[...slug].md.ts` because the old name welded `.md` into
// every URL it could emit: the slug carried the stem and the route supplied the extension, which
// works only while every served file is markdown. The corpus has `.yml`, `.xsd`, `.prompt`,
// `.ga`, `.json` and `.myst` sidecars. The path now carries the whole filename, so the URLs are
// the ones that were already being linked — `/raw/molds/x.md`, `/raw/molds/x/eval.md` — and
// `/raw/research/component-nextflow-testing/component-nextflow-testing.yml` is expressible.

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getAllNotes();

  // A note is served at its own id plus `.md`, whatever shape its kind is.
  const paths = entries.map((entry) => ({
    params: { path: `${entry.id}.md` },
    props: { body: entry.body ?? '' },
  }));

  for (const entry of entries) {
    // Only a directory-shaped kind HAS anything beside it. Asked of the kind rather than
    // listed here, so a new directory kind is served the day it exists — the literal this
    // replaced named `mold` and `pipeline`, and `research` and `prompt` are directory kinds too.
    const kind = (entry.data as { type: keyof typeof DEFINITIONS }).type;
    if (DEFINITIONS[kind]?.shape !== 'directory') continue;

    for (const relativePath of noteAdjacentFiles(entry.id)) {
      const body = readAdjacent(entry.id, relativePath);
      if (body === undefined) continue;
      paths.push({ params: { path: `${entry.id}/${relativePath}` }, props: { body } });
    }
  }

  return paths;
};

export const GET: APIRoute = ({ props }) => {
  const { body } = props as { body: string };
  return new Response(body ?? '', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
