// `refine` receives its kind's INFERRED frontmatter, asserted where that fact lives: the
// typecheck.
//
// Every refine rule is conditional — it fires only when some other field takes a particular
// value — so a rule that never fires is indistinguishable from a rule with nothing to
// complain about. While `data` was `Record<string, unknown>`, comparing `d.axis` to a
// misspelled literal compiled clean and the mold rule was silently dead. Nothing at runtime
// can catch that: the corpus just quietly stops being checked.
//
// Checked by `tsc --noEmit` at the repo root (`npm run typecheck`, which CI runs), because
// the root tsconfig includes tests/. vitest does not collect this file — its include is
// `tests/**/*.test.ts`, and `.test-d.ts` does not match.

import { z } from "zod";

import { defineKind, type KindContext } from "@galaxy-foundry/gxwf-foundry-note-schema";

const axes = ["source-specific", "target-specific", "tool-specific", "generic"] as const;

const build = (ctx: KindContext) =>
  z
    .object({
      type: z.literal("probe"),
      axis: z.enum(axes),
      source: z.string().optional(),
      ...ctx.base,
    })
    .strict();

/** A rule comparing against a real axis value — types line up, so this compiles. */
export const wellTyped = defineKind({
  kind: "probe",
  title: "Probe",
  layer: "instance",
  summary: "Asserts refine sees this kind's own fields.",
  shape: "file",
  companions: [],
  build,
  refine: (d, ctx) => {
    if (d.axis === "source-specific" && !d.source) {
      ctx.addIssue({ code: "custom", path: ["source"], message: "needs a source" });
    }
  },
});

export const misspelledLiteral = defineKind({
  kind: "probe",
  title: "Probe",
  layer: "instance",
  summary: "Asserts a typo'd literal is a compile error, not a dead rule.",
  shape: "file",
  companions: [],
  build,
  refine: (d, ctx) => {
    // @ts-expect-error — "source-specifc" is not one of the four axis values, so this
    // comparison has no overlap. If it ever stops erroring, `refine` has been widened back
    // to an untyped payload and every conditional rule can rot without a test noticing.
    if (d.axis === "source-specifc" && !d.source) {
      ctx.addIssue({ code: "custom", path: ["source"], message: "unreachable" });
    }
  },
});
