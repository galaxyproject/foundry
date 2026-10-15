import { describe, expect, it } from "vitest";

import {
  asBoolean,
  asNumber,
  asRecord,
  asScalarString,
  asString,
  isRecord,
} from "../src/lib/narrow.js";

describe("narrowing helpers", () => {
  it("treats only a plain mapping as a record", () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    for (const value of [null, undefined, [], "x", 3]) {
      expect(asRecord(value)).toBeNull();
      expect(isRecord(value)).toBe(false);
    }
  });

  it("reads strings strictly or as scalar text, and the two differ only on non-strings", () => {
    expect(asString("abc")).toBe("abc");
    expect(asString("")).toBeNull();
    expect(asString(12)).toBeNull();
    expect(asString(true)).toBeNull();

    expect(asScalarString("abc")).toBe("abc");
    expect(asScalarString("")).toBeNull();
    expect(asScalarString(12)).toBe("12");
    expect(asScalarString(false)).toBe("false");
    expect(asScalarString({})).toBeNull();
  });

  it("accepts only finite numbers and real booleans", () => {
    expect(asNumber(3)).toBe(3);
    expect(asNumber(Number.NaN)).toBeNull();
    expect(asNumber(Number.POSITIVE_INFINITY)).toBeNull();
    expect(asNumber("3")).toBeNull();
    expect(asBoolean(false)).toBe(false);
    expect(asBoolean("true")).toBeNull();
  });
});
