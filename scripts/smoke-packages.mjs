// Pack every public workspace package, install the tarballs into a throwaway
// consumer, and exercise each package's runtime surface. This catches regressions
// in `files`, exports, bins, and workspace dependency rewriting.

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
  "@galaxy-foundry/foundry": `
    import {
      summaryCwlValidator,
      galaxyToolDiscoveryValidator,
      summaryNextflowValidator,
    } from "@galaxy-foundry/foundry";
    for (const validator of [
      summaryCwlValidator,
      galaxyToolDiscoveryValidator,
      summaryNextflowValidator,
    ]) {
      const result = validator.validate({});
      if (result.valid) throw new Error("expected empty object to fail validation");
    }
  `,
  "@galaxy-foundry/note-schema": `
    import { DEFINITIONS, KINDS } from "@galaxy-foundry/note-schema";
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

  console.log(`smoke install ok: ${packageNames.join(", ")}`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
