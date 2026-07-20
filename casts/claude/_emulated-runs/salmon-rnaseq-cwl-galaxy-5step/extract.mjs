import fs from "fs";

const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const ENTRY = "workflow-fixtures/cwl/hubmapconsortium__salmon-rnaseq/pipeline.cwl";
const NORM = "normalized/pipeline.packed.json";

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
    scatter: s.scatter ? (Array.isArray(s.scatter) ? s.scatter.map((x) => strip(x).split("/").pop()) : [strip(s.scatter).split("/").pop()]) : [],
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
  hints: [{ class: "_NestedWorkflow", docker_pull: null, docker_image_id: null, packages: [], raw: { steps: (sw.steps || []).map((s) => ({ id: strip(s.id), run: strip(s.run), scatter: s.scatter || null })) } }],
}));

const nodes = [];
const edges = [];
for (const i of workflow_inputs) nodes.push({ id: i.id, kind: "workflow-input", label: i.label });
for (const o of workflow_outputs) nodes.push({ id: o.id, kind: "workflow-output", label: o.label });
for (const s of steps) nodes.push({ id: s.id, kind: "step", label: s.id });

for (const s of steps) {
  for (const sin of s.in) {
    for (const src of sin.source) {
      const via = [];
      if (sin.value_from) via.push("valueFrom");
      if (s.scatter.includes(sin.id.split("/").pop())) via.push("scatter");
      edges.push({ from: src, to: `${s.id}/${sin.id.split("/").pop()}`, via });
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
    workflow: "salmon-rnaseq",
    url: "https://github.com/hubmapconsortium/salmon-rnaseq/blob/2f77bcfe9d6eaccce04359ed110995de65d03422/pipeline.cwl",
    version: "2f77bcfe9d6eaccce04359ed110995de65d03422",
    license: null,
    slug: "hubmap-salmon-rnaseq",
    cwl_version: "v1.2",
    entrypoint: "pipeline.cwl",
  },
  documents: {
    entrypoint: ENTRY,
    normalized_path: NORM,
    validation: {
      command: "cwltool --validate pipeline.cwl",
      status: "valid",
      diagnostics: [],
    },
  },
  workflow_inputs,
  workflow_outputs,
  steps,
  tools: [...cmdTools, ...subWorkflows],
  graph: { nodes, edges },
  tests: [],
  warnings: [
    { code: "ref.directory", message: "fastq_dir, img_dir, metadata_dir are CWL Directory or Directory[] inputs; Galaxy needs a collection or wrapper-side directory handling strategy.", path: "workflow_inputs" },
    { code: "scatter", message: "fastqc step scatters over fastq_dir (dotproduct) — Galaxy will need a per-element collection mapping or an in-tool loop.", path: "steps/fastqc" },
    { code: "nested.workflow", message: "salmon_quantification calls a nested Workflow (#salmon-quantification.cwl, 9 inner steps including its own scatter over fastq_dir); downstream Galaxy may flatten or wrap.", path: "steps/salmon_quantification" },
    { code: "optional.outputs", message: "Several outputs are File? (spatial_plot, scvelo_*, squidpy_*); downstream Galaxy template must allow conditional/optional outputs.", path: "workflow_outputs" },
    { code: "tests.missing", message: "No CWL job file or sibling test inputs discoverable in repo at root; tests=[] emitted.", path: "tests" },
  ],
};

fs.writeFileSync(process.argv[3], JSON.stringify(summary, null, 2));
console.log("wrote", process.argv[3], "size", fs.statSync(process.argv[3]).size);
