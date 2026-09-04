// What this instance owes the manifest format, now that the format itself lives in
// @galaxy-foundry/kind-manifest.
//
// The synthetic-shape suite that used to live here — does `describeType` unwrap a
// defaulted array, does a refined string still render as `string` — moved to that package
// along with the renderer it exercises. Re-testing a dependency's unit behaviour here
// would just be the duplication this extraction removed, in a new place.
//
// What is still ours, and only testable here: that OUR kinds resolve against OUR
// registries into a manifest that is well-formed, complete, and stable enough for the
// `check:kinds` gate to mean something.

import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { bundledPolicy } from "@galaxy-foundry/license-policy";
import {
  KINDS,
  KIND_MANIFEST_VERSION,
  MANIFEST_SOURCE,
  buildKindManifest,
  loadReferenceContract,
  parseKindManifest,
} from "../src/index.js";
import { loadTagRegistry } from "@galaxy-foundry/tag-registry";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

const registries = {
  tags: loadTagRegistry(path.join(repoRoot, "meta_tags.yml")),
  contract: loadReferenceContract(path.join(repoRoot, "reference_contract.yml")),
  licensePolicy: bundledPolicy(),
};

const INSTANCE = "galaxy-workflow-foundry";
const manifest = buildKindManifest({ instance: INSTANCE, ...registries });

describe("this Foundry's manifest", () => {
  it("names every kind the barrel declares, in barrel order", () => {
    expect(manifest.kinds.map((k) => k.kind)).toEqual(KINDS.map((d) => d.kind));
  });

  it("stamps the instance slug and the format version", () => {
    expect(manifest.instance).toBe(INSTANCE);
    expect(manifest.version).toBe(KIND_MANIFEST_VERSION);
  });

  it("declares where it lives, so a consumer need not hard-code our identity", () => {
    expect(manifest.source).toEqual(MANIFEST_SOURCE);
    expect(MANIFEST_SOURCE.repo).toBe("galaxyproject/foundry");
  });

  // The manifest is committed and CI regenerates it with `--check`, which string-compares.
  // Anything in it that varies between two runs at the same commit breaks that gate for
  // everyone, and the failure looks like an unrelated stale-file error.
  it("is byte-identical across builds, so --check can pass", () => {
    const again = buildKindManifest({ instance: INSTANCE, ...registries });
    expect(JSON.stringify(again)).toBe(JSON.stringify(manifest));
  });

  it("gives every kind a title, a summary, and at least one field", () => {
    for (const kind of manifest.kinds) {
      expect(kind.title, kind.kind).toBeTruthy();
      expect(kind.summary, kind.kind).toBeTruthy();
      expect(kind.fields.length, kind.kind).toBeGreaterThan(0);
    }
  });

  // A `type` discriminator that did not resolve to its own literal means the kind was built
  // against the wrong context — the manifest would look fine and be wrong.
  it("renders each kind's `type` field as its own literal", () => {
    for (const kind of manifest.kinds) {
      const type = kind.fields.find((f) => f.name === "type");
      expect(type?.type, kind.kind).toBe(JSON.stringify(kind.kind));
    }
  });

  it("carries a doc body only for the kinds it was given one for", () => {
    const first = KINDS[0]!.kind;
    const withDocs = buildKindManifest({
      instance: INSTANCE,
      docs: { [first]: "# Doc" },
      ...registries,
    });
    expect(withDocs.kinds.find((k) => k.kind === first)?.doc).toBe("# Doc");
    for (const kind of withDocs.kinds.filter((k) => k.kind !== first)) {
      expect(Object.hasOwn(kind, "doc"), kind.kind).toBe(false);
    }
  });

  // The round trip a consumer actually performs: our JSON, their reader. If what we emit
  // stops satisfying the shared schema, this fails here rather than in another repo.
  it("survives the shared reader after a JSON round trip", () => {
    expect(parseKindManifest(JSON.parse(JSON.stringify(manifest)))).toEqual(manifest);
  });
});
