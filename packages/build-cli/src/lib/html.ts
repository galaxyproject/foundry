// HTML escaping for a page built from model-generated text.
//
// A run's artifacts carry prose written by a model reading arbitrary papers and repositories, and
// a ledger note is free text. Nothing from a run reaches the page unescaped, and the embedded JSON
// is escaped against the one sequence that can close a script element early.

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]!);
}

export function escapeAttr(value: unknown): string {
  return escapeHtml(value);
}

/**
 * Serialize a value into a `<script type="application/json">` body.
 *
 * `</` is the sequence that ends the element early regardless of context, and U+2028/U+2029 are
 * literal line terminators in JavaScript source that some parsers still mishandle.
 */
export function jsonScriptBody(json: string): string {
  return json
    .replace(/<\//g, "<\\/")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function humanBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** ISO instants are precise and unreadable; a run is read by date and minute. */
export function shortInstant(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().replace("T", " ").slice(0, 16);
}
