// Pack every public workspace package, install the tarballs into a throwaway
// consumer, and exercise each package's runtime surface. This catches regressions
// in `files`, exports, bins, and workspace dependency rewriting.

import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import process from "node:process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(repoRoot, "packages");
const tempRoot = mkdtempSync(join(tmpdir(), "foundry-smoke-"));
const consumerDir = join(tempRoot, "consumer");

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: "inherit", ...options });
}

function publicPackages() {
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifestPath = join(packagesDir, entry.name, "package.json");
      try {
        return JSON.parse(readFileSync(manifestPath, "utf8"));
      } catch (error) {
        if (error?.code === "ENOENT") return null;
        throw error;
      }
    })
    .filter(
      (manifest) =>
        manifest && manifest.private !== true && manifest.publishConfig?.access === "public",
    )
    .map((manifest) => manifest.name)
    .sort();
}

function packTarball(packageName) {
  run("pnpm", ["--filter", packageName, "pack", "--pack-destination", tempRoot], {
    cwd: repoRoot,
  });
  const prefix = packageName.replace("@galaxy-foundry/", "galaxy-foundry-");
  const tarball = readdirSync(tempRoot).find(
    (name) => name.endsWith(".tgz") && name.startsWith(prefix),
  );
  if (!tarball) throw new Error(`no tarball for ${packageName} in ${tempRoot}`);
  return join(tempRoot, tarball);
}

const smokeScripts = {
  "@galaxy-foundry/nfcore-tool-lab": `
    import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
    import { join } from "node:path";
    import { prepareLabTool, packageVersion } from "@galaxy-foundry/nfcore-tool-lab";
    import { stageLabTool } from "@galaxy-foundry/nfcore-tool-lab/stage";
    if (typeof stageLabTool !== "function") throw new Error("lab staging export missing");
    const inputDir = join(process.cwd(), "lab-conversion");
    const outputDir = join(process.cwd(), "lab-prepared");
    mkdirSync(inputDir);
    writeFileSync(join(inputDir, "tool.xml"), '<tool id="stats" name="Stats" version="1"><command><![CDATA[  seqkit stats  ]]></command></tool>');
    writeFileSync(join(inputDir, "macros.xml"), '<macros/>');
    writeFileSync(join(inputDir, "_provenance.yml"), JSON.stringify({
      nfcore_source: {
        modules_repo: "nf-core/modules", module_path: "modules/nf-core/seqkit/stats",
        git_sha: "1".repeat(40), test_datasets_sha: "2".repeat(40),
      },
      generated: {
        by_mold: "convert-nfcore-module-to-galaxy-tool", mold_revision: 11,
        cast_target: "claude", cast_artifact_sha: "3".repeat(64),
      },
      overrides: [],
    }));
    const metadata = {
      description: "Sequence statistics", categories: ["Sequence Analysis"],
      homepage_url: "https://bioinf.shenwei.me/seqkit/",
    };
    writeFileSync(join(inputDir, "metadata.json"), JSON.stringify(metadata));
    const record = prepareLabTool({ inputDir, outputDir, metadata });
    if (record.tool.id !== "nfcore_compat_seqkit_stats") throw new Error("lab identity missing");
    if (record.prepared_by.version !== packageVersion) throw new Error("package version mismatch");
    const xml = readFileSync(join(outputDir, "tool.xml"), "utf8");
    if (!xml.includes("<![CDATA[  seqkit stats  ]]>") || !xml.includes("(Nextflow Module Automated Conversion)")) {
      throw new Error("tool command or lab name changed incorrectly");
    }
    const destinationDir = join(process.cwd(), "lab-destination");
    const castBundleDir = join(process.cwd(), "lab-cast");
    const conversionRunFile = join(process.cwd(), "lab-run.json");
    mkdirSync(destinationDir); mkdirSync(castBundleDir);
    writeFileSync(conversionRunFile, '{}');
    const staged = await stageLabTool({
      inputDir, outputDir: join(process.cwd(), "lab-staged"), metadata,
      destinationDir, castBundleDir, conversionRunFile,
      planemoCommand: [join(process.cwd(), "absent-planemo")],
    });
    if (staged.ready_for_draft_pr || staged.status !== "blocked") throw new Error("staging must report missing gates");
    const proposal = JSON.parse(readFileSync(join(process.cwd(), "lab-staged/pr-proposal.json"), "utf8"));
    if (!proposal.draft || proposal.repository !== "galaxyproject/tools-iwc-lab") throw new Error("draft proposal missing");
  `,
  "@galaxy-foundry/gxwf-foundry": `
    import {
      summaryCwlValidator,
      galaxyToolDiscoveryValidator,
      summaryNextflowValidator,
    } from "@galaxy-foundry/gxwf-foundry";
    for (const validator of [
      summaryCwlValidator,
      galaxyToolDiscoveryValidator,
      summaryNextflowValidator,
    ]) {
      const result = validator.validate({});
      if (result.valid) throw new Error("expected empty object to fail validation");
    }
  `,
  "@galaxy-foundry/gxwf-foundry-note-schema": `
    import { DEFINITIONS, KINDS } from "@galaxy-foundry/gxwf-foundry-note-schema";
    if (KINDS.length === 0) throw new Error("note kinds are empty");
    if (DEFINITIONS.mold.kind !== "mold") throw new Error("mold definition missing");
  `,
  "@galaxy-foundry/planemo-cli-meta": `
    import { createRequire } from "node:module";
    import { readFileSync } from "node:fs";
    import {
      planemoCliMeta,
      planemoCliMetaProvenance,
    } from "@galaxy-foundry/planemo-cli-meta";
    const require = createRequire(import.meta.url);
    const raw = JSON.parse(
      readFileSync(require.resolve("@galaxy-foundry/planemo-cli-meta/cli-meta.json"), "utf8"),
    );
    const provenance = JSON.parse(
      readFileSync(require.resolve("@galaxy-foundry/planemo-cli-meta/provenance.json"), "utf8"),
    );
    if (!planemoCliMeta.commands.some(({ name }) => name === "test")) {
      throw new Error("planemo test command missing");
    }
    if (raw.commands.length !== planemoCliMeta.commands.length) {
      throw new Error("raw CLI metadata differs from typed export");
    }
    if (provenance.source.release !== planemoCliMetaProvenance.source.release) {
      throw new Error("raw CLI provenance differs from typed export");
    }
  `,
  "@galaxy-foundry/planemo-test-report-schema": `
    import { createRequire } from "node:module";
    import { readFileSync } from "node:fs";
    import {
      planemoTestReportProvenance,
      planemoTestReportSchema,
      validatePlanemoTestReport,
    } from "@galaxy-foundry/planemo-test-report-schema";
    const require = createRequire(import.meta.url);
    const raw = JSON.parse(
      readFileSync(
        require.resolve("@galaxy-foundry/planemo-test-report-schema/schema.json"),
        "utf8",
      ),
    );
    const provenance = JSON.parse(
      readFileSync(
        require.resolve("@galaxy-foundry/planemo-test-report-schema/provenance.json"),
        "utf8",
      ),
    );
    if (!planemoTestReportSchema.$schema) throw new Error("schema missing $schema");
    if (raw.$schema !== planemoTestReportSchema.$schema) {
      throw new Error("raw schema differs from typed export");
    }
    if (validatePlanemoTestReport({}).valid) {
      throw new Error("expected empty report to fail validation");
    }
    if (provenance.source.release !== planemoTestReportProvenance.source.release) {
      throw new Error("raw report provenance differs from typed export");
    }
  `,
  "@galaxy-foundry/gxwf-pi-harness": `
    import extension from "@galaxy-foundry/gxwf-pi-harness/extension";
    import { runPiSkill } from "@galaxy-foundry/gxwf-pi-harness";
    if (typeof extension !== "function" || typeof runPiSkill !== "function") {
      throw new Error("pi-harness exports missing");
    }
  `,
  "@galaxy-foundry/summarize-nextflow": `
    import { readFileSync } from "node:fs";
    import {
      summaryNextflowSchema,
      validateSummary,
    } from "@galaxy-foundry/summarize-nextflow";
    if (!summaryNextflowSchema.$schema) throw new Error("schema missing $schema");
    const data = JSON.parse(
      readFileSync(
        ${JSON.stringify(
          join(repoRoot, "casts/claude/skills/summarize-nextflow/runs/nf-core__demo/summary.json"),
        )},
        "utf8",
      ),
    );
    const result = validateSummary(data);
    if (!result.valid) throw new Error(JSON.stringify(result.errors));
  `,
};

try {
  mkdirSync(consumerDir);
  run("npm", ["init", "-y"], { cwd: consumerDir });

  const packageNames = publicPackages();
  const missingSmoke = packageNames.filter((name) => !smokeScripts[name]);
  const staleSmoke = Object.keys(smokeScripts).filter((name) => !packageNames.includes(name));
  if (missingSmoke.length || staleSmoke.length) {
    throw new Error(
      `smoke coverage mismatch; missing: ${missingSmoke.join(", ") || "none"}; stale: ${
        staleSmoke.join(", ") || "none"
      }`,
    );
  }

  // Install all tarballs together so workspace dependencies resolve to the exact
  // artifacts under test rather than to whatever npm currently serves.
  const tarballs = packageNames.map(packTarball);
  run("npm", ["install", ...tarballs], { cwd: consumerDir });

  for (const packageName of packageNames) {
    const scriptPath = join(
      consumerDir,
      `smoke-${packageName.replace("@galaxy-foundry/", "")}.mjs`,
    );
    writeFileSync(scriptPath, smokeScripts[packageName]);
    run("node", [scriptPath], { cwd: consumerDir });
  }

  const summaryPath = join(
    repoRoot,
    "casts/claude/skills/summarize-nextflow/runs/nf-core__demo/summary.json",
  );
  run("npx", ["--no-install", "summarize-nextflow", "--help"], {
    cwd: consumerDir,
  });
  run("npx", ["--no-install", "foundry", "validate-summary-nextflow", summaryPath], {
    cwd: consumerDir,
  });
  run("npx", ["--no-install", "validate-planemo-test-report", "--help"], {
    cwd: consumerDir,
  });
  run(
    "npx",
    [
      "--no-install",
      "nfcore-tool-lab",
      "prepare",
      "--input",
      "lab-conversion",
      "--output",
      "lab-cli-prepared",
      "--metadata",
      "lab-conversion/metadata.json",
    ],
    { cwd: consumerDir },
  );
  const labCliRecord = JSON.parse(
    readFileSync(join(consumerDir, "lab-cli-prepared", "_publication.json"), "utf8"),
  );
  if (labCliRecord.tool.id !== "nfcore_compat_seqkit_stats")
    throw new Error("lab CLI preparation failed");
  const labBin = join(
    consumerDir,
    "node_modules/@galaxy-foundry/nfcore-tool-lab/dist/bin/nfcore-tool-lab.js",
  );
  const labArgs = [
    labBin,
    "prepare",
    "--input",
    "lab-conversion",
    "--metadata",
    "lab-conversion/metadata.json",
  ];
  const preview = spawnSync(
    process.execPath,
    [...labArgs, "--output", "lab-preview", "--dry-run"],
    { cwd: consumerDir, encoding: "utf8" },
  );
  if (
    preview.status !== 0 ||
    JSON.parse(preview.stdout).tool.id !== "nfcore_compat_seqkit_stats" ||
    existsSync(join(consumerDir, "lab-preview"))
  )
    throw new Error("lab CLI dry-run failed");
  const rejected = spawnSync(process.execPath, [...labArgs, "--output", "lab-cli-prepared"], {
    cwd: consumerDir,
    encoding: "utf8",
  });
  if (rejected.status !== 1 || rejected.stdout || !rejected.stderr.includes("already exists"))
    throw new Error("lab CLI must refuse overwrite with nonzero exit status");
  const staged = spawnSync(
    process.execPath,
    [
      labBin,
      "stage",
      "--input",
      "lab-conversion",
      "--output",
      "lab-cli-staged",
      "--metadata",
      "lab-conversion/metadata.json",
      "--destination",
      "lab-destination",
      "--cast-bundle",
      "lab-cast",
      "--conversion-run",
      "lab-run.json",
      "--planemo",
      join(consumerDir, "absent-planemo"),
    ],
    { cwd: consumerDir, encoding: "utf8" },
  );
  if (
    staged.status !== 1 ||
    staged.stderr ||
    JSON.parse(staged.stdout).ready_for_draft_pr !== false
  )
    throw new Error("lab staging CLI must retain a blocked report with nonzero exit status");

  console.log(`smoke install ok: ${packageNames.join(", ")}`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
