import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import { checkStepRemovals, StepRemovalInputError } from "../src/step-removals.js";

// `gxwf diff --json` output, galaxy-tool-util-ts PR #233 at 3fd23149, on its synthetic-diff fixtures.
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(resolve(__dirname, "fixtures/step-removals", name), "utf8"));
const draftToFinal = fixture("draft-before-to-after.diff.json");
const removedLeaf = fixture("removed-leaf-step.diff.json");
const changedStep = fixture("changed-step.diff.json");

const chrDropped = {
  id: "chr-filter-dropped",
  status: "open",
  kind: "dropped",
  raised_by: "debug-galaxy-workflow-output",
  step: "chr_filter",
  units: "chromosome filter (SAMTOOLS_VIEW --chr)",
  because: "planemo-test.log.attempt9: samtools view rejected the region list",
};

describe("checkStepRemovals", () => {
  it("reports a removed step with no ledger entry, and the unwired input it left", () => {
    expect(checkStepRemovals(draftToFinal, { entries: [] })).toEqual({
      ok: false,
      removed_steps: [
        { step: "chr_filter", label: "keep only requested chromosomes", dropped_entries: [] },
      ],
      unlabelled: ["chr_filter"],
      unwired_inputs: ["chr"],
    });
  });

  it("accepts a removed step named by a kind: dropped entry's top-level step", () => {
    const result = checkStepRemovals(draftToFinal, { entries: [chrDropped] });
    expect(result.ok).toBe(true);
    expect(result.unlabelled).toEqual([]);
    expect(result.removed_steps[0].dropped_entries).toEqual(["chr-filter-dropped"]);
    expect(result.unwired_inputs).toEqual(["chr"]);
  });

  it("matches the removed step's label as well as its key", () => {
    const byLabel = { ...chrDropped, step: "keep only requested chromosomes" };
    expect(checkStepRemovals(draftToFinal, { entries: [byLabel] }).ok).toBe(true);
  });

  it("ignores flag records, which carry source_arg, even when they set step", () => {
    const flagRecord = {
      ...chrDropped,
      source_arg: { step: "chr_filter", arg: "conf/modules.config#withName:SAMTOOLS_VIEW/args" },
    };
    expect(checkStepRemovals(draftToFinal, { entries: [flagRecord] }).unlabelled).toEqual([
      "chr_filter",
    ]);
  });

  it("does not count a gap, a dropped entry without step, or one naming another step", () => {
    const { kind: _kind, ...gap } = chrDropped;
    const { step: _step, ...noStep } = chrDropped;
    const otherStep = { ...chrDropped, step: "to_fastq" };
    const result = checkStepRemovals(draftToFinal, {
      entries: [gap, { ...gap, kind: "gap" }, noStep, otherStep],
    });
    expect(result.ok).toBe(false);
    expect(result.unlabelled).toEqual(["chr_filter"]);
  });

  it("only reads obligation entries, not decisions", () => {
    expect(checkStepRemovals(draftToFinal, { decisions: [chrDropped] }).ok).toBe(false);
  });

  it("checks a concrete-to-concrete diff the same way", () => {
    expect(checkStepRemovals(removedLeaf, {}).unlabelled).toEqual(["filter"]);
    const dropped = { ...chrDropped, id: "filter-dropped", step: "filter" };
    expect(checkStepRemovals(removedLeaf, { entries: [dropped] }).ok).toBe(true);
  });

  it("passes a diff that removes no step, with an empty or absent ledger", () => {
    const clear = { ok: true, removed_steps: [], unlabelled: [], unwired_inputs: [] };
    expect(checkStepRemovals(changedStep, null)).toEqual(clear);
    expect(checkStepRemovals(changedStep, { entries: [chrDropped] })).toEqual(clear);
  });

  it("rejects input that is not a gxwf diff or a ledger", () => {
    expect(() => checkStepRemovals({ steps: {} }, {})).toThrow(StepRemovalInputError);
    expect(() => checkStepRemovals(draftToFinal, { entries: {} })).toThrow(StepRemovalInputError);
    expect(() => checkStepRemovals(draftToFinal, ["not", "a", "ledger"])).toThrow(
      StepRemovalInputError,
    );
  });
});

describe("foundry check-step-removals", () => {
  const run = (args: string[], input?: string) =>
    spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        resolve(__dirname, "../src/bin/foundry.ts"),
        "check-step-removals",
        ...args,
      ],
      { encoding: "utf8", input },
    );
  const diffPath = resolve(__dirname, "fixtures/step-removals/draft-before-to-after.diff.json");

  it("exits 0 when labelled, 4 when not, 3 on bad input and 1 on a missing file", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "step-removals-"));
    const ledger = resolve(dir, "open-requirements.ledger.yml");
    try {
      writeFileSync(ledger, stringify({ entries: [] }));
      const red = run([diffPath, ledger, "--json"]);
      expect(red.status).toBe(4);
      expect(JSON.parse(red.stdout)).toEqual(checkStepRemovals(draftToFinal, { entries: [] }));
      expect(run([diffPath, ledger]).stderr).toContain("chr_filter");

      writeFileSync(ledger, stringify({ entries: [chrDropped] }));
      const green = run([diffPath, ledger]);
      expect(green.status).toBe(0);
      expect(green.stdout).toContain("chr");

      const piped = run(["-", ledger, "--json"], readFileSync(diffPath, "utf8"));
      expect(piped.status).toBe(0);
      expect(JSON.parse(piped.stdout).ok).toBe(true);

      writeFileSync(ledger, stringify({ entries: { not: "a list" } }));
      expect(run([diffPath, ledger]).status).toBe(3);
      expect(run([resolve(dir, "missing.json"), ledger]).status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
