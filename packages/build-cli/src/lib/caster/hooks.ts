// Where instance knowledge attaches to a generic caster.
//
// Casting itself is domain-free: resolve each ref to a file, place its bytes, hash both ends,
// report drift, write the provenance record. Everything a Foundry adds on top of that is its own
// knowledge — Galaxy's artifact contracts, CLI tooling and planemo command shape here, something
// else entirely in the next instance — and it reaches the caster through this interface alone.
//
// The rest of this directory is that caster, which is why each point below is a value handed in
// rather than a branch taken inside. The test of a point being in the right place is that this
// instance supplies it and a second instance supplies nothing: a Foundry whose corpus is
// research notes has no artifacts, no tools, and no commands, and should still cast.
//
// The provenance `artifacts` block is not among them, and does not need to be. Casting reserves
// one slot in the record for whatever an instance records beyond the refs, so the block is
// supplied at the call rather than declared as a point here — see lib/artifact-contract.ts for
// the vocabulary and @galaxy-foundry/cast's `provenanceRecord` for where it lands.

import type { ProvenanceRefEntry } from "@galaxy-foundry/cast";

import type { Frontmatter } from "../types.js";

export interface RefRenderInput {
  /** Absolute path to the ref's source file. */
  srcAbs: string;
  /** Repo-relative path to that same file — what a record of this cast should name. */
  srcRel: string;
  /** The source note's frontmatter, parsed once by the caller. */
  meta: Frontmatter;
}

/**
 * Turns a ref's source into the exact bytes its bundled file must contain.
 *
 * Must be deterministic. The same source has to render to the same bytes on every run, or
 * `--check` reports drift on a cast where nothing changed and the byte-identity oracle stops
 * meaning anything. Reading files and importing packages is fine; the clock, the network and
 * the environment are not.
 */
export type RefRenderer = (input: RefRenderInput) => Promise<string> | string;

/**
 * Renderers by the `mode` that selects them.
 *
 * `verbatim` is deliberately absent and cannot be registered over. It is a copy rather than a
 * render — compared against the source's own hash and written with `copyFileSync`, so the
 * expected bytes are never a string in hand. A renderer returning the file's own contents would
 * be a different operation wearing the same name.
 *
 * A mode is vocabulary; a renderer is an implementation of it. Keeping them apart is what lets
 * `sidecar` mean one thing across instances — "a structured runtime artifact beside the skill" —
 * while only this one knows that the structure is a planemo command description.
 */
export type RefRenderers = Readonly<Record<string, RefRenderer>>;

/** What a cast knows about itself, and all a contributor is given to work from. */
export interface CastContext {
  /** The Mold being cast. */
  readonly moldName: string;
  /** Its frontmatter. */
  readonly meta: Frontmatter;
  /** Every ref this cast resolved, in the order the bundle lists them. */
  readonly refs: readonly ProvenanceRefEntry[];
  /** Every note in the corpus, by repo-relative path. */
  readonly metaByPath: ReadonlyMap<string, Frontmatter>;
  /** Wiki-link slug to repo-relative path. */
  readonly slugMap: ReadonlyMap<string, string>;
}

/** A file a cast puts at the bundle root beyond the ones casting always writes. */
export interface BundleFile {
  /** Bundle-relative path. */
  readonly path: string;
  /**
   * The bytes, or null when this cast requires the file NOT to be there.
   *
   * Null is the case worth having: a Mold that stops requiring tools must not leave the old
   * manifest behind still claiming it does, and nothing else in a cast can notice that, because
   * hash comparison only ever visits files something still declares.
   */
  readonly content: string | null;
  /** Shown when a check finds a file that `content: null` says should be gone. */
  readonly absentReason?: string;
}

/**
 * Extra bundle-root files this instance derives from the cast.
 *
 * Contributors run after refs are resolved and licence-checked, so they see the finished ref
 * list. They must be pure functions of their input: a cast is byte-stable, and a contributor
 * that consults anything else breaks `--check` for every Mold.
 */
export type BundleFileContributor = (context: CastContext) => readonly BundleFile[];

/**
 * One `## Title` block of a skill document.
 *
 * The body arrives already rendered rather than as lines, because the blocks are not all lists:
 * the procedure is prose, the reference sections are bullets, and a section that had to be one
 * of those would push the other through a shape it does not fit.
 */
export interface SkillSection {
  readonly title: string;
  readonly body: string;
}

/** What a section contributor is given: the cast, plus the Mold's own prose. */
export interface SkillContext extends CastContext {
  /** The Mold's markdown body, wiki-links intact and not yet rewritten for a runtime reader. */
  readonly body: string;
}

/**
 * The skill document's sections, in the order they appear.
 *
 * The instance supplies the whole list — including the procedure and any closing notes — rather
 * than filling slots in a skeleton. Casting owns the frontmatter, the title, and the `## Title`
 * convention; what a skill document should SAY is a fact about the corpus it was cast from, and
 * a fixed skeleton would make every Foundry render Galaxy's idea of a skill.
 */
export type SkillSectionContributor = (context: SkillContext) => readonly SkillSection[];

/**
 * Extra wiki-link addresses a note answers to, beyond the slug of its own filename.
 *
 * Galaxy's CLI command notes are addressable as `[[gxwf validate]]` as well as by filename,
 * because that is how someone writing a Mold thinks of them. Nothing general requires a note to
 * have a second address; an instance that supplies none gets filename addressing alone.
 */
export type SlugAliases = (meta: Frontmatter) => readonly string[];

/** What a bundle check is given: the finished cast, and where it was written. */
export interface BundleCheckContext extends CastContext {
  readonly bundleRoot: string;
}

/**
 * An instance's check over the finished bundle, returning one string per finding.
 *
 * Findings are collected, not thrown: a bundle that fails its own check is a fact about this
 * cast, and the caller reports facts. A check that throws is caught and reported the same way,
 * so a broken check cannot end a run with a stack trace.
 */
export type BundleCheck = (context: BundleCheckContext) => readonly string[];

export interface CastHooks {
  /**
   * Renderers for every non-verbatim mode this instance admits.
   *
   * A mode reaching the caster with nothing registered is an error rather than a pass-through.
   * Declining a mode is done by narrowing it out of the vocabulary, which fails at authoring
   * time; arriving here means the vocabulary and the implementation disagree, and casting
   * cannot guess which one is right.
   */
  readonly renderers: RefRenderers;
  /**
   * Bundle-root files beyond `SKILL.md` and `_provenance.json`.
   *
   * Both of ours describe Galaxy: which tools a skill needs installed, and how to verify what it
   * produces. A Foundry of research notes contributes none, and gets a bundle of exactly the two
   * files casting itself writes.
   */
  readonly bundleFiles: readonly BundleFileContributor[];
  /** The paragraph under the skill's title, before the first section. */
  readonly skillLede: string;
  /** Everything below that paragraph. */
  readonly skillSections: SkillSectionContributor;
  /** Second addresses for a note, beyond the slug of its filename. */
  readonly slugAliases: SlugAliases;
  /**
   * Checks over the finished bundle, run before the error gate.
   *
   * Ours validates harvested sample runs against the schema the Mold declares for its own
   * output — a question that only means something where a Mold's artifacts have schemas.
   */
  readonly bundleChecks: readonly BundleCheck[];
}
