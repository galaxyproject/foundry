import { z } from "zod";

import { type KindContext, defineKind } from "../context.js";

export const kind = defineKind({
  kind: "cli-tool",
  title: "CLI Tool",
  layer: "instance",
  summary:
    "One external command-line tool the casting pipeline may invoke — how to install it, how to run it, how to tell it is present.",

  shape: "directory",

  // Empty, and this is the kind that proves the note-vs-companion distinction is load-bearing:
  // `content/cli/<tool>/` is full of markdown, and every one of those files is a `cli-command`
  // NOTE rather than a companion. A layout check that guessed from the extension would report
  // every documented subcommand in the corpus as a stray.
  companions: [],

  build: (ctx: KindContext) =>
    z
      .object({
        type: z.literal("cli-tool"),
        tool: ctx.toolSlug,
        origin: z.enum(["npm", "pypi"]),
        package: z.string(),
        package_version: z.string().optional(),
        invoke: z.string().regex(/^[A-Za-z0-9._-]+$/),
        invoke_fallback: z.string().optional(),
        availability_check: z.string().optional(),
        docs_url: z.string().optional(),
        ...ctx.base,
      })
      .strict(),
});
