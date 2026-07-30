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
        upstream: z.string().optional(),
        ...ctx.base,
      })
      .strict(),
});
