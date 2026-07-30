import { z } from "zod";

import { type KindContext, defineKind } from "../context.js";

export const kind = defineKind({
  kind: "meta",
  title: "Design Record",
  layer: "substrate",
  summary:
    "A record of why the Foundry itself is built the way it is — the rationale behind the machinery, not the domain.",

  shape: "file",
  companions: [],

  build: (ctx: KindContext) =>
    z
      .object({
        ...ctx.base,
        type: z.literal("meta"),

        // Required here, optional in the envelope. A design record is addressed by name in
        // prose and in a navigation card, so it cannot fall back to its summary the way a
        // research note can.
        title: z.string(),

        // Which shelf the record sits on. Named `record_kind` to match `pattern_kind` and
        // `source_pattern_kind` — the suffix this instance already uses for "which sort of
        // this kind is it". `meta_kind` would read as a kind of kind, which it is not.
        record_kind: z.enum(["foundation", "infrastructure"]),

        // Reading order within a shelf. This was the ARRAY POSITION in the hand-written
        // registry that used to list these records, and it is the one thing that position
        // carried which frontmatter otherwise could not: the sequence is pedagogical, not
        // chronological, so neither `created` nor the title sorts it correctly.
        order: z.number().int().min(1),
      })
      .strict(),
});
