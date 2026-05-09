import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { buildSummary } from "../src/index.js";

interface SummaryLike {
  tools: {
    name: string;
    version: string;
    bioconda: string | null;
    mulled_components?: { name: string; version: string; bioconda: string }[];
  }[];
  processes: {
    name: string;
    module_path: string;
    meta: {
      description?: string;
      keywords: string[];
      authors: string[];
      tools: { name: string; description?: string; homepage?: string; licence?: string[] }[];
      input: { name: string; type?: string; description?: string; pattern?: string }[];
      output: { name: string; type?: string; description?: string; pattern?: string }[];
    } | null;
    module_tests: {
      name: string;
      path: string;
      snapshot: {
        snap_path: string | null;
        parsed_content?: {
          name: string;
          channels: {
            key: string | null;
            files: { path: string; basename: string; md5: string; stub: boolean }[];
            values: unknown[];
          }[];
        }[];
      } | null;
    }[];
    inputs: unknown[];
    outputs: unknown[];
  }[];
  subworkflows: {
    name: string;
    path: string;
    kind: "pipeline" | "utility";
    calls: string[];
    tests: { name: string; path: string }[];
  }[];
  workflow: { name: string };
  warnings: string[];
}

const roots: string[] = [];

afterEach(() => {
  roots.length = 0;
});

describe("resolveNextflowSummary", () => {
  test("discovers multiple processes in a single root-level module file", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'adhoc/callings' }\n");
    write(
      root,
      "modules.nf",
      `process FIRST {
  input:
  path reads
  output:
  path "first.txt", emit: first
  script:
  "first"
}

process SECOND {
  input:
  val sample
  output:
  path "second.txt", emit: second
  script:
  "second"
}
`,
    );
    write(root, "main.nf", "workflow { FIRST(Channel.of('x')); SECOND('sample') }\n");

    const summary = await summarize(root);

    expect(summary.processes.map((process) => process.name)).toEqual(["FIRST", "SECOND"]);
    expect(summary.processes.every((process) => process.module_path === "modules.nf")).toBe(true);
    expect(summary.processes[0]?.inputs).toHaveLength(1);
    expect(summary.processes[1]?.outputs).toHaveLength(1);
  });

  test("discovers flat module files that are not named main.nf", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'adhoc/flat' }\n");
    write(root, "modules/align.nf", "process ALIGN {\n  script:\n  'align'\n}\n");
    write(root, "modules/qc.nf", "process QC {\n  script:\n  'qc'\n}\n");
    write(root, "main.nf", "workflow { ALIGN(); QC() }\n");

    const summary = await summarize(root);

    expect(summary.processes.map((process) => process.name)).toEqual(["ALIGN", "QC"]);
    expect(summary.processes.map((process) => process.module_path)).toEqual([
      "modules/align.nf",
      "modules/qc.nf",
    ]);
  });

  test("discovers inline, workflow, and lib process blocks", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'adhoc/spread' }\n");
    write(root, "main.nf", "process INLINE {\n  script:\n  'inline'\n}\nworkflow { INLINE() }\n");
    write(root, "workflows/assemble.nf", "process ASSEMBLE {\n  script:\n  'assemble'\n}\n");
    write(root, "lib/annotate.nf", "process ANNOTATE {\n  script:\n  'annotate'\n}\n");

    const summary = await summarize(root);

    expect(summary.processes.map((process) => process.name)).toEqual([
      "ANNOTATE",
      "INLINE",
      "ASSEMBLE",
    ]);
    expect(summary.processes.map((process) => process.module_path)).toEqual([
      "lib/annotate.nf",
      "main.nf",
      "workflows/assemble.nf",
    ]);
  });

  test("skips known vendored and generated directories", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'adhoc/vendor-skip' }\n");
    write(root, "main.nf", "process REAL {\n  script:\n  'real'\n}\nworkflow { REAL() }\n");
    write(root, "external-modules/noise.nf", "process VENDORED {\n  script:\n  'vendored'\n}\n");
    write(root, "work/noise.nf", "process WORKDIR {\n  script:\n  'workdir'\n}\n");

    const summary = await summarize(root);

    expect(summary.processes.map((process) => process.name)).toEqual(["REAL"]);
  });

  test("auto-detects a child pipeline root with nextflow.config", async () => {
    const repo = tempPipelineRoot();
    write(repo, "mop_preprocess/nextflow.config", "manifest { name = 'adhoc/mop_preprocess' }\n");
    write(
      repo,
      "mop_preprocess/local_modules.nf",
      "process BASECALL {\n  script:\n  'basecall'\n}\n",
    );
    write(repo, "mop_preprocess/main.nf", "workflow { BASECALL() }\n");

    const summary = await summarize(repo);

    expect(summary.processes.map((process) => process.name)).toEqual(["BASECALL"]);
    expect(summary.warnings).toContain("auto-detected Nextflow pipeline root: mop_preprocess");
  });

  test("surfaces ambiguous child pipeline roots", async () => {
    const repo = tempPipelineRoot();
    write(repo, "mop_mod/nextflow.config", "manifest { name = 'adhoc/mop_mod' }\n");
    write(repo, "mop_mod/main.nf", "workflow { MOD() }\nprocess MOD {\n  script:\n  'mod'\n}\n");
    write(repo, "mop_preprocess/nextflow.config", "manifest { name = 'adhoc/mop_preprocess' }\n");
    write(
      repo,
      "mop_preprocess/main.nf",
      "workflow { PREPROCESS() }\nprocess PREPROCESS {\n  script:\n  'preprocess'\n}\n",
    );

    const summary = await summarize(repo);

    expect(summary.processes.map((process) => process.name)).toEqual(["MOD"]);
    expect(summary.warnings).toContain("multiple Nextflow pipeline roots found; selected mop_mod");
  });

  test("keeps monorepo root when child configs share root-level process files", async () => {
    const repo = tempPipelineRoot();
    write(repo, "local_modules.nf", "process SHARED {\n  script:\n  'shared'\n}\n");
    write(repo, "mop_mod/nextflow.config", "manifest { name = 'adhoc/mop_mod' }\n");
    write(repo, "mop_mod/mop_mod.nf", "workflow { SHARED() }\n");
    write(repo, "mop_preprocess/nextflow.config", "manifest { name = 'adhoc/mop_preprocess' }\n");
    write(repo, "mop_preprocess/mop_preprocess.nf", "workflow { SHARED() }\n");

    const summary = await summarize(repo);

    expect(summary.processes.map((process) => process.name)).toEqual(["SHARED"]);
    expect(summary.processes.map((process) => process.module_path)).toEqual(["local_modules.nf"]);
    expect(summary.warnings).toContain(
      "detected child Nextflow configs but kept repository root because shared process files exist outside child roots",
    );
  });

  test("auto-detects a source directory from a workflow block without config", async () => {
    const repo = tempPipelineRoot();
    write(repo, "nf/phage.nf", "workflow { PHAGE() }\n");
    write(repo, "nf/modules/phage.nf", "process PHAGE {\n  script:\n  'phage'\n}\n");

    const summary = await summarize(repo);

    expect(summary.processes.map((process) => process.name)).toEqual(["PHAGE"]);
    expect(summary.warnings).toContain(
      "auto-detected Nextflow pipeline root from workflow block: nf",
    );
    expect(summary.warnings).toContain("selected Nextflow entrypoint: phage.nf");
  });

  test("prefers shallow anonymous workflow entrypoints over nested named workflows", async () => {
    const repo = tempPipelineRoot();
    write(repo, "nf/ui.nf", "workflow { UI() }\n");
    write(repo, "nf/subworkflows/nested/main.nf", "workflow NESTED { UI() }\n");
    write(repo, "nf/modules/ui.nf", "process UI {\n  script:\n  'ui'\n}\n");

    const summary = await summarize(repo);

    expect(summary.warnings).toContain(
      "auto-detected Nextflow pipeline root from workflow block: nf",
    );
    expect(summary.warnings).toContain("selected Nextflow entrypoint: ui.nf");
  });

  test("captures module meta.yml and module nf-tests on canonical process", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'nf-core/module-meta' }\n");
    write(
      root,
      "main.nf",
      "include { ALIGN } from './modules/nf-core/minimap2/align'\nworkflow MODULE_META { ALIGN() }\n",
    );
    write(
      root,
      "modules/nf-core/minimap2/align/main.nf",
      "process ALIGN {\n  script:\n  'align'\n}\n",
    );
    write(
      root,
      "modules/nf-core/minimap2/align/meta.yml",
      `description: Align reads against a reference
keywords:
  - align
  - reference
authors:
  - "@author"
maintainers:
  - "@maintainer"
tools:
  - minimap2:
      description: Fast sequence aligner
      homepage: https://github.com/lh3/minimap2
      licence:
        - MIT
input:
  - reads:
      type: file
      description: Input reads
      pattern: "*.fastq.gz"
output:
  - bam:
      type: file
      description: Aligned reads
      pattern: "*.bam"
`,
    );
    write(
      root,
      "modules/nf-core/minimap2/align/tests/main.nf.test",
      `profile "test"
test("align module") {
  when { params { outdir = "results" } }
  then { assert snapshot(workflow.trace.succeeded().size()).match() }
}
`,
    );
    write(
      root,
      "modules/nf-core/minimap2/align/tests/main.nf.test.snap",
      JSON.stringify({
        "align module": {
          content: [
            {
              "0": ["aligned.bam:md5,aa8b2aa1e0b5fbbba3b04d471e1b0535"],
              versions: [["MINIMAP2", "minimap2", "2.28"]],
              bam: [["sample1", "results/aligned.bam:md5,d41d8cd98f00b204e9800998ecf8427e"]],
            },
          ],
          meta: { "nf-test": "0.9.3" },
        },
        "sibling module": {
          content: [{ bam: ["sibling.bam:md5,ffffffffffffffffffffffffffffffff"] }],
        },
      }),
    );

    const summary = await summarize(root);
    const process = summary.processes[0]!;

    expect(process.meta?.description).toBe("Align reads against a reference");
    expect(process.meta?.keywords).toEqual(["align", "reference"]);
    expect(process.meta?.authors).toEqual(["@author"]);
    expect(process.meta?.tools[0]).toEqual(
      expect.objectContaining({
        name: "minimap2",
        description: "Fast sequence aligner",
        homepage: "https://github.com/lh3/minimap2",
        licence: ["MIT"],
      }),
    );
    expect(process.meta?.input[0]).toEqual(
      expect.objectContaining({ name: "reads", type: "file", pattern: "*.fastq.gz" }),
    );
    expect(process.module_tests).toHaveLength(1);
    expect(process.module_tests[0]).toEqual(
      expect.objectContaining({
        name: "align module",
        path: "modules/nf-core/minimap2/align/tests/main.nf.test",
        snapshot: expect.objectContaining({
          snap_path: "modules/nf-core/minimap2/align/tests/main.nf.test.snap",
          parsed_content: [
            {
              name: "align module",
              channels: [
                {
                  key: "0",
                  files: [
                    {
                      path: "aligned.bam",
                      basename: "aligned.bam",
                      md5: "aa8b2aa1e0b5fbbba3b04d471e1b0535",
                      stub: false,
                    },
                  ],
                  values: [],
                },
                {
                  key: "versions",
                  files: [],
                  values: [["MINIMAP2", "minimap2", "2.28"]],
                },
                {
                  key: "bam",
                  files: [
                    {
                      path: "results/aligned.bam",
                      basename: "aligned.bam",
                      md5: "d41d8cd98f00b204e9800998ecf8427e",
                      stub: true,
                    },
                  ],
                  values: ["sample1"],
                },
              ],
            },
          ],
        }),
      }),
    );
  });

  test("captures subworkflow tests and leaves local process module metadata empty", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'nf-core/subworkflow-tests' }\n");
    write(root, "modules/local/local.nf", "process LOCAL {\n  script:\n  'local'\n}\n");
    write(root, "modules/local/meta.yml", "description: Local metadata should not be promoted\n");
    write(
      root,
      "modules/local/tests/local.nf.test",
      'test("local") { then { assert workflow.success } }\n',
    );
    write(root, "modules/local/other.nf", "process OTHER {\n  script:\n  'other'\n}\n");
    write(
      root,
      "subworkflows/nf-core/trim/main.nf",
      "workflow TRIM {\n  take:\n  reads\n  main:\n  LOCAL(reads)\n}\n",
    );
    write(
      root,
      "workflows/pipeline.nf",
      "workflow PIPELINE {\n  take:\n  reads\n  main:\n  LOCAL(reads)\n  OTHER(reads)\n}\n",
    );
    write(
      root,
      "main.nf",
      "include { LOCAL } from './modules/local/local'\ninclude { OTHER } from './modules/local/other'\ninclude { TRIM } from './subworkflows/nf-core/trim'\ninclude { PIPELINE } from './workflows/pipeline'\nworkflow { PIPELINE(Channel.of('x')) }\n",
    );
    write(
      root,
      "subworkflows/nf-core/trim/tests/main.nf.test",
      `test("trim subworkflow") {
  then { assert workflow.success }
}
`,
    );

    const summary = await summarize(root);

    expect(summary.processes.every((process) => process.meta === null)).toBe(true);
    expect(summary.processes.every((process) => process.module_tests.length === 0)).toBe(true);
    expect(summary.subworkflows.find((workflow) => workflow.name === "TRIM")?.tests).toEqual([
      expect.objectContaining({
        name: "trim subworkflow",
        path: "subworkflows/nf-core/trim/tests/main.nf.test",
      }),
    ]);
  });

  test("captures nf-test single-quoted blocks and typed params", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'nf-core/quoted-tests' }\n");
    write(root, "main.nf", "workflow QUOTED_TESTS { }\n");
    write(
      root,
      "tests/quoted.nf.test",
      `profile 'test_full'
nextflow_pipeline {
  test('-profile "test,test_full"') {
    when {
      params {
        input = 'samplesheet.csv'
        skip_multiqc = true
        min_reads = 25
        ratio = 0.5
      }
    }
    then { assert workflow.success }
  }
}
`,
    );

    const summary = await summarize(root);
    const tests = (
      summary as SummaryLike & {
        nf_tests: {
          name: string;
          profiles: string[];
          params_overrides: Record<string, unknown>;
        }[];
      }
    ).nf_tests;

    expect(tests).toEqual([
      expect.objectContaining({
        name: '-profile "test,test_full"',
        profiles: ["test", "test_full"],
        params_overrides: {
          input: "samplesheet.csv",
          skip_multiqc: true,
          min_reads: 25,
          ratio: 0.5,
        },
      }),
    ]);
  });

  test("parses compact nf-test snapshot sidecars", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'nf-core/compact-snapshots' }\n");
    write(root, "main.nf", "workflow COMPACT_SNAPSHOTS { }\n");
    write(
      root,
      "tests/compact.nf.test",
      `test("compact snapshot") {
  then { assert snapshot(workflow.out).match() }
}
`,
    );
    write(
      root,
      "tests/compact.nf.test.snap",
      JSON.stringify({
        "compact snapshot": {
          bam: ["results/sample.bam:md5,11111111111111111111111111111111"],
          count: 2,
        },
      }),
    );

    const summary = await summarize(root);
    const snapshot = (
      summary as SummaryLike & {
        nf_tests: {
          snapshot: {
            parsed_content: {
              channels: {
                key: string | null;
                files: { path: string; basename: string; md5: string; stub: boolean }[];
                values: unknown[];
              }[];
            }[];
          } | null;
        }[];
      }
    ).nf_tests[0]!.snapshot;

    expect(snapshot?.parsed_content).toEqual([
      {
        name: "compact snapshot",
        channels: [
          {
            key: "bam",
            files: [
              {
                path: "results/sample.bam",
                basename: "sample.bam",
                md5: "11111111111111111111111111111111",
                stub: false,
              },
            ],
            values: [],
          },
          { key: "count", files: [], values: [2] },
        ],
      },
    ]);
  });

  test("captures same-file utility and wrapper subworkflow calls without choosing wrapper primary", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'nf-core/wrappers' }\n");
    write(root, "modules/local/align/main.nf", "process ALIGN {\n  script:\n  'align'\n}\n");
    write(root, "modules/local/report/main.nf", "process REPORT {\n  script:\n  'report'\n}\n");
    write(
      root,
      "workflows/analysis.nf",
      "include { ALIGN } from '../modules/local/align'\ninclude { REPORT } from '../modules/local/report'\nworkflow ANALYSIS {\n  take:\n  reads\n  main:\n  ALIGN(reads)\n  REPORT(ALIGN.out)\n}\n",
    );
    write(
      root,
      "main.nf",
      "include { ANALYSIS } from './workflows/analysis'\nworkflow PIPELINE_INITIALISATION {\n  main:\n  paramsSummaryMap(workflow, params)\n}\nworkflow PIPELINE_COMPLETION {\n  main:\n  completionSummary(workflow, params)\n}\nworkflow NFCORE_WRAPPERS {\n  main:\n  PIPELINE_INITIALISATION()\n  ANALYSIS(Channel.of('reads'))\n  PIPELINE_COMPLETION()\n}\nworkflow { NFCORE_WRAPPERS() }\n",
    );

    const summary = await summarize(root);

    expect(summary.subworkflows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "PIPELINE_INITIALISATION",
          kind: "utility",
          calls: [],
        }),
        expect.objectContaining({
          name: "PIPELINE_COMPLETION",
          kind: "utility",
          calls: [],
        }),
        expect.objectContaining({
          name: "NFCORE_WRAPPERS",
          kind: "pipeline",
          calls: ["ANALYSIS", "PIPELINE_COMPLETION", "PIPELINE_INITIALISATION"],
        }),
      ]),
    );
    expect(summary.subworkflows.map((workflow) => workflow.name)).not.toContain("ANALYSIS");
    expect(summary.workflow.name).toBe("ANALYSIS");
  });

  test("decomposes mulled-v2 containers from a cached multi-package TSV", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'nf-core/mulled' }\n");
    write(
      root,
      "modules/nf-core/minimap2/align/main.nf",
      `process MINIMAP2_ALIGN {
  container "\${ workflow.containerEngine == 'singularity' ? 'https://depot.galaxyproject.org/singularity/mulled-v2-66534bcbb7031a148b13e2ad42583020b9cd25c4:3161f532a5ea6f1dec9be5667c9efc2afdac6104-0' : 'biocontainers/mulled-v2-66534bcbb7031a148b13e2ad42583020b9cd25c4:3161f532a5ea6f1dec9be5667c9efc2afdac6104-0' }"
  conda "\${moduleDir}/environment.yml"
  script:
  'minimap2'
}
`,
    );
    write(
      root,
      "modules/nf-core/minimap2/align/environment.yml",
      `dependencies:
  - bioconda::minimap2=2.28
  - bioconda::samtools=1.20
`,
    );
    write(
      root,
      "multi-package-containers.tsv",
      "#targets\tbase_image\timage_build\nminimap2=2.28,samtools=1.20\tbgruening/busybox-bash:0.1\t0\n",
    );
    write(
      root,
      "main.nf",
      "include { MINIMAP2_ALIGN } from './modules/nf-core/minimap2/align'\nworkflow MULLED { MINIMAP2_ALIGN() }\n",
    );

    const summary = await summarize(root, `${root}/multi-package-containers.tsv`);
    const minimap2 = summary.tools.find((tool) => tool.name === "minimap2");

    expect(minimap2?.mulled_components).toEqual([
      { name: "minimap2", version: "2.28", bioconda: "bioconda::minimap2=2.28" },
      { name: "samtools", version: "1.20", bioconda: "bioconda::samtools=1.20" },
    ]);
  });

  test("selects ad-hoc DSL2 root composer with lowercase subworkflow plane calls", async () => {
    // Repro of egapx-shape: anonymous workflow {} in entrypoint calls a single
    // lowercase composer subworkflow that itself only calls other lowercase plane
    // subworkflows (not processes directly). Plane subworkflows then call processes.
    // Validates G-1 (root composer wins via transitive reach), G-2 (conditionals
    // populate via lowercase calls), G-3 (composer's calls/kind are correct).
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'adhoc/composer' }\n");
    write(root, "modules/aligner.nf", "process align_reads {\n  script:\n  'align'\n}\n");
    write(root, "modules/caller.nf", "process call_variants {\n  script:\n  'call'\n}\n");
    write(
      root,
      "subworkflows/aln/main.nf",
      `include { align_reads } from '../../modules/aligner'
workflow aln_plane {
  take:
  reads
  main:
  align_reads(reads)
}
`,
    );
    write(
      root,
      "subworkflows/var/main.nf",
      `include { call_variants } from '../../modules/caller'
workflow var_plane {
  take:
  bam
  main:
  call_variants(bam)
}
`,
    );
    write(
      root,
      "subworkflows/composer/main.nf",
      `include { aln_plane } from '../aln/main'
include { var_plane } from '../var/main'
workflow composer {
  take:
  reads
  main:
  aln_plane(reads)
  if (params.call_variants) {
    var_plane(aln_plane.out)
  }
}
`,
    );
    write(
      root,
      "main.nf",
      "include { composer } from './subworkflows/composer/main'\nworkflow { composer(Channel.of('reads')) }\n",
    );

    const summary = await summarize(root);

    expect(summary.workflow.name).toBe("composer");
    expect(summary.workflow.conditionals).toEqual([
      { guard: "params.call_variants", branch: "default", affects: ["var_plane"] },
    ]);

    const composer = summary.subworkflows.find((workflow) => workflow.name === "composer");
    expect(composer).toBeUndefined(); // primary excluded from subworkflows[]

    const aln = summary.subworkflows.find((workflow) => workflow.name === "aln_plane");
    expect(aln?.kind).toBe("pipeline");
    expect(aln?.calls).toEqual(["align_reads"]);

    const varPlane = summary.subworkflows.find((workflow) => workflow.name === "var_plane");
    expect(varPlane?.kind).toBe("pipeline");
    expect(varPlane?.calls).toEqual(["call_variants"]);
  });

  test("captures Groovy-style channels: tuple destructure, .out access, operator chain", async () => {
    // Repro of egapx-shape channel idioms inside a workflow body without ch_* naming:
    // (a, b) = call(...), name = sub.out.X, name = a.combine(b).
    // Lines outside main: are ignored; non-channel-shaped RHS (e.g. params.get())
    // are filtered out so workflow.channels stays focused on data flow.
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'adhoc/groovy-channels' }\n");
    write(
      root,
      "modules/m.nf",
      `process prepare_thing {\n  script:\n  'prepare'\n}\nprocess align_thing {\n  script:\n  'align'\n}\n`,
    );
    write(
      root,
      "subworkflows/setup/main.nf",
      `include { prepare_thing } from '../../modules/m'
workflow setup {
  take:
  raw
  main:
  prepare_thing(raw)
  emit:
  scaffolds = prepare_thing.out
  index = prepare_thing.out
}
`,
    );
    write(
      root,
      "subworkflows/aln/main.nf",
      `include { align_thing } from '../../modules/m'
workflow aln_plane {
  take:
  reads
  main:
  align_thing(reads)
  emit:
  alignments = align_thing.out
}
`,
    );
    write(
      root,
      "main.nf",
      `include { setup } from './subworkflows/setup/main'
include { aln_plane } from './subworkflows/aln/main'
workflow root {
  take:
  reads
  main:
  def task_setting = task_params.get('mode', 'fast')
  (scaffolds, index) = setup(reads)
  aln_plane(scaffolds)
  alignments = aln_plane.out.alignments
  combined = alignments.combine(index)
  emit:
  out = combined
}
`,
    );

    const summary = await summarize(root);

    expect(summary.workflow.name).toBe("root");
    const channels = (
      summary as unknown as { workflow: { channels: { name: string; source: string }[] } }
    ).workflow.channels.map((channel) => channel.name);
    // tuple destructure produces both names
    expect(channels).toContain("scaffolds");
    expect(channels).toContain("index");
    // .out.X accesses captured
    expect(channels).toContain("alignments");
    // operator-chain RHS captured
    expect(channels).toContain("combined");
    // non-channel-shaped def is filtered out
    expect(channels).not.toContain("task_setting");
    // emit-block channel `out` is not double-counted as a workflow channel
    expect(channels).not.toContain("out");
  });

  test("warns when an explicit mulled index path is missing", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'nf-core/missing-mulled-index' }\n");
    write(root, "main.nf", "workflow MISSING_INDEX { }\n");

    const summary = await summarize(root, `${root}/missing.tsv`);

    expect(summary.warnings).toContain(`mulled index path not found: ${root}/missing.tsv`);
  });
});

async function summarize(root: string, mulledIndexPath?: string): Promise<SummaryLike> {
  return (await buildSummary(root, {
    profile: "test",
    withNextflow: false,
    fetchTestData: false,
    mulledIndexPath,
    validate: false,
  })) as SummaryLike;
}

function tempPipelineRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "summarize-nextflow-"));
  roots.push(root);
  return root;
}

function write(root: string, path: string, content: string): void {
  const target = join(root, path);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content);
}
