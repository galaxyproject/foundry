import { getAllNotes } from '../../lib/notes';
import { companionOf, readCompanion } from '../../lib/content-files';
import type { APIRoute, GetStaticPaths } from 'astro';

// Companions served alongside a directory note's index.md, resolved through the kind that
// declares them rather than spelled here — `mold` and `pipeline` both declare these two, and
// `companionOf` fails the build if either stops.
//
// Deliberately NOT every markdown companion those kinds declare: `mold` declares seven more,
// and serving them would publish `changes.md`, `casting.md` and the rest, which is a decision
// about what the site shows rather than a refactor of where the names come from.
const SIBLINGS = ['eval.md', 'scenarios.md'] as const;

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getAllNotes();
  const paths = entries.map(entry => ({
    params: { slug: entry.id },
    props: { body: entry.body ?? '' },
  }));
  for (const entry of entries) {
    const data = entry.data as any;
    if (data.type !== 'mold' && data.type !== 'pipeline') continue;
    for (const name of SIBLINGS) {
      const companion = companionOf(data.type, name);
      const body = readCompanion(entry.id, companion);
      if (body === undefined) continue;
      paths.push({
        // The route file is `[...slug].md.ts`, so the extension is the route's and the slug
        // carries the stem: `molds/x` + `eval` renders at `/raw/molds/x/eval.md`.
        params: { slug: `${entry.id}/${companion.name.replace(/\.md$/, '')}` },
        props: { body },
      });
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
