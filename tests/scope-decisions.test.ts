// Checks the interface Mold's sarek scope fixture: record shape always, citations against a live summary.

import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import yaml from "js-yaml";
import { checkScopeRecords, type ScopeSummary } from "@galaxy-foundry/gxwf-foundry";
import { buildSummary } from "@galaxy-foundry/summarize-nextflow";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ledgerPath = path.join(
  repoRoot,
  "content/molds/nextflow-summary-to-galaxy-interface/examples/sarek-germline-scope/open-requirements.ledger.yml",
);
const sarek = [
  path.join(repoRoot, "workflow-fixtures/pipelines/nf-core__sarek"),
  path.join(os.homedir(), "projects/repositories/workflow-fixtures/pipelines/nf-core__sarek"),
].find((dir) => existsSync(dir));
const itIfSarek = sarek ? it : it.skip;
// Drop families the interface Mold's sarek scenario requires.
const SCENARIO_DROPS = [
  "scope-somatic-calling",
  "scope-tumor-only-calling",
  "scope-other-germline-callers",
  "scope-alternative-aligners",
  "scope-later-start-steps",
  "scope-annotation",
];

const readLedger = (): unknown => yaml.load(readFileSync(ledgerPath, "utf-8"));

describe("sarek scope ledger fixture", () => {
  it("records one scope decision and an open scope drop per excluded branch", () => {
    const check = checkScopeRecords(readLedger());
    expect(check.problems).toEqual([]);
    expect(check.decision?.controls.length).toBeGreaterThan(0);
    expect(check.drops.map((d) => d.id)).toEqual(expect.arrayContaining(SCENARIO_DROPS));
  });

  itIfSarek("cites only controls, candidates and units the sarek summary holds", async () => {
    const summary = (await buildSummary(sarek!, {
      withNextflow: false,
      fetchTestData: false,
      validate: false,
    })) as ScopeSummary;
    expect(checkScopeRecords(readLedger(), summary).problems).toEqual([]);
  });
});
