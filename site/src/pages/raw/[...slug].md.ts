import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

// Sibling artifacts served alongside a directory note's index.md.
const SIBLINGS = ['eval', 'scenarios'] as const;

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getCollection('content');
  const paths = entries.map(entry => ({
    params: { slug: entry.id },
    props: { body: entry.body ?? '' },
  }));
  for (const entry of entries) {
    const data = entry.data as any;
    if (data.type !== 'mold' && data.type !== 'pipeline') continue;
    for (const sib of SIBLINGS) {
      const sibPath = fileURLToPath(new URL(`../../../../content/${entry.id}/${sib}.md`, import.meta.url));
      if (!existsSync(sibPath)) continue;
      paths.push({
        params: { slug: `${entry.id}/${sib}` },
        props: { body: readFileSync(sibPath, 'utf8') },
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
