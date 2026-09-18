// Decides what each file in a run directory is.
//
// Only a minority of a real run directory is declared by a Mold — measured across the two runs
// that exist, 13 of 21 entries in one and 14 of 30 in the other, and by bytes the undeclared side
// wins about five to one. A reader that showed only the declared files would be describing a
// different directory than the one on disk, so everything else gets a class and a place rather
// than being dropped.

import type { DeclaredOutput } from "./cast-registry.js";
import type { UnmappedClass } from "./run-model.js";
import type { ScannedEntry } from "./run-scan.js";

/**
 * Suffixes a person adds by hand when they keep a copy before changing something.
 *
 * These are the most interesting files in a run — each one marks a human intervention — so they
 * are folded into their parent artifact as a variant rather than listed as strays.
 */
const VARIANT_SUFFIX = /\.(bak|orig|save|prepin)$/i;

/** Outputs of the tools a run drives, rather than artifacts a Mold declares. */
const TOOL_OUTPUT_PATTERNS: RegExp[] = [
  /^planemo[-.].*\.(log|json|html|xml)$/i,
  /^planemo\.(log|json|html)$/i,
  /^tool_test_output.*\.(json|html)$/i,
  /^extract-report\.json$/i,
  /^plnmotmp.*\.json$/i,
  /\.log$/i,
];

/**
 * Names that mean "a person wrote this about the run" in any directory.
 *
 * These are checked before the cross-pipeline rule, because they are generic enough that another
 * pipeline declaring one does not make this copy that pipeline's artifact. The IWC maturation Mold
 * emits a `README.md`; a README beside an interview run is still just a README.
 */
const GENERIC_NARRATIVE_NAMES = new Set([
  "readme.md",
  "license",
  "license.md",
  "license.txt",
  "notes.md",
  "changelog.md",
]);

/** Narrative names distinctive enough that no pipeline is likely to claim them. */
const NARRATIVE_NAMES = new Set(["transcript.md", "run-summary.md", "case_study.md"]);

export interface ClassifiedVariant {
  parentArtifactId: string;
  entry: ScannedEntry;
  suffix: string;
}

export interface ClassifiedUnmapped {
  entry: ScannedEntry;
  cls: UnmappedClass;
  attachedTo: string | null;
  declaredByPipelines: string[];
  declaredBySkills: string[];
}

export interface Classification {
  /** artifact id -> the entry carrying its declared filename */
  declared: Map<string, ScannedEntry>;
  variants: ClassifiedVariant[];
  unmapped: ClassifiedUnmapped[];
}

/**
 * Strip one trailing variant suffix, and any single interposed token before it.
 *
 * `galaxy-workflow.gxwf.yml.prepin.bak` and `galaxy-workflow-validation-result.json.gxwf-1.10.1.bak`
 * are both real; the second carries a tool version between the filename and the suffix.
 */
export function variantParent(basename: string, declaredNames: Set<string>): string | null {
  if (!VARIANT_SUFFIX.test(basename)) return null;
  let stem = basename.replace(VARIANT_SUFFIX, "");
  // Strip trailing dot-segments one at a time. A single cut is not enough: the interposed token is
  // sometimes a tool version, and `galaxy-workflow-validation-result.json.gxwf-1.10.1.bak` needs
  // three. Only an exact declared name is accepted, so over-stripping cannot invent a parent.
  while (stem.includes(".")) {
    if (declaredNames.has(stem)) return stem;
    stem = stem.slice(0, stem.lastIndexOf("."));
  }
  return declaredNames.has(stem) ? stem : null;
}

function variantSuffix(basename: string, parent: string): string {
  return basename.slice(parent.length).replace(/^\./, "");
}

function isToolOutput(basename: string): boolean {
  return TOOL_OUTPUT_PATTERNS.some((pattern) => pattern.test(basename));
}

function isNarrative(basename: string): boolean {
  const lower = basename.toLowerCase();
  return NARRATIVE_NAMES.has(lower) || GENERIC_NARRATIVE_NAMES.has(lower);
}

function isGenericNarrative(basename: string): boolean {
  return GENERIC_NARRATIVE_NAMES.has(basename.toLowerCase());
}

export function classifyEntries(
  entries: ScannedEntry[],
  declared: DeclaredOutput[],
  /** filename -> the pipelines declaring it, across every assembled harness */
  declaredElsewhere: Map<string, string[]>,
  /**
   * filename -> every cast skill declaring it, including Molds no pipeline lists as a phase.
   *
   * The per-step loop invokes `discover-shed-tool` and `summarize-galaxy-tool` from inside a
   * phase, so their outputs land in the run directory while belonging to no phase. Without this
   * they read as strays, which is exactly backwards: they are the loop's working evidence.
   */
  declaredBySkill?: Map<string, string[]>,
): Classification {
  const byFilename = new Map<string, DeclaredOutput>();
  for (const output of declared) byFilename.set(output.default_filename, output);
  const declaredNames = new Set(byFilename.keys());

  const declaredHits = new Map<string, ScannedEntry>();
  const variants: ClassifiedVariant[] = [];
  const unmapped: ClassifiedUnmapped[] = [];

  const push = (
    entry: ScannedEntry,
    cls: UnmappedClass,
    extra: Partial<Omit<ClassifiedUnmapped, "entry" | "cls">> = {},
  ): void => {
    unmapped.push({
      entry,
      cls,
      attachedTo: extra.attachedTo ?? null,
      declaredByPipelines: extra.declaredByPipelines ?? [],
      declaredBySkills: extra.declaredBySkills ?? [],
    });
  };

  for (const entry of entries) {
    if (entry.type === "dir") {
      push(entry, "directory");
      continue;
    }

    const declaredMatch = byFilename.get(entry.basename);
    if (declaredMatch) {
      declaredHits.set(declaredMatch.id, entry);
      continue;
    }

    const parent = variantParent(entry.basename, declaredNames);
    if (parent) {
      const parentOutput = byFilename.get(parent)!;
      variants.push({
        parentArtifactId: parentOutput.id,
        entry,
        suffix: variantSuffix(entry.basename, parent),
      });
      continue;
    }

    if (isGenericNarrative(entry.basename)) {
      push(entry, "narrative");
      continue;
    }

    const elsewhere = declaredElsewhere.get(entry.basename);
    if (elsewhere && elsewhere.length > 0) {
      push(entry, "cross-pipeline", { declaredByPipelines: elsewhere });
      continue;
    }

    const bySkill = declaredBySkill?.get(entry.basename);
    if (bySkill && bySkill.length > 0) {
      push(entry, "sub-mold", { declaredBySkills: bySkill });
      continue;
    }

    if (isToolOutput(entry.basename)) {
      push(entry, "tool-output");
      continue;
    }

    if (isNarrative(entry.basename)) {
      push(entry, "narrative");
      continue;
    }

    push(entry, "undeclared");
  }

  return { declared: declaredHits, variants, unmapped };
}
