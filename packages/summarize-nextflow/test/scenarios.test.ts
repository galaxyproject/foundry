import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, test, vi } from "vitest";
import { buildSummary, validateSummary } from "../src/index.js";

type Summary = Awaited<ReturnType<typeof import("../src/resolver.js").resolveNextflowSummary>>;
const fixtures = resolve(import.meta.dirname, "fixtures");
const temporary: string[] = [];
const options = { profile: "test", withNextflow: false, fetchTestData: false, validate: true };
const summarize = async (name: string) =>
  (await buildSummary(join(fixtures, name), options)) as Summary;

afterEach(() => {
  vi.unstubAllGlobals();
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe("committed summarize-nextflow scenario fixtures", () => {
  test("rejects the summary missing source.workflow", () => {
    const input = JSON.parse(readFileSync(join(fixtures, "missing-source-workflow.json"), "utf8"));
    const result = validateSummary(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ path: "/source", keyword: "required" }),
    ]);
    expect(result.errors[0]?.message).toContain("workflow");
  });

  test("built CLI rejects malformed resolver output with exit 3 and preserves --out", () => {
    const root = mkdtempSync(join(tmpdir(), "nextflow-scenario-invalid-"));
    temporary.push(root);
    const out = join(root, "summary.json");
    const bootstrap = join(root, "inject.mjs");
    const indexUrl = pathToFileURL(resolve(fixtures, "../../dist/index.js")).href;
    const invalid = join(fixtures, "missing-source-workflow.json");
    const replacement = `export * from ${JSON.stringify(indexUrl + "?actual")};
import { readFileSync } from 'node:fs';
export async function buildSummary() { return JSON.parse(readFileSync(${JSON.stringify(invalid)}, 'utf8')); }`;
    const loader = `export async function load(url, context, nextLoad) {
if (url === ${JSON.stringify(indexUrl)}) return { format: 'module', shortCircuit: true, source: ${JSON.stringify(replacement)} };
return nextLoad(url, context);
}`;
    writeFileSync(
      bootstrap,
      `import { register } from 'node:module';
register(${JSON.stringify("data:text/javascript," + encodeURIComponent(loader))}, import.meta.url);
`,
    );
    const run = () =>
      spawnSync(
        process.execPath,
        [
          "--import",
          bootstrap,
          resolve(fixtures, "../../dist/bin/summarize-nextflow.js"),
          join(fixtures, "layouts"),
          "--no-with-nextflow",
          "--out",
          out,
        ],
        { encoding: "utf8" },
      );
    const absent = run();
    expect(absent.status, absent.stderr).toBe(3);
    expect(absent.stderr).toContain("/source: must have required property 'workflow'");
    expect(absent.stdout).toBe("");
    expect(existsSync(out)).toBe(false);
    writeFileSync(out, "previous output\n");
    const existing = run();
    expect(existing.status, existing.stderr).toBe(3);
    expect(readFileSync(out, "utf8")).toBe("previous output\n");
  });

  test("DSL1 emits schema-valid provenance without process or channel inventions", async () => {
    const summary = await summarize("dsl1");
    expect(validateSummary(summary).valid).toBe(true);
    expect(summary.source.workflow).toBe("dsl1");
    expect(summary.processes).toEqual([]);
    expect(summary.subworkflows).toEqual([]);
    expect(summary.workflow.channels).toEqual([]);
    expect(summary.workflow.edges).toEqual([]);
    expect(summary.warnings).toContain(
      "DSL1 pipeline is out of scope; process and workflow extraction skipped",
    );
  });

  test("discovers every committed layout and preserves ad-hoc IO and script evidence", async () => {
    const summary = await summarize("layouts");
    expect(validateSummary(summary).valid).toBe(true);
    expect(summary.processes.map(({ name, module_path }) => [name, module_path])).toEqual([
      ["ANNOTATE", "lib/annotate.nf"],
      ["INLINE", "main.nf"],
      ["FLAT", "modules/flat.nf"],
      ["LOCAL", "modules/local/local.nf"],
      ["ROOT", "modules.nf"],
      ["ASSEMBLE", "workflows/assemble.nf"],
    ]);
    const inline = summary.processes.find(({ name }) => name === "INLINE")!;
    expect(inline.meta).toBeNull();
    expect(inline.inputs[0]?.name).toBe("word");
    expect(inline.outputs[0]?.name).toBe("greeting");
    expect(inline.script_excerpt).toContain("echo $word > hello.txt");
    expect(summary.params).toEqual([]);
    expect(summary.warnings).toContain(
      "no named workflow blocks found; summary uses manifest-derived workflow name",
    );
  });

  test("resolves Docker, Singularity and Conda and reports unreadable directives", async () => {
    const summary = await summarize("containers");
    expect(validateSummary(summary).valid).toBe(true);
    for (const [process, tool] of [
      ["FASTQC_DOCKER", "fastqc"],
      ["SAMTOOLS_SINGULARITY", "samtools"],
      ["MINIMAP2_CONDA", "minimap2"],
    ]) {
      expect(summary.processes.find(({ name }) => name === process)?.tool).toBe(tool);
      expect(summary.tools.some(({ name }) => name === tool)).toBe(true);
    }
    expect(summary.tools.find(({ name }) => name === "fastqc")?.biocontainer).toContain(
      "quay.io/biocontainers/fastqc",
    );
    expect(summary.tools.find(({ name }) => name === "samtools")?.singularity).toContain(
      "samtools:1.17",
    );
    expect(summary.tools.find(({ name }) => name === "minimap2")?.bioconda).toBe(
      "bioconda::minimap2=2.28",
    );
    expect(summary.warnings.some((warning) => warning.includes("???"))).toBe(true);
    expect(summary.warnings).toContain(
      "unresolved container directive in CONTAINER_ONLY: 'quay.io/biocontainers/samtools:1.17--h00cdaf9_0'",
    );
  });

  test("enumerates test blocks rather than files, retaining captures and null snapshots", async () => {
    const summary = await summarize("nf-tests");
    expect(validateSummary(summary).valid).toBe(true);
    expect(summary.nf_tests).toHaveLength(2);
    expect(summary.nf_tests.map(({ name }) => name)).toEqual(["first", "second"]);
    expect(summary.nf_tests.every(({ path }) => path === "tests/main.nf.test")).toBe(true);
    expect(summary.nf_tests[0]?.snapshot?.captures).toEqual([
      "succeeded_task_count",
      "versions_yml",
    ]);
    expect(summary.nf_tests[1]?.snapshot).toBeNull();
  });

  test("localization round-trip records stable hashes for every remote input", async () => {
    vi.stubGlobal("fetch", async (url: string | URL | Request) => {
      const filename = String(url).split("/").at(-1)!;
      return new Response(readFileSync(join(fixtures, "localization/http", filename)));
    });
    const root = mkdtempSync(join(tmpdir(), "nextflow-scenario-localization-"));
    temporary.push(root);
    const runs: Summary[] = [];
    for (const name of ["first", "second"]) {
      runs.push(
        (await buildSummary(join(fixtures, "localization"), {
          ...options,
          fetchTestData: true,
          testDataDir: join(root, name),
        })) as Summary,
      );
    }
    for (const summary of runs) {
      expect(validateSummary(summary).valid).toBe(true);
      expect(summary.test_fixtures.inputs).toHaveLength(2);
      for (const input of summary.test_fixtures.inputs) {
        expect(input.url).toMatch(/^https:\/\/example.test\/data\//);
        expect(existsSync(input.path!)).toBe(true);
        expect(input.sha1).toBe(createHash("sha1").update(readFileSync(input.path!)).digest("hex"));
      }
    }
    expect(runs[0]!.test_fixtures.inputs.map(({ sha1 }) => sha1)).toEqual(
      runs[1]!.test_fixtures.inputs.map(({ sha1 }) => sha1),
    );
  });

  test("built CLI writes a complete schema-valid DSL1 summary", () => {
    const root = mkdtempSync(join(tmpdir(), "nextflow-scenario-cli-"));
    temporary.push(root);
    const out = join(root, "summary.json");
    const result = spawnSync(
      process.execPath,
      [
        resolve(fixtures, "../../dist/bin/summarize-nextflow.js"),
        join(fixtures, "dsl1"),
        "--no-with-nextflow",
        "--out",
        out,
      ],
      { encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
    const summary = JSON.parse(readFileSync(out, "utf8"));
    expect(validateSummary(summary).valid).toBe(true);
    expect(summary.processes).toEqual([]);
  });
});
