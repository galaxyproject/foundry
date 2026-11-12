// Pins the `_plan_state` transport the galaxy template Mold documents for `effective_args`.

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateDraft } from "@galaxy-tool-util/schema";
import { beforeAll, describe, expect, it } from "vitest";
import yaml from "js-yaml";
import { buildSummary } from "@galaxy-foundry/summarize-nextflow";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateMold = path.join(
  repoRoot,
  "content/molds/nextflow-summary-to-galaxy-template/index.md",
);

const MAP_MAP = "NFCORE_BAMTOFASTQ:BAMTOFASTQ:ALIGNMENT_TO_FASTQ:SAMTOOLS_VIEW_MAP_MAP";
const UNMAP_UNMAP = "NFCORE_BAMTOFASTQ:BAMTOFASTQ:ALIGNMENT_TO_FASTQ:SAMTOOLS_VIEW_UNMAP_UNMAP";

interface Entry {
  id: string;
  expression: string;
  [key: string]: unknown;
}
interface Process {
  name: string;
  resolved_args: Entry[];
  effective_args: { call: string; ids: string[]; tie?: true }[];
}
interface PlanState {
  calls: string[];
  resolved_args: Entry[];
}

// Shaped like nf-core/bamtofastq 8698321; the UNMAP_UNMAP if/else is synthetic, to get a tie.
const FIXTURE: Record<string, string> = {
  "nextflow.config":
    "manifest { name = 'nf-core/bamtofastq' }\nincludeConfig 'conf/modules.config'\n",
  "conf/modules.config": `process {
    withName: 'SAMTOOLS_VIEW' {
        ext.args = '-h'
    }
    withName: 'SAMTOOLS_VIEW_MAP_MAP' {
        ext.args           = '-b -f1 -F12'
        ext.prefix         = { "\${meta.id}.map_map" }
    }
    withName: 'SAMTOOLS_VIEW_UNMAP_UNMAP' {
        ext.args = "-b -f12 -F256"
        if (params.split_unmapped) {
            ext.prefix = { "\${meta.id}.unmap_unmap" }
        } else {
            ext.prefix = { "\${meta.id}.unmapped" }
        }
    }
}
`,
  "modules/nf-core/samtools/view/main.nf":
    "process SAMTOOLS_VIEW {\n  script:\n  'samtools view'\n}\n",
  "subworkflows/local/alignment_to_fastq.nf": `include { SAMTOOLS_VIEW as SAMTOOLS_VIEW_MAP_MAP } from '../../modules/nf-core/samtools/view/main'
include { SAMTOOLS_VIEW as SAMTOOLS_VIEW_UNMAP_UNMAP } from '../../modules/nf-core/samtools/view/main'
workflow ALIGNMENT_TO_FASTQ { SAMTOOLS_VIEW_MAP_MAP(); SAMTOOLS_VIEW_UNMAP_UNMAP() }
`,
  "workflows/bamtofastq.nf": `include { ALIGNMENT_TO_FASTQ } from '../subworkflows/local/alignment_to_fastq'
workflow BAMTOFASTQ { ALIGNMENT_TO_FASTQ() }
`,
  "main.nf": `include { BAMTOFASTQ } from './workflows/bamtofastq'
workflow NFCORE_BAMTOFASTQ { BAMTOFASTQ() }
workflow { NFCORE_BAMTOFASTQ() }
`,
};

let view: Process;

beforeAll(async () => {
  const root = mkdtempSync(path.join(tmpdir(), "plan-state-transport-"));
  for (const [rel, content] of Object.entries(FIXTURE)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), content);
  }
  const summary = (await buildSummary(root, {
    withNextflow: false,
    fetchTestData: false,
    validate: true,
  })) as { processes: Process[] };
  view = summary.processes.find((process) => process.name === "SAMTOOLS_VIEW")!;
});

// The template's copy rule: entries the calls' rows name, each id once, tie rows marked.
function effectiveEntries(process: Process, calls: string[]): Entry[] {
  const byId = new Map(process.resolved_args.map((entry) => [entry.id, entry]));
  const out = new Map<string, Entry>();
  for (const row of process.effective_args.filter((r) => calls.includes(r.call))) {
    for (const id of row.ids)
      out.set(id, row.tie ? { ...byId.get(id)!, tie: true } : byId.get(id)!);
  }
  return [...out.values()];
}

function planState(calls: string[], entries: Entry[], intent: string): string {
  return [
    `calls: ${JSON.stringify(calls)}`,
    "resolved_args:",
    ...entries.map((entry) => `  - ${JSON.stringify(entry)}`),
    "intent: |",
    `  ${intent}`,
    "",
  ].join("\n");
}

function oneStepDraft(plan: unknown): Record<string, unknown> {
  return {
    class: "GalaxyWorkflowDraft",
    inputs: { reads: { type: "data" } },
    outputs: {},
    steps: {
      view: {
        tool_id: "TODO",
        in: { TODO_input: { source: "reads" } },
        out: [{ id: "TODO_output" }],
        _plan_state: plan,
      },
    },
  };
}

function templateExample(): string {
  const markdown = readFileSync(templateMold, "utf-8");
  const block = [...markdown.matchAll(/```yaml\n([\s\S]*?)```/g)]
    .map((match) => match[1]!)
    .find((body) => body.startsWith("_plan_state: |"));
  return (yaml.load(block!) as { _plan_state: string })._plan_state;
}

describe("_plan_state transport for effective_args", () => {
  it("round-trips the copied entries through a draft that validates", () => {
    for (const call of [MAP_MAP, UNMAP_UNMAP]) {
      const entries = effectiveEntries(view, [call]);
      const text = yaml.dump(oneStepDraft(planState([call], entries, "Filter reads.")));
      const draft = yaml.load(text) as { steps: { view: { _plan_state: string } } };

      expect(validateDraft(draft).ok).toBe(true);
      const inner = yaml.load(draft.steps.view._plan_state) as PlanState;
      expect(inner.calls).toEqual([call]);
      expect(inner.resolved_args).toEqual(entries);
    }
  });

  it("marks both branch assignments of a tied key", () => {
    const tied = effectiveEntries(view, [UNMAP_UNMAP]).filter((entry) => entry.tie);
    expect(tied.map((entry) => entry.expression)).toEqual([
      '{ "${meta.id}.unmap_unmap" }',
      '{ "${meta.id}.unmapped" }',
    ]);
  });

  it("rejects the same document as a mapping", () => {
    const call = MAP_MAP;
    const mapping = yaml.load(planState([call], effectiveEntries(view, [call]), "Filter reads."));
    const result = validateDraft(oneStepDraft(mapping));
    expect(result.ok).toBe(false);
    expect(result.structureErrors.length).toBeGreaterThan(0);
  });

  it("loses every expression written as plain YAML", () => {
    for (const { expression } of view.resolved_args) {
      expect((yaml.load(`v: ${expression}`) as { v: unknown }).v).not.toEqual(expression);
    }
  });

  it("keeps the template Mold's example equal to resolver output", () => {
    const example = templateExample();
    expect(validateDraft(oneStepDraft(example)).ok).toBe(true);
    const inner = yaml.load(example) as PlanState;
    expect(inner.calls).toEqual([MAP_MAP]);
    expect(inner.resolved_args).toEqual(effectiveEntries(view, [MAP_MAP]));
  });
});
