import { readFileSync } from "node:fs";
import process from "node:process";

/** Read and parse one CLI input file (`-` is stdin); on any failure print `error reading <path>` and exit 1. */
export function readInputOrExit<T = string>(
  path: string,
  parse: (text: string) => T = (text) => text as T,
): T {
  try {
    return parse(readFileSync(path === "-" ? 0 : path, "utf8"));
  } catch (error) {
    process.stderr.write(
      `error reading ${path}: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
}
