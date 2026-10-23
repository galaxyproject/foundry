// HTML escaping for a page built from model-generated text.
//
// A run's artifacts carry prose written by a model reading arbitrary papers and repositories, and
// a ledger note is free text. Nothing from a run reaches the page unescaped, and the embedded JSON
// is escaped so nothing in it can end or re-enter a script element.

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

/**
 * Serialize a value into a `<script type="application/json">` body.
 *
 * Every `<`, `>` and `&` becomes a JSON unicode escape, so no value can form `</script`, `<!--` or
 * `<script` — the sequences that end the element early or put the HTML parser into an escaped
 * state that swallows the next script. U+2028/U+2029 are escaped for older JavaScript parsers.
 */
export function jsonScriptBody(json: string): string {
  return json.replace(
    /[<>&\u2028\u2029]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
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
