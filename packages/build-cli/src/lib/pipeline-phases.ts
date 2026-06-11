// Shared pipeline-phase compiler. Parses a pipeline note's `phases:` spine into
// ordered, typed phase descriptors. Consumed by the validator (cross-file phase
// resolution + artifact-binding order) and by the assembler (harness rendering).
// One grammar, one parser — see docs/HARNESS_PIPELINES.md and the glossary
// (Phase, Mold, Branch, Loop, Routing pattern).

import type { Frontmatter } from "./types.js";
import { fileSlug } from "./walk.js";
import { resolveWikiLink, WIKI_LINK_RE } from "./wiki-links.js";

export interface PhaseFinding {
  path: string;
  severity: "error" | "warning";
  message: string;
}

export interface ParsedBranchItem {
  /** Raw string as authored: a `[[wiki-link]]` or a terminal sentinel (e.g. `user-supplied`). */
  raw: string;
  /** True for non-wiki-link sentinels the harness treats as "ask the user". */
  sentinel: boolean;
  /** True when this item came from a `{ fallthrough: ... }` entry. */
  fallthrough: boolean;
  /** Resolved Mold content path, or null for sentinels / unresolved links. */
  moldPath: string | null;
  /** fileSlug of `moldPath`, or null. */
  moldSlug: string | null;
}

export interface ParsedMoldPhase {
  kind: "mold";
  index: number;
  /** Raw `[[slug]]` reference as authored. */
  ref: string;
  moldPath: string | null;
  moldSlug: string | null;
  loop: boolean;
}

export interface ParsedBranchPhase {
  kind: "branch";
  index: number;
  /** Routing-pattern value (the `branch:` field): `test-data-resolution`, `discover-or-author`, … */
  pattern: string;
  /** Which inner-list grammar was used. `chain` = sequential fallback; `branches` = binary. */
  shape: "branches" | "chain";
  items: ParsedBranchItem[];
}

export interface ParsedUnknownPhase {
  kind: "unknown";
  index: number;
  keys: string[];
}

export type ParsedPhase = ParsedMoldPhase | ParsedBranchPhase | ParsedUnknownPhase;

export interface ParsedPhases {
  findings: PhaseFinding[];
  phases: ParsedPhase[];
}

/** Resolve a `[[wiki-link]]` to a Mold path, recording a finding on failure. */
function resolveMold(
  ref: unknown,
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
  filePath: string,
  loc: string,
  findings: PhaseFinding[],
): { moldPath: string | null; moldSlug: string | null } {
  const tp = resolveWikiLink(ref, slugMap);
  if (!tp) {
    findings.push({
      path: filePath,
      severity: "error",
      message: `${loc}: wiki link ${String(ref)} did not resolve`,
    });
    return { moldPath: null, moldSlug: null };
  }
  if (metaByPath.get(tp)?.type !== "mold") {
    findings.push({
      path: filePath,
      severity: "error",
      message: `${loc}: ${String(ref)} resolves to type=${String(metaByPath.get(tp)?.type)}, expected mold`,
    });
    return { moldPath: null, moldSlug: null };
  }
  return { moldPath: tp, moldSlug: fileSlug(tp) };
}

export function parsePhases(
  phases: unknown[],
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
  filePath: string,
): ParsedPhases {
  const findings: PhaseFinding[] = [];
  const parsed: ParsedPhase[] = [];

  phases.forEach((phase, i) => {
    if (typeof phase !== "object" || phase === null || Array.isArray(phase)) {
      findings.push({
        path: filePath,
        severity: "error",
        message: `phases[${i}]: must be an object`,
      });
      parsed.push({ kind: "unknown", index: i, keys: [] });
      return;
    }
    const p = phase as Record<string, unknown>;

    if ("mold" in p) {
      const { moldPath, moldSlug } = resolveMold(
        p.mold,
        slugMap,
        metaByPath,
        filePath,
        `phases[${i}].mold`,
        findings,
      );
      parsed.push({
        kind: "mold",
        index: i,
        ref: typeof p.mold === "string" ? p.mold : String(p.mold),
        moldPath,
        moldSlug,
        loop: p.loop === true,
      });
      return;
    }

    if ("branch" in p) {
      const items: ParsedBranchItem[] = [];
      const collectFromList = (list: unknown, locTag: string): void => {
        if (!Array.isArray(list)) return;
        list.forEach((item, j) => {
          let candidate: unknown = item;
          let fallthrough = false;
          if (typeof item === "object" && item !== null && !Array.isArray(item)) {
            const obj = item as Record<string, unknown>;
            if ("fallthrough" in obj) {
              candidate = obj.fallthrough;
              fallthrough = true;
            } else return; // unknown shape — ignore (open-set)
          }
          if (typeof candidate !== "string") return;
          const raw = candidate;
          if (!WIKI_LINK_RE.test(candidate)) {
            // Terminal sentinel (e.g. `user-supplied`): recorded but not resolved.
            items.push({ raw, sentinel: true, fallthrough, moldPath: null, moldSlug: null });
            return;
          }
          const { moldPath, moldSlug } = resolveMold(
            candidate,
            slugMap,
            metaByPath,
            filePath,
            `phases[${i}].${locTag}[${j}]`,
            findings,
          );
          items.push({ raw, sentinel: false, fallthrough, moldPath, moldSlug });
        });
      };
      collectFromList(p.branches, "branches");
      collectFromList(p.chain, "chain");
      parsed.push({
        kind: "branch",
        index: i,
        pattern: typeof p.branch === "string" ? p.branch : String(p.branch),
        shape: "chain" in p ? "chain" : "branches",
        items,
      });
      return;
    }

    // Open-set: unknown phase kind. Warn so we notice but don't fail.
    const keys = Object.keys(p);
    findings.push({
      path: filePath,
      severity: "warning",
      message: `phases[${i}]: unknown phase kind (keys: ${keys.join(",")}) — coin a tag if this is intentional`,
    });
    parsed.push({ kind: "unknown", index: i, keys });
  });

  return { findings, phases: parsed };
}

/** All resolved Mold paths reachable from a parsed phase (top-level or branch inner). */
export function phaseMoldPaths(phase: ParsedPhase): string[] {
  if (phase.kind === "mold") return phase.moldPath ? [phase.moldPath] : [];
  if (phase.kind === "branch") {
    return phase.items.map((it) => it.moldPath).filter((p): p is string => p !== null);
  }
  return [];
}
