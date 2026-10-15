// Narrowing for parsed YAML and JSON that a reader does not trust: each helper returns the value
// in the shape asked for, or null.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

/** A non-empty string; anything else, an empty string included, is absent. */
export function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * A non-empty string, or a number or boolean as its text.
 *
 * For hand-written fields where unquoted YAML turns `id: 12` or `status: true` into a scalar the
 * author meant as a label. Identifiers whose digits matter (shas) must not use this.
 */
export function asScalarString(value: unknown): string | null {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return asString(value);
}

/** A finite number. */
export function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
