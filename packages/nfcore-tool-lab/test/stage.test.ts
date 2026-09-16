import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { stringify } from "yaml";

import { stageLabTool, type StageLabToolOptions } from "../src/stage.js";
import { prepareLabTool } from "../src/index.js";

const roots: string[] = [];
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const metadata = {
  description: "Sequence statistics",
  categories: ["Sequence Analysis"],
  homepage_url: "https://bioinf.shenwei.me/seqkit/",
};

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "nfcore-lab-stage-test-"));
  roots.push(root);
  const inputDir = path.join(root, "input");
  const destinationDir = path.join(root, "destination");
  const castBundleDir = path.join(root, "cast");
  for (const dir of [inputDir, destinationDir, castBundleDir]) mkdirSync(dir);
  const skill = "---\nname: convert-nfcore-module-to-galaxy-tool\n---\nConvert a module.\n";
  writeFileSync(path.join(castBundleDir, "SKILL.md"), skill);
  const castProvenance = JSON.stringify({
    mold: { name: "convert-nfcore-module-to-galaxy-tool", revision: 11 },
    cast_target: "claude",
  });
  writeFileSync(path.join(castBundleDir, "_provenance.json"), castProvenance);
  const castSha = hash(`_provenance.json\0${castProvenance}\0SKILL.md\0${skill}\0`);
  writeFileSync(
    path.join(inputDir, "tool.xml"),
    '<tool id="seqkit_stats" name="SeqKit stats" version="1"><tests><test><output name="stats" md5="' +
      "a".repeat(32) +
      '"/></test></tests></tool>',
  );
  writeFileSync(path.join(inputDir, "macros.xml"), "<macros/>");
  writeFileSync(
    path.join(inputDir, "_provenance.yml"),
    stringify({
      nfcore_source: {
        modules_repo: "nf-core/modules",
        module_path: "modules/nf-core/seqkit/stats",
        git_sha: "1".repeat(40),
        test_datasets_sha: "2".repeat(40),
      },
      generated: {
        by_mold: "convert-nfcore-module-to-galaxy-tool",
        mold_revision: 11,
        cast_target: "claude",
        cast_artifact_sha: castSha,
      },
      overrides: [{ reason: "Stub omitted" }],
    }),
  );
  const conversionRunFile = path.join(root, "run.json");
  writeFileSync(
    conversionRunFile,
    JSON.stringify({
      run_schema_version: 1,
      status: "passed",
      invocation: { skill: "convert-nfcore-module-to-galaxy-tool", skill_sha256: castSha },
      artifacts: [
        { id: "galaxy-tool", path: "tool.xml" },
        { id: "galaxy-tool-macros", path: "macros.xml" },
        { id: "galaxy-tool-provenance", path: "_provenance.yml" },
      ].map((a) => ({
        ...a,
        status: "present",
        sha256: hash(readFileSync(path.join(inputDir, a.path))),
      })),
    }),
  );
  const preparation = prepareLabTool({
    inputDir,
    outputDir: path.join(root, "unused"),
    metadata,
    dryRun: true,
  });
  const reviewFile = path.join(root, "review.json");
  writeFileSync(
    reviewFile,
    JSON.stringify({
      schema_version: 1,
      input_sha256: preparation.input_sha256,
      reviewer: "Maintainer",
      licensing: {
        status: "approved",
        notes: "Checked redistribution terms",
        evidence: ["nf-core-module", "wrapper", "software", "test-data"].map((component) => ({
          component,
          license: "MIT",
          reference: "https://example.org/license",
        })),
      },
      coverage: {
        status: "approved",
        notes: "Reviewed upstream cases at pinned revision",
        cases: [
          { upstream_test: "single_end", galaxy_test_index: 0 },
          { upstream_test: "stub", galaxy_test_index: null, omission_reason: "Stub-only case" },
        ],
      },
    }),
  );
  const planemoFile = path.join(root, "planemo.cjs");
  writeFileSync(
    planemoFile,
    `const fs = require('node:fs'); const args = process.argv.slice(2); if (args.includes('--version')) console.log('planemo, version 0.75.47'); if (args.includes('test')) { const file = args[args.indexOf('--test_output_json') + 1]; fs.writeFileSync(file, JSON.stringify({version:'0.1',exit_code:0,summary:{num_tests:1,num_errors:0,num_failures:0,num_skips:0},tests:[{id:'nfcore_compat_seqkit_stats-0',has_data:true,data:{status:'success'}}]})); }`,
  );
  const options: StageLabToolOptions = {
    inputDir,
    outputDir: path.join(root, "staging"),
    metadata,
    destinationDir,
    castBundleDir,
    conversionRunFile,
    reviewFile,
    planemoCommand: [process.execPath, planemoFile],
    timeoutMs: 5000,
  };
  return { root, options, reviewFile, planemoFile, preparation };
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test.each(["mold_revision", "cast_target"])(
  "checks converter %s against the bundle",
  async (field) => {
    const f = fixture();
    const filename = path.join(f.options.inputDir, "_provenance.yml");
    writeFileSync(
      filename,
      readFileSync(filename, "utf8").replace(
        field === "mold_revision" ? "mold_revision: 11" : "cast_target: claude",
        field === "mold_revision" ? "mold_revision: 99" : "cast_target: codex",
      ),
    );
    const report = await stageLabTool(f.options);
    expect(report.checks.find((c) => c.id === "conversion_identity")?.status).toBe("failed");
  },
);

test("requires conversion artifact hashes, not merely the supplied bundle hash", async () => {
  const f = fixture();
  const run = JSON.parse(readFileSync(f.options.conversionRunFile, "utf8"));
  run.artifacts[0].sha256 = "a".repeat(64);
  writeFileSync(f.options.conversionRunFile, JSON.stringify(run));
  const report = await stageLabTool(f.options);
  expect(report.checks.find((c) => c.id === "conversion_identity")?.message).toContain(
    "artifact does not match",
  );
});

test.each(["missing_omission", "out_of_range", "unaccounted", "duplicate_case"])(
  "rejects %s coverage review",
  async (kind) => {
    const f = fixture();
    const review = JSON.parse(readFileSync(f.reviewFile, "utf8"));
    if (kind === "missing_omission") delete review.coverage.cases[1].omission_reason;
    if (kind === "out_of_range") review.coverage.cases[0].galaxy_test_index = 1;
    if (kind === "unaccounted") review.coverage.cases.shift();
    if (kind === "duplicate_case") review.coverage.cases[1].upstream_test = "single_end";
    writeFileSync(f.reviewFile, JSON.stringify(review));
    const report = await stageLabTool(f.options);
    expect(report.checks.find((c) => c.id === "coverage")?.status).toBe("failed");
  },
);

test("requires licensing evidence for test data as well as software and wrappers", async () => {
  const f = fixture();
  const review = JSON.parse(readFileSync(f.reviewFile, "utf8"));
  review.licensing.evidence.pop();
  writeFileSync(f.reviewFile, JSON.stringify(review));
  const report = await stageLabTool(f.options);
  expect(report.checks.find((c) => c.id === "licensing")?.status).toBe("failed");
});

test.each(["conversion", "destination", "cast"])(
  "rejects output inside the %s tree before writing",
  async (kind) => {
    const f = fixture();
    const directory =
      kind === "conversion"
        ? f.options.inputDir
        : kind === "destination"
          ? f.options.destinationDir
          : f.options.castBundleDir;
    f.options.outputDir = path.join(directory, "staging");
    await expect(stageLabTool(f.options)).rejects.toThrow(/must be separate/);
    expect(existsSync(f.options.outputDir)).toBe(false);
  },
);

test("does not follow symlinks when inspecting a destination snapshot", async () => {
  const f = fixture();
  symlinkSync(f.options.inputDir, path.join(f.options.destinationDir, "escape"));
  const report = await stageLabTool(f.options);
  expect(report.checks.find((c) => c.id === "destination_collisions")?.status).toBe("failed");
});

test("does not forward GitHub, npm, provider credentials or ambient Planemo options", async () => {
  const f = fixture();
  for (const key of [
    "GH_TOKEN",
    "GITHUB_TOKEN",
    "NPM_TOKEN",
    "OPENAI_API_KEY",
    "PLANEMO_TEST_INDEX",
  ])
    vi.stubEnv(key, "test-only-placeholder");
  const script = readFileSync(f.planemoFile, "utf8");
  writeFileSync(
    f.planemoFile,
    `console.error(JSON.stringify(Object.keys(process.env)));\n${script}`,
  );
  const report = await stageLabTool(f.options);
  expect(report.status).toBe("passed");
  const envKeys = JSON.parse(
    readFileSync(path.join(f.options.outputDir, "evidence/planemo_version.stderr.log"), "utf8"),
  );
  expect(envKeys).not.toContain("GH_TOKEN");
  expect(envKeys).not.toContain("NPM_TOKEN");
  expect(envKeys).not.toContain("OPENAI_API_KEY");
  expect(envKeys).not.toContain("PLANEMO_TEST_INDEX");
  for (const command of report.commands.filter((c) => c.check !== "planemo_version"))
    expect(command.argv).toContain("--config");
});

test("kills timed-out commands and reports the failure", async () => {
  const f = fixture();
  f.options.timeoutMs = 300;
  writeFileSync(f.planemoFile, "setInterval(() => {}, 1000);");
  const report = await stageLabTool(f.options);
  expect(report.checks.find((c) => c.id === "planemo_version")?.message).toContain("timed out");
});

test("propagates cancellation and does not launch remaining checks", async () => {
  const f = fixture();
  const controller = new AbortController();
  f.options.signal = controller.signal;
  writeFileSync(f.planemoFile, "setInterval(() => {}, 1000);");
  const timer = setTimeout(() => controller.abort(), 250);
  try {
    const report = await stageLabTool(f.options);
    expect(report.checks.find((c) => c.id === "planemo_version")?.message).toContain("cancelled");
    expect(report.commands).toHaveLength(1);
    expect(report.checks.find((c) => c.id === "planemo_tests")?.status).toBe("not_run");
  } finally {
    clearTimeout(timer);
  }
});

test("records a nonzero lint result and continues independent test checks", async () => {
  const f = fixture();
  writeFileSync(
    f.planemoFile,
    readFileSync(f.planemoFile, "utf8") + "\nif(args.includes('lint')) process.exit(1);",
  );
  const report = await stageLabTool(f.options);
  expect(report.checks.find((c) => c.id === "planemo_lint")?.status).toBe("failed");
  expect(report.checks.find((c) => c.id === "planemo_tests")?.status).toBe("passed");
  expect(report.ready_for_draft_pr).toBe(false);
});

test.each(["null", "absent"])(
  "accepts Planemo's nullable report exit_code (%s) only with successful process and tests",
  async (kind) => {
    const f = fixture();
    const script = readFileSync(f.planemoFile, "utf8");
    writeFileSync(
      f.planemoFile,
      script.replace("exit_code:0,", kind === "null" ? "exit_code:null," : ""),
    );
    const report = await stageLabTool(f.options);
    expect(report.checks.find((c) => c.id === "planemo_tests")?.status).toBe("passed");
  },
);

test("rejects oversized command logs", async () => {
  const f = fixture();
  writeFileSync(
    f.planemoFile,
    "process.stdout.write('x'.repeat(5 * 1024 * 1024)); setInterval(() => {}, 1000);",
  );
  const report = await stageLabTool(f.options);
  expect(report.checks.find((c) => c.id === "planemo_version")?.message).toContain(
    "exceeded 4 MiB",
  );
});

test.each(["<tests/>", '<tests><expand macro="tests"/></tests>'])(
  "does not certify absent or macro-expanded test inventories",
  async (tests) => {
    const f = fixture();
    const filename = path.join(f.options.inputDir, "tool.xml");
    writeFileSync(
      filename,
      readFileSync(filename, "utf8").replace(/<tests>[\s\S]*<\/tests>/, tests),
    );
    const report = await stageLabTool(f.options);
    expect(report.checks.find((c) => c.id === "declared_tests")?.status).toBe("failed");
    expect(report.checks.find((c) => c.id === "planemo_tests")?.status).toBe("not_run");
  },
);

test("rejects payload mutations during validation", async () => {
  const f = fixture();
  writeFileSync(
    f.planemoFile,
    readFileSync(f.planemoFile, "utf8") +
      "\nif(args.includes('lint')) fs.appendFileSync('tool.xml', '\\n<!-- mutation -->');",
  );
  const report = await stageLabTool(f.options);
  expect(report.checks.find((c) => c.id === "package_integrity")?.status).toBe("failed");
  expect(report.ready_for_draft_pr).toBe(false);
});

test("runs real checks on an execution copy and keeps logs/reviews outside publication payload", async () => {
  const f = fixture();
  const report = await stageLabTool(f.options);
  expect(report.commands.find((c) => c.check === "planemo_tests")?.argv.join(" ")).toContain(
    "execution/tool_collections/nf_core_modules/seqkit/stats/tool.xml",
  );
  expect(report.evidence_sha256["evidence/review.json"]).toBe(hash(readFileSync(f.reviewFile)));
  expect(Object.keys(report.package_sha256)).not.toContain("validation.json");
});

test("stages a reviewed tool, runs checks and writes a draft PR proposal without touching inputs", async () => {
  const f = fixture();
  const before = readFileSync(path.join(f.options.inputDir, "tool.xml"));
  const report = await stageLabTool(f.options);
  expect(report.status).toBe("passed");
  expect(report.ready_for_draft_pr).toBe(true);
  expect(report.checks.every((c) => c.status === "passed")).toBe(true);
  const packageDir = path.join(f.options.outputDir, "package");
  expect(
    JSON.parse(readFileSync(path.join(packageDir, "_publication.json"), "utf8")).validation.status,
  ).toBe("not_run");
  expect(readFileSync(path.join(f.options.inputDir, "tool.xml"))).toEqual(before);
  const proposal = JSON.parse(
    readFileSync(path.join(f.options.outputDir, "pr-proposal.json"), "utf8"),
  );
  expect(proposal).toMatchObject({
    repository: "galaxyproject/tools-iwc-lab",
    destination_path: "tool_collections/nf_core_modules/seqkit/stats",
    draft: true,
  });
  expect(readFileSync(path.join(f.options.outputDir, "pr-body.md"), "utf8")).toContain(
    "AI-generated",
  );
});

test("missing human review stays blocked even when Planemo passes", async () => {
  const f = fixture();
  delete f.options.reviewFile;
  const report = await stageLabTool(f.options);
  expect(report.status).toBe("blocked");
  expect(report.ready_for_draft_pr).toBe(false);
  expect(report.checks.find((c) => c.id === "licensing")?.status).toBe("needs_review");
  expect(report.checks.find((c) => c.id === "coverage")?.status).toBe("needs_review");
  expect(report.checks.find((c) => c.id === "planemo_tests")?.status).toBe("passed");
});

test("rejects stale review attestations", async () => {
  const f = fixture();
  const review = JSON.parse(readFileSync(f.reviewFile, "utf8"));
  review.input_sha256["tool.xml"] = "a".repeat(64);
  writeFileSync(f.reviewFile, JSON.stringify(review));
  const report = await stageLabTool(f.options);
  expect(report.ready_for_draft_pr).toBe(false);
  expect(report.checks.find((c) => c.id === "licensing")?.status).toBe("failed");
});

test("flags the legacy Mold-source hash without repairing provenance", async () => {
  const f = fixture();
  const filename = path.join(f.options.inputDir, "_provenance.yml");
  const before = readFileSync(filename, "utf8").replace(
    /cast_artifact_sha: [a-f0-9]+/,
    "cast_artifact_sha: " + "a".repeat(64),
  );
  writeFileSync(filename, before);
  const report = await stageLabTool(f.options);
  expect(report.checks.find((c) => c.id === "conversion_identity")?.status).toBe("failed");
  expect(readFileSync(path.join(f.options.outputDir, "package/_provenance.yml"), "utf8")).toBe(
    before,
  );
});

test("detects nested tool and Shed-name collisions in a read-only destination snapshot", async () => {
  const f = fixture();
  const dir = path.join(f.options.destinationDir, "tool_collections/other/module");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "other.xml"),
    '<tool id="nfcore_compat_seqkit_stats" name="Other"/>',
  );
  writeFileSync(path.join(dir, ".shed.yml"), "name: nfcore_compat_seqkit_stats\nowner: iwc-lab\n");
  const report = await stageLabTool(f.options);
  expect(report.checks.find((c) => c.id === "destination_collisions")?.status).toBe("failed");
  expect(readFileSync(path.join(dir, ".shed.yml"), "utf8")).toContain("iwc-lab");
});

test.each(["missing", "skipped", "wrong_identity", "empty", "bad_summary", "malformed"])(
  "rejects a %s test report despite exit zero",
  async (kind) => {
    const f = fixture();
    const r = {
      version: "0.1",
      exit_code: 0,
      summary: { num_tests: 1, num_errors: 0, num_failures: 0, num_skips: 0 },
      tests: [{ id: "nfcore_compat_seqkit_stats-0", has_data: true, data: { status: "success" } }],
    };
    if (kind === "skipped") r.tests[0]!.data.status = "skip";
    if (kind === "wrong_identity") r.tests[0]!.id = "unrelated-0";
    if (kind === "empty") r.tests = [];
    if (kind === "bad_summary") r.summary.num_tests = 99;
    writeFileSync(
      f.planemoFile,
      `const fs=require('node:fs'); const a=process.argv.slice(2); if(a.includes('--version')) console.log('planemo, version 0.75.47'); if(a.includes('test') && ${JSON.stringify(kind)} !== 'missing') fs.writeFileSync(a[a.indexOf('--test_output_json')+1], ${JSON.stringify(kind === "malformed" ? "{" : JSON.stringify(r))});`,
    );
    const report = await stageLabTool(f.options);
    expect(report.checks.find((c) => c.id === "planemo_tests")?.status).toBe("failed");
    expect(report.ready_for_draft_pr).toBe(false);
  },
);

test("records missing executable and still emits useful report and proposal", async () => {
  const f = fixture();
  f.options.planemoCommand = [path.join(f.root, "absent")];
  const report = await stageLabTool(f.options);
  expect(report.status).toBe("blocked");
  expect(report.checks.find((c) => c.id === "planemo_version")?.status).toBe("failed");
  expect(report.checks.find((c) => c.id === "planemo_tests")?.status).toBe("not_run");
  expect(existsSync(path.join(f.options.outputDir, "validation.json"))).toBe(true);
});

test("does not overwrite a staging directory", async () => {
  const f = fixture();
  mkdirSync(f.options.outputDir);
  writeFileSync(path.join(f.options.outputDir, "keep"), "user data");
  await expect(stageLabTool(f.options)).rejects.toThrow(/already exists/);
  expect(readFileSync(path.join(f.options.outputDir, "keep"), "utf8")).toBe("user data");
});
