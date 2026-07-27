// What this Foundry owes the license table, now that the table itself ships in
// @galaxy-foundry/license-policy.
//
// The table's own invariants — own-words-only never permits a copying carry, verbatim-ok
// always demands its notice, no row permits nothing — moved to that package along with the
// table they describe. Re-asserting them here would be the hand-mirroring this removes,
// wearing a test's clothes.
//
// What is still ours: our frontmatter contract derives its `license` grammar from that table
// rather than from a hand-written enum. That claim spans the package and our schema, so it is
// only checkable here.

import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { bundledPolicy, licenseIds } from "@galaxy-foundry/license-policy";
import {
  buildNoteSchema,
  loadReferenceContract,
  loadTagRegistry,
} from "@galaxy-foundry/note-schema";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const schema = buildNoteSchema({
  tags: loadTagRegistry(path.join(repoRoot, "meta_tags.yml")),
  contract: loadReferenceContract(path.join(repoRoot, "reference_contract.yml")),
  licensePolicy: bundledPolicy(),
});

/** A minimal research note — the loosest kind that carries a license. */
const noteWithLicense = (license: string) => ({
  type: "research",
  tags: ["target/galaxy"],
  status: "draft",
  created: "2026-04-30",
  revised: "2026-04-30",
  revision: 1,
  ai_generated: false,
  summary: "A short summary that meets the minimum length requirement.",
  license,
});

describe("the frontmatter contract's license grammar", () => {
  it("accepts every id the shipped table names", () => {
    // No separate hand-written enum to keep in lockstep: the grammar asks the table.
    // A row added upstream becomes authorable here the moment the dependency is bumped.
    for (const id of licenseIds(bundledPolicy())) {
      expect(schema.safeParse(noteWithLicense(id)).success, id).toBe(true);
    }
  });

  it("accepts the LicenseRef escape hatch for ids outside the curated set", () => {
    expect(schema.safeParse(noteWithLicense("LicenseRef-example-thing")).success).toBe(true);
  });

  it("rejects an id the table does not name", () => {
    expect(schema.safeParse(noteWithLicense("Not-A-Real-License")).success).toBe(false);
  });
});
