// How each reference kind is CAST — the half of a kind's declaration that says what the
// caster does with it, as opposed to what the site calls it.
//
// A reference kind already declares `label`, `description` and `ref_shape` in
// reference_contract.yml. Those describe the kind to a reader. What the caster needed to
// know — where the source bytes come from, what transform applies by default, whether the
// kind's notes may carry companions — was a set of string literals in cast-mold.ts, keyed
// on the kind NAME:
//
//     const SUPPORTED_KINDS = new Set(["schema", "research", ...]);
//     const defaultMode = kind === "cli-command" ? "sidecar" : "verbatim";
//     if (r.kind !== "research" && r.kind !== "pattern") continue;
//
// Four decisions keyed on the kind NAME, none of them the declaration, all of them able to
// disagree with it. That is the same shape as the hand-written `forbid_packaged_files` that named
// two of the eight companions its kinds declared, and it is fixed the same way: the kind
// declares, and the caster reads the declaration.
//
// This parser is deliberately separate from @galaxy-foundry/reference-contract's, which
// keeps `KindTerm` to the fields the SITE renders and drops the rest. Composing the two
// halves here matches how `kinds` itself is composed. When the caster moves into the
// shared substrate this is the piece that travels with it — at which point the shared
// parser should REJECT an unknown key rather than drop it, so a `cast:` block that
// reaches no caster fails loudly instead of silently doing nothing.

import { readFileSync } from "node:fs";

import yaml from "js-yaml";

/**
 * Where a ref's source bytes come from, and how its bundled filename is derived.
 *
 * Source and filename are one choice rather than two because they are not independent:
 * a `package-export` ref has no file to take a basename from, and a `payload-companion`
 * ref must be named for the note that frames it rather than for the payload beside it.
 */
export type CastResolve =
  /** The note file itself. */
  | "note"
  /** An npm export named by the note's `package` + `package_export`. */
  | "package-export"
  /** The kind's single `bundled` companion, sitting beside the note. */
  | "payload-companion";

export const CAST_RESOLVE_VALUES: readonly CastResolve[] = [
  "note",
  "package-export",
  "payload-companion",
];

export interface CastDeclaration {
  resolve: CastResolve;
  /** Applied when a `references[]` entry names no `mode`. */
  default_mode: string;
  /**
   * Frontmatter field naming the bundled file, when the note's own slug is the wrong name.
   *
   * `cli-tool` notes live at `content/cli/<dir>/index.md` and the directory is not always
   * the command — `tool:` is what a reader of the bundle expects to find.
   */
  slug_field?: string;
  /**
   * Whether this kind's notes may carry per-note `companions:` into a bundle.
   *
   * Layout stays the kind's and membership stays the note's: this says the kind's notes
   * are ALLOWED to declare companions, never which files they are. A note still lists its
   * own, and a file is never picked up for sitting in the directory.
   */
  companions: boolean;
}

/** A reference kind the caster can compile. Kinds with no `cast:` block are not castable. */
export type CastContract = Record<string, CastDeclaration>;

const CAST_FIELDS = new Set(["resolve", "default_mode", "slug_field", "companions"]);

function fail(sourcePath: string, message: string): never {
  throw new Error(`${sourcePath}: ${message}`);
}

function parseCastDeclaration(
  kindName: string,
  raw: unknown,
  sourcePath: string,
  modes: readonly string[],
): CastDeclaration {
  const where = `kinds.${kindName}.cast`;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fail(sourcePath, `${where} is not a mapping`);
  }
  const fields = raw as Record<string, unknown>;

  // Reject rather than ignore. This parser exists because the shared one DROPS what it does
  // not recognise, and a `cast:` block reaching no reader is the failure it was written to
  // avoid — so a `slug_feild:` inside the block must not be quietly discarded here either.
  const unknownFields = Object.keys(fields).filter((key) => !CAST_FIELDS.has(key));
  if (unknownFields.length > 0) {
    fail(
      sourcePath,
      `${where} has unknown field(s) ${unknownFields.join(", ")} (known: ${[...CAST_FIELDS].join(", ")})`,
    );
  }

  const resolve = fields["resolve"];
  if (typeof resolve !== "string" || !CAST_RESOLVE_VALUES.includes(resolve as CastResolve)) {
    fail(
      sourcePath,
      `${where}.resolve is \`${String(resolve)}\` (expected ${CAST_RESOLVE_VALUES.join(" | ")})`,
    );
  }

  const defaultMode = fields["default_mode"];
  if (typeof defaultMode !== "string" || !defaultMode) {
    fail(sourcePath, `${where} missing required field \`default_mode\``);
  }
  // Checked against the composed vocabulary rather than a literal list, so an instance
  // that narrows `modes` (declining the LLM phase, say) cannot declare a default it has
  // just removed from its own contract.
  if (!modes.includes(defaultMode)) {
    fail(
      sourcePath,
      `${where}.default_mode is \`${defaultMode}\`, which is not in this instance's ` +
        `\`modes\` vocabulary (${modes.join(", ")})`,
    );
  }

  const slugField = fields["slug_field"];
  if (slugField !== undefined && (typeof slugField !== "string" || !slugField)) {
    fail(sourcePath, `${where}.slug_field must be a non-empty string`);
  }

  const companions = fields["companions"];
  if (typeof companions !== "boolean") {
    fail(sourcePath, `${where}.companions must be true or false`);
  }

  const declaration: CastDeclaration = {
    resolve: resolve as CastResolve,
    default_mode: defaultMode,
    companions,
  };
  if (typeof slugField === "string") declaration.slug_field = slugField;
  return declaration;
}

/**
 * Read the `cast:` blocks from reference_contract.yml.
 *
 * A kind with no `cast:` block is absent from the result — that is how a kind declares it
 * is vocabulary the site renders but the caster cannot compile, which `example` has been
 * since v1. Being absent here is the whole reason the caster refuses it, rather than a
 * second list of names agreeing with this one.
 */
export function loadCastContract(contractPath: string, modes: readonly string[]): CastContract {
  const parsed: unknown = yaml.load(readFileSync(contractPath, "utf8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    fail(contractPath, "reference contract is not a mapping");
  }
  const kinds = (parsed as Record<string, unknown>)["kinds"];
  if (typeof kinds !== "object" || kinds === null || Array.isArray(kinds)) {
    fail(contractPath, "`kinds` is not a mapping");
  }

  const contract: CastContract = {};
  for (const [kindName, rawKind] of Object.entries(kinds as Record<string, unknown>)) {
    if (typeof rawKind !== "object" || rawKind === null || Array.isArray(rawKind)) continue;
    const rawCast = (rawKind as Record<string, unknown>)["cast"];
    if (rawCast === undefined) continue;
    contract[kindName] = parseCastDeclaration(kindName, rawCast, contractPath, modes);
  }
  return contract;
}
