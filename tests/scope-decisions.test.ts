// Checks the interface Mold's sarek scope fixture: record shape always, citations against a live summary.

import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import yaml from "js-yaml";
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

interface Control {
  control: string;
  value: string | boolean;
  from: string;
}
interface ScopeDecision {
  id: string;
  decided_by: string;
  scope: { candidate?: string; controls: Control[] };
  decision: string;
  rationale: string;
}
interface ScopeDrop {
  id: string;
  status: string;
  kind: string;
  raised_by: string;
  scope_branch: { decision: string; selected_by: Control[] };
  units: string;
  because: string;
  step?: unknown;
  source_arg?: unknown;
}
interface Ledger {
  decisions: (ScopeDecision | Record<string, unknown>)[];
  entries: (ScopeDrop | Record<string, unknown>)[];
}
interface Summary {
  params: { name: string; type?: string; default?: unknown; enum?: unknown[] }[];
  profiles: { name: string }[];
  processes: { name: string; aliases?: string[] }[];
  subworkflows: { name: string; calls?: string[] }[];
  test_candidates: { id: string; params_delta?: Record<string, unknown> }[];
  workflow: { conditionals: { guard: string; affects: string[] }[] };
}

function readLedger(): Ledger {
  return yaml.load(readFileSync(ledgerPath, "utf-8")) as Ledger;
}

function scopeRecords(ledger: Ledger): { scope: ScopeDecision; drops: ScopeDrop[] } {
  const scopes = ledger.decisions.filter((d) => "scope" in d) as ScopeDecision[];
  expect(scopes).toHaveLength(1);
  const drops = ledger.entries.filter((e) => "scope_branch" in e) as ScopeDrop[];
  return { scope: scopes[0]!, drops };
}

// Resolves a `from` citation (`<array>[<key>]` plus an optional field) and checks it backs the value.
function checkCitation(summary: Summary, { control, value, from }: Control): void {
  const match =
    /^(params|profiles|test_candidates|workflow\.conditionals)\[([^\]]+)\](?:\.(\w+))?$/.exec(from);
  expect(match, `unparseable from: ${from}`).not.toBeNull();
  const [, array, key, field] = match!;
  const param = control.startsWith("params.") ? control.slice("params.".length) : undefined;
  if (array === "params") {
    const entry = summary.params.find((p) => p.name === key);
    expect(entry, from).toBeDefined();
    expect(key).toBe(param);
    if (field === "enum") expect(entry!.enum, from).toContain(value);
    else if (field === "default") expect(entry!.default, from).toBe(value);
    else {
      expect(field, from).toBeUndefined();
      expect([entry!.type, value], from).toEqual(["boolean", true]);
    }
  } else if (array === "profiles") {
    expect(control).toBe("profile");
    expect(key).toBe(value);
    expect(summary.profiles.map((p) => p.name)).toContain(key);
  } else if (array === "test_candidates") {
    const candidate = summary.test_candidates.find((c) => c.id === key);
    expect(candidate, from).toBeDefined();
    if (field === "params_delta") expect(candidate!.params_delta?.[param!], from).toBe(value);
    else {
      expect(field, from).toBeUndefined();
      expect(key, from).toContain(String(value));
    }
  } else {
    const conditional = summary.workflow.conditionals.find((c) => c.affects.includes(key!));
    expect(conditional, from).toBeDefined();
    expect(conditional!.guard).toContain(param!);
    expect(conditional!.guard).toContain(String(value));
  }
}

describe("sarek scope ledger fixture", () => {
  it("records one scope decision and an open scope drop per excluded branch", () => {
    const { scope, drops } = scopeRecords(readLedger());
    expect(scope.decided_by).toBe("nextflow-summary-to-galaxy-interface");
    expect(scope.scope.controls.length).toBeGreaterThan(0);
    expect(drops.length).toBeGreaterThan(1);
    for (const drop of drops) {
      expect(drop, drop.id).toMatchObject({
        status: "open",
        kind: "dropped",
        raised_by: "nextflow-summary-to-galaxy-interface",
        scope_branch: { decision: scope.id },
      });
      expect(drop.scope_branch.selected_by.length, drop.id).toBeGreaterThan(0);
      expect(drop.units.trim(), drop.id).not.toBe("");
      expect(drop.because, drop.id).toContain(scope.id);
      expect(drop.step, drop.id).toBeUndefined();
      expect(drop.source_arg, drop.id).toBeUndefined();
    }
  });

  itIfSarek("cites only controls, candidates and units the sarek summary holds", async () => {
    const summary = (await buildSummary(sarek!, {
      withNextflow: false,
      fetchTestData: false,
      validate: false,
    })) as Summary;
    const { scope, drops } = scopeRecords(readLedger());

    if (scope.scope.candidate)
      expect(summary.test_candidates.map((c) => c.id)).toContain(scope.scope.candidate);
    for (const control of scope.scope.controls) checkCitation(summary, control);

    const units = new Set([
      ...summary.subworkflows.flatMap((s) => [s.name, ...(s.calls ?? [])]),
      ...summary.processes.flatMap((p) => [p.name, ...(p.aliases ?? [])]),
    ]);
    for (const drop of drops) {
      for (const control of drop.scope_branch.selected_by) checkCitation(summary, control);
      for (const [, name] of drop.units.matchAll(/`([A-Z][A-Z0-9_]+)`/g))
        expect(units, `${drop.id}: ${name}`).toContain(name);
    }
  });
});
