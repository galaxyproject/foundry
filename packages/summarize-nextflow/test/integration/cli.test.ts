// Integration tests against real cast artifacts and real pipeline trees.
// Skips gracefully when the workflow-fixtures repo isn't present locally.

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import { isAbsolute, join, relative as relativePath, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateSummary } from "@galaxy-foundry/summary-nextflow-schema";

const PKG_ROOT = resolve(__dirname, "..", "..");
const FOUNDRY_ROOT = resolve(PKG_ROOT, "..", "..");
const CLI = resolve(PKG_ROOT, "dist/bin/summarize-nextflow.js");
// Prefer repo-local materialization (`make fixtures-nextflow` →
// $REPO/workflow-fixtures/pipelines/) so CI exercises the same paths.
// Fall back to a developer-managed external clone for backwards compatibility.
const REPO_FIXTURES = resolve(FOUNDRY_ROOT, "workflow-fixtures/pipelines");
const HOME_FIXTURES = resolve(os.homedir(), "projects/repositories/workflow-fixtures/pipelines");
const FIXTURES = (() => {
  try {
    if (statSync(REPO_FIXTURES).isDirectory()) return REPO_FIXTURES;
  } catch {
    /* fall through */
  }
  return HOME_FIXTURES;
})();
const DEMO_PIPELINE = resolve(FIXTURES, "nf-core__demo");
const BACASS_PIPELINE = resolve(FIXTURES, "nf-core__bacass");
const RNASEQ_PIPELINE = resolve(FIXTURES, "nf-core__rnaseq");
const SAREK_PIPELINE = resolve(FIXTURES, "nf-core__sarek");
const SPAWN_MAX_BUFFER = 64 * 1024 * 1024;
const DEMO_SUMMARY = resolve(
  FOUNDRY_ROOT,
  "casts/claude/skills/summarize-nextflow/runs/nf-core__demo/summary.json",
);

function cliBuilt(): boolean {
  return existsSync(CLI);
}

function fixturePresent(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

const itIfBuilt = cliBuilt() ? it : it.skip;
const itIfDemoFixture = cliBuilt() && fixturePresent(DEMO_PIPELINE) ? it : it.skip;
const itIfBacassFixture = cliBuilt() && fixturePresent(BACASS_PIPELINE) ? it : it.skip;
const itIfRnaseqFixture = cliBuilt() && fixturePresent(RNASEQ_PIPELINE) ? it : it.skip;
const itIfSarekFixture = cliBuilt() && fixturePresent(SAREK_PIPELINE) ? it : it.skip;

describe("summarize-nextflow CLI — built bin", () => {
  itIfBuilt("--version emits a semver", () => {
    const r = spawnSync("node", [CLI, "--version"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  itIfBuilt("--help mentions the planned flags", () => {
    const r = spawnSync("node", [CLI, "--help"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("--profile");
    expect(r.stdout).toContain("--no-with-nextflow");
    expect(r.stdout).toContain("--fetch-test-data");
    expect(r.stdout).toContain("--test-data-dir");
    expect(r.stdout).toContain("--no-validate");
  });

  itIfBuilt("resolves inherited test-data params and localizes fetched files", async () => {
    const root = mkdtempSync(join(os.tmpdir(), "foundry-synthetic-nextflow-"));
    mkdirSync(join(root, "conf"));
    writeFileSync(
      join(root, "nextflow.config"),
      `manifest { name = 'nf-core/synthetic' }
params {
  pipelines_testdata_base_path = 'https://example.test/data/'
  reference_fasta = params.pipelines_testdata_base_path + 'ref.fa'
}
profiles { test {} }
`,
    );
    writeFileSync(
      join(root, "conf", "test.config"),
      `params {
  input = params.pipelines_testdata_base_path + 'samplesheet.csv'
}
`,
    );

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request) => {
      const href = String(url);
      if (href.endsWith("samplesheet.csv")) {
        return new Response("sample,reads\none,https://example.test/data/reads.fastq.gz\n");
      }
      if (href.endsWith("ref.fa")) return new Response(">chr1\nACGT\n");
      if (href.endsWith("reads.fastq.gz")) return new Response("reads");
      return new Response("missing", { status: 404, statusText: "Not Found" });
    }) as typeof fetch;

    try {
      const { buildSummary } = (await import("../../dist/index.js")) as {
        buildSummary: typeof import("../../src/index.js").buildSummary;
      };
      const summary = await buildSummary(root, {
        profile: "test",
        withNextflow: false,
        fetchTestData: true,
        testDataDir: relativePath(process.cwd(), join(root, "localized-test-data")),
        validate: false,
      });
      const validation = validateSummary(summary);
      expect(validation.valid).toBe(true);

      const inputs = (summary as { test_fixtures: { inputs: { role: string; path: string }[] } })
        .test_fixtures.inputs;
      expect(inputs.map((input) => input.role)).toEqual(
        expect.arrayContaining(["samplesheet", "reference_fasta", "reads"]),
      );
      expect(inputs.every((input) => isAbsolute(input.path))).toBe(true);
      expect(inputs.every((input) => existsSync(input.path))).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  itIfBuilt("extracts all conda dependencies from module environments", async () => {
    const root = mkdtempSync(join(os.tmpdir(), "foundry-synthetic-nextflow-"));
    const moduleDir = join(root, "modules", "local", "align");
    mkdirSync(moduleDir, { recursive: true });
    writeFileSync(
      join(root, "nextflow.config"),
      `manifest { name = 'nf-core/synthetic' }
profiles { test {} }
`,
    );
    writeFileSync(
      join(moduleDir, "main.nf"),
      `process MINIMAP2_ALIGN {
  conda "\${moduleDir}/environment.yml"
  input:
  path reads
  output:
  path "*.bam", emit: bam
  script:
  """
  minimap2 | samtools sort
  """
}
`,
    );
    writeFileSync(
      join(moduleDir, "environment.yml"),
      `name: synthetic
dependencies:
  - bioconda::minimap2=2.24
  - bioconda::samtools=1.18
  - bioconda::htslib=1.18
  - conda-forge::pigz=2.6
`,
    );

    const { buildSummary } = (await import("../../dist/index.js")) as {
      buildSummary: typeof import("../../src/index.js").buildSummary;
    };
    const summary = await buildSummary(root, {
      profile: "test",
      withNextflow: false,
      fetchTestData: false,
      validate: false,
    });
    const validation = validateSummary(summary);
    expect(validation.valid).toBe(true);

    const tools = (summary as { tools: { name: string; version: string; bioconda: string }[] })
      .tools;
    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["minimap2", "samtools", "htslib", "pigz"]),
    );
    expect(tools.find((tool) => tool.name === "htslib")?.bioconda).toBe("bioconda::htslib=1.18");
    expect(tools.find((tool) => tool.name === "pigz")?.bioconda).toBe("conda-forge::pigz=2.6");
  });

  itIfBuilt("links processes[].tool to dashed and singleton tool names", async () => {
    const root = mkdtempSync(join(os.tmpdir(), "foundry-synthetic-nextflow-"));
    const dashedDir = join(root, "modules", "nf-core", "ensemblvep", "vep");
    const singletonDir = join(root, "modules", "nf-core", "tabix", "tabix");
    const bareDir = join(root, "modules", "nf-core", "mosdepth");
    mkdirSync(dashedDir, { recursive: true });
    mkdirSync(singletonDir, { recursive: true });
    mkdirSync(bareDir, { recursive: true });
    writeFileSync(
      join(root, "nextflow.config"),
      `manifest { name = 'nf-core/synthetic' }
profiles { test {} }
`,
    );
    const moduleStub = (name: string) =>
      `process ${name} {
  conda "\${moduleDir}/environment.yml"
  output:
  path "out", emit: out
  script:
  """
  run
  """
}
`;
    writeFileSync(join(dashedDir, "main.nf"), moduleStub("ENSEMBLVEP_VEP"));
    writeFileSync(
      join(dashedDir, "environment.yml"),
      `dependencies:\n  - bioconda::ensembl-vep=115.2\n  - bioconda::perl-math-cdf=0.1\n`,
    );
    writeFileSync(join(singletonDir, "main.nf"), moduleStub("TABIX_TABIX"));
    writeFileSync(
      join(singletonDir, "environment.yml"),
      `dependencies:\n  - bioconda::htslib=1.21\n`,
    );
    writeFileSync(join(bareDir, "main.nf"), moduleStub("MOSDEPTH"));
    writeFileSync(
      join(bareDir, "environment.yml"),
      `channels:\n  - bioconda\ndependencies:\n  - mosdepth=0.3.10\n`,
    );

    const { buildSummary } = (await import("../../dist/index.js")) as {
      buildSummary: typeof import("../../src/index.js").buildSummary;
    };
    const summary = (await buildSummary(root, {
      profile: "test",
      withNextflow: false,
      fetchTestData: false,
      validate: false,
    })) as { tools: { name: string }[]; processes: { name: string; tool: string | null }[] };

    const toolNames = summary.tools.map((tool) => tool.name);
    expect(toolNames).toEqual(expect.arrayContaining(["ensembl-vep", "htslib", "mosdepth"]));
    const fk = (name: string) =>
      summary.processes.find((process) => process.name === name)?.tool ?? null;
    expect(fk("ENSEMBLVEP_VEP")).toBe("ensembl-vep");
    expect(fk("TABIX_TABIX")).toBe("htslib");
    expect(fk("MOSDEPTH")).toBe("mosdepth");
  });

  itIfBuilt("extracts process aliases from include statements", async () => {
    const root = mkdtempSync(join(os.tmpdir(), "foundry-synthetic-nextflow-"));
    const moduleDir = join(root, "modules", "local", "align");
    mkdirSync(join(root, "workflows"), { recursive: true });
    mkdirSync(moduleDir, { recursive: true });
    writeFileSync(
      join(root, "nextflow.config"),
      `manifest { name = 'nf-core/synthetic' }
profiles { test {} }
`,
    );
    writeFileSync(
      join(root, "workflows", "synthetic.nf"),
      `include { MINIMAP2_ALIGN as MINIMAP2_CONSENSUS } from '../modules/local/align'
include { MINIMAP2_ALIGN as MINIMAP2_POLISH } from '../modules/local/align'
include { FASTQC } from '../modules/local/fastqc'
`,
    );
    writeFileSync(
      join(moduleDir, "main.nf"),
      `process MINIMAP2_ALIGN {
  output:
  path "*.paf", emit: paf
  script:
  """
  minimap2
  """
}
`,
    );

    const { buildSummary } = (await import("../../dist/index.js")) as {
      buildSummary: typeof import("../../src/index.js").buildSummary;
    };
    const summary = await buildSummary(root, {
      profile: "test",
      withNextflow: false,
      fetchTestData: false,
      validate: false,
    });
    const validation = validateSummary(summary);
    expect(validation.valid).toBe(true);

    const process = (
      summary as { processes: { name: string; aliases: string[] }[] }
    ).processes.find((candidate) => candidate.name === "MINIMAP2_ALIGN");
    expect(process?.aliases).toEqual(["MINIMAP2_CONSENSUS", "MINIMAP2_POLISH"]);
  });

  itIfBuilt("extracts one nf-test entry per test block with snapshot details", async () => {
    const root = mkdtempSync(join(os.tmpdir(), "foundry-synthetic-nextflow-"));
    mkdirSync(join(root, "tests"));
    writeFileSync(
      join(root, "nextflow.config"),
      `manifest { name = 'nf-core/synthetic' }
profiles { test {} test_alt {} }
`,
    );
    writeFileSync(
      join(root, "tests", "default.nf.test"),
      `nextflow_pipeline {
  test("-profile test") {
    when { params { outdir = "$outputDir" } }
    then {
      def stable_name = getAllFilesFromDir(params.outdir, relative: true, ignoreFile: 'tests/.nftignore_files_entirely')
      def stable_path = getAllFilesFromDir(params.outdir, ignore: ['Prokka/**'])
      assertAll(
        { assert workflow.success },
        { assert snapshot(workflow.trace.succeeded().size(), removeNextflowVersion("$outputDir/versions.yml"), stable_name, stable_path).match() }
      )
    }
  }
  test("-profile test_alt") {
    when { params { outdir = "$outputDir" } }
    then { assert workflow.success }
  }
}
`,
    );

    const { buildSummary } = (await import("../../dist/index.js")) as {
      buildSummary: typeof import("../../src/index.js").buildSummary;
    };
    const summary = await buildSummary(root, {
      profile: "test",
      withNextflow: false,
      fetchTestData: false,
      validate: false,
    });
    const validation = validateSummary(summary);
    expect(validation.valid).toBe(true);

    const tests = (
      summary as {
        nf_tests: {
          profiles: string[];
          snapshot: {
            captures: string[];
            helpers: string[];
            ignore_files: string[];
            ignore_globs: string[];
          } | null;
        }[];
      }
    ).nf_tests;
    expect(tests).toHaveLength(2);
    expect(tests.map((test) => test.profiles[0])).toEqual(["test", "test_alt"]);
    expect(tests[0]?.snapshot?.captures).toEqual([
      "succeeded_task_count",
      "versions_yml",
      "stable_names",
      "stable_paths",
    ]);
    expect(tests[0]?.snapshot?.helpers).toEqual(["getAllFilesFromDir", "removeNextflowVersion"]);
    expect(tests[0]?.snapshot?.ignore_files).toEqual(["tests/.nftignore_files_entirely"]);
    expect(tests[0]?.snapshot?.ignore_globs).toEqual(["Prokka/**"]);
  });

  itIfBuilt("extracts named subworkflows and selects the primary workflow", async () => {
    const root = mkdtempSync(join(os.tmpdir(), "foundry-synthetic-nextflow-"));
    mkdirSync(join(root, "modules", "local", "align"), { recursive: true });
    mkdirSync(join(root, "subworkflows", "local", "prep"), { recursive: true });
    mkdirSync(join(root, "workflows"), { recursive: true });
    writeFileSync(
      join(root, "nextflow.config"),
      `manifest { name = 'nf-core/synthetic' }
profiles { test {} }
`,
    );
    writeFileSync(
      join(root, "modules", "local", "align", "main.nf"),
      `process ALIGN {
  output:
  path "*.bam", emit: bam
  script:
  """
  align
  """
}
`,
    );
    writeFileSync(
      join(root, "subworkflows", "local", "prep", "main.nf"),
      `include { ALIGN } from '../../../modules/local/align'
workflow PREP_READS {
  take:
  ch_reads
  main:
  ALIGN(ch_reads)
  emit:
  bam = ALIGN.out.bam
}
`,
    );
    writeFileSync(
      join(root, "workflows", "synthetic.nf"),
      `include { PREP_READS } from '../subworkflows/local/prep'
workflow SYNTHETIC {
  take:
  ch_reads
  main:
  ch_extra = Channel.empty()
  PREP_READS(ch_reads)
  emit:
  bam = PREP_READS.out.bam
}
`,
    );

    const { buildSummary } = (await import("../../dist/index.js")) as {
      buildSummary: typeof import("../../src/index.js").buildSummary;
    };
    const summary = await buildSummary(root, {
      profile: "test",
      withNextflow: false,
      fetchTestData: false,
      validate: false,
    });
    const validation = validateSummary(summary);
    expect(validation.valid).toBe(true);

    const data = summary as {
      workflow: {
        name: string;
        channels: { name: string; source: string }[];
        edges: { from: string; to: string; via: string[] }[];
      };
      subworkflows: {
        name: string;
        kind: string;
        calls: string[];
        inputs: unknown[];
        outputs: unknown[];
      }[];
    };
    expect(data.workflow.name).toBe("SYNTHETIC");
    expect(data.workflow.channels).toEqual([
      {
        name: "ch_extra",
        source: "Channel.empty()",
        shape: "channel",
        construct: "empty",
        from_param: null,
        required_runtime: false,
      },
    ]);
    expect(data.workflow.edges).toEqual([{ from: "ch_reads", to: "PREP_READS", via: [] }]);
    const prep = data.subworkflows.find((workflow) => workflow.name === "PREP_READS");
    expect(prep?.kind).toBe("pipeline");
    expect(prep?.calls).toEqual(["ALIGN"]);
    expect(prep?.inputs).toHaveLength(1);
    expect(prep?.outputs).toHaveLength(1);
  });

  itIfBuilt("emits valid JSON with warnings for off-template anonymous workflows", async () => {
    const root = mkdtempSync(join(os.tmpdir(), "foundry-ad-hoc-nextflow-"));
    writeFileSync(
      join(root, "nextflow.config"),
      `manifest { name = 'example/ad-hoc' }
profiles { test {} }
`,
    );
    writeFileSync(
      join(root, "main.nf"),
      `process SAY_HELLO {
  output:
  path "hello.txt", emit: txt
  script:
  """
  printf hello > hello.txt
  """
}

workflow {
  Channel.of('hello').set { ch_words }
  SAY_HELLO(ch_words)
}
`,
    );

    const { buildSummary } = (await import("../../dist/index.js")) as {
      buildSummary: typeof import("../../src/index.js").buildSummary;
    };
    const summary = await buildSummary(root, {
      profile: "test",
      withNextflow: false,
      fetchTestData: false,
      validate: false,
    });
    const validation = validateSummary(summary);
    expect(validation.valid).toBe(true);

    const data = summary as { workflow: { name: string }; warnings: string[] };
    expect(data.workflow.name).toBe("AD-HOC");
    expect(data.warnings).toEqual(
      expect.arrayContaining([
        "no named workflow blocks found; summary uses manifest-derived workflow name",
        "no module process files found under modules/; process extraction may be incomplete",
      ]),
    );
  });

  itIfBuilt("extracts operator channels and conditionals from workflow bodies", async () => {
    const root = mkdtempSync(join(os.tmpdir(), "foundry-synthetic-nextflow-"));
    mkdirSync(join(root, "modules", "local", "align"), { recursive: true });
    mkdirSync(join(root, "modules", "local", "qc"), { recursive: true });
    mkdirSync(join(root, "workflows"), { recursive: true });
    writeFileSync(
      join(root, "nextflow.config"),
      `manifest { name = 'nf-core/synthetic' }
profiles { test {} }
`,
    );
    writeFileSync(
      join(root, "modules", "local", "align", "main.nf"),
      `process ALIGN { script: "align" }
`,
    );
    writeFileSync(
      join(root, "modules", "local", "qc", "main.nf"),
      `process QC { script: "qc" }
`,
    );
    writeFileSync(
      join(root, "workflows", "synthetic.nf"),
      `include { ALIGN } from '../modules/local/align'
include { QC } from '../modules/local/qc'
workflow SYNTHETIC {
  take:
  ch_reads
  main:
  ch_reads
    .filter { meta, reads -> meta.keep }
    .map { meta, reads -> tuple(meta, reads) }
    .set { ch_filtered }
  ch_filtered.join(ch_reference).set { ch_joined }
  ch_joined.mix(ch_extra).set { ch_mixed }
  ch_mixed.branch { meta, reads -> pass: true }.set { ch_branched }
  if (params.run_qc) {
    QC(ch_filtered)
  } else {
    ALIGN(ch_joined)
  }
  ALIGN(ch_branched.pass)
}
`,
    );

    const { buildSummary } = (await import("../../dist/index.js")) as {
      buildSummary: typeof import("../../src/index.js").buildSummary;
    };
    const summary = await buildSummary(root, {
      profile: "test",
      withNextflow: false,
      fetchTestData: false,
      validate: false,
    });
    const validation = validateSummary(summary);
    expect(validation.valid).toBe(true);

    const data = summary as {
      workflow: {
        channels: { name: string; source: string; shape: string }[];
        edges: { from: string; to: string; via: string[] }[];
        conditionals: { guard: string; branch: string; affects: string[] }[];
      };
    };
    expect(data.workflow.channels).toEqual(
      expect.arrayContaining([
        {
          name: "ch_filtered",
          source:
            "ch_reads.filter { meta, reads -> meta.keep }.map { meta, reads -> tuple(meta, reads) }",
          shape: "filter|map",
          construct: "other",
          from_param: null,
          required_runtime: false,
        },
        {
          name: "ch_joined",
          source: "ch_filtered.join(ch_reference)",
          shape: "join",
          construct: "other",
          from_param: null,
          required_runtime: false,
        },
        {
          name: "ch_mixed",
          source: "ch_joined.mix(ch_extra)",
          shape: "mix",
          construct: "other",
          from_param: null,
          required_runtime: false,
        },
        {
          name: "ch_branched",
          source: "ch_mixed.branch { meta, reads -> pass: true }",
          shape: "branch",
          construct: "other",
          from_param: null,
          required_runtime: false,
        },
      ]),
    );
    expect(data.workflow.edges).toEqual(
      expect.arrayContaining([
        { from: "ch_filtered", to: "QC", via: [] },
        { from: "ch_joined", to: "ALIGN", via: [] },
        { from: "ch_branched.pass", to: "ALIGN", via: [] },
      ]),
    );
    expect(data.workflow.conditionals).toEqual([
      { guard: "params.run_qc", branch: "default", affects: ["QC"] },
      { guard: "params.run_qc", branch: "alternate", affects: ["ALIGN"] },
    ]);
  });
});

describe("summarize-nextflow CLI — real pipeline tree (nf-core/demo)", () => {
  itIfDemoFixture("emits valid JSON summary for the demo fixture", () => {
    const r = spawnSync("node", [CLI, DEMO_PIPELINE, "--no-with-nextflow", "--no-validate"], {
      encoding: "utf8",
      maxBuffer: SPAWN_MAX_BUFFER,
    });
    expect(r.status).toBe(0);

    const data = JSON.parse(r.stdout);
    const validation = validateSummary(data);
    expect(validation.valid).toBe(true);
    expect(data.source.workflow).toBe("demo");
    expect(data.profiles).toContain("test");
    expect(data.processes.map((p: { name: string }) => p.name)).toEqual(
      expect.arrayContaining(["FASTQC", "SEQTK_TRIM", "MULTIQC"]),
    );
    expect(data.tools.map((t: { name: string }) => t.name)).toEqual(
      expect.arrayContaining(["fastqc", "seqtk", "multiqc"]),
    );
    expect(data.test_fixtures.inputs[0].url).toContain("samplesheet_test_illumina_amplicon.csv");
    expect(data.nf_tests[0].profiles).toContain("test");
  });

  itIfDemoFixture("uses nextflow inspect by default when available", () => {
    const binDir = mkdtempSync(join(os.tmpdir(), "foundry-nextflow-bin-"));
    const fakeNextflow = join(binDir, "nextflow");
    writeFileSync(
      fakeNextflow,
      `#!/bin/sh\nprintf '%s\n' '{"processes":[{"name":"FASTQC","container":"quay.io/example/fastqc:inspect"}]}'\n`,
    );
    chmodSync(fakeNextflow, 0o755);

    const r = spawnSync("node", [CLI, DEMO_PIPELINE, "--no-validate"], {
      encoding: "utf8",
      maxBuffer: SPAWN_MAX_BUFFER,
      env: { ...process.env, PATH: `${binDir}${process.env.PATH ? `:${process.env.PATH}` : ""}` },
    });
    expect(r.status).toBe(0);

    const data = JSON.parse(r.stdout);
    const fastqc = data.processes.find((p: { name: string }) => p.name === "FASTQC");
    expect(fastqc.container).toBe("quay.io/example/fastqc:inspect");
  });

  itIfDemoFixture("fetches samplesheet-referenced test data when requested", () => {
    const r = spawnSync(
      "node",
      [CLI, DEMO_PIPELINE, "--no-with-nextflow", "--fetch-test-data", "--no-validate"],
      { encoding: "utf8", maxBuffer: SPAWN_MAX_BUFFER, timeout: 120_000 },
    );
    expect(r.status).toBe(0);

    const data = JSON.parse(r.stdout);
    const inputs = data.test_fixtures.inputs as {
      role: string;
      url: string;
      sha1: string;
      filetype: string;
    }[];
    const urls = inputs.map((input) => input.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(inputs.find((input) => input.role === "samplesheet")?.sha1).toMatch(/^[a-f0-9]{40}$/u);
    expect(inputs.filter((input) => input.role === "reads").length).toBe(4);
    expect(inputs.filter((input) => input.role === "reads").map((input) => input.filetype)).toEqual(
      ["fastq.gz", "fastq.gz", "fastq.gz", "fastq.gz"],
    );
    expect(
      inputs
        .filter((input) => input.role === "reads")
        .every((input) => /^[a-f0-9]{40}$/u.test(input.sha1)),
    ).toBe(true);
  });

  itIfDemoFixture("emits nf-schema metadata on Param entries (issue #186)", () => {
    const r = spawnSync("node", [CLI, DEMO_PIPELINE, "--no-with-nextflow", "--no-validate"], {
      encoding: "utf8",
      maxBuffer: SPAWN_MAX_BUFFER,
    });
    expect(r.status).toBe(0);
    const data = JSON.parse(r.stdout);
    const params = data.params as {
      name: string;
      format: string | null;
      hidden: boolean | null;
      mimetype: string | null;
      schema_group: string | null;
      fa_icon: string | null;
    }[];

    const input = params.find((p) => p.name === "input");
    expect(input).toBeDefined();
    expect(input!.format).toBe("file-path");
    expect(input!.mimetype).toBe("text/csv");
    expect(input!.schema_group).toBe("Input/output options");
    expect(input!.fa_icon).toBe("fas fa-terminal");

    const outdir = params.find((p) => p.name === "outdir");
    expect(outdir!.format).toBe("directory-path");

    const version = params.find((p) => p.name === "version");
    expect(version!.hidden).toBe(true);
    expect(version!.schema_group).toBe("Generic options");

    const skipTrim = params.find((p) => p.name === "skip_trim");
    expect(skipTrim!.format).toBeNull();
    expect(skipTrim!.hidden).toBeNull();
    expect(skipTrim!.schema_group).toBe("Process skipping options");
  });
});

describe("summarize-nextflow CLI — real pipeline tree (nf-core/rnaseq)", () => {
  itIfRnaseqFixture("emits nf-schema Param metadata on the flagship pipeline (issue #186)", () => {
    const r = spawnSync("node", [CLI, RNASEQ_PIPELINE, "--no-with-nextflow", "--no-validate"], {
      encoding: "utf8",
      maxBuffer: SPAWN_MAX_BUFFER,
    });
    expect(r.status).toBe(0);
    const data = JSON.parse(r.stdout);
    const validation = validateSummary(data);
    expect(validation.valid).toBe(true);

    const params = data.params as {
      name: string;
      format: string | null;
      hidden: boolean | null;
      mimetype: string | null;
      schema_group: string | null;
      fa_icon: string | null;
    }[];

    const input = params.find((p) => p.name === "input");
    expect(input!.format).toBe("file-path");
    expect(input!.mimetype).toBe("text/csv");
    expect(input!.schema_group).toBe("Input/output options");

    expect(params.some((p) => p.hidden === true)).toBe(true);

    const groups = new Set(
      params.map((p) => p.schema_group).filter((g): g is string => typeof g === "string"),
    );
    expect(groups.size).toBeGreaterThan(3);
    expect(groups.has("Input/output options")).toBe(true);
  });
});

describe("summarize-nextflow CLI — real pipeline tree (nf-core/bacass)", () => {
  itIfBacassFixture("resolves bacass profile test data expressions", () => {
    const dataDir = mkdtempSync(join(os.tmpdir(), "foundry-bacass-test-data-"));
    const r = spawnSync(
      "node",
      [
        CLI,
        BACASS_PIPELINE,
        "--profile",
        "test_liftoff",
        "--no-with-nextflow",
        "--fetch-test-data",
        "--test-data-dir",
        dataDir,
        "--no-validate",
      ],
      { encoding: "utf8", maxBuffer: SPAWN_MAX_BUFFER, timeout: 120_000 },
    );
    expect(r.status).toBe(0);

    const data = JSON.parse(r.stdout);
    const validation = validateSummary(data);
    expect(validation.valid).toBe(true);
    expect(data.source.workflow).toBe("bacass");
    expect(data.nf_tests.length).toBeGreaterThanOrEqual(9);
    expect(data.nf_tests[0].snapshot.captures).toEqual([
      "succeeded_task_count",
      "versions_yml",
      "stable_names",
      "stable_paths",
    ]);
    expect(
      data.nf_tests.find((test: { name: string }) => test.name.includes("test_hybrid_dragonflye"))
        ?.snapshot.ignore_globs,
    ).toContain("Prokka/**");

    const inputs = data.test_fixtures.inputs as {
      role: string;
      path: string;
      url: string;
      sha1: string;
    }[];
    expect(inputs.map((input) => input.role)).toEqual(
      expect.arrayContaining(["samplesheet", "reference_fasta", "reference_gff", "reads"]),
    );
    expect(inputs.every((input) => input.path.startsWith(dataDir))).toBe(true);
    expect(inputs.every((input) => existsSync(input.path))).toBe(true);
    expect(inputs.every((input) => /^[a-f0-9]{40}$/u.test(input.sha1))).toBe(true);
    expect(inputs.find((input) => input.role === "samplesheet")?.url).toBe(
      "https://raw.githubusercontent.com/nf-core/test-datasets/refs/heads/bacass/bacass_short.tsv",
    );
  });

  itIfBacassFixture("extracts multi-dependency bioconda tools from bacass modules", () => {
    const r = spawnSync("node", [CLI, BACASS_PIPELINE, "--no-with-nextflow", "--no-validate"], {
      encoding: "utf8",
      maxBuffer: SPAWN_MAX_BUFFER,
    });
    expect(r.status).toBe(0);

    const data = JSON.parse(r.stdout);
    const validation = validateSummary(data);
    expect(validation.valid).toBe(true);
    expect(data.tools.map((tool: { name: string }) => tool.name)).toEqual(
      expect.arrayContaining(["samtools", "htslib", "minimap2", "multiqc", "racon"]),
    );
    expect(data.tools.find((tool: { name: string }) => tool.name === "htslib")?.bioconda).toMatch(
      /^bioconda::htslib=/u,
    );
  });

  itIfBacassFixture("extracts repeated module aliases from bacass includes", () => {
    const r = spawnSync("node", [CLI, BACASS_PIPELINE, "--no-with-nextflow", "--no-validate"], {
      encoding: "utf8",
      maxBuffer: SPAWN_MAX_BUFFER,
    });
    expect(r.status).toBe(0);

    const data = JSON.parse(r.stdout);
    const minimap2 = data.processes.find(
      (process: { name: string }) => process.name === "MINIMAP2_ALIGN",
    );
    const fastqc = data.processes.find((process: { name: string }) => process.name === "FASTQC");
    expect(minimap2.aliases).toEqual(["MINIMAP2_CONSENSUS", "MINIMAP2_POLISH"]);
    expect(fastqc.aliases).toEqual(["FASTQC_RAW", "FASTQC_TRIM"]);
  });

  itIfBacassFixture("extracts bacass named subworkflows", () => {
    const r = spawnSync("node", [CLI, BACASS_PIPELINE, "--no-with-nextflow", "--no-validate"], {
      encoding: "utf8",
      maxBuffer: SPAWN_MAX_BUFFER,
    });
    expect(r.status).toBe(0);

    const data = JSON.parse(r.stdout);
    expect(data.workflow.name).toBe("BACASS");
    expect(data.workflow.edges).toEqual(
      expect.arrayContaining([
        { from: "ch_shortreads_fastqs.multiple", to: "CAT_FASTQ_SHORT", via: [] },
      ]),
    );
    const trim = data.subworkflows.find(
      (workflow: { name: string }) => workflow.name === "FASTQ_TRIM_FASTP_FASTQC",
    );
    expect(trim?.path).toBe("subworkflows/nf-core/fastq_trim_fastp_fastqc/main.nf");
    expect(trim?.kind).toBe("pipeline");
    expect(trim?.calls).toEqual(["FASTP", "FASTQC_RAW", "FASTQC_TRIM"]);
  });

  itIfBacassFixture("extracts bacass graph operators and conditionals", () => {
    const r = spawnSync("node", [CLI, BACASS_PIPELINE, "--no-with-nextflow", "--no-validate"], {
      encoding: "utf8",
      maxBuffer: SPAWN_MAX_BUFFER,
    });
    expect(r.status).toBe(0);

    const data = JSON.parse(r.stdout);
    expect(data.workflow.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "ch_shortreads_fastqs", shape: "branch" }),
        expect.objectContaining({ name: "ch_shortreads_concat", shape: "mix" }),
        expect.objectContaining({ name: "ch_for_assembly", shape: "dump|cross|map|dump" }),
      ]),
    );
    expect(data.workflow.conditionals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          guard: "params.assembly_type in ['short', 'hybrid']",
          branch: "default",
          affects: ["CAT_FASTQ_SHORT"],
        }),
        expect.objectContaining({
          guard: "params.assembly_type != 'long'",
          branch: "default",
          affects: ["FASTQ_TRIM_FASTP_FASTQC"],
        }),
      ]),
    );
  });
});

describe("summarize-nextflow CLI — real pipeline tree (nf-core/sarek)", () => {
  itIfSarekFixture(
    "emits reference_assets and reference_rebuilds for Sarek's PREPARE_GENOME",
    () => {
      const r = spawnSync("node", [CLI, SAREK_PIPELINE, "--no-with-nextflow", "--no-validate"], {
        encoding: "utf8",
        maxBuffer: SPAWN_MAX_BUFFER,
      });
      expect(r.status).toBe(0);
      const data = JSON.parse(r.stdout);
      const validation = validateSummary(data);
      if (!validation.valid)
        console.error("sarek validation errors:", validation.errors.slice(0, 10));
      expect(validation.valid).toBe(true);

      const assetParams = (data.reference_assets as { param: string }[]).map((a) => a.param);
      for (const expected of ["fasta", "fasta_fai", "dict", "bwa"]) {
        expect(assetParams).toContain(expected);
      }
      const fasta = (data.reference_assets as { param: string; used_by: string[] }[]).find(
        (a) => a.param === "fasta",
      );
      expect(fasta?.used_by).toContain("PREPARE_GENOME");

      const rebuilds = data.reference_rebuilds as {
        asset_param: string;
        builder: string;
        evidence: { source_path: string | null };
      }[];
      const byAsset = Object.fromEntries(rebuilds.map((r) => [r.asset_param, r]));
      expect(byAsset.fasta_fai?.builder).toBe("SAMTOOLS_FAIDX");
      expect(byAsset.dict?.builder).toBe("GATK4_CREATESEQUENCEDICTIONARY");
      expect(byAsset.bwamem2?.builder).toBe("BWAMEM2_INDEX");
      expect(byAsset.fasta_fai?.evidence.source_path).toBe(
        "subworkflows/local/prepare_genome/main.nf",
      );
    },
  );
});

describe("real cast artifact: nf-core/demo summary.json", () => {
  it("exists in the cast bundle", () => {
    expect(existsSync(DEMO_SUMMARY)).toBe(true);
  });

  it("is valid JSON with the expected top-level keys", () => {
    const data = JSON.parse(readFileSync(DEMO_SUMMARY, "utf8"));
    expect(data.source).toBeDefined();
    expect(data.source.workflow).toBe("demo");
    expect(Array.isArray(data.processes)).toBe(true);
    expect(data.processes.length).toBeGreaterThan(0);
  });
});
