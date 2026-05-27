import fs from "fs";

const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const ENTRY = "workflow-fixtures/cwl/Barski-Lab__ga4gh_challenge/biowardrobe_chipseq_se.cwl";
const NORM = "normalized/biowardrobe_chipseq_se.packed.json";

const strip = (s) => typeof s === "string" ? s.replace(/^#main\//, "").replace(/^#/, "") : s;
const sfList = (sf) => (Array.isArray(sf) ? sf : (sf ? [sf] : [])).map((x) => typeof x === "string" ? x : (x.pattern || JSON.stringify(x)));

const main = data.$graph.find((g) => g.id === "#main");
const tools = data.$graph.filter((g) => g.class === "CommandLineTool");
const subs = data.$graph.filter((g) => g.class === "Workflow" && g.id !== "#main");

const reqsOf = (item) => {
  const all = (item.requirements || []).concat(item.hints || []);
  return all.map((r) => {
    const docker = r.class === "DockerRequirement" ? (r.dockerPull || null) : null;
    return {
      class: r.class || "Unknown",
      docker_pull: docker,
      docker_image_id: r.dockerImageId || null,
      packages: r.class === "SoftwareRequirement" ? (r.packages || []).map((p) => ({ package: p.package, version: p.version || [], specs: p.specs || [] })) : [],
      raw: r,
    };
  });
};

const typeStr = (t) => {
  if (typeof t === "string") return t;
  if (Array.isArray(t)) return t.map(typeStr).join(" | ");
  if (t && typeof t === "object") return t.type || JSON.stringify(t);
  return String(t);
};

const isOptional = (t) => Array.isArray(t) && t.includes("null");

const workflow_inputs = main.inputs.map((i) => ({
  id: strip(i.id),
  label: i.label || strip(i.id),
  type: typeStr(i.type),
  optional: isOptional(i.type),
  default: i.default ?? null,
  doc: i.doc || null,
  format: i.format || null,
  secondary_files: sfList(i.secondaryFiles),
}));

const workflow_outputs = main.outputs.map((o) => ({
  id: strip(o.id),
  label: o.label || strip(o.id),
  type: typeStr(o.type),
  output_source: Array.isArray(o.outputSource) ? o.outputSource.map(strip) : [strip(o.outputSource)],
  doc: o.doc || null,
  format: o.format || null,
  secondary_files: sfList(o.secondaryFiles),
}));

const classOfRun = (runId) => {
  const found = data.$graph.find((g) => g.id === runId);
  return found ? found.class : "Unknown";
};

const steps = main.steps.map((s) => {
  const runId = s.run;
  return {
    id: strip(s.id),
    run: strip(runId),
    run_class: classOfRun(runId),
    label: s.label || null,
    doc: s.doc || null,
    in: s.in.map((i) => ({
      id: strip(i.id),
      source: i.source ? (Array.isArray(i.source) ? i.source.map(strip) : [strip(i.source)]) : [],
      default: i.default ?? null,
      value_from: i.valueFrom || null,
      link_merge: i.linkMerge || null,
      pick_value: i.pickValue || null,
    })),
    out: (s.out || []).map((o) => typeof o === "string" ? strip(o).split("/").pop() : strip(o.id).split("/").pop()),
    scatter: s.scatter ? (Array.isArray(s.scatter) ? s.scatter.map(strip) : [strip(s.scatter)]) : [],
    scatter_method: s.scatterMethod || null,
    when: s.when || null,
    requirements: reqsOf(s),
    hints: [],
  };
});

const bindingOf = (b) => b ? ({
  position: b.position ?? null,
  prefix: b.prefix || null,
  glob: null,
  value_from: b.valueFrom || null,
}) : null;

const outBindingOf = (b) => b ? ({
  position: null,
  prefix: null,
  glob: Array.isArray(b.glob) ? b.glob.join(",") : (b.glob || null),
  value_from: b.outputEval || null,
}) : null;

const cmdTools = tools.map((t) => ({
  id: strip(t.id),
  label: t.label || null,
  base_command: Array.isArray(t.baseCommand) ? t.baseCommand : (t.baseCommand ? [t.baseCommand] : []),
  arguments: (t.arguments || []).map((a) => typeof a === "string" ? a : JSON.stringify(a)),
  inputs: (t.inputs || []).map((i) => ({
    id: strip(i.id).split("/").pop(),
    type: typeStr(i.type),
    input_binding: bindingOf(i.inputBinding),
    doc: i.doc || null,
    format: i.format || null,
    secondary_files: sfList(i.secondaryFiles),
  })),
  outputs: (t.outputs || []).map((o) => ({
    id: strip(o.id).split("/").pop(),
    type: typeStr(o.type),
    output_binding: outBindingOf(o.outputBinding),
    doc: o.doc || null,
    format: o.format || null,
    secondary_files: sfList(o.secondaryFiles),
  })),
  requirements: reqsOf(t),
  hints: [],
}));

const subWorkflows = subs.map((sw) => ({
  id: strip(sw.id),
  label: sw.label || null,
  base_command: [],
  arguments: [],
  inputs: (sw.inputs || []).map((i) => ({ id: strip(i.id).split("/").pop(), type: typeStr(i.type), input_binding: null, doc: i.doc || null, format: i.format || null, secondary_files: [] })),
  outputs: (sw.outputs || []).map((o) => ({ id: strip(o.id).split("/").pop(), type: typeStr(o.type), output_binding: null, doc: o.doc || null, format: o.format || null, secondary_files: [] })),
  requirements: reqsOf(sw),
  hints: [{ class: "_NestedWorkflow", docker_pull: null, docker_image_id: null, packages: [], raw: { steps: sw.steps.map((s) => ({ id: strip(s.id), run: strip(s.run) })) } }],
}));

const nodes = [];
const edges = [];
for (const i of workflow_inputs) nodes.push({ id: i.id, kind: "workflow-input", label: i.label });
for (const o of workflow_outputs) nodes.push({ id: o.id, kind: "workflow-output", label: o.label });
for (const s of steps) nodes.push({ id: s.id, kind: "step", label: s.id });

for (const s of steps) {
  for (const sin of s.in) {
    for (const src of sin.source) {
      edges.push({ from: src, to: `${s.id}/${sin.id.split("/").pop()}`, via: sin.value_from ? ["valueFrom"] : [] });
    }
  }
}
for (const o of workflow_outputs) {
  for (const src of o.output_source) edges.push({ from: src, to: o.id, via: [] });
}

const summary = {
  summary_version: "1",
  source: {
    ecosystem: "cwl",
    workflow: "biowardrobe_chipseq_se",
    url: "https://github.com/Barski-Lab/ga4gh_challenge/blob/f28d47bd0911e5e7210c4dc83f75653a1e0297c9/biowardrobe_chipseq_se.cwl",
    version: "f28d47bd0911e5e7210c4dc83f75653a1e0297c9",
    license: null,
    slug: "biowardrobe-chipseq-se",
    cwl_version: "v1.0",
    entrypoint: "biowardrobe_chipseq_se.cwl",
  },
  documents: {
    entrypoint: ENTRY,
    normalized_path: NORM,
    validation: {
      command: "cwltool --validate biowardrobe_chipseq_se.cwl",
      status: "valid",
      diagnostics: [
        "warning biowardrobe_chipseq_se.cwl:341:9 — macs2_callpeak/peak_xls_file (null|File) may be incompatible with downstream sink input_filename (File)",
      ],
    },
  },
  workflow_inputs,
  workflow_outputs,
  steps,
  tools: [...cmdTools, ...subWorkflows],
  graph: { nodes, edges },
  tests: [
    {
      name: "biowardrobe_chipseq_se",
      job_path: "biowardrobe_chipseq_se.yaml",
      expected_outputs: [],
      provenance: "sibling-yaml: biowardrobe_chipseq_se.yaml job file in repo; no asserted expected outputs",
    },
  ],
  warnings: [
    { code: "expression.javascript", message: "InlineJavascriptRequirement is active; expressions are preserved, not executed.", path: "requirements" },
    { code: "ref.directory", message: "indices_folder is a CWL Directory input; downstream Galaxy translation must choose between directory-capable wrappers, explicit files, or collections.", path: "workflow_inputs/indices_folder" },
    { code: "nested.workflow", message: "Nested workflow #bam-bedgraph-bigwig.cwl in step bam_to_bigwig is preserved as a step target; downstream may need expansion.", path: "steps/bam_to_bigwig" },
    { code: "type.compat", message: "macs2_callpeak/peak_xls_file is (null|File) but is fed to a sink expecting File; downstream needs null-handling.", path: "steps/macs2_callpeak" },
  ],
};

fs.writeFileSync(process.argv[3], JSON.stringify(summary, null, 2));
console.log("wrote", process.argv[3], "size", fs.statSync(process.argv[3]).size);
