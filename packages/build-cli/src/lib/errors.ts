/**
 * The message of something thrown, without assuming it was an `Error`.
 *
 * `(e as Error).message` renders `undefined` for a thrown string or object, which turns a
 * reported failure into a line that says nothing.
 */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
