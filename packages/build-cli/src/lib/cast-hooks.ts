// Where instance knowledge attaches to a generic caster.
//
// Casting itself is domain-free: resolve each ref to a file, place its bytes, hash both ends,
// report drift, write the provenance record. Everything this repo adds on top of that is Galaxy
// knowledge — artifact contracts, CLI tooling, the shape of a planemo command — and it is
// currently woven through cast-mold.ts rather than declared anywhere.
//
// This file names the attachment points so the generic half can eventually leave this repo
// without carrying any of them along. The test of a point being in the right place is that this
// instance supplies it and a second instance supplies nothing: a Foundry whose corpus is
// research notes has no artifacts, no tools, and no commands, and should still cast.
//
// One point is declared so far. The rest — bundle-file contributors, SKILL.md section
// contributors, the provenance `artifacts` block, and slug aliasing — are still inline.

import type { ProvenanceRefEntry } from "@galaxy-foundry/cast";

import type { Frontmatter } from "./types.js";

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
}
