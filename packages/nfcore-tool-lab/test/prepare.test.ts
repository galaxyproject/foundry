import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { parse, stringify } from "yaml";

import { packageVersion, prepareLabTool } from "../src/index.js";

const roots: string[] = [];
const moduleSha = "1".repeat(40);
const datasetSha = "2".repeat(40);
const castSha = "3".repeat(64);
const metadata = {
  description: "Compute sequence statistics",
  categories: ["Sequence Analysis"],
  homepage_url: "https://bioinf.shenwei.me/seqkit/",
};
const provenance = {
  nfcore_source: {
    modules_repo: "nf-core/modules",
    module_path: "modules/nf-core/seqkit/stats",
    branch: "master",
    git_sha: moduleSha,
    test_datasets_sha: datasetSha,
  },
  generated: {
    by_mold: "convert-nfcore-module-to-galaxy-tool",
    mold_revision: 11,
    cast_target: "claude",
    cast_artifact_sha: castSha,
  },
  overrides: [{ reason: "No versions channel in Galaxy" }],
};
const body = [
  "\r\n  <macros><import>macros.xml</import></macros>\r\n  <command><![CDATA[\r\n",
  "    seqkit stats \\",
  "\r\n      '$input' > '$output'\r\n  ]]></command>\r\n",
  '  <tests><test><param name="input" location="https://example.org/input.fa"/></test></tests>\r\n</tool>\r\n',
].join("");
const tool =
  '\uFEFF<?xml version="1.0" encoding="UTF-8"?>\r\n<!-- <tool id="decoy" name="decoy"> -->\r\n<tool description="name=\'decoy\' >" id = \'seqkit_stats\' name="Seqkit &amp; stats" version="@TOOL_VERSION@+galaxy@VERSION_SUFFIX@" profile="23.1">' +
  body;

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "nfcore-tool-lab-test-"));
  roots.push(root);
  const inputDir = path.join(root, "conversion");
  mkdirSync(inputDir);
  writeFileSync(path.join(inputDir, "tool.xml"), tool);
  writeFileSync(
    path.join(inputDir, "macros.xml"),
    '<macros>\r\n  <token name="@TOOL_VERSION@">2.10.1</token>\r\n</macros>\r\n',
  );
  writeFileSync(path.join(inputDir, "_provenance.yml"), stringify(provenance));
  return { root, inputDir, outputDir: path.join(root, "prepared"), metadata };
}

function snapshot(directory: string): Record<string, Buffer> {
  const result: Record<string, Buffer> = {};
  for (const entry of readdirSync(directory)) {
    const filename = path.join(directory, entry);
    if (lstatSync(filename).isDirectory()) {
      for (const [name, bytes] of Object.entries(snapshot(filename)))
        result[`${entry}/${name}`] = bytes;
    } else result[entry] = readFileSync(filename);
  }
  return result;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("prepareLabTool", () => {
  test("changes only the root identity attributes and preserves conversion evidence", () => {
    const options = fixture();
    const before = snapshot(options.inputDir);
    const result = prepareLabTool(options);
    const xml = readFileSync(path.join(options.outputDir, "tool.xml"), "utf8");
    expect(xml).toBe(
      tool
        .replace("id = 'seqkit_stats'", "id = 'nfcore_compat_seqkit_stats'")
        .replace(
          'name="Seqkit &amp; stats"',
          'name="Seqkit &amp; stats (Nextflow Module Automated Conversion)"',
        ),
    );
    expect(snapshot(options.inputDir)).toEqual(before);
    expect(readFileSync(path.join(options.outputDir, "macros.xml"))).toEqual(before["macros.xml"]);
    expect(readFileSync(path.join(options.outputDir, "_provenance.yml"))).toEqual(
      before["_provenance.yml"],
    );
    const shed = parse(readFileSync(path.join(options.outputDir, ".shed.yml"), "utf8"));
    expect(shed).toMatchObject({
      ...metadata,
      owner: "iwc-lab",
      name: "nfcore_compat_seqkit_stats",
      type: "unrestricted",
    });
    expect(shed.remote_repository_url).toBe(
      "https://github.com/galaxyproject/tools-iwc-lab/tree/main/tool_collections/nf_core_modules/seqkit/stats",
    );
    expect(result.destination_path).toBe("tool_collections/nf_core_modules/seqkit/stats");
    const record = JSON.parse(
      readFileSync(path.join(options.outputDir, "_publication.json"), "utf8"),
    );
    expect(record.source).toMatchObject({
      module_path: provenance.nfcore_source.module_path,
      git_sha: moduleSha,
    });
    expect(record.validation.status).toBe("not_run");
    expect(record.prepared_by).toMatchObject({
      package: "@galaxy-foundry/nfcore-tool-lab",
      version: packageVersion,
    });
    for (const [name, hash] of Object.entries(record.output_sha256)) {
      expect(hash).toBe(
        createHash("sha256")
          .update(readFileSync(path.join(options.outputDir, name)))
          .digest("hex"),
      );
    }
    expect(record.output_sha256).not.toHaveProperty("_publication.json");
    expect(record.input_sha256["tool.xml"]).toBe(
      createHash("sha256").update(before["tool.xml"]!).digest("hex"),
    );
    const readme = readFileSync(path.join(options.outputDir, "README.md"), "utf8");
    expect(readme).toContain(moduleSha);
    expect(readme).toContain(datasetSha);
    expect(readme).toContain("No versions channel in Galaxy");
    expect(readme).toContain("not been run");
  });

  test("is reproducible and does not double-prefix or double-suffix prepared input", () => {
    const options = fixture();
    prepareLabTool(options);
    const repeatDir = path.join(options.root, "repeat");
    prepareLabTool({ ...options, outputDir: repeatDir });
    expect(snapshot(repeatDir)).toEqual(snapshot(options.outputDir));
    const chainedDir = path.join(options.root, "chained");
    prepareLabTool({ ...options, inputDir: options.outputDir, outputDir: chainedDir });
    expect(readFileSync(path.join(chainedDir, "tool.xml"))).toEqual(
      readFileSync(path.join(options.outputDir, "tool.xml")),
    );
    expect(readFileSync(path.join(chainedDir, "_provenance.yml"))).toEqual(
      readFileSync(path.join(options.inputDir, "_provenance.yml")),
    );
  });

  test("copies only explicitly selected assets, never traces or stray secrets", () => {
    const options = fixture();
    mkdirSync(path.join(options.inputDir, "test-data"));
    writeFileSync(path.join(options.inputDir, "test-data", "input.fa"), ">a\nACGT\n");
    writeFileSync(path.join(options.inputDir, "helper.py"), "print('ok')\n");
    writeFileSync(path.join(options.inputDir, "auth.json"), "secret");
    writeFileSync(path.join(options.inputDir, "trace.jsonl"), "trace");
    prepareLabTool({ ...options, assets: ["test-data", "helper.py"] });
    expect(readFileSync(path.join(options.outputDir, "test-data", "input.fa"), "utf8")).toBe(
      ">a\nACGT\n",
    );
    expect(existsSync(path.join(options.outputDir, "helper.py"))).toBe(true);
    expect(existsSync(path.join(options.outputDir, "auth.json"))).toBe(false);
    expect(existsSync(path.join(options.outputDir, "trace.jsonl"))).toBe(false);
  });

  test("accepts an explicitly named older conversion wrapper", () => {
    const options = fixture();
    writeFileSync(path.join(options.inputDir, "seqkit_stats.xml"), tool);
    prepareLabTool({ ...options, toolFilename: "seqkit_stats.xml" });
    expect(readFileSync(path.join(options.outputDir, "tool.xml"), "utf8")).toContain(
      "nfcore_compat_seqkit_stats",
    );
  });

  test("dry-run computes the same record without making any directories", () => {
    const options = fixture();
    const outputDir = path.join(options.root, "missing-parent", "prepared");
    const before = snapshot(options.inputDir);
    const preview = prepareLabTool({ ...options, outputDir, dryRun: true });
    expect(existsSync(path.dirname(outputDir))).toBe(false);
    expect(snapshot(options.inputDir)).toEqual(before);
    expect(prepareLabTool({ ...options, outputDir })).toEqual(preview);
  });

  test("preserves executable assets", () => {
    const options = fixture();
    writeFileSync(path.join(options.inputDir, "helper.sh"), "#!/bin/sh\nexit 0\n");
    chmodSync(path.join(options.inputDir, "helper.sh"), 0o755);
    prepareLabTool({ ...options, assets: ["helper.sh"] });
    expect(lstatSync(path.join(options.outputDir, "helper.sh")).mode & 0o100).toBe(0o100);
  });

  test("safely escapes decoded names while preserving all other attributes", () => {
    const options = fixture();
    const xml =
      '<?before content?><tool name=\'α &amp; &apos;Stats&apos; &quot;🧬&quot;\' version="1" id="old">' +
      body;
    writeFileSync(path.join(options.inputDir, "tool.xml"), xml);
    const result = prepareLabTool(options);
    expect(result.tool.name).toBe("α & 'Stats' \"🧬\" (Nextflow Module Automated Conversion)");
    expect(readFileSync(path.join(options.outputDir, "tool.xml"), "utf8")).toBe(
      xml
        .replace('id="old"', 'id="nfcore_compat_seqkit_stats"')
        .replace(
          "name='α &amp; &apos;Stats&apos; &quot;🧬&quot;'",
          "name='α &amp; &apos;Stats&apos; \"🧬\" (Nextflow Module Automated Conversion)'",
        ),
    );
  });

  test("retains a null converter bundle identity without inventing one", () => {
    const options = fixture();
    const unavailable = {
      ...provenance,
      generated: { ...provenance.generated, cast_artifact_sha: null },
    };
    writeFileSync(path.join(options.inputDir, "_provenance.yml"), stringify(unavailable));
    prepareLabTool(options);
    expect(
      parse(readFileSync(path.join(options.outputDir, "_provenance.yml"), "utf8")).generated
        .cast_artifact_sha,
    ).toBeNull();
  });

  test("rejects an already prefixed identity belonging to another module", () => {
    const options = fixture();
    writeFileSync(
      path.join(options.inputDir, "tool.xml"),
      tool.replace("seqkit_stats", "nfcore_compat_seqkit_grep"),
    );
    expect(() => prepareLabTool(options)).toThrow(/does not match/);
    expect(existsSync(options.outputDir)).toBe(false);
  });

  test("retains backticks in divergence notes inside a sufficiently long code fence", () => {
    const options = fixture();
    writeFileSync(
      path.join(options.inputDir, "_provenance.yml"),
      stringify({ ...provenance, overrides: [{ reason: "Contains ```yaml and `command`" }] }),
    );
    prepareLabTool(options);
    const readme = readFileSync(path.join(options.outputDir, "README.md"), "utf8");
    expect(readme).toContain("Contains ```yaml and `command`");
    expect(readme).toContain("````yaml\n");
  });

  test("rejects duplicate and case-insensitive generated-file asset collisions", () => {
    const options = fixture();
    writeFileSync(path.join(options.inputDir, "helper.py"), "print('ok')\n");
    expect(() => prepareLabTool({ ...options, assets: ["helper.py", "helper.py"] })).toThrow(
      /collision/,
    );
    mkdirSync(path.join(options.inputDir, "README.md"));
    writeFileSync(path.join(options.inputDir, "README.md", "child.txt"), "text");
    expect(() => prepareLabTool({ ...options, assets: ["README.md"] })).toThrow(/collision/);
    expect(existsSync(options.outputDir)).toBe(false);
  });

  test("rejects symbolic links in asset ancestor directories", () => {
    const options = fixture();
    const outside = path.join(options.root, "outside");
    mkdirSync(outside);
    writeFileSync(path.join(outside, "helper.py"), "print('ok')\n");
    symlinkSync(outside, path.join(options.inputDir, "scripts"), "dir");
    expect(() => prepareLabTool({ ...options, assets: ["scripts/helper.py"] })).toThrow(/symbolic/);
    expect(existsSync(options.outputDir)).toBe(false);
  });

  test("rejects malformed macros and provenance before writing output", () => {
    const options = fixture();
    writeFileSync(path.join(options.inputDir, "macros.xml"), "<macros>");
    expect(() => prepareLabTool(options)).toThrow();
    writeFileSync(path.join(options.inputDir, "macros.xml"), "<macros/>");
    writeFileSync(path.join(options.inputDir, "_provenance.yml"), "generated: [\n");
    expect(() => prepareLabTool(options)).toThrow(/provenance YAML/);
    expect(existsSync(options.outputDir)).toBe(false);
  });

  test.each([
    "../stats",
    "/stats",
    "seqkit//stats",
    "seqkit/../stats",
    "seqkit\\stats",
    "seqkit/-stats",
  ])("rejects unsafe module path %s before creating output", (modulePath) => {
    const options = fixture();
    writeFileSync(
      path.join(options.inputDir, "_provenance.yml"),
      stringify({
        ...provenance,
        nfcore_source: {
          ...provenance.nfcore_source,
          module_path: `modules/nf-core/${modulePath}`,
        },
      }),
    );
    expect(() => prepareLabTool(options)).toThrow(/module_path/);
    expect(existsSync(options.outputDir)).toBe(false);
  });

  test.each([
    { description: "" },
    { categories: [] },
    { homepage_url: "javascript:alert(1)" },
    { homepage_url: "https://user:secret@example.org/" },
    { owner: "iuc" },
  ])("rejects invalid or unsupported metadata %j", (override) => {
    const options = fixture();
    expect(() => prepareLabTool({ ...options, metadata: { ...metadata, ...override } })).toThrow(
      /metadata/,
    );
    expect(existsSync(options.outputDir)).toBe(false);
  });

  test.each([
    "<tool id='a' name='b'><command></tool>",
    "<tool id='a' id='b' name='c'/>",
    "<tool id='a' name='&undefined;'/>",
    '<!DOCTYPE tool SYSTEM "file:///etc/passwd"><tool id="a" name="b"/>',
    "<macros id='a' name='b'/>",
    "<tool id='a'/>",
  ])("rejects malformed or unsupported XML %s", (xml) => {
    const options = fixture();
    writeFileSync(path.join(options.inputDir, "tool.xml"), xml);
    expect(() => prepareLabTool(options)).toThrow();
    expect(existsSync(options.outputDir)).toBe(false);
  });

  test.each([
    { modules_repo: "other/modules" },
    { git_sha: "master" },
    { test_datasets_sha: "main" },
  ])("requires the pinned nf-core source %j", (override) => {
    const options = fixture();
    writeFileSync(
      path.join(options.inputDir, "_provenance.yml"),
      stringify({ ...provenance, nfcore_source: { ...provenance.nfcore_source, ...override } }),
    );
    expect(() => prepareLabTool(options)).toThrow(/provenance/);
    expect(existsSync(options.outputDir)).toBe(false);
  });

  test("refuses to overwrite an existing output directory", () => {
    const options = fixture();
    mkdirSync(options.outputDir);
    writeFileSync(path.join(options.outputDir, "keep.txt"), "keep");
    expect(() => prepareLabTool(options)).toThrow(/exist/);
    expect(readFileSync(path.join(options.outputDir, "keep.txt"), "utf8")).toBe("keep");
  });

  test("refuses output inside input, including symlinked parents", () => {
    const options = fixture();
    expect(() =>
      prepareLabTool({ ...options, outputDir: path.join(options.inputDir, "prepared") }),
    ).toThrow(/input/);
    symlinkSync(options.inputDir, path.join(options.root, "alias"), "dir");
    expect(() =>
      prepareLabTool({ ...options, outputDir: path.join(options.root, "alias", "prepared") }),
    ).toThrow(/input/);
  });

  test.each(["../auth.json", "/tmp/file", ".git", "README.md", "tool.xml"])(
    "rejects unsafe or colliding asset %s",
    (asset) => {
      const options = fixture();
      expect(() => prepareLabTool({ ...options, assets: [asset] })).toThrow();
      expect(existsSync(options.outputDir)).toBe(false);
    },
  );

  test("rejects symlinks in required files and selected asset trees", () => {
    const options = fixture();
    symlinkSync(path.join(options.inputDir, "tool.xml"), path.join(options.inputDir, "linked.xml"));
    expect(() => prepareLabTool({ ...options, toolFilename: "linked.xml" })).toThrow(/symbolic/);
    mkdirSync(path.join(options.inputDir, "test-data"));
    symlinkSync(
      path.join(options.inputDir, "tool.xml"),
      path.join(options.inputDir, "test-data", "linked.xml"),
    );
    expect(() => prepareLabTool({ ...options, assets: ["test-data"] })).toThrow(/symbolic/);
    expect(existsSync(options.outputDir)).toBe(false);
  });
});
