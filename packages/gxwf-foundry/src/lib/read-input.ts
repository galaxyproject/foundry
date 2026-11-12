import { readFileSync, type PathOrFileDescriptor } from "node:fs";
import process from "node:process";
import { InputShapeError } from "../ledger.js";

/** Read and parse one CLI input; on any failure print `error reading <path>` and exit 1. */
export function readInputOrExit<T = string>(
  path: string,
  parse: (text: string) => T = (text) => text as T,
  source: PathOrFileDescriptor = path,
): T {
  try {
    return parse(readFileSync(source, "utf8"));
  } catch (error) {
    process.stderr.write(
      `error reading ${path}: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
}

/** Run a check; on an `InputShapeError` print its message and exit 3. */
export function exitOnInputShape<T>(check: () => T): T {
  try {
    return check();
  } catch (error) {
    if (!(error instanceof InputShapeError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(3);
  }
}
