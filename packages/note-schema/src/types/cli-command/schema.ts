import { z } from "zod";

import { type KindContext, defineKind } from "../context.js";

export const kind = defineKind({
  kind: "cli-command",
  title: "CLI Command",
  layer: "instance",
  summary:
    "One subcommand of a CLI tool, authored as a manual page a cast can read instead of guessing at flags.",

  // A flat file INSIDE another kind's directory — the one kind whose notes are neither a directory
  // nor alone in one. `content/cli/<tool>/index.md` is the tool; every sibling `.md` is one of
  // these.
  shape: "file",
  companions: [],

  build: (ctx: KindContext) =>
    z
      .object({
        type: z.literal("cli-command"),
        tool: ctx.toolSlug,
        command: z.string(),
        package: z.string().optional(),
        // The document this page summarizes — a spec file, a command implementation at a pinned
        // ref. `source_url` and `z.url()` are the sibling instance's name and constraint for the
        // same thing, so one field means one thing across both.
        //
        // Distinct from the `schema` kind's `upstream`, which is where a VENDORED artifact came
        // from and carries a cross-field rule keying off whether it points outside this
        // repository. Summarizing an external command is not vendoring it.
        source_url: z.url().optional(),
        ...ctx.base,
      })
      .strict(),
});
