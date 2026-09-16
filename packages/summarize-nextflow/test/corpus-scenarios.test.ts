import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import YAML from "yaml";
import { validateSummary } from "../src/index.js";

type Summary = Awaited<ReturnType<typeof import("../src/resolver.js").resolveNextflowSummary>>;
interface Pin {
  name: string;
  sha: string;
  flavor: string;
}
const root = resolve(import.meta.dirname, "../../..");
const cli = join(root, "packages/summarize-nextflow/dist/bin/summarize-nextflow.js");
const pins = (
  YAML.parse(readFileSync(join(root, "workflow-fixtures/fixtures.yaml"), "utf8")) as {
    pipelines: Pin[];
  }
).pipelines;
const corpus = join(root, "workflow-fixtures/pipelines");
const required = process.env.FOUNDRY_REQUIRE_NEXTFLOW_FIXTURES === "1";
const skippedDirectories = new Set([
  ".git",
  ".nextflow",
  "work",
  "node_modules",
  "BioNextflow",
  "external-modules",
  "vendor",
  "vendors",
  "third_party",
]);
const summaries = new Map<string, Summary>();

function tree(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? (skippedDirectories.has(entry.name) ? [] : tree(path)) : [path];
  });
}
function fixture(name: string): string {
  return join(corpus, name.replace("/", "__"));
}
function ready(name: string): boolean {
  const pin = pins.find((pin) => pin.name === name)!;
  if (!existsSync(cli) || !existsSync(join(fixture(name), ".git"))) return false;
  return (
    execFileSync("git", ["-C", fixture(name), "rev-parse", "HEAD"], { encoding: "utf8" }).trim() ===
    pin.sha
  );
}
function corpusTest(names: string[]) {
  return required || names.every(ready) ? test : test.skip;
}
function summary(name: string): Summary {
  if (summaries.has(name)) return summaries.get(name)!;
  expect(ready(name), `build the CLI and materialize manifest pin for ${name}`).toBe(true);
  const result = spawnSync(process.execPath, [cli, fixture(name), "--no-with-nextflow"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 60_000,
  });
  expect(result.status, result.stderr).toBe(0);
  const value = JSON.parse(result.stdout) as Summary;
  expect(validateSummary(value).valid).toBe(true);
  summaries.set(name, value);
  return value;
}
function testBlocks(directory: string): { name: string; path: string }[] {
  return tree(directory)
    .filter((path) => path.endsWith(".nf.test"))
    .flatMap((path) =>
      [...readFileSync(path, "utf8").matchAll(/\btest\(\s*(["'])(.*?)\1\s*\)\s*\{/gu)].map(
        (match) => ({ name: match[2]!, path }),
      ),
    );
}
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => [key, normalize(value)]),
    );
  return value;
}

describe("pinned summarize-nextflow corpus scenarios", () => {
  for (const pin of pins) {
    corpusTest([pin.name])(
      `${pin.name}: pinned schema, inventory and alias uniqueness`,
      () => {
        const value = summary(pin.name);
        expect(value.source.version).toBe(pin.sha);
        expect(value.source.workflow).toBeTruthy();
        const detected = value.warnings
          .find((warning) =>
            /^auto-detected Nextflow pipeline root(?: from workflow block)?: /u.test(warning),
          )
          ?.split(": ")
          .at(-1);
        const pipelineRoot = detected ? join(fixture(pin.name), detected) : fixture(pin.name);
        const declarations = tree(pipelineRoot)
          .filter((path) => path.endsWith(".nf"))
          .reduce(
            (count, path) =>
              count +
              [...readFileSync(path, "utf8").matchAll(/^\s*process\s+[A-Za-z0-9_]+\s*\{/gmu)]
                .length,
            0,
          );
        expect(value.processes.length).toBeGreaterThanOrEqual(Math.ceil(declarations * 0.8));
        expect(
          new Set(value.processes.map(({ name, module_path }) => `${module_path}:${name}`)).size,
        ).toBe(value.processes.length);
        if (declarations) expect(value.processes.length).toBeGreaterThan(0);
      },
      60_000,
    );
  }

  corpusTest(["CRG-CNAG/CalliNGS-NF"])(
    "CalliNGS-NF has eleven root modules with declared IO and script evidence",
    () => {
      const rows = summary("CRG-CNAG/CalliNGS-NF").processes;
      expect(rows).toHaveLength(11);
      expect(
        rows.every(
          ({ module_path, meta, script_excerpt }) =>
            module_path === "modules.nf" && meta === null && script_excerpt !== null,
        ),
      ).toBe(true);
    },
  );
  corpusTest(["biocorecrg/MOP2", "ncbi/egapx"])(
    "repository-root invocation surfaces child-root decisions",
    () => {
      expect(summary("biocorecrg/MOP2").warnings).toContain(
        "multiple Nextflow pipeline roots found; selected .",
      );
      expect(
        summary("biocorecrg/MOP2").warnings.some((warning) => warning.includes("multiple")),
      ).toBe(true);
      expect(summary("ncbi/egapx").warnings).toContain(
        "auto-detected Nextflow pipeline root from workflow block: nf",
      );
    },
  );
  corpusTest(["replikation/What_the_Phage"])("What_the_Phage selects phage.nf", () => {
    expect(summary("replikation/What_the_Phage").warnings).toContain(
      "selected Nextflow entrypoint: phage.nf",
    );
  });
  corpusTest(["nf-core/bacass"])("bacass aliases merge into canonical rows", () => {
    const rows = summary("nf-core/bacass").processes;
    expect(rows.find(({ name }) => name === "MINIMAP2_ALIGN")?.aliases.sort()).toEqual([
      "MINIMAP2_CONSENSUS",
      "MINIMAP2_POLISH",
    ]);
    expect(rows.find(({ name }) => name === "FASTQC")?.aliases.sort()).toEqual([
      "FASTQC_RAW",
      "FASTQC_TRIM",
    ]);
  });
  corpusTest(["ncbi/egapx"])(
    "egapx excludes commented duplicate workflow and retains live aliases",
    () => {
      const rows = summary("ncbi/egapx").subworkflows;
      const iterations = rows.find(({ name }) => name === "gnomon_training_iterations")!;
      expect(iterations.inputs[0]?.name).toBe("initial_hmm_params");
      expect(iterations.inputs.map(({ name }) => name)).toContain("gnomon_softmask");
      expect(iterations.inputs.map(({ name }) => name)).not.toEqual(
        expect.arrayContaining(["models_file"]),
      );
      expect(iterations.inputs.map(({ name }) => name)).not.toContain("gnomon_softmask_lds2");
      expect(iterations.calls).toEqual(
        expect.arrayContaining([
          "gnomon_training_iteration",
          "gnomon_training_iteration2",
          "gnomon_training_iteration3",
          "gnomon_training_iteration4",
        ]),
      );
      expect(JSON.stringify(iterations.outputs)).toContain("gnomon_training_iteration4");
      expect(rows.find(({ name }) => name === "gnomon_training_iteration")?.aliases).toEqual(
        expect.arrayContaining([
          "gnomon_training_iteration2",
          "gnomon_training_iteration3",
          "gnomon_training_iteration4",
        ]),
      );
    },
  );
  corpusTest(["nf-core/bacass"])(
    "bacass module metadata and test blocks match pinned files",
    () => {
      const value = summary("nf-core/bacass");
      for (const row of value.processes) {
        if (row.module_path.startsWith("modules/local/")) {
          expect(row.meta).toBeNull();
          expect(row.module_tests).toEqual([]);
          continue;
        }
        const directory = join(fixture("nf-core/bacass"), dirname(row.module_path));
        if (existsSync(join(directory, "meta.yml"))) {
          expect(row.meta).not.toBeNull();
          const meta = YAML.parse(readFileSync(join(directory, "meta.yml"), "utf8")) as {
            tools: Record<string, unknown>[];
          };
          expect(row.meta?.tools.map(({ name }) => name)).toEqual(
            meta.tools.flatMap((tool) => Object.keys(tool)),
          );
        }
        expect(row.module_tests.map(({ name }) => name)).toEqual(
          testBlocks(join(directory, "tests")).map(({ name }) => name),
        );
      }
      const minimap = value.processes.find(({ name }) => name === "MINIMAP2_ALIGN")!;
      expect(minimap.meta?.input.map(({ name }) => name)).toEqual([
        "meta",
        "reads",
        "meta2",
        "reference",
        "bam_format",
        "cigar_paf_format",
        "cigar_bam",
      ]);
      expect(minimap.meta?.output.map(({ name }) => name)).toEqual([
        "meta",
        "paf",
        "bam",
        "versions",
      ]);
    },
  );
  corpusTest(["nf-core/bacass"])(
    "bacass subworkflow tests match test blocks and retain compact snapshots",
    () => {
      for (const row of summary("nf-core/bacass").subworkflows) {
        const directory = join(fixture("nf-core/bacass"), dirname(row.path));
        const expected = row.path.startsWith("subworkflows/local/")
          ? []
          : testBlocks(join(directory, "tests"));
        expect(row.tests.map(({ name }) => name)).toEqual(expected.map(({ name }) => name));
        for (const item of row.tests)
          if (item.snapshot) expect(item.snapshot).toHaveProperty("snap_path");
      }
    },
  );
  corpusTest(["nf-core/bacass"])(
    "bacass directives resolve or warn and non-null tool names are foreign keys",
    () => {
      const value = summary("nf-core/bacass");
      for (const row of value.processes) {
        if (row.tool) expect(value.tools.some(({ name }) => name === row.tool)).toBe(true);
        if (!row.container && !row.conda) continue;
        const evidence = value.tools.some(
          (tool) =>
            [tool.biocontainer, tool.singularity, tool.docker, tool.wave].some(
              (container) => container && row.container?.includes(container),
            ) ||
            (tool.bioconda && row.conda?.includes(tool.bioconda)),
        );
        const environment =
          row.conda &&
          existsSync(join(fixture("nf-core/bacass"), dirname(row.module_path), "environment.yml"));
        expect(
          evidence || environment || value.warnings.some((warning) => warning.includes(row.name)),
          row.name,
        ).toBeTruthy();
      }
    },
  );
  corpusTest(["nf-core/bacass"])(
    "bacass pipeline nf-tests match nine test blocks with every snapshot capture",
    () => {
      const rows = summary("nf-core/bacass").nf_tests;
      const blocks = testBlocks(join(fixture("nf-core/bacass"), "tests"));
      expect(rows).toHaveLength(9);
      expect(rows.map(({ name }) => name)).toEqual(blocks.map(({ name }) => name));
      for (const row of rows) {
        expect(row.profiles).toHaveLength(1);
        expect(row.snapshot?.captures).toEqual([
          "succeeded_task_count",
          "versions_yml",
          "stable_names",
          "stable_paths",
        ]);
      }
    },
  );
  for (const name of ["nf-core/bacass", "nf-core/demo"]) {
    corpusTest([name])(`${name}: normalized regression pin`, () => {
      const baseline = JSON.parse(
        readFileSync(
          join(
            root,
            "casts/claude/skills/summarize-nextflow/runs",
            name.replace("/", "__"),
            "summary.json",
          ),
          "utf8",
        ),
      );
      expect(normalize(summary(name))).toEqual(normalize(baseline));
    });
  }
});
