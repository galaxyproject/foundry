import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { buildSummary } from "@galaxy-foundry/summarize-nextflow";
import { InputShapeError } from "../src/ledger.js";
import { assembleNextflowParity, type NextflowParityInputs } from "../src/nextflow-parity.js";

// A bamtofastq-shaped run: the diff is `gxwf diff --json` (galaxy-tool-util-ts #233 at a5c6cd57)
// of the snapshot against the final workflow, and the summary is built from `pipeline/`.
const dir = resolve(__dirname, "fixtures/nextflow-parity/bamtofastq");
const read = (name: string) => readFileSync(resolve(dir, name), "utf8");
const inputs = (): NextflowParityInputs => ({
  summary: JSON.parse(read("summary-nextflow.json")),
  ledger: YAML.parse(read("open-requirements.ledger.yml")),
  snapshot: YAML.parse(read("galaxy-workflow-draft.snapshot.gxwf.yml")),
  workflow: YAML.parse(read("galaxy-workflow.gxwf.yml")),
  diff: JSON.parse(read("parity-diff.json")),
});
const CALL = "NFCORE_BAMTOFASTQ:BAMTOFASTQ:ALIGNMENT_TO_FASTQ:";
const ARG = "conf/modules.config#withName:";

describe("assembleNextflowParity", () => {
  const parity = assembleNextflowParity(inputs());
  const step = (key: string) => parity.steps.find((s) => s.step === key);
  const row = (call: string, key: string) =>
    parity.source_args.rows.find((r) => r.call === CALL + call && r.key === key);

  it("keeps the committed summary equal to one built from the pipeline", async () => {
    const live = (await buildSummary(resolve(dir, "pipeline"), {
      withNextflow: false,
      fetchTestData: false,
      validate: true,
    })) as { processes: unknown; tools: unknown };
    const committed = inputs().summary as { processes: unknown; tools: unknown };
    expect(live.processes).toEqual(committed.processes);
    expect(live.tools).toEqual(committed.tools);
  });

  it("maps each step to its calls and status", () => {
    expect(
      parity.steps.map((s) => [s.step, s.status, s.plan_state, s.calls_from, s.calls.length]),
    ).toEqual([
      ["chr_filter", "removed", "calls", "plan_state", 1],
      ["view_map_map", "kept", "calls", "plan_state", 1],
      ["view_unmap_unmap", "kept", "calls", "plan_state", 1],
      ["collate", "kept", "calls", "plan_state", 1],
      ["to_fastq", "kept", "none", "records", 1],
      ["summarize", "kept", "text", null, 0],
    ]);
    expect(step("to_fastq")?.calls).toEqual([`${CALL}SAMTOOLS_FASTQ`]);
  });

  it("joins the source tool to the final wrapper", () => {
    expect(step("view_map_map")).toMatchObject({
      tool_id: "toolshed.g2.bx.psu.edu/repos/iuc/samtools_view/samtools_view/1.15.1+galaxy2",
      tool_version: "1.15.1+galaxy2",
      source: [
        {
          call: `${CALL}SAMTOOLS_VIEW_MAP_MAP`,
          process: "SAMTOOLS_VIEW",
          tool: "samtools",
          tool_versions: ["1.17"],
          container: "biocontainers/samtools:1.17--h00cdaf9_0",
          conda: "bioconda::samtools=1.17",
        },
      ],
    });
    expect(step("summarize")?.source).toEqual([]);
  });

  it("joins flag records to effective entries on step and arg", () => {
    expect(row("SAMTOOLS_VIEW_MAP_MAP", "args")).toMatchObject({
      process: "SAMTOOLS_VIEW",
      steps: ["view_map_map"],
      steps_from: "plan_state",
      entries: [
        {
          id: `${ARG}SAMTOOLS_VIEW_MAP_MAP/args`,
          expression: "'-b -f1 -F12'",
          records: [
            {
              id: "arg-view-map-map-args",
              step: "view_map_map",
              collection: "decisions",
              disposition: "carried",
              flags: ["-b", "-f1", "-F12"],
            },
          ],
        },
      ],
    });
    const tie = row("SAMTOOLS_VIEW_UNMAP_UNMAP", "prefix");
    expect(tie?.tie).toBe(true);
    expect(tie?.entries.map((e) => e.records.map((r) => [r.id, r.disposition]))).toEqual([
      [["arg-view-unmap-unmap-prefix-tie", "gap"]],
      [["arg-view-unmap-unmap-prefix-tie-2", "gap"]],
    ]);
    expect(row("SAMTOOLS_FASTQ", "args")).toMatchObject({
      steps: ["to_fastq"],
      steps_from: "records",
    });
  });

  it("lists overridden entries and stray records", () => {
    expect(parity.source_args.overridden).toEqual([
      { process: "SAMTOOLS_VIEW", id: `${ARG}SAMTOOLS_VIEW/args`, key: "args", expression: "'-h'" },
    ]);
    expect(parity.source_args.stray_records).toEqual([
      {
        id: "arg-view-map-map-header",
        step: "view_map_map",
        arg: `${ARG}SAMTOOLS_VIEW/args`,
        problem: "not-effective",
      },
    ]);
  });

  it("reports every unrecorded difference as a finding", () => {
    expect(parity.findings).toEqual([
      { kind: "step-removed-unrecorded", subject: "chr_filter" },
      { kind: "output-removed-unrecorded", subject: "chr_alignment", detail: "chr_filter" },
      { kind: "input-unwired", subject: "chr" },
      { kind: "input-unwired", subject: "samtools_collate_fast" },
      { kind: "input-unwired", subject: "reads_in_memory" },
      {
        kind: "source-arg-unrecorded",
        subject: "collate",
        detail: `${ARG}SAMTOOLS_COLLATE/args`,
      },
      { kind: "source-arg-stray", subject: "arg-view-map-map-header", detail: "not-effective" },
    ]);
  });

  it("separates design drops from step, flag and scope records", () => {
    expect(parity.other_drops.map((d) => d.id)).toEqual(["multiqc-not-built"]);
    expect(parity.scope).toEqual({ ok: true, decision: null, drops: [], problems: [] });
    expect(parity.outputs.removed).toEqual([
      { output: "chr_alignment", source_step: "chr_filter", dropped_entries: [] },
    ]);
  });

  it("labels a removed step and its output once a drop names the step", () => {
    const withDrop = inputs();
    (withDrop.ledger as { entries: unknown[] }).entries.push({
      id: "chr-filter-dropped",
      status: "open",
      kind: "dropped",
      raised_by: "debug-galaxy-workflow-output",
      step: "chr_filter",
      units: "`SAMTOOLS_CHR`",
      because: "samtools view rejected the region list",
    });
    const result = assembleNextflowParity(withDrop);
    expect(result.steps[0]?.dropped_entries).toEqual(["chr-filter-dropped"]);
    expect(result.outputs.removed[0]?.dropped_entries).toEqual(["chr-filter-dropped"]);
    expect(result.findings.map((f) => f.kind)).not.toContain("step-removed-unrecorded");
    expect(result.findings.map((f) => f.kind)).not.toContain("output-removed-unrecorded");
    expect(result.other_drops.map((d) => d.id)).toEqual(["multiqc-not-built"]);
  });

  it("gives a removed output sourced from an input no source step", () => {
    const fromInput = inputs();
    const diff = fromInput.diff as { outputs: { removed: string[] } };
    diff.outputs.removed.push("chr_echo");
    (fromInput.snapshot as { outputs: Record<string, unknown> }).outputs.chr_echo = {
      outputSource: "chr",
    };
    const result = assembleNextflowParity(fromInput);
    expect(result.outputs.removed[1]).toEqual({
      output: "chr_echo",
      source_step: null,
      dropped_entries: [],
    });
    expect(result.findings).toContainEqual({
      kind: "output-removed-unrecorded",
      subject: "chr_echo",
    });
  });

  it("maps every row of a call to the step one row's records name", () => {
    const template = inputs();
    const steps = (template.snapshot as { steps: Record<string, Record<string, unknown>> }).steps;
    delete steps.view_map_map!._plan_state;
    const ledger = template.ledger as { decisions: { id: string }[] };
    ledger.decisions = ledger.decisions.filter((d) => d.id !== "arg-view-map-map-prefix");
    const result = assembleNextflowParity(template);
    const prefix = result.source_args.rows.find(
      (r) => r.call === `${CALL}SAMTOOLS_VIEW_MAP_MAP` && r.key === "prefix",
    );
    expect(prefix).toMatchObject({ steps: ["view_map_map"], steps_from: "records" });
    expect(result.findings).toContainEqual({
      kind: "source-arg-unrecorded",
      subject: "view_map_map",
      detail: `${ARG}SAMTOOLS_VIEW_MAP_MAP/prefix`,
    });
    expect(result.findings).not.toContainEqual(expect.objectContaining({ kind: "call-unmapped" }));
  });

  it("rejects a snapshot or workflow the diff didn't compare", () => {
    const mismatched = inputs();
    delete (mismatched.workflow as { steps: Record<string, unknown> }).steps.collate;
    expect(() => assembleNextflowParity(mismatched)).toThrow(InputShapeError);
    const extra = inputs();
    (extra.snapshot as { steps: Record<string, unknown> }).steps.extra = { tool_id: "TODO" };
    expect(() => assembleNextflowParity(extra)).toThrow(InputShapeError);
  });

  it("keys inner steps only where gxwf diff recurses: an inline run on both sides", () => {
    const nested = inputs();
    const inline = { class: "GalaxyWorkflow", inputs: {}, outputs: {}, steps: { inner: {} } };
    const snapshot = nested.snapshot as { steps: Record<string, Record<string, unknown>> };
    snapshot.steps.chr_filter!.run = inline;
    snapshot.steps.summarize!.run = inline;
    const final = nested.workflow as { steps: Record<string, Record<string, unknown>> };
    final.steps.summarize!.run = "summarize.gxwf.yml";
    const result = assembleNextflowParity(nested);
    expect(result.steps.map((s) => s.step)).not.toContain("chr_filter/inner");
    expect(result.steps.map((s) => s.step)).not.toContain("summarize/inner");

    final.steps.summarize!.run = inline;
    expect(assembleNextflowParity(nested).steps.map((s) => s.step)).toContain("summarize/inner");
  });

  it("lists a step drop no removed step matches with the other drops", () => {
    const stale = inputs();
    (stale.ledger as { entries: unknown[] }).entries.push({
      id: "collate-dropped",
      status: "open",
      kind: "dropped",
      step: "collate",
      because: "fast mode has no wrapper input",
    });
    expect(assembleNextflowParity(stale).other_drops.map((d) => d.id)).toEqual([
      "multiqc-not-built",
      "collate-dropped",
    ]);
  });

  it("reports a flag record whose source_arg lacks a step or arg", () => {
    const broken = inputs();
    (broken.ledger as { entries: unknown[] }).entries.push({
      id: "arg-collate-args",
      status: "open",
      kind: "dropped",
      source_arg: { step: "collate" },
      units: "`-f -r` from `ext.args`",
      because: "no fast-mode input",
    });
    expect(assembleNextflowParity(broken).findings).toContainEqual({
      kind: "source-arg-malformed",
      subject: "arg-collate-args",
      detail: "source_arg has no string step and arg",
    });
  });

  it("doesn't map a call to a step through an entry id another call shares", () => {
    const shared = inputs();
    const summary = shared.summary as {
      processes: { name: string; effective_args: { call: string; ids: string[] }[] }[];
    };
    const sharedId = "conf/base.config#withLabel:process_single/args";
    for (const p of summary.processes.filter((p) => p.name !== "SAMTOOLS_VIEW"))
      for (const row of p.effective_args) row.ids = [sharedId];
    delete (shared.snapshot as { steps: Record<string, unknown> }).steps.collate;
    delete (shared.workflow as { steps: Record<string, unknown> }).steps.collate;
    const ledger = shared.ledger as { decisions: { id: string; source_arg?: { arg: string } }[] };
    ledger.decisions.find((d) => d.id === "arg-to-fastq-args")!.source_arg!.arg = sharedId;
    expect(assembleNextflowParity(shared).findings).toContainEqual({
      kind: "call-unmapped",
      subject: `${CALL}SAMTOOLS_COLLATE`,
    });
  });

  it("joins a removed output to a drop whose units name it", () => {
    const outputDrop = inputs();
    (outputDrop.ledger as { entries: unknown[] }).entries.push({
      id: "chr-alignment-dropped",
      status: "open",
      kind: "dropped",
      raised_by: "debug-galaxy-workflow-output",
      units: "`chr_alignment` output",
      because: "the filtered BAM is an intermediate",
    });
    const result = assembleNextflowParity(outputDrop);
    expect(result.outputs.removed[0]?.dropped_entries).toEqual(["chr-alignment-dropped"]);
    expect(result.findings.map((f) => f.kind)).not.toContain("output-removed-unrecorded");
    expect(result.findings.map((f) => f.kind)).toContain("step-removed-unrecorded");
  });

  it("doesn't count a flag record with no disposition or reason as recording its entry", () => {
    const unreasoned = inputs();
    (unreasoned.ledger as { entries: unknown[] }).entries.push({
      id: "arg-collate-args",
      status: "open",
      kind: "dropped",
      source_arg: { step: "collate", arg: `${ARG}SAMTOOLS_COLLATE/args`, flags: ["-f", "-r"] },
    });
    const ledger = unreasoned.ledger as { decisions: Record<string, unknown>[] };
    delete ledger.decisions.find((d) => d.id === "arg-view-map-map-args")!.disposition;
    const result = assembleNextflowParity(unreasoned);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        {
          kind: "source-arg-malformed",
          subject: "arg-collate-args",
          detail: "a dropped flag record has no because",
        },
        {
          kind: "source-arg-malformed",
          subject: "arg-view-map-map-args",
          detail: "disposition is not carried or not_applicable",
        },
        {
          kind: "source-arg-unrecorded",
          subject: "collate",
          detail: `${ARG}SAMTOOLS_COLLATE/args`,
        },
        {
          kind: "source-arg-unrecorded",
          subject: "view_map_map",
          detail: `${ARG}SAMTOOLS_VIEW_MAP_MAP/args`,
        },
      ]),
    );
  });

  it("marks a call with no step as covered by a drop naming one of its units", () => {
    const narrowed = inputs();
    // Absent from both sides, as a design that never built the step would be.
    delete (narrowed.snapshot as { steps: Record<string, unknown> }).steps.collate;
    delete (narrowed.workflow as { steps: Record<string, unknown> }).steps.collate;
    (narrowed.ledger as { entries: unknown[] }).entries.push({
      id: "collate-not-designed",
      status: "open",
      kind: "dropped",
      units: "`SAMTOOLS_COLLATE`",
      because: "fast collation has no wrapper input",
    });
    const result = assembleNextflowParity(narrowed);
    const collate = result.source_args.rows.find((r) => r.call === `${CALL}SAMTOOLS_COLLATE`);
    expect(collate).toMatchObject({ steps: [], covered_by: ["collate-not-designed"] });
    expect(result.findings).not.toContainEqual(expect.objectContaining({ kind: "call-unmapped" }));

    (narrowed.ledger as { entries: { id: string }[] }).entries.pop();
    expect(assembleNextflowParity(narrowed).findings).toContainEqual({
      kind: "call-unmapped",
      subject: `${CALL}SAMTOOLS_COLLATE`,
    });
  });
});

describe("foundry nextflow-parity", () => {
  const run = (args: string[]) =>
    spawnSync(
      process.execPath,
      ["--import", "tsx", resolve(__dirname, "../src/bin/foundry.ts"), "nextflow-parity", ...args],
      { encoding: "utf8" },
    );
  const files = [
    ["--summary", "summary-nextflow.json"],
    ["--ledger", "open-requirements.ledger.yml"],
    ["--snapshot", "galaxy-workflow-draft.snapshot.gxwf.yml"],
    ["--workflow", "galaxy-workflow.gxwf.yml"],
    ["--diff", "parity-diff.json"],
  ].flatMap(([flag, name]) => [flag!, resolve(dir, name!)]);

  it("prints the joins, exits 0 with findings, 3 on a bad shape and 1 on a missing file", () => {
    const result = run(files);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(assembleNextflowParity(inputs()));

    const notADiff = files.map((arg) => (arg.endsWith("parity-diff.json") ? files[1]! : arg));
    expect(run(notADiff).status).toBe(3);
    const missing = files.map((arg) => (arg.endsWith("parity-diff.json") ? `${arg}.nope` : arg));
    expect(run(missing).status).toBe(1);
  }, 30_000);
});
