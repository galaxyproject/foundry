/**
 * Flag-reading primitives shared by the `foundry-build` subcommands.
 *
 * Worker-runtime flags live in `worker-runtime-args.ts`, which builds on these;
 * this module is only about the two spellings every flag accepts.
 */

export function takeValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

/**
 * Reads `--flag value` and `--flag=value` for one flag name.
 *
 * `lastIndex` is the last argv index this flag consumed -- `index + 1` for the spaced
 * form, `index` for the inline one. Assign it to the loop variable and let the `for`
 * loop's own `i++` move past it; continuing *from* it would reparse the token.
 * Returns `null` when the current token is not that flag.
 */
export function readOption(
  argv: string[],
  index: number,
  flag: string,
): { value: string; lastIndex: number } | null {
  const token = argv[index]!;
  if (token === flag) return { value: takeValue(argv, index, flag), lastIndex: index + 1 };
  if (token.startsWith(`${flag}=`))
    return { value: token.slice(flag.length + 1), lastIndex: index };
  return null;
}
