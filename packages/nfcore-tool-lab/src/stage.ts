import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  planemoTestReportProvenance,
  validatePlanemoTestReport,
} from "@galaxy-foundry/planemo-test-report-schema";
import {
  packageVersion,
  prepareLabTool,
  type LabPublicationRecord,
  type PrepareLabToolOptions,
} from "./index.js";
import {
  checkConversionIdentity,
  destinationInventory,
  readRegular,
  record,
  reviewChecks,
  sha256,
  toolTests,
  treeFiles,
  type StageCheck,
} from "./stage-checks.js";

export interface StageLabToolOptions extends Omit<PrepareLabToolOptions, "dryRun"> {
  destinationDir: string;
  castBundleDir: string;
  conversionRunFile: string;
  reviewFile?: string;
  planemoCommand?: string[];
  timeoutMs?: number;
  galaxyRoot?: string;
  galaxyPythonVersion?: "3.11" | "3.12";
  condaPrefix?: string;
  signal?: AbortSignal;
}

export interface StageCommandResult {
  check: string;
  argv: string[];
  exit_code: number | null;
  signal: string | null;
  error?: string;
  stdout: string;
  stderr: string;
}

export interface LabValidationReport {
  schema_version: 1;
  staged_by: { package: string; version: string };
  status: "passed" | "blocked";
  ready_for_draft_pr: boolean;
  publication: LabPublicationRecord;
  package_sha256: Record<string, string>;
  evidence_sha256: Record<string, string>;
  checks: StageCheck[];
  commands: StageCommandResult[];
  execution: {
    security_boundary: false;
    credential_policy: "filtered-environment";
    timeout_ms_per_command: number;
  };
  limitations: string[];
}

function canonical(filename: string): string {
  if (existsSync(filename)) return realpathSync(filename);
  const parent = path.dirname(filename);
  return parent === filename ? filename : path.join(canonical(parent), path.basename(filename));
}

function within(root: string, filename: string): boolean {
  const relative = path.relative(root, filename);
  return (
    relative === "" ||
    (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

async function runCommand(
  check: string,
  argv: string[],
  cwd: string,
  timeoutMs: number,
  stdout: string,
  stderr: string,
  signal?: AbortSignal,
): Promise<StageCommandResult> {
  const env: NodeJS.ProcessEnv = {};
  for (const key of ["PATH", "HOME", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL", "SYSTEMROOT"])
    if (process.env[key]) env[key] = process.env[key];
  const result: StageCommandResult = { check, argv, exit_code: null, signal: null, stdout, stderr };
  return new Promise((resolve, reject) => {
    const child = spawn(argv[0]!, argv.slice(1), {
      cwd,
      env,
      shell: false,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const streams = { stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
    const stop = (message: string) => {
      result.error ??= message;
      if (child.pid) {
        try {
          process.kill(process.platform === "win32" ? child.pid : -child.pid, "SIGKILL");
        } catch {
          child.kill("SIGKILL");
        }
      }
    };
    const timer = setTimeout(() => stop(`command timed out after ${timeoutMs} ms`), timeoutMs);
    const cancel = () => stop("command cancelled");
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) cancel();
    for (const channel of ["stdout", "stderr"] as const)
      child[channel].on("data", (bytes: Buffer) => {
        if (streams[channel].length + bytes.length > 4 * 1024 * 1024) {
          stop("command output exceeded 4 MiB per stream");
          return;
        }
        streams[channel] = Buffer.concat([streams[channel], bytes]);
      });
    child.on("error", (error) => {
      result.error = error.message;
    });
    child.on("close", (code, exitSignal) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      result.exit_code = code;
      result.signal = exitSignal;
      try {
        writeFileSync(stdout, streams.stdout, { flag: "wx" });
        writeFileSync(stderr, streams.stderr, { flag: "wx" });
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

function assertTestReport(filename: string, id: string, count: number): void {
  const report = JSON.parse(readRegular(filename).toString("utf8")) as unknown;
  const validation = validatePlanemoTestReport(report);
  if (!validation.valid)
    throw new Error(`invalid Planemo report: ${JSON.stringify(validation.errors)}`);
  const data = record(report);
  const summary = record(data.summary);
  if (
    (data.exit_code !== undefined && data.exit_code !== null && data.exit_code !== 0) ||
    summary.num_tests !== count ||
    summary.num_errors !== 0 ||
    summary.num_failures !== 0 ||
    summary.num_skips !== 0
  )
    throw new Error(
      "Planemo report must account for all declared tests without errors, failures, or skips",
    );
  const tests = data.tests as unknown[];
  if (tests.length !== count)
    throw new Error("Planemo report test count does not match the wrapper");
  const ids = new Set<string>();
  for (const value of tests) {
    const test = record(value);
    const name = String(test.id);
    if (test.has_data !== true || record(test.data).status !== "success" || ids.has(name))
      throw new Error("every distinct Planemo test must contain successful execution data");
    ids.add(name);
  }
  for (let index = 0; index < count; index++)
    if (!ids.has(`${id}-${index}`))
      throw new Error(`Planemo report missing prepared-tool test ${id}-${index}`);
}

export async function stageLabTool(options: StageLabToolOptions): Promise<LabValidationReport> {
  const outputDir = canonical(path.resolve(options.outputDir));
  if (existsSync(outputDir)) throw new Error(`output directory already exists: ${outputDir}`);
  for (const input of [options.inputDir, options.destinationDir, options.castBundleDir]) {
    const root = canonical(path.resolve(input));
    if (within(root, outputDir) || within(outputDir, root))
      throw new Error(
        "staging output must be separate from conversion, destination, and cast bundle trees",
      );
  }
  for (const filename of [options.conversionRunFile, options.reviewFile].filter(
    (value): value is string => value !== undefined,
  ))
    if (within(outputDir, canonical(path.resolve(filename))))
      throw new Error("evidence inputs must be outside staging output");
  const timeoutMs = options.timeoutMs ?? 30 * 60 * 1000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 24 * 60 * 60 * 1000)
    throw new Error("timeoutMs must be an integer between 1 ms and 24 hours");
  const command = options.planemoCommand ?? ["planemo"];
  const galaxyPythonVersion = options.galaxyPythonVersion ?? "3.11";
  if (!["3.11", "3.12"].includes(galaxyPythonVersion))
    throw new Error("galaxyPythonVersion must be 3.11 or 3.12");
  if (
    !command.length ||
    command.some((arg) => typeof arg !== "string" || !arg || arg.includes("\0"))
  )
    throw new Error("planemoCommand must contain an executable and nonempty arguments");
  const packageDir = path.join(outputDir, "package");
  const publication = prepareLabTool({ ...options, outputDir: packageDir, dryRun: true });
  mkdirSync(path.dirname(outputDir), { recursive: true });
  mkdirSync(outputDir);
  prepareLabTool({ ...options, outputDir: packageDir });
  const expectedHashes = {
    ...publication.output_sha256,
    "_publication.json": sha256(readFileSync(path.join(packageDir, "_publication.json"))),
  };
  const evidenceDir = path.join(outputDir, "evidence");
  mkdirSync(evidenceDir);
  let reviewFile = options.reviewFile;
  if (options.reviewFile) {
    try {
      const retainedReview = path.join(evidenceDir, "review.json");
      writeFileSync(retainedReview, readRegular(options.reviewFile), {
        flag: "wx",
      });
      reviewFile = retainedReview;
    } catch {
      /* Invalid review is reported by the review checks. */
    }
  }
  const executionDir = path.join(outputDir, "execution", publication.destination_path);
  mkdirSync(path.dirname(executionDir), { recursive: true });
  cpSync(packageDir, executionDir, { recursive: true, errorOnExist: true });
  const config = path.join(evidenceDir, "planemo.yml");
  writeFileSync(config, "{}\n", { flag: "wx" });
  const checks: StageCheck[] = [];
  const commands: StageCommandResult[] = [];
  const check = (id: string, operation: () => string): void => {
    try {
      checks.push({ id, status: "passed", message: operation() });
    } catch (error) {
      checks.push({ id, status: "failed", message: (error as Error).message });
    }
  };
  check("conversion_identity", () => {
    const retainedRun = path.join(evidenceDir, "conversion-run.json");
    writeFileSync(retainedRun, readRegular(options.conversionRunFile), { flag: "wx" });
    return checkConversionIdentity(
      publication,
      packageDir,
      options.castBundleDir,
      retainedRun,
      options.toolFilename ?? "tool.xml",
    );
  });
  check("destination_collisions", () => destinationInventory(options.destinationDir, publication));
  let count = 0;
  check("declared_tests", () => {
    count = toolTests(readFileSync(path.join(packageDir, "tool.xml"), "utf8"));
    return `${count} explicit Galaxy tests declared.`;
  });
  checks.push(...reviewChecks(reviewFile, publication, count));
  const execute = async (id: string, args: string[]) => {
    if (options.signal?.aborted) throw new Error("staging cancelled; no further commands launched");
    const result = await runCommand(
      id,
      [...command, ...args],
      executionDir,
      timeoutMs,
      path.join(evidenceDir, `${id}.stdout.log`),
      path.join(evidenceDir, `${id}.stderr.log`),
      options.signal,
    );
    commands.push({
      ...result,
      stdout: path.relative(outputDir, result.stdout),
      stderr: path.relative(outputDir, result.stderr),
    });
    if (result.error || result.exit_code !== 0)
      throw new Error(
        result.error ??
          `Planemo exited ${result.exit_code} (${result.signal ?? "no signal"}); see evidence logs`,
      );
    return result;
  };
  let versionOk = false;
  try {
    const result = await execute("planemo_version", ["--version"]);
    const version = planemoTestReportProvenance.planemo_version;
    if (readFileSync(result.stdout, "utf8").trim() !== `planemo, version ${version}`)
      throw new Error(`Planemo must be ${version}, matching the report schema pin`);
    versionOk = true;
    checks.push({ id: "planemo_version", status: "passed", message: `Planemo ${version}.` });
  } catch (error) {
    checks.push({ id: "planemo_version", status: "failed", message: (error as Error).message });
  }
  const globalArgs = ["--config", config];
  const reportFile = path.join(evidenceDir, "planemo-tests.json");
  const testArgs = [
    "test",
    path.join(executionDir, "tool.xml"),
    "--galaxy_python_version",
    galaxyPythonVersion,
    "--test_output_json",
    reportFile,
    "--test_output",
    path.join(evidenceDir, "planemo-tests.html"),
    "--test_output_xunit",
    path.join(evidenceDir, "planemo-tests.xml"),
  ];
  if (options.galaxyRoot) testArgs.push("--galaxy_root", path.resolve(options.galaxyRoot));
  else testArgs.push("--install_galaxy", "--galaxy_branch", "release_26.1");
  if (options.condaPrefix) testArgs.push("--conda_prefix", path.resolve(options.condaPrefix));
  for (const [id, args] of [
    ["planemo_lint", ["lint", path.join(executionDir, "tool.xml"), "--fail_level", "warn"]],
    ["shed_metadata", ["shed_lint", executionDir, "--ensure_metadata", "--fail_level", "warn"]],
    ["planemo_tests", testArgs],
  ] as const) {
    if (!versionOk || (id === "planemo_tests" && !count)) {
      checks.push({
        id,
        status: "not_run",
        message: "Blocked by Planemo version or declared-test check.",
      });
      continue;
    }
    try {
      await execute(id, [...globalArgs, ...args]);
      if (id === "planemo_tests") assertTestReport(reportFile, publication.tool.id, count);
      checks.push({
        id,
        status: "passed",
        message:
          id === "planemo_tests"
            ? `${count}/${count} final-package Galaxy tests passed, with no skips.`
            : "Planemo check passed at warning-level strictness.",
      });
    } catch (error) {
      checks.push({ id, status: "failed", message: (error as Error).message });
    }
  }
  check("package_integrity", () => {
    for (const dir of [packageDir, executionDir])
      for (const [filename, expected] of Object.entries(expectedHashes))
        if (sha256(readRegular(path.join(dir, filename))) !== expected)
          throw new Error(`validated payload changed: ${filename}`);
    if (
      JSON.stringify(treeFiles(packageDir).sort()) !==
      JSON.stringify(Object.keys(expectedHashes).sort())
    )
      throw new Error("staged package contains unexpected files");
    return "Prepared payload remained byte-identical in staging and the validation execution copy.";
  });
  const passed = checks.every((entry) => entry.status === "passed");
  const report: LabValidationReport = {
    schema_version: 1,
    staged_by: { package: "@galaxy-foundry/nfcore-tool-lab", version: packageVersion },
    status: passed ? "passed" : "blocked",
    ready_for_draft_pr: passed,
    publication,
    package_sha256: expectedHashes,
    evidence_sha256: Object.fromEntries(
      treeFiles(evidenceDir).map((filename) => [
        `evidence/${filename}`,
        sha256(readRegular(path.join(evidenceDir, filename))),
      ]),
    ),
    checks,
    commands,
    execution: {
      security_boundary: false,
      credential_policy: "filtered-environment",
      timeout_ms_per_command: timeoutMs,
    },
    limitations: [
      "Local wrapper execution is not a security sandbox. No GitHub/npm/provider credential variables are forwarded; host filesystem and network remain accessible.",
      "Supplied local conversion evidence and destination snapshot are not authenticated against upstream services.",
      "Licensing and complete upstream coverage require hash-bound human review.",
      "Destination CI discovery and CI success remain unverified until the draft PR; this report is not merge or Tool Shed deployment approval.",
    ],
  };
  writeFileSync(path.join(outputDir, "validation.json"), `${JSON.stringify(report, null, 2)}\n`, {
    flag: "wx",
  });
  const reviewTemplate = {
    schema_version: 1,
    input_sha256: publication.input_sha256,
    reviewer: "TODO: maintainer identity",
    licensing: {
      status: "needs_review",
      notes: "Review redistribution eligibility for the module, wrapper, software and test data.",
      evidence: [],
    },
    coverage: {
      status: "needs_review",
      notes:
        "Inventory all upstream cases at the pinned source and map them to zero-based Galaxy test indices or document omissions.",
      cases: [],
    },
  };
  writeFileSync(
    path.join(outputDir, "review-template.json"),
    `${JSON.stringify(reviewTemplate, null, 2)}\n`,
    { flag: "wx" },
  );
  const moduleName = publication.source.module_path.slice("modules/nf-core/".length);
  const proposal = {
    schema_version: 1,
    repository: publication.destination_repository,
    base: "main",
    draft: true,
    destination_path: publication.destination_path,
    title: `Add nf-core ${moduleName} automated conversion`,
    ready_for_draft_pr: passed,
    package_directory: "package",
    body_file: "pr-body.md",
    validation_file: "validation.json",
  };
  writeFileSync(
    path.join(outputDir, "pr-proposal.json"),
    `${JSON.stringify(proposal, null, 2)}\n`,
    { flag: "wx" },
  );
  const body = `## Automated nf-core module conversion\n\nAI-generated Galaxy wrapper for [${publication.source.module_path}](https://github.com/nf-core/modules/tree/${publication.source.git_sha}/${publication.source.module_path}). Experimental \`iwc-lab\` tool, not an IUC release.\n\n- Tool: \`${publication.tool.id}\`\n- Destination: \`${publication.destination_path}\`\n- Module commit: \`${publication.source.git_sha}\`\n- Test dataset commit: \`${publication.source.test_datasets_sha}\`\n- Preparation/staging: \`@galaxy-foundry/nfcore-tool-lab@${packageVersion}\`\n- Local staging gate: **${report.status}**\n\n## Checks\n\n${checks.map((entry) => `- ${entry.id}: ${entry.status} — ${entry.message}`).join("\n")}\n\n## Conversion divergences and coverage\n\nReview unchanged \`_provenance.yml\` and \`README.md\` in the tool directory. Passing tests do not erase documented omissions. \`_publication.json\` remains the preparation-only record (\`validation.status: not_run\`); the separate staging \`validation.json\` carries the executed checks and payload/evidence hashes.\n\n## Before review/merge\n\nVerify destination CI discovers this nested repository and passes. Recheck collisions against the current destination, review licensing/coverage evidence, and retain the staging report/logs outside the tool payload. No Tool Shed deployment is requested or enabled by this proposal.\n`;
  writeFileSync(path.join(outputDir, "pr-body.md"), body, { flag: "wx" });
  return report;
}
