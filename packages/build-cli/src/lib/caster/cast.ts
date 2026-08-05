// The cast itself: everything between a loaded Mold and a published bundle.
//
// This function reads nothing it was not handed. Where a Foundry keeps its Molds, its targets
// and its reference contract are facts about that Foundry's tree, so the caller finds them and
// passes what it found; what happens to a resolved ref afterwards is the same everywhere.
//
// It also prints nothing. Errors and drift come back as VALUES, because a cast that found four
// unresolved refs has produced a result rather than suffered a failure, and how a caller wants
// to render that — a CLI's stderr lines, a test's assertion, a future editor's squiggles — is
// not casting's business. The one thing it does decide is whether to publish, since that is a
// question about the staged bundle rather than about presentation.

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  applyLicensePolicy,
  copyVerbatim,
  gitHead,
  provenanceRecord,
  readProvenanceCarryOver,
  PROVENANCE_SCHEMA_VERSION,
  type ProvenanceCarryOver,
  type ProvenanceRefEntry,
} from "@galaxy-foundry/cast";
import type { CastContract, ReferenceContractTerm } from "@galaxy-foundry/note-schema";

import { errorMessage } from "../errors.js";
import { reconcileAbsent, reconcileText, reconcileTreeTo } from "../reconcile.js";
import type { Frontmatter } from "../types.js";
import type { BundleFile, CastHooks } from "./hooks.js";
import { castOneRef, expandCompanions, resolveMoldRef, type ResolvedRef } from "./refs.js";
import { renderSkillMarkdown } from "./skill.js";
import type { TargetConfig } from "./target.js";

/** The Mold being cast, already read off disk. */
export interface CastSubject {
  /** The bundle's name, and the skill's. */
  name: string;
  /** Repo-relative path to the Mold's source, as the record should name it. */
  path: string;
  meta: Frontmatter;
  body: string;
  /** Hash of the source file, so the record can say which revision it was cast from. */
  contentHash: string;
}

/**
 * Everything a cast needs, found by the instance and handed over whole.
 *
 * `Ext` is whatever this Foundry records in the provenance slot beside `refs` — Galaxy's
 * artifact contracts, nothing at all for a Foundry that declares no handoff. It arrives as a
 * value rather than through a hook because it is a fact about the Mold, known before the first
 * ref resolves, and a hook would only be a longer way to pass it.
 */
export interface CastRequest<Ext extends object = Record<string, never>> {
  /** Ref `src` paths, `license_file` paths and `gitHead` are all resolved against this. */
  repoRoot: string;
  /** Absolute directory this cast publishes to. */
  bundleRoot: string;
  /**
   * The target this cast is for, as the caller addresses it — `casts/<target>/` in this Foundry.
   *
   * Deliberately not `target.name`, which is the same string restated inside `_target.yml`. What
   * a record says is which target it was cast FOR, and that is the caller's question; a
   * declaration disagreeing with the directory that holds it is a fact worth reporting rather
   * than one worth quietly writing into every record.
   */
  targetName: string;
  /** What that target declares about placement and modes. */
  target: TargetConfig;
  mold: CastSubject;
  castContract: CastContract;
  refKinds: Record<string, ReferenceContractTerm & { ref_shape?: string }>;
  slugMap: ReadonlyMap<string, string>;
  metaByPath: ReadonlyMap<string, Frontmatter>;
  hooks: CastHooks;
  extensions?: Ext;
  /** Report what a cast would do and publish nothing. */
  check: boolean;
  /** Opens a new cast revision, recorded in `cast_history`. */
  note: string | null;
}

/** One file the cast found different from what it would write. */
export interface CastDrift {
  file: string;
  reason: string;
}

export interface CastOutcome {
  errors: string[];
  drift: CastDrift[];
  /**
   * Absolute path of the record this cast published, or null when it published nothing.
   *
   * Null covers both refusals and every `--check` run, which is why a caller that wants to say
   * WHY nothing was written reads `check` and `errors` rather than expecting this to explain
   * itself. The publish decision is here; the account of it is the caller's.
   */
  wrote: string | null;
}

/**
 * Compare every contributed file against the bundle, and bring it into line unless checking.
 *
 * Run twice per cast: once to report, before the error gate, and once to write, after it. The
 * second call's findings are discarded because the first already reported them. Splitting it
 * that way is what keeps a refused cast from leaving files behind — a cast that reports an
 * unresolved ref and exits must not have already written a manifest describing the bundle it
 * declined to finish.
 */
function reconcileBundleFiles(
  files: readonly BundleFile[],
  bundleRoot: string,
  check: boolean,
): CastDrift[] {
  const found: CastDrift[] = [];
  for (const file of files) {
    const abs = path.join(bundleRoot, file.path);
    const outcome =
      file.content === null
        ? reconcileAbsent({
            path: abs,
            reason: file.absentReason ?? "stale (nothing declares it)",
            check,
          })
        : reconcileText({ path: abs, expected: file.content, label: file.path, check });
    if (outcome.reason) found.push({ file: file.path, reason: outcome.reason });
  }
  return found;
}

/** The hand-recorded fields of the record already on disk, or nothing on a first cast. */
function readExistingProvenance(provenancePath: string): ProvenanceCarryOver {
  return readProvenanceCarryOver(
    existsSync(provenancePath) ? readFileSync(provenancePath, "utf8") : null,
  );
}

/**
 * A record with the two fields that move on every cast held fixed, or null if it will not parse.
 *
 * `cast_at` is the clock and `mold.commit` is wherever HEAD happens to be. Comparing raw bytes
 * would report drift on every check of a bundle nothing changed, which is why the record was
 * never compared at all — and why it became the one file in a bundle whose drift a `--check`
 * could not see. These are the same two fields a regenerate has always been expected to move.
 *
 * Key order survives normalizing: `JSON.parse` preserves it and reassigning an existing key does
 * not move it, so a record whose fields were reshuffled still compares unequal here. That is the
 * case worth catching — every value stays correct while every committed record rewrites.
 */
function comparableProvenance(text: string): string | null {
  let doc: { cast_at?: unknown; mold?: { commit?: unknown } | null };
  try {
    doc = JSON.parse(text) as typeof doc;
  } catch {
    return null;
  }
  if (typeof doc !== "object" || doc === null) return null;
  doc.cast_at = "";
  if (typeof doc.mold === "object" && doc.mold !== null) doc.mold.commit = "";
  return JSON.stringify(doc);
}

export async function castMold<Ext extends object = Record<string, never>>(
  request: CastRequest<Ext>,
): Promise<CastOutcome> {
  const { repoRoot, bundleRoot, mold, slugMap, metaByPath, hooks } = request;
  const provenancePath = path.join(bundleRoot, "_provenance.json");
  const carry = readExistingProvenance(provenancePath);

  const rawRefs = Array.isArray(mold.meta.references) ? (mold.meta.references as unknown[]) : [];

  const resolved: ResolvedRef[] = [];
  const errors: string[] = [];
  rawRefs.forEach((r, i) => {
    const out = resolveMoldRef(r, i, request);
    if (out.error) errors.push(out.error);
    if (out.resolved) resolved.push(out.resolved);
  });

  // Expand multi-file notes' declared companion files into sibling verbatim refs.
  const expanded = expandCompanions(resolved, request);
  resolved.length = 0;
  resolved.push(...expanded);

  // Stable ordering: by (kind, note, companions after the note they belong to).
  //
  // Keyed on `dst` rather than `src` because `dst` is what a reader of the bundle sees, and
  // because a companion's place in the list is not a fact about where it is stored. Sorting on
  // `src` put a companion after its note only while both were flat and `.md` sorted before
  // `.yml`; under `<slug>/index.md` it sorted before instead, and the SKILL.md line saying
  // "sibling of X — read it where that note directs" arrived above X.
  const groupKey = (r: ResolvedRef): string => r.companion_of ?? r.dst;
  resolved.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    const group = groupKey(a).localeCompare(groupKey(b));
    if (group !== 0) return group;
    // Same note: it comes first, then its companions among themselves.
    const companion = Number(Boolean(a.companion_of)) - Number(Boolean(b.companion_of));
    return companion !== 0 ? companion : a.dst.localeCompare(b.dst);
  });

  // Assemble against a private copy of the current bundle. Every reconciliation therefore
  // reports the same drift it would find on the real tree while leaving the checkout untouched,
  // and hooks inspect the complete expected bundle — new refs, contributed files and provenance
  // together. Only a cast that clears every error publishes the owned files below.
  const stageDir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-stage-"));
  const stagedBundleRoot = path.join(stageDir, "bundle");
  if (existsSync(bundleRoot)) cpSync(bundleRoot, stagedBundleRoot, { recursive: true });
  else mkdirSync(stagedBundleRoot, { recursive: true });

  try {
    const refEntries: ProvenanceRefEntry[] = [];
    const drift: CastDrift[] = [];

    // Every bundle-relative path this cast writes into the staged bundle, recorded beside the
    // write that produces it. Publishing copies exactly this set, so the two halves cannot
    // disagree about what a cast produces: a new kind of output is added here, at the write,
    // rather than here AND again in a publish block that re-derives its own list.
    const staged = new Set<string>();

    for (const r of resolved) {
      const result = await castOneRef(r, repoRoot, stagedBundleRoot, hooks.renderers);
      refEntries.push(result.entry);
      staged.add(result.entry.dst);
      if (result.error) errors.push(result.error);
      if (result.drift) drift.push({ file: r.src, reason: result.drift });
    }

    // License → redistribution-policy enforcement + license_file hashing.
    errors.push(...applyLicensePolicy(refEntries, repoRoot));

    const skillText = renderSkillMarkdown({
      moldName: mold.name,
      meta: mold.meta,
      lede: hooks.skillLede,
      sections: hooks.skillSections({
        moldName: mold.name,
        meta: mold.meta,
        body: mold.body,
        refs: refEntries,
        metaByPath,
        slugMap,
      }),
    });
    const skillDrift = reconcileText({
      path: path.join(stagedBundleRoot, "SKILL.md"),
      expected: skillText,
      label: "SKILL.md",
      check: false,
    });
    if (skillDrift.reason) drift.push({ file: "SKILL.md", reason: skillDrift.reason });
    staged.add("SKILL.md");

    // Reduce `references/` to exactly what provenance lists.
    //
    // Casting writes each ref and never looked at what was already there, so a file that stops
    // being a ref stayed in the bundle forever. Undeclaring one companion was enough to prove it:
    // provenance dropped `galaxy-collection-semantics.upstream.myst`, SKILL.md stopped naming it,
    // and the file sat in nine bundles regardless — invisible to every check, and still the first
    // thing an agent listing the directory would find.
    //
    // Scoped to `references/` because that subtree is the only part of a bundle casting owns —
    // `runs/` is harvested output and is not ours to delete.
    const declaredRefs = new Set(refEntries.map((entry) => entry.dst));
    drift.push(
      ...reconcileTreeTo({
        root: path.join(stagedBundleRoot, "references"),
        declared: declaredRefs,
        relativeTo: stagedBundleRoot,
        reason: () => "orphan (no ref claims it)",
        check: false,
      }),
    );

    // Bundle-root files this instance contributes are reconciled into the staged bundle before
    // checks run. A checker therefore sees the bytes this cast proposes, never a stale manifest
    // copied from the previous cast.
    const contributed = hooks.bundleFiles.flatMap((contribute) =>
      contribute({
        moldName: mold.name,
        meta: mold.meta,
        refs: refEntries,
        metaByPath,
        slugMap,
      }),
    );
    drift.push(...reconcileBundleFiles(contributed, stagedBundleRoot, false));
    for (const file of contributed) if (file.content !== null) staged.add(file.path);

    // A `--note` opens a new cast revision. Decided before the record is assembled rather than
    // assigned onto it after, so the numbering does not depend on where a later assignment
    // would leave a key.
    const history = carry.cast_history ?? [];
    const revised = request.note
      ? (() => {
          const rev = history.reduce((m, h) => Math.max(m, h.rev), 0) + 1;
          const today = new Date().toISOString().slice(0, 10);
          return {
            cast_date: today,
            cast_revision: rev,
            cast_history: [...history, { rev, date: today, note: request.note }],
          };
        })()
      : {
          cast_date: carry.cast_date,
          cast_revision: carry.cast_revision,
          cast_history: carry.cast_history,
        };

    // The instance's own block sits between `refs` and `validation_results`. A Foundry that
    // records nothing there passes nothing and the keys are simply absent, which is what a
    // corpus with no artifacts at all gets for free.
    const next = provenanceRecord<Ext>({
      head: {
        provenance_schema_version: PROVENANCE_SCHEMA_VERSION,
        cast_target: request.targetName,
        mold: {
          name: mold.name,
          path: mold.path,
          revision: typeof mold.meta.revision === "number" ? mold.meta.revision : undefined,
          content_hash: mold.contentHash,
          commit: gitHead(repoRoot),
        },
        cast_method: carry.cast_method,
        cast_agent: carry.cast_agent,
        cast_at: new Date().toISOString(),
        ...revised,
      },
      refs: refEntries,
      extensions: request.extensions,
      tail: {
        validation_results: carry.validation_results,
        open_questions: carry.open_questions,
      },
    });

    const provenanceText = JSON.stringify(next, null, 2) + "\n";

    // The record is reconciled like everything else in the bundle. It used to be the one
    // exception — written straight out, never compared — which made the file that IS the cast's
    // contract the only one a `--check` could not see drift in.
    const stagedProvenance = path.join(stagedBundleRoot, "_provenance.json");
    const committed = existsSync(stagedProvenance)
      ? comparableProvenance(readFileSync(stagedProvenance, "utf8"))
      : undefined;
    if (committed === undefined) {
      drift.push({ file: "_provenance.json", reason: "missing (this Mold has not been cast)" });
    } else if (committed === null) {
      drift.push({ file: "_provenance.json", reason: "unreadable as JSON" });
    } else if (committed !== comparableProvenance(provenanceText)) {
      drift.push({
        file: "_provenance.json",
        reason: "changed (a re-cast records something else)",
      });
    }
    writeFileSync(stagedProvenance, provenanceText);
    staged.add("_provenance.json");

    // Checks this instance runs over the finished staged bundle.
    //
    // Collected rather than thrown: a bundle that fails its own check is a finding about this
    // cast, and the caller reports findings. Letting one escape ends the run with a stack trace
    // instead — and a check that throws is itself a finding, not a reason to lose the others.
    for (const check of hooks.bundleChecks) {
      try {
        errors.push(
          ...check({
            moldName: mold.name,
            meta: mold.meta,
            refs: refEntries,
            metaByPath,
            slugMap,
            bundleRoot: stagedBundleRoot,
          }),
        );
      } catch (e) {
        errors.push(errorMessage(e));
      }
    }

    if (request.check || errors.length) return { errors, drift, wrote: null };

    // Publish what was staged, and only that. `runs/` and any other harvested state stay exactly
    // as found — casting did not write them and does not own them.
    //
    // The set is the one built alongside the staging writes, so this cannot fall behind them.
    // It iterates in insertion order, which puts `_provenance.json` last because it is staged
    // last — the record lands only after the files it describes.
    //
    // A path in it that is not on disk means a write was recorded and did not happen, which is a
    // bug in this function rather than a condition to tolerate: publishing the rest would leave a
    // bundle whose provenance names a file it does not contain.
    mkdirSync(bundleRoot, { recursive: true });
    for (const rel of staged) {
      const from = path.join(stagedBundleRoot, rel);
      if (!existsSync(from)) throw new Error(`staged but never written: ${rel}`);
      copyVerbatim(from, path.join(bundleRoot, rel));
    }

    // Removals, which copying cannot express: refs that stopped being refs, and contributions
    // whose declaration says the file must not be there.
    reconcileTreeTo({
      root: path.join(bundleRoot, "references"),
      declared: declaredRefs,
      relativeTo: bundleRoot,
      reason: () => "orphan (no ref claims it)",
      check: false,
    });
    reconcileBundleFiles(
      contributed.filter((file) => file.content === null),
      bundleRoot,
      false,
    );

    return { errors, drift, wrote: provenancePath };
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}
