/** Nextflow config selector matching and priority for `ext.*` assignments. */

export const EXT_KEYS = ["args", "args2", "prefix"] as const;
export type ExtKey = (typeof EXT_KEYS)[number];

export interface ResolvedArg {
  /** Names the assignment: config, profile, selector, and key, with `~n` for repeats. */
  id: string;
  key: ExtKey;
  expression: string;
  selector: string;
  config: string;
  /** Set when the assignment came from a selected profile. Omitted for the root chain. */
  profile?: string;
}

/** The entries of one `key` that take effect for one call, by Nextflow selector priority. */
export interface EffectiveArg {
  /** Nextflow's fully qualified call name, e.g. `NFCORE_X:X:SUB:FOO_B`. */
  call: string;
  key: ExtKey;
  ids: string[];
  tie?: true;
}

export interface Selector {
  kind: "withName" | "withLabel";
  pattern: string;
}

/** A resolved arg with the rank its selector reaches each call at. */
export interface RankedArg {
  arg: ResolvedArg;
  ranks: Map<string, number>;
  /** From a profile selector the root chain never declares, which the legacy parser appends after the root's. */
  appended: boolean;
  /** 1-based count of the selector's declaration within its config and profile. */
  ordinal: number;
  /** The declaring block branches (`if`, `else`, `switch`), so which of its assignments to one key applies is unknown. */
  conditional: boolean;
}

export function selectorName(selector: Selector): string {
  return `${selector.kind}:${selector.pattern}`;
}

/**
 * Rank at which a selector reaches each call path it reaches: label 0, then the
 * process name, the alias, and the full path, deduplicated as Nextflow does.
 * Patterns match whole names.
 */
export function selectorRanks(
  selector: Selector,
  process: { name: string; labels?: string[] },
  calls: string[],
): Map<string, number> {
  const matches = nameMatcher(selector.pattern);
  const ranks = new Map<string, number>();
  for (const call of calls) {
    if (selector.kind === "withLabel") {
      if ((process.labels ?? []).some(matches)) ranks.set(call, 0);
      continue;
    }
    const names = [...new Set([process.name, call.split(":").at(-1)!, call])];
    for (let index = names.length - 1; index >= 0; index--) {
      if (matches(names[index]!)) {
        ranks.set(call, index + 1);
        break;
      }
    }
  }
  return ranks;
}

/**
 * Per call and `key`, the entries Nextflow applies: the highest rank, then at
 * that rank any appended profile entries. A profile selector the root also
 * declares merges at the root's position, so it only shadows that selector's
 * root entries. Within one config the later declaration of a selector wins, and
 * within a branching declaration every assignment to the key stays level.
 * Entries still level with different expressions tie: include order is not modeled.
 */
export function effectiveArgs(calls: string[], assignments: RankedArg[]): EffectiveArg[] {
  const slot = (arg: ResolvedArg) => `${arg.selector}\0${arg.key}`;
  const fromProfile = new Set(
    assignments.flatMap(({ arg }) => (arg.profile === undefined ? [] : [slot(arg)])),
  );
  const contenders = assignments.filter(
    ({ arg }) => arg.profile !== undefined || !fromProfile.has(slot(arg)),
  );
  return calls.flatMap((call) =>
    EXT_KEYS.flatMap((key) => {
      const reaching = contenders.filter(({ arg, ranks }) => arg.key === key && ranks.has(call));
      if (reaching.length === 0) return [];
      const top = Math.max(...reaching.map(({ ranks }) => ranks.get(call)!));
      const atTop = reaching.filter(({ ranks }) => ranks.get(call) === top);
      const appended = atTop.filter((entry) => entry.appended);
      const level = lastDeclarations(appended.length > 0 ? appended : atTop);
      if (new Set(level.map((arg) => arg.expression)).size === 1) {
        return [{ call, key, ids: [level[0]!.id] }];
      }
      return [{ call, key, ids: level.map((arg) => arg.id), tie: true as const }];
    }),
  );
}

/**
 * Per config, profile, and selector, in first-declaration order: the last entry,
 * or every entry of the last declaration when that declaration branches.
 */
function lastDeclarations(entries: RankedArg[]): ResolvedArg[] {
  const latest = new Map<string, RankedArg[]>();
  for (const entry of entries) {
    const slot = `${entry.arg.config}\0${entry.arg.profile ?? ""}\0${entry.arg.selector}`;
    const kept = latest.get(slot) ?? [];
    const sameBranchingBlock = entry.conditional && kept[0]?.ordinal === entry.ordinal;
    latest.set(slot, sameBranchingBlock ? [...kept, entry] : [entry]);
  }
  return [...latest.values()].flat().map((entry) => entry.arg);
}

function nameMatcher(pattern: string): (name: string) => boolean {
  if (!isRegexSelector(pattern)) return (name) => name === pattern;
  const regex = compileSelector(pattern);
  return (name) => regex !== null && regex.test(name);
}

function isRegexSelector(pattern: string): boolean {
  return /[.+*?^$()[\]\\|]/u.test(pattern);
}

function compileSelector(pattern: string): RegExp | null {
  if (pattern.length > 200) return null;
  try {
    return new RegExp(`^(?:${pattern})$`, "u");
  } catch {
    return null;
  }
}
