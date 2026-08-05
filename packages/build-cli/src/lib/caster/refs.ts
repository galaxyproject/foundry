// Turning a Mold's `references:` list into concrete file ops, and performing them.
//
// A ref arrives as authored YAML and leaves as bytes in a bundle plus one provenance entry
// describing how they got there. Which kinds are castable, what each defaults to and how each
// resolves are read from the reference contract's `cast:` blocks rather than decided here.

import { existsSync } from "node:fs";
import path from "node:path";

import { copyVerbatim, type ProvenanceRefEntry } from "@galaxy-foundry/cast";
import type { CastContract, ReferenceContractTerm } from "@galaxy-foundry/note-schema";

import { payloadCompanionOf } from "../dispositions.js";
import { errorMessage } from "../errors.js";
import { readMarkdown } from "../frontmatter.js";
import { reconcile, reconcileText, sha256File } from "../reconcile.js";
import type { Frontmatter } from "../types.js";
import { fileSlug } from "../walk.js";
import { resolveWikiLink, WIKI_LINK_RE } from "../wiki-links.js";
import type { RefRenderers } from "./hooks.js";
import type { TargetConfig, TargetKindConfig } from "./target.js";

export interface ResolvedRef {
  kind: "schema" | "research" | "pattern" | "cli-tool" | "cli-command" | "prompt";
  mode: "verbatim" | "sidecar";
  ref: string;
  src: string;
  dst: string;
  used_at: "cast-time" | "runtime" | "both";
  load: "upfront" | "on-demand";
  evidence?: string;
  purpose?: string;
  trigger?: string;
  verification?: string;
  /** Set when src is an npm package export rather than a repo file. */
  package_source?: { spec: string; exportName: string };
  /** Bundle-relative dst of the parent note when this ref is a copied companion file. */
  companion_of?: string;
  /** License of the upstream work this ref draws on, from the source note's frontmatter. */
  license?: string;
  /** How an authored note relates to the licensed work it cites. Absent for raw payloads. */
  derived?: string;
  /** Repo-relative LICENSES/ path associated with this ref's licensed lineage. */
  license_file?: string;
}

function deriveDst(kind: string, src: string, mode: string, kindCfg: TargetKindConfig): string {
  // 1:1 strict slug mapping: a bundled file is named for the note it came from, never for the
  // file it happens to be stored in. Those were the same string while every note was
  // `<slug>.md`, which is why the verbatim branch could get away with the basename — and why
  // it silently produced `references/notes/index.md` the moment a kind became a directory.
  //
  // Non-markdown sources keep their literal basename: a slug plus `dst_extension` would turn
  // `gxformat2.schema.json` into `gxformat2.schema.json.json`.
  if (path.extname(src) !== ".md") {
    return path.posix.join(kindCfg.dst_dir, path.basename(src));
  }
  const slug = fileSlug(src);
  const ext = mode === "verbatim" ? ".md" : kindCfg.dst_extension;
  return path.posix.join(kindCfg.dst_dir, `${slug}${ext}`);
}

export function resolveMoldRef(
  raw: unknown,
  index: number,
  slugMap: ReadonlyMap<string, string>,
  metaByPath: ReadonlyMap<string, Frontmatter>,
  target: TargetConfig,
  castContract: CastContract,
  refKinds: Record<string, ReferenceContractTerm & { ref_shape?: string }>,
): { resolved?: ResolvedRef; error?: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { error: `references[${index}]: not an object` };
  }
  const ref = raw as Record<string, unknown>;
  const kind = typeof ref.kind === "string" ? ref.kind : "";
  const refStr = typeof ref.ref === "string" ? ref.ref : "";

  const castDecl = castContract[kind];
  if (!castDecl) {
    // Two different failures, and the distinction is the declaration's: a kind the contract
    // never names is a typo, while a kind it names WITHOUT a `cast:` block is deliberate —
    // authored vocabulary the caster has no support for yet.
    return {
      error: refKinds[kind]
        ? `references[${index}]: kind=${kind} is not castable — reference_contract.yml declares it with no \`cast:\` block (the first Mold to need one defines the contract)`
        : `references[${index}]: unknown kind=${kind}`,
    };
  }
  const kindCfg = target.kinds[kind];
  if (!kindCfg) {
    return { error: `references[${index}]: target=${target.name} does not declare kind=${kind}` };
  }

  const mode = (
    typeof ref.mode === "string" ? ref.mode : castDecl.default_mode
  ) as ResolvedRef["mode"];
  // The target's list is a CONSTRAINT on the kind's, never a second declaration of it: a
  // target may refuse a mode the kind allows, and can never permit one the kind does not.
  if (!kindCfg.modes.includes(mode)) {
    return {
      error: `references[${index}]: kind=${kind} does not support mode=${mode} (allowed: ${kindCfg.modes.join(", ")})`,
    };
  }

  // Resolve src.
  let src: string;
  let dstOverride: string | undefined;
  let packageSource: { spec: string; exportName: string } | undefined;

  // Every kind addresses its note the same way and expects the note's `type` to be the kind's
  // own name; the strategies differ only in what they take FROM that note.
  //
  // The address check answers to the kind's declared `ref_shape` rather than assuming every
  // castable kind is wiki-link-shaped. They all are today, which is exactly why asserting it
  // in code would sit there being true until the first `path`-shaped kind, and then be wrong.
  //
  // It is deliberately strict. `resolveWikiLink` accepts the bare inner text
  // (`planemo-asserts-idioms`) as readily as `[[planemo-asserts-idioms]]`, so without this
  // precheck a kind could declare `ref_shape: wiki-link` and still take things that are not
  // wiki-links — a declaration that means nothing. All 253 committed refs are bracketed; a bare
  // or space-padded one is refused.
  if (refKinds[kind]?.ref_shape === "wiki-link" && !WIKI_LINK_RE.test(refStr)) {
    return {
      error: `references[${index}]: ${kind} ref must be a [[wiki-link]] to a ${kind} note (got ${refStr})`,
    };
  }
  const tp = resolveWikiLink(refStr, slugMap);
  if (!tp) return { error: `references[${index}]: ${kind} ref ${refStr} did not resolve` };
  // Frontmatter of the note this ref resolves to; source of its license fields.
  const noteMeta: Frontmatter | undefined = metaByPath.get(tp);
  if (noteMeta?.type !== kind) {
    return {
      error: `references[${index}]: ${kind} ref ${refStr} resolves to type=${noteMeta?.type ?? "(none)"}, expected ${kind}`,
    };
  }

  // The bundled filename is the note's slug, never the storage filename — `fileSlug` is what
  // keeps a directory-shaped kind from landing as `index.md`. `slug_field` overrides it where
  // the note's own slug is the wrong name for a reader of the bundle.
  //
  // A declared `slug_field` the note does not carry is an ERROR, not a fallback to the slug:
  // the declaration's whole content is "the note's own slug is the wrong name here", so
  // quietly using it anyway would rename every file of the kind on a typo'd field name and
  // look like a successful cast.
  let slug = fileSlug(tp);
  if (castDecl.slug_field) {
    const declaredSlug = noteMeta[castDecl.slug_field];
    if (typeof declaredSlug !== "string" || !declaredSlug) {
      return {
        error: `references[${index}]: ${kind} ref ${refStr} resolves to a note with no \`${castDecl.slug_field}\`, which its kind declares as slug_field`,
      };
    }
    slug = declaredSlug;
  }
  const namedDst = path.posix.join(kindCfg.dst_dir, `${slug}${kindCfg.dst_extension}`);

  switch (castDecl.resolve) {
    case "package-export": {
      // The note declares `package` + `package_export`; cast imports the runtime export,
      // JSON.stringifies it, and writes that to the bundle. There is no file to copy.
      const pkg = typeof noteMeta.package === "string" ? noteMeta.package : null;
      const exp = typeof noteMeta.package_export === "string" ? noteMeta.package_export : null;
      if (!pkg || !exp) {
        return {
          error: `references[${index}]: ${kind} ref ${refStr} resolves to a note missing 'package' and/or 'package_export' frontmatter`,
        };
      }
      src = `package://${pkg}#${exp}`;
      dstOverride = namedDst;
      packageSource = { spec: pkg, exportName: exp };
      break;
    }
    case "payload-companion": {
      // What casting packages is the payload beside the note, never the wrapper. Which file
      // that is comes from the kind's own companion declaration, so there is nothing here to
      // resolve and nothing that can point at a file that is not there.
      //
      // Caught rather than thrown: a kind declaring no single `bundled` companion is a broken
      // declaration, and every other failure in this function arrives as a collected
      // `references[i]: ...` line. Letting this one escape as a stack trace would lose the
      // ref index — the only thing that says WHICH reference was being resolved.
      let payload: string;
      try {
        payload = payloadCompanionOf(kind);
      } catch (e) {
        return { error: `references[${index}]: ${errorMessage(e)}` };
      }
      src = path.posix.join(path.posix.dirname(tp), payload);
      dstOverride = namedDst;
      break;
    }
    case "note": {
      src = tp;
      // Only a kind that renames its output needs the explicit dst; the rest go through
      // `deriveDst`, which is also the path a non-markdown source has to take.
      if (castDecl.slug_field) dstOverride = namedDst;
      break;
    }
  }

  const dst = dstOverride ?? deriveDst(kind, src, mode, kindCfg);

  const used_at = (
    typeof ref.used_at === "string" ? ref.used_at : "runtime"
  ) as ResolvedRef["used_at"];
  const load = (typeof ref.load === "string" ? ref.load : "on-demand") as ResolvedRef["load"];

  return {
    resolved: {
      kind: kind as ResolvedRef["kind"],
      mode,
      ref: refStr,
      src,
      dst,
      used_at,
      load,
      evidence: typeof ref.evidence === "string" ? ref.evidence : undefined,
      purpose: typeof ref.purpose === "string" ? ref.purpose : undefined,
      trigger: typeof ref.trigger === "string" ? ref.trigger : undefined,
      verification: typeof ref.verification === "string" ? ref.verification : undefined,
      package_source: packageSource,
      license: typeof noteMeta?.license === "string" ? noteMeta.license : undefined,
      // `derived` describes authored prose. A package export or payload companion is upstream
      // bytes rather than the note that describes them, so absence deliberately keeps those
      // refs on the policy's pass-through path.
      derived:
        castDecl.resolve === "note" && typeof noteMeta?.derived === "string"
          ? noteMeta.derived
          : undefined,
      license_file: typeof noteMeta?.license_file === "string" ? noteMeta.license_file : undefined,
    },
  };
}

// Expand companion files declared on a note's frontmatter into sibling refs.
// A multi-file note (e.g. a vendored bundle) lists `companions:` filenames in
// its `.md`; each is copied verbatim next to the note in the bundle so the
// note body can reference it at runtime. Companions ship verbatim whatever the
// parent ref's mode — a note points at its structured sibling either way. They
// inherit the parent ref's load/used_at/trigger/purpose and carry
// `companion_of` for provenance.
export function expandCompanions(
  resolved: ResolvedRef[],
  metaByPath: ReadonlyMap<string, Frontmatter>,
  target: TargetConfig,
  castContract: CastContract,
): ResolvedRef[] {
  const out: ResolvedRef[] = [];
  for (const r of resolved) {
    out.push(r);
    // Whether a kind's notes may carry companions is the kind's declaration, not a pair of
    // names checked here. The note still lists its own — membership stays declared per-note,
    // and a file is never packaged for merely sitting in the directory.
    if (!castContract[r.kind]?.companions) continue;
    const rawCompanions = metaByPath.get(r.src)?.companions;
    const companions = Array.isArray(rawCompanions) ? (rawCompanions as unknown[]) : [];
    if (companions.length === 0) continue;
    const kindCfg = target.kinds[r.kind];
    if (!kindCfg) continue;
    const srcDir = path.posix.dirname(r.src);
    for (const c of companions) {
      if (typeof c !== "string") continue;
      out.push({
        kind: r.kind,
        mode: "verbatim",
        ref: r.ref,
        src: path.posix.join(srcDir, c),
        dst: path.posix.join(kindCfg.dst_dir, c),
        used_at: r.used_at,
        load: r.load,
        evidence: r.evidence,
        purpose: r.purpose,
        trigger: r.trigger,
        companion_of: r.dst,
        license: r.license,
        license_file: r.license_file,
      });
    }
  }
  return out;
}

/**
 * Place one ref's bytes and report what it took.
 *
 * There is no check mode in here. Assembly always writes, because it writes into a staged copy
 * of the bundle that a `--check` run simply never publishes — check-ness is one decision, made
 * once, after every ref has had its say. That is also why `dst_hash` is the expected hash rather
 * than `recordedHash`'s answer: the staged file was brought into line by definition, so the two
 * cases that function distinguishes cannot both arise here.
 */
export async function castOneRef(
  resolved: ResolvedRef,
  repoRoot: string,
  bundleRoot: string,
  renderers: RefRenderers,
): Promise<{ entry: ProvenanceRefEntry; drift?: string; error?: string }> {
  const dstAbs = path.join(bundleRoot, resolved.dst);

  // Package-vendored schema: import the named export, JSON.stringify, write verbatim.
  // No file `src` exists; src_hash and dst_hash are both the hash of the synthesized JSON.
  if (resolved.package_source) {
    if (resolved.kind !== "schema" || resolved.mode !== "verbatim") {
      return {
        entry: { ...skeleton(resolved), src_hash: null, dst_hash: null, source: "deterministic" },
        error: `package_source ref must be kind=schema mode=verbatim (got ${resolved.kind}/${resolved.mode})`,
      };
    }
    let json: string;
    try {
      const mod = (await import(resolved.package_source.spec)) as Record<string, unknown>;
      const exported = mod[resolved.package_source.exportName];
      if (exported === undefined) {
        return {
          entry: { ...skeleton(resolved), src_hash: null, dst_hash: null, source: "deterministic" },
          error: `package ${resolved.package_source.spec} has no export '${resolved.package_source.exportName}'`,
        };
      }
      const stringified = JSON.stringify(exported, null, 2);
      if (stringified === undefined) {
        return {
          entry: { ...skeleton(resolved), src_hash: null, dst_hash: null, source: "deterministic" },
          error: `package ${resolved.package_source.spec} export '${resolved.package_source.exportName}' is not JSON-serializable (typeof=${typeof exported}). The export must be a plain JSON Schema object; an Effect schema function needs upstream to publish a JSON-converted sibling.`,
        };
      }
      json = stringified + "\n";
    } catch (e) {
      return {
        entry: { ...skeleton(resolved), src_hash: null, dst_hash: null, source: "deterministic" },
        error: `failed to import ${resolved.package_source.spec}: ${(e as Error).message}`,
      };
    }
    const drift = reconcileText({
      path: dstAbs,
      expected: json,
      label: "package schema",
      check: false,
    });
    return {
      entry: {
        ...skeleton(resolved),
        src_hash: drift.expectedHash,
        dst_hash: drift.expectedHash,
        source: "deterministic",
      },
      drift: drift.reason,
    };
  }

  const srcAbs = path.join(repoRoot, resolved.src);
  if (!existsSync(srcAbs)) {
    return {
      entry: { ...skeleton(resolved), src_hash: null, dst_hash: null, source: "deterministic" },
      error: `ref source missing: ${resolved.src}`,
    };
  }
  const srcHash = sha256File(srcAbs);

  if (resolved.mode === "verbatim") {
    // The one ref that is a COPY rather than a render: compared against the source's own hash,
    // and written with `copyFileSync`, so the expected bytes are never a string in hand.
    const drift = reconcile({
      path: dstAbs,
      expectedHash: srcHash,
      label: "dst",
      check: false,
      write: () => copyVerbatim(srcAbs, dstAbs),
    });
    return {
      entry: {
        ...skeleton(resolved),
        src_hash: srcHash,
        dst_hash: drift.expectedHash,
        source: "deterministic",
      },
      drift: drift.reason,
    };
  }

  // Dispatched on the mode alone. Which kinds may take a given mode is already declared — the
  // target's `kinds.<kind>.modes` gates it above — so naming the kind again here would be a
  // second gate that could only ever disagree with the first.
  //
  // Which RENDERER a mode selects is a separate question, and the instance answers it. The mode
  // is shared vocabulary; the bytes it produces are not.
  const renderer = renderers[resolved.mode];
  if (renderer) {
    const parsed = readMarkdown(srcAbs);
    const text = await renderer({ srcAbs, srcRel: resolved.src, meta: parsed.meta });
    const drift = reconcileText({
      path: dstAbs,
      expected: text,
      label: resolved.mode,
      check: false,
    });
    return {
      entry: {
        ...skeleton(resolved),
        src_hash: srcHash,
        dst_hash: drift.expectedHash,
        source: "deterministic",
      },
      drift: drift.reason,
    };
  }

  // Unreachable from this instance, and kept anyway. Our `modes` vocabulary is narrowed to
  // exactly the modes we implement, so an unimplemented one is refused when the contract loads.
  // That is a fact about this instance's vocabulary, not a guarantee of the caster: widen the
  // vocabulary without registering a renderer and this is the failure. Says which of the two
  // disagreed, because "kind does not support mode" is a Mold to fix and this is a hook to write.
  return {
    entry: { ...skeleton(resolved), src_hash: srcHash, dst_hash: null, source: "deterministic" },
    error: `no renderer for mode=${resolved.mode} (kind=${resolved.kind}) — the target admits this mode but nothing implements it`,
  };
}

function skeleton(r: ResolvedRef): Omit<ProvenanceRefEntry, "src_hash" | "dst_hash" | "source"> {
  return {
    kind: r.kind,
    mode: r.mode,
    ref: r.ref,
    src: r.src,
    dst: r.dst,
    used_at: r.used_at,
    load: r.load,
    evidence: r.evidence,
    purpose: r.purpose,
    trigger: r.trigger,
    verification: r.verification,
    companion_of: r.companion_of,
    license: r.license,
    derived: r.derived,
    license_file: r.license_file,
  };
}
