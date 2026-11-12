import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import { checkScopeRecords, citationProblems, type ScopeSummary } from "../src/scope-records.js";

const summary: ScopeSummary = {
  params: [
    { name: "step", type: "string", default: "mapping", enum: ["mapping", "variant_calling"] },
    { name: "aligner", type: "string", default: "bwa-mem", enum: ["bwa-mem", "dragmap"] },
    { name: "tools", type: "string", default: null },
    { name: "skip_qc", type: "boolean", default: false },
  ],
  profiles: [{ name: "test" }, { name: "mutect" }],
  processes: [{ name: "STRELKA_GERMLINE" }, { name: "DRAGMAP_ALIGN", aliases: ["DRAGMAP"] }],
  subworkflows: [{ name: "BAM_VARIANT_CALLING_SOMATIC_ALL", calls: ["MUTECT2"] }],
  test_candidates: [
    { id: "tests/default.nf.test::dynamically-generated", params_delta: { tools: "strelka" } },
    { id: "tests/variant_calling_mutect2.nf.test::dynamically-generated" },
  ],
  workflow: {
    conditionals: [
      { guard: "params.tools && params.tools.contains('cnvkit')", affects: ["CNVKIT"] },
    ],
  },
};

const scope = {
  id: "scope-germline-strelka",
  decided_by: "nextflow-summary-to-galaxy-interface",
  scope: {
    candidate: "tests/default.nf.test::dynamically-generated",
    controls: [
      { control: "params.step", value: "mapping", from: "params[step].default" },
      {
        control: "params.tools",
        value: "strelka",
        from: "test_candidates[tests/default.nf.test::dynamically-generated].params_delta",
      },
    ],
  },
  decision: "Germline calling with Strelka.",
};
const somatic = {
  id: "scope-somatic-calling",
  status: "open",
  kind: "dropped",
  raised_by: "nextflow-summary-to-galaxy-interface",
  scope_branch: {
    decision: "scope-germline-strelka",
    selected_by: [
      {
        control: "params.tools",
        value: "mutect2",
        from: "test_candidates[tests/variant_calling_mutect2.nf.test::dynamically-generated]",
      },
      { control: "profile", value: "mutect", from: "profiles[mutect]" },
    ],
  },
  units: "`BAM_VARIANT_CALLING_SOMATIC_ALL` and `MUTECT2`",
  because: "outside the selected scope `scope-germline-strelka`",
};
const ledger = { decisions: [scope], entries: [somatic] };

describe("checkScopeRecords", () => {
  it("accepts well-formed scope records with resolving citations", () => {
    const check = checkScopeRecords(ledger, summary);
    expect(check).toMatchObject({
      ok: true,
      decision: { id: "scope-germline-strelka", candidate: scope.scope.candidate },
      drops: [
        {
          id: "scope-somatic-calling",
          decision: "scope-germline-strelka",
          unit_names: ["BAM_VARIANT_CALLING_SOMATIC_ALL", "MUTECT2"],
        },
      ],
    });
  });

  it("passes a ledger with no scope records, and ignores plain drops in it", () => {
    const capped = { id: "steps-past-cap", status: "open", kind: "dropped", because: "cap" };
    expect(checkScopeRecords({ decisions: [], entries: [capped] }, summary)).toEqual({
      ok: true,
      decision: null,
      drops: [],
      problems: [],
    });
  });

  it("reports drop shape problems without a summary", () => {
    const bad = {
      ...somatic,
      status: "resolved",
      step: "somatic",
      source_arg: { step: "x", arg: "y" },
      units: "somatic callers",
      because: "not in scope",
      scope_branch: { decision: "other-scope", selected_by: [scope.scope.controls[0]] },
    };
    const problems = checkScopeRecords({ decisions: [scope], entries: [bad] }).problems.map(
      (p) => p.problem,
    );
    expect(problems).toEqual([
      "status is not open",
      "scope_branch.decision is not scope-germline-strelka",
      "selected_by repeats the fixed control params.step=mapping",
      "units names no backticked summary subworkflow or process",
      "because does not name the scope decision",
      "a scope drop has no top-level step",
      "a scope drop has no source_arg",
    ]);
  });

  it("reports a missing, duplicated or malformed scope decision", () => {
    expect(checkScopeRecords({ entries: [somatic] }).problems).toContainEqual({
      record: "(ledger)",
      problem: "scope drops with no scope decision",
    });
    const second = { ...scope, id: "scope-two" };
    expect(checkScopeRecords({ decisions: [scope, second] }).problems[0]?.problem).toBe(
      "more than one scope decision",
    );
    const malformed = { ...scope, decided_by: "someone", scope: { controls: [{ control: "x" }] } };
    expect(checkScopeRecords({ decisions: [malformed] }).problems.map((p) => p.problem)).toEqual([
      "decided_by is not nextflow-summary-to-galaxy-interface",
      "scope.controls is not a non-empty control list",
    ]);
  });

  it("reports units and candidates the summary lacks", () => {
    const fake = { ...somatic, units: "`NOT_A_UNIT`" };
    const unknownCandidate = { ...scope, scope: { ...scope.scope, candidate: "tests/x.nf.test" } };
    const problems = checkScopeRecords(
      { decisions: [unknownCandidate], entries: [fake] },
      summary,
    ).problems;
    expect(problems).toEqual([
      {
        record: "scope-germline-strelka",
        problem: "candidate tests/x.nf.test is not a summary test candidate",
      },
      { record: "scope-somatic-calling", problem: "unit NOT_A_UNIT is not in the summary" },
    ]);
  });
});

describe("citationProblems", () => {
  const cite = (control: string, value: unknown, from: string) =>
    citationProblems(summary, { control, value, from });

  it("resolves each citation form", () => {
    expect(cite("params.aligner", "dragmap", "params[aligner].enum")).toEqual([]);
    expect(cite("params.skip_qc", true, "params[skip_qc]")).toEqual([]);
    expect(cite("profile", "mutect", "profiles[mutect]")).toEqual([]);
    expect(cite("params.tools", "cnvkit", "workflow.conditionals[CNVKIT]")).toEqual([]);
  });

  it("rejects citations that do not back the value", () => {
    expect(cite("params.aligner", "bowtie2", "params[aligner].enum")).toEqual([
      "params[aligner].enum: bowtie2 is not in the param's enum",
    ]);
    expect(cite("params.aligner", "dragmap", "params[aligner].default")).toEqual([
      "params[aligner].default: dragmap is not the param's default",
    ]);
    expect(cite("params.step", "mapping", "params[aligner].default")).toEqual([
      "params[aligner].default: cites params[aligner] for control params.step",
      "params[aligner].default: mapping is not the param's default",
    ]);
    expect(cite("params.aligner", "bwa-mem", "params[aligner]")).toEqual([
      "params[aligner]: a bare params citation backs only a boolean set true",
    ]);
    expect(cite("profile", "test", "profiles[mutect]")).toEqual([
      "profiles[mutect]: profile mutect is not the value test",
    ]);
    expect(
      cite(
        "params.tools",
        "mutect2",
        "test_candidates[tests/default.nf.test::dynamically-generated].params_delta",
      ),
    ).toEqual([
      "test_candidates[tests/default.nf.test::dynamically-generated].params_delta: the candidate's params_delta.tools is not mutect2",
    ]);
    expect(
      cite(
        "params.tools",
        "lofreq",
        "test_candidates[tests/variant_calling_mutect2.nf.test::dynamically-generated]",
      ),
    ).toEqual([
      "test_candidates[tests/variant_calling_mutect2.nf.test::dynamically-generated]: the candidate's file stem variant_calling_mutect2 does not name lofreq",
    ]);
    expect(cite("params.tools", "ascat", "workflow.conditionals[CNVKIT]")).toEqual([
      "workflow.conditionals[CNVKIT]: the guard does not test ascat",
    ]);
    expect(cite("params.tools", "x", "nextflow_schema[tools]")).toEqual([
      "unparseable from: nextflow_schema[tools]",
    ]);
  });
});

describe("foundry check-scope-records", () => {
  const run = (args: string[]) =>
    spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        resolve(__dirname, "../src/bin/foundry.ts"),
        "check-scope-records",
        ...args,
      ],
      { encoding: "utf8" },
    );

  it("exits 0 when clean, 4 on problems, 3 on bad input and 1 on a missing file", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "scope-records-"));
    const ledgerPath = resolve(dir, "ledger.yml");
    const summaryPath = resolve(dir, "summary.json");
    try {
      writeFileSync(summaryPath, JSON.stringify(summary));
      writeFileSync(ledgerPath, stringify(ledger));
      const green = run([ledgerPath, summaryPath, "--json"]);
      expect(green.status).toBe(0);
      expect(JSON.parse(green.stdout)).toEqual(checkScopeRecords(ledger, summary));

      const fake = { ...ledger, entries: [{ ...somatic, units: "`NOT_A_UNIT`" }] };
      writeFileSync(ledgerPath, stringify(fake));
      expect(run([ledgerPath]).status).toBe(0);
      const red = run([ledgerPath, summaryPath]);
      expect(red.status).toBe(4);
      expect(red.stderr).toContain("scope-somatic-calling: unit NOT_A_UNIT is not in the summary");

      writeFileSync(ledgerPath, stringify({ decisions: { not: "a list" } }));
      expect(run([ledgerPath]).status).toBe(3);
      expect(run([resolve(dir, "missing.yml")]).status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
