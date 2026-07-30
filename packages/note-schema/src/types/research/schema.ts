import { z } from "zod";

import { type KindContext, defineKind } from "../context.js";

export const kind = defineKind({
  kind: "research",
  title: "Research Note",
  layer: "instance",
  summary:
    "A captured finding about the domain or its tooling — the grounding a Mold cites rather than inventing.",

  shape: "directory",

  // Nothing is declared, and `allow` says so out loud. A research note's companions are its
  // vendored upstream files — a set that is open by nature: what is beside a note is whatever
  // that note framed, and the next note frames something else. `vendored_upstreams.yml` remains
  // the thing that says which of them must exist and where each came from; this kind only says
  // the directory is theirs.
  //
  // The alternative — 63 hand-written companion lists — would be a second copy of that manifest,
  // and the copy nobody syncs is the one that drifts.
  companions: [],
  additionalCompanions: "allow",

  build: (ctx: KindContext) =>
    z
      .object({
        type: z.literal("research"),
        component: z.string().optional(),
        companions: ctx.companions.optional(),
        license: ctx.licenseId.optional(),
        license_file: ctx.licenseFile.optional(),
        ...ctx.base,
      })
      .strict(),
});
