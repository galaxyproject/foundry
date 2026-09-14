import { readFileSync } from "node:fs";
import path from "node:path";

import {
  DEFAULT_ROADMAP_PATH,
  DEFAULT_ROADMAP_REPO,
  fetchRoadmapMetadata,
  validateRoadmap,
} from "../lib/roadmap.js";

interface ValidateRoadmapArgs {
  file: string;
  repo: string;
}

export async function runValidateRoadmapCommand(argv = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const markdown = readFileSync(options.file, "utf8");
  const metadata = await fetchRoadmapMetadata(options.repo);
  const errors = validateRoadmap(markdown, metadata, options.repo);
  if (errors.length) {
    for (const error of errors) process.stderr.write(`ERROR: ${error}\n`);
    process.stderr.write(`FAILED: ${errors.length} roadmap validation error(s)\n`);
    process.exitCode = 1;
    return;
  }

  const mains = metadata.issues.filter((issue) => issue.labels.includes("roadmap/main")).length;
  const substeps = metadata.issues.filter((issue) =>
    issue.labels.includes("roadmap/substep"),
  ).length;
  process.stdout.write(
    `roadmap agrees with ${options.repo}: ${mains} mains, ${substeps} substeps\n`,
  );
}

function parseArgs(argv: string[]): ValidateRoadmapArgs {
  let root = ".";
  let file: string | undefined;
  let repo = DEFAULT_ROADMAP_REPO;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--root") root = argv[++index] ?? root;
    else if (arg?.startsWith("--root=")) root = arg.slice("--root=".length);
    else if (arg === "--file") file = argv[++index];
    else if (arg?.startsWith("--file=")) file = arg.slice("--file=".length);
    else if (arg === "--repo") repo = argv[++index] ?? repo;
    else if (arg?.startsWith("--repo=")) repo = arg.slice("--repo=".length);
    else throw new Error(`unknown validate-roadmap option: ${arg}`);
  }
  if (!/^[^/]+\/[^/]+$/.test(repo))
    throw new Error(`invalid repository '${repo}'; expected owner/name`);
  return { file: file ?? path.join(root, DEFAULT_ROADMAP_PATH), repo };
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) {
  runValidateRoadmapCommand().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
