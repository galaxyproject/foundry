// The manifest's `fields` are DERIVED from the zod shapes, and `check:kinds` cannot catch a
// bug in that derivation: it regenerates with the same code and string-compares, so a wrong
// manifest stays "up to date" forever. These tests are what actually pins the derivation —
// and they matter more than most, because the manifest's consumer is another repository.

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { describeFields, describeType } from "../src/kind-manifest.js";

describe("describeType", () => {
  it("renders the primitive types", () => {
    expect(describeType(z.string())).toBe("string");
    expect(describeType(z.number())).toBe("number");
    expect(describeType(z.boolean())).toBe("boolean");
    expect(describeType(z.coerce.date())).toBe("date");
  });

  it("renders a literal as its JSON value", () => {
    expect(describeType(z.literal("mold"))).toBe('"mold"');
  });

  it("renders an enum as its members", () => {
    expect(describeType(z.enum(["npm", "pypi"]))).toBe("npm | pypi");
  });

  it("renders arrays by element type", () => {
    expect(describeType(z.array(z.string()))).toBe("string[]");
    expect(describeType(z.array(z.object({ ref: z.string() })))).toBe("object[]");
  });

  it("unwraps optional, nullable, and default to the inner type", () => {
    expect(describeType(z.string().optional())).toBe("string");
    expect(describeType(z.string().nullable())).toBe("string");
    expect(describeType(z.string().default("x"))).toBe("string");
  });

  it("unwraps effects — a refined string is still a string", () => {
    const tag = z.string().refine((v) => v.length > 0);
    expect(describeType(tag)).toBe("string");
    expect(describeType(z.array(tag))).toBe("string[]");
  });

  it("collapses a union, and gives up readably once it is wide", () => {
    expect(describeType(z.union([z.string(), z.number()]))).toBe("string | number");
    // Same rendering twice is one member, not two.
    expect(describeType(z.union([z.string(), z.string().min(1)]))).toBe("string");
    expect(describeType(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))).toBe(
      "one of several shapes",
    );
  });
});

describe("describeFields", () => {
  const fields = describeFields({
    type: z.literal("example"),
    zebra: z.string(),
    alpha: z.string(),
    maybe: z.string().optional(),
    defaulted: z.string().default("x"),
  });

  it("sorts required first, then alphabetically", () => {
    expect(fields.map((f) => f.name)).toEqual(["alpha", "type", "zebra", "defaulted", "maybe"]);
  });

  it("marks a plain field required and an optional one not", () => {
    expect(fields.find((f) => f.name === "alpha")?.required).toBe(true);
    expect(fields.find((f) => f.name === "maybe")?.required).toBe(false);
  });

  it("treats a defaulted field as optional — an author need not write it", () => {
    expect(fields.find((f) => f.name === "defaulted")?.required).toBe(false);
  });

  it("carries the rendered type through", () => {
    expect(fields.find((f) => f.name === "type")?.type).toBe('"example"');
  });
});
