#!/usr/bin/env node
import fs from "node:fs";
import yaml from "js-yaml";

const [mode, field] = process.argv.slice(2);
const manifest = new URL("../fixtures.yaml", import.meta.url);
const data = yaml.load(fs.readFileSync(manifest, "utf8"));

if (mode === "iwc") {
  if (!field || !(field in data.iwc)) process.exit(1);
  process.stdout.write(`${data.iwc[field]}\n`);
} else if (mode === "pipelines") {
  for (const p of data.pipelines) {
    process.stdout.write([p.name, p.repo, p.sha, p.tag].join("\t") + "\n");
  }
} else if (mode === "cwl") {
  for (const p of data.cwl_repositories ?? []) {
    process.stdout.write([p.name, p.repo, p.sha, p.tag].join("\t") + "\n");
  }
} else {
  process.stderr.write("usage: read-fixture-manifest.mjs iwc <field>|pipelines|cwl\n");
  process.exit(1);
}
