// Pack each publishable package as a tarball, install into a throwaway consumer
// project, and exercise the bin + library export. Catches packaging regressions
// (missing files in `files`, missing dist assets, broken sub-path exports).

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = mkdtempSync(join(tmpdir(), "foundry-smoke-"));
const consumerDir = join(tempRoot, "consumer");
mkdirSync(consumerDir);

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: "inherit", ...options });
}

function packTarball(pkg) {
  run("pnpm", ["--filter", pkg, "pack", "--pack-destination", tempRoot], { cwd: repoRoot });
  const prefix = pkg.replace("@galaxy-foundry/", "galaxy-foundry-");
  const tarball = readdirSync(tempRoot).find(
    (name) => name.endsWith(".tgz") && name.startsWith(prefix),
  );
  if (!tarball) throw new Error(`no tarball for ${pkg} in ${tempRoot}`);
  return join(tempRoot, tarball);
}

run("npm", ["init", "-y"], { cwd: consumerDir });

const summarizeNextflowTarball = packTarball("@galaxy-foundry/summarize-nextflow");
const foundryTarball = packTarball("@galaxy-foundry/foundry");

// foundry depends on summarize-nextflow at workspace:* in source; install both
// from local tarballs so the consumer install resolves them.
run("npm", ["install", summarizeNextflowTarball, foundryTarball], { cwd: consumerDir });

const summaryPath = join(
  repoRoot,
  "casts/claude/skills/summarize-nextflow/runs/nf-core__demo/summary.json",
);

const summarizeNextflowSmoke = join(consumerDir, "smoke-summarize-nextflow.mjs");
writeFileSync(
  summarizeNextflowSmoke,
  `import { readFileSync } from "node:fs";\n` +
    `import { summaryNextflowSchema, validateSummary } from "@galaxy-foundry/summarize-nextflow";\n` +
    `if (!summaryNextflowSchema.$schema) throw new Error("schema missing $schema");\n` +
    `const data = JSON.parse(readFileSync(${JSON.stringify(summaryPath)}, "utf8"));\n` +
    `const result = validateSummary(data);\n` +
    `if (!result.valid) throw new Error(JSON.stringify(result.errors));\n`,
);
run("node", [summarizeNextflowSmoke], { cwd: consumerDir });
run("npx", ["summarize-nextflow", "--help"], { cwd: consumerDir });

const foundrySmoke = join(consumerDir, "smoke-foundry.mjs");
writeFileSync(
  foundrySmoke,
  `import { summaryCwlValidator, galaxyToolDiscoveryValidator, summaryNextflowValidator } from "@galaxy-foundry/foundry";\n` +
    `for (const v of [summaryCwlValidator, galaxyToolDiscoveryValidator, summaryNextflowValidator]) {\n` +
    `  const r = v.validate({});\n` +
    `  if (r.valid) throw new Error("expected empty object to fail validation");\n` +
    `}\n`,
);
run("node", [foundrySmoke], { cwd: consumerDir });
run("npx", ["foundry", "validate-summary-nextflow", summaryPath], { cwd: consumerDir });

console.log(`smoke install ok: ${summarizeNextflowTarball}, ${foundryTarball}`);
