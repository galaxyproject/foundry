import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { PROVENANCE_SCHEMA_VERSION } from "@galaxy-foundry/cast";
import { fileSlug } from "../packages/build-cli/src/lib/walk.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const castMold = path.join(repoRoot, "scripts", "cast-mold.ts");
const foundryBuild = path.join(repoRoot, "packages", "build-cli", "src", "bin", "foundry-build.ts");
const castVerify = path.join(repoRoot, "scripts", "cast-skill-verify.ts");
// Resolve the repo-local tsx binary by absolute path. Invoking `npx tsx` from a
// temp-dir cwd can't see local node_modules and auto-installs tsx into the
// shared npx cache; two such installs racing across test files corrupt it.
const tsxBin = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);

// A temp repo is a miniature Foundry, and a Foundry without a reference contract has no
// `cast:` declarations to compile against — the caster reads which kinds are castable, what
// each defaults to and how each resolves from this file. Fixtures write their own
// `_target.yml` (placement, per test) and inherit the real contract (strategy, repo-wide),
// which is the same split the two files have in the repo proper.
function seedReferenceContract(dir: string): void {
  copyFileSync(
    path.join(repoRoot, "reference_contract.yml"),
    path.join(dir, "reference_contract.yml"),
  );
}

function runTsx(script: string, args: string[]): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(tsxBin, [script, ...args], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    const err = e as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      code: typeof err.status === "number" ? err.status : 1,
      stdout: typeof err.stdout === "string" ? err.stdout : (err.stdout?.toString() ?? ""),
      stderr: typeof err.stderr === "string" ? err.stderr : (err.stderr?.toString() ?? ""),
    };
  }
}

describe("cast-mold (summarize-nextflow integration)", () => {
  it("--check passes for the committed cast", () => {
    const r = runTsx(castMold, ["summarize-nextflow", "--target=claude", "--check"]);
    expect(r.code, `stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);
    expect(r.stdout).toContain("clean");
  });

  it("foundry-build cast --check passes for the committed cast", () => {
    const r = runTsx(foundryBuild, ["cast", "summarize-nextflow", "--target=claude", "--check"]);
    expect(r.code, `stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);
    expect(r.stdout).toContain("clean");
  });

  // Gutting the committed `_verify.json` in place and restoring it in a `finally` is the same
  // hazard the mutated-contract helper below was rewritten to remove: vitest runs files in
  // parallel, so a sibling suite — or a `make check-casts` in another shell — reads a gutted
  // manifest and reports drift on a Mold nobody touched, and a SIGINT leaves it gutted in the
  // working tree. The bundle under test is COPIED into a temp root instead; only the copy is
  // damaged, and the tracked tree is never opened for writing.
  it("foundry-build cast --check catches stale _verify.json", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-verify-"));
    try {
      const bundle = path.join(root, "casts/claude/skills/summarize-nextflow");
      mkdirSync(bundle, { recursive: true });
      cpSync(path.join(repoRoot, "casts/claude/skills/summarize-nextflow"), bundle, {
        recursive: true,
      });
      copyFileSync(
        path.join(repoRoot, "casts/claude/_target.yml"),
        path.join(root, "casts/claude/_target.yml"),
      );
      seedReferenceContract(root);
      for (const name of ["content", "LICENSES"]) {
        symlinkSync(path.join(repoRoot, name), path.join(root, name));
      }
      writeFileSync(
        path.join(bundle, "_verify.json"),
        JSON.stringify({ verify_schema_version: 1, entries: [] }, null, 2) + "\n",
      );
      const r = runTsx(foundryBuild, [
        "cast",
        "summarize-nextflow",
        "--target=claude",
        "--check",
        "--root",
        root,
      ]);
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("_verify.json");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("provenance is schema v4 and lists deterministic refs", () => {
    const provPath = path.join(
      repoRoot,
      "casts",
      "claude",
      "skills",
      "summarize-nextflow",
      "_provenance.json",
    );
    const prov = JSON.parse(readFileSync(provPath, "utf8"));
    expect(prov.provenance_schema_version).toBe(4);
    expect(prov.cast_target).toBe("claude");
    expect(Array.isArray(prov.refs)).toBe(true);
    expect(prov.refs.length).toBeGreaterThan(0);
    for (const r of prov.refs) {
      expect(r.source).toBe("deterministic");
      expect(r.src_hash).toBe(r.dst_hash);
    }
    // Refs sorted by (kind, note), each note followed by its own companions.
    const keys = prov.refs.map(
      (r: { kind: string; dst: string; companion_of?: string }) =>
        `${r.kind}:${r.companion_of ?? r.dst}:${r.companion_of ? 1 : 0}:${r.dst}`,
    );
    expect(keys).toEqual([...keys].sort());
    // v3 license lineage: this mold vendors third-party schemas (nf-core MIT,
    // nf-schema Apache-2.0), so at least one ref carries license + hashed file.
    const licensed = prov.refs.filter(
      (r: { license?: string; license_file?: string; license_file_hash?: string }) =>
        r.license && r.license_file,
    );
    expect(licensed.length).toBeGreaterThan(0);
    for (const r of licensed) {
      expect(r.license_file).toMatch(/^LICENSES\//);
      expect(r.license_file_hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("verbatim refs are named for the note they came from", () => {
    const provPath = path.join(
      repoRoot,
      "casts",
      "claude",
      "skills",
      "summarize-nextflow",
      "_provenance.json",
    );
    const prov = JSON.parse(readFileSync(provPath, "utf8"));
    for (const r of prov.refs) {
      if (r.mode !== "verbatim") continue;
      // Package-vendored schema refs use a `package://...#export` src marker; the
      // dst basename derives from the schema note slug, not the export name.
      if (typeof r.src === "string" && r.src.startsWith("package://")) continue;
      // cli-tool notes may rename to their `tool:` field, which is the one case where
      // the bundle filename is not the note's own slug.
      if (r.kind === "cli-tool") continue;
      // A companion is not a note: it keeps its literal filename, which is what the
      // note body cites it by.
      const expected = r.companion_of
        ? path.basename(r.src)
        : `${fileSlug(r.src)}${path.extname(r.dst)}`;
      expect(path.basename(r.dst)).toBe(expected);
    }
  });
});

describe("required-tools manifest (summarize-cwl integration)", () => {
  const bundle = path.join(repoRoot, "casts", "claude", "skills", "summarize-cwl");
  const manifestPath = path.join(bundle, "_required_tools.json");

  it("emits _required_tools.json with referenced and implied tools", () => {
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Array<{
      tool: string;
      origin: string;
      invoke: string;
      source: string;
    }>;
    const slugs = manifest.map((t) => t.tool).sort();
    expect(slugs).toContain("cwltool");
    expect(slugs).toContain("cwl-utils");
    expect(slugs).toContain("foundry");
    for (const entry of manifest) {
      expect(entry.invoke.length).toBeGreaterThan(0);
      expect(["referenced", "implied"]).toContain(entry.source);
      expect(["npm", "pypi"]).toContain(entry.origin);
    }
  });

  it("SKILL.md Required Tools section renders install + ephemeral-run commands", () => {
    const skill = readFileSync(path.join(bundle, "SKILL.md"), "utf8");
    expect(skill).toContain("## Required Tools");
    expect(skill).toContain("uv tool install cwltool");
    expect(skill).toContain("uvx --from cwl-utils cwl-normalizer");
    expect(skill).toContain("npx --package @galaxy-foundry/foundry foundry");
  });
});

describe("cast-skill-verify (summarize-nextflow integration)", () => {
  it("verifier passes against committed cast", () => {
    const r = runTsx(castVerify, ["summarize-nextflow", "--target=claude"]);
    expect(r.code, `stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);
    expect(r.stdout).toContain("verify clean");
  });

  it("required outputs present", () => {
    const bundle = path.join(repoRoot, "casts", "claude", "skills", "summarize-nextflow");
    expect(existsSync(path.join(bundle, "SKILL.md"))).toBe(true);
    expect(existsSync(path.join(bundle, "_provenance.json"))).toBe(true);
    expect(existsSync(path.join(bundle, "_verify.json"))).toBe(true);
  });

  it("SKILL.md is rendered from Mold metadata, references, and body", () => {
    const skillPath = path.join(
      repoRoot,
      "casts",
      "claude",
      "skills",
      "summarize-nextflow",
      "SKILL.md",
    );
    const text = readFileSync(skillPath, "utf8");
    expect(text).toContain("Follow the procedure below");
    expect(text).toContain("## Inputs");
    expect(text).toContain("## Outputs");
    expect(text).toContain("`summary-nextflow`");
    expect(text).toContain("references/schemas/summary-nextflow.schema.json");
    expect(text).toContain("## Procedure");
    expect(text).toContain("Read a Nextflow pipeline source tree");
    expect(text).not.toContain("This skill was deterministically cast from its Mold");
    expect(text).not.toMatch(/\[\[[^\]]+\]\]/);
  });

  it("rejects unknown flags", () => {
    const r = runTsx(castVerify, ["summarize-nextflow", "--target=claude", "--bogus"]);
    expect(r.code).not.toBe(0);
  });
});

describe("artifact-contract inheritance", () => {
  it("consumer input inherits schema and producers from the producer's output_artifact", async () => {
    const { buildProducerIndex, readArtifactContracts } =
      await import("../packages/build-cli/src/commands/cast-mold.js");
    const meta = new Map<string, any>([
      [
        "content/molds/producer/index.md",
        {
          type: "mold",
          output_artifacts: [
            {
              id: "summary-x",
              kind: "json",
              default_filename: "summary-x.json",
              schema: "[[schema-x]]",
              description: "Producer output that downstream consumers bind to.",
            },
          ],
        },
      ],
      [
        "content/molds/consumer/index.md",
        {
          type: "mold",
          input_artifacts: [{ id: "summary-x", description: "Upstream summary used for binding." }],
        },
      ],
    ]);
    const idx = buildProducerIndex(meta);
    const contracts = readArtifactContracts(meta.get("content/molds/consumer/index.md")!, idx);
    expect(contracts).toBeDefined();
    expect(contracts!.consumes).toEqual([
      {
        id: "summary-x",
        description: "Upstream summary used for binding.",
        inherited_schema: "[[schema-x]]",
        producers: ["producer"],
      },
    ]);
  });

  it("builds a process-based verify manifest for output and inherited input schemas", async () => {
    const { buildProducerIndex, buildVerifyManifest } =
      await import("../packages/build-cli/src/commands/cast-mold.js");
    const meta = new Map<string, any>([
      [
        "content/molds/producer/index.md",
        {
          type: "mold",
          output_artifacts: [
            {
              id: "summary-x",
              kind: "json",
              default_filename: "summary-x.json",
              schema: "[[schema-x]]",
              description: "Producer output.",
            },
          ],
        },
      ],
      [
        "content/molds/consumer/index.md",
        {
          type: "mold",
          input_artifacts: [{ id: "summary-x", description: "Upstream summary." }],
          output_artifacts: [
            {
              id: "summary-y",
              kind: "json",
              default_filename: "summary-y.json",
              schema: "[[schema-y]]",
              description: "Consumer output.",
            },
          ],
        },
      ],
      [
        "content/schemas/schema-x.md",
        { type: "schema", name: "schema-x", validator_bin: "validate-schema-x" },
      ],
      [
        "content/schemas/schema-y.md",
        { type: "schema", name: "schema-y", validator_bin: "validate-schema-y" },
      ],
    ]);
    const slugMap = new Map([
      ["schema-x", "content/schemas/schema-x.md"],
      ["schema-y", "content/schemas/schema-y.md"],
    ]);
    const manifest = buildVerifyManifest(
      meta.get("content/molds/consumer/index.md")!,
      buildProducerIndex(meta),
      slugMap,
      meta,
    );
    expect(manifest).toEqual({
      verify_schema_version: 1,
      entries: [
        {
          artifact_id: "summary-x",
          direction: "input",
          kind: "json",
          default_filename: "summary-x.json",
          schema: "[[schema-x]]",
          validator_bin: "validate-schema-x",
          args: ["{artifact_path}"],
        },
        {
          artifact_id: "summary-y",
          direction: "output",
          kind: "json",
          default_filename: "summary-y.json",
          schema: "[[schema-y]]",
          validator_bin: "validate-schema-y",
          args: ["{artifact_path}"],
        },
      ],
    });
  });

  it("drops inherited_schema when producers disagree on the schema", async () => {
    const { buildProducerIndex, readArtifactContracts } =
      await import("../packages/build-cli/src/commands/cast-mold.js");
    const meta = new Map<string, any>([
      [
        "content/molds/producer-a/index.md",
        {
          type: "mold",
          output_artifacts: [
            {
              id: "shared",
              kind: "json",
              default_filename: "shared.json",
              schema: "[[schema-a]]",
              description: "Producer A output.",
            },
          ],
        },
      ],
      [
        "content/molds/producer-b/index.md",
        {
          type: "mold",
          output_artifacts: [
            {
              id: "shared",
              kind: "json",
              default_filename: "shared.json",
              schema: "[[schema-b]]",
              description: "Producer B output.",
            },
          ],
        },
      ],
      [
        "content/molds/consumer/index.md",
        {
          type: "mold",
          input_artifacts: [{ id: "shared", description: "Disagreement-test input." }],
        },
      ],
    ]);
    const idx = buildProducerIndex(meta);
    const contracts = readArtifactContracts(meta.get("content/molds/consumer/index.md")!, idx);
    expect(contracts!.consumes[0]?.inherited_schema).toBeUndefined();
    expect(contracts!.consumes[0]?.producers).toEqual(["producer-a", "producer-b"]);
  });
});

describe("cast-mold prompt refs", () => {
  it("copies the upstream.prompt companion using the prompt directory slug", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-prompt-"));
    seedReferenceContract(dir);
    try {
      mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
      mkdirSync(path.join(dir, "content/prompts/prompt-x"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
      writeFileSync(
        path.join(dir, "casts/claude/_target.yml"),
        [
          "name: claude",
          "provenance_schema_version: 4",
          "bundle_path: skills/{mold}",
          "required_outputs: [SKILL.md, _provenance.json]",
          "kinds:",
          "  prompt:",
          "    dst_dir: references/prompts/",
          "    dst_extension: .md",
          "    modes: [verbatim]",
          "skill_constraints:",
          "  frontmatter_required: [name, description]",
          "  forbidden_runtime_paths: []",
          "",
        ].join("\n"),
      );
      writeFileSync(
        path.join(dir, "content/molds/m/index.md"),
        `---
type: mold
name: m
axis: generic
tags: [mold]
status: draft
created: 2026-05-07
revised: 2026-05-07
revision: 1
summary: Prompt-copy cast test mold summary.
references:
  - kind: prompt
    ref: "[[prompt-x]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
---

# m

Use the prompt reference.
`,
      );
      writeFileSync(
        path.join(dir, "content/prompts/prompt-x/index.md"),
        `---
type: prompt
title: Prompt X
tags: [prompt]
status: draft
created: 2026-05-07
revised: 2026-05-07
revision: 1
summary: Prompt wrapper summary for cast sidecar behavior.
---

Wrapper body should not be copied.
`,
      );
      writeFileSync(path.join(dir, "content/prompts/prompt-x/upstream.prompt"), "RAW PROMPT\n");

      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code, `stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);
      const copied = readFileSync(
        path.join(dir, "casts/claude/skills/m/references/prompts/prompt-x.md"),
        "utf8",
      );
      expect(copied).toBe("RAW PROMPT\n");
      const prov = JSON.parse(
        readFileSync(path.join(dir, "casts/claude/skills/m/_provenance.json"), "utf8"),
      );
      expect(prov.refs[0].src).toBe("content/prompts/prompt-x/upstream.prompt");
      expect(prov.refs[0].dst).toBe("references/prompts/prompt-x.md");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("cast-mold provenance schema version", () => {
  it("emits the caster's version, not one the target claims", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-provver-"));
    seedReferenceContract(dir);
    try {
      mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
      mkdirSync(path.join(dir, "content/prompts/prompt-x"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
      writeFileSync(
        path.join(dir, "casts/claude/_target.yml"),
        [
          "name: claude",
          // A target cannot move the record's shape. If it could, this would produce a
          // document announcing a contract nothing writes and nothing validates.
          "provenance_schema_version: 99",
          "bundle_path: skills/{mold}",
          "required_outputs: [SKILL.md, _provenance.json]",
          "kinds:",
          "  prompt:",
          "    dst_dir: references/prompts/",
          "    dst_extension: .md",
          "    modes: [verbatim]",
          "skill_constraints:",
          "  frontmatter_required: [name, description]",
          "  forbidden_runtime_paths: []",
          "",
        ].join("\n"),
      );
      writeFileSync(
        path.join(dir, "content/molds/m/index.md"),
        `---
type: mold
name: m
axis: generic
tags: [mold]
status: draft
created: 2026-05-07
revised: 2026-05-07
revision: 1
summary: Provenance version cast test mold summary.
references:
  - kind: prompt
    ref: "[[prompt-x]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
---

# m

Use the prompt reference.
`,
      );
      writeFileSync(
        path.join(dir, "content/prompts/prompt-x/index.md"),
        `---
type: prompt
title: Prompt X
tags: [prompt]
status: draft
created: 2026-05-07
revised: 2026-05-07
revision: 1
summary: Prompt wrapper summary for provenance version test.
---

Wrapper body should not be copied.
`,
      );
      writeFileSync(path.join(dir, "content/prompts/prompt-x/upstream.prompt"), "RAW PROMPT\n");

      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code, `stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);
      const prov = JSON.parse(
        readFileSync(path.join(dir, "casts/claude/skills/m/_provenance.json"), "utf8"),
      );
      expect(prov.provenance_schema_version).toBe(PROVENANCE_SCHEMA_VERSION);
      expect(prov.provenance_schema_version).toBe(4);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("cast-mold cli-command meta injection", () => {
  it("embeds args/options from the package meta subpath and leaves the body flag-free", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-cli-"));
    seedReferenceContract(dir);
    try {
      mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
      mkdirSync(path.join(dir, "content/cli/galaxy-tool-cache"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
      writeFileSync(
        path.join(dir, "casts/claude/_target.yml"),
        [
          "name: claude",
          "provenance_schema_version: 4",
          "bundle_path: skills/{mold}",
          "required_outputs: [SKILL.md, _provenance.json]",
          "kinds:",
          "  cli-command:",
          "    dst_dir: references/cli/",
          "    dst_extension: .json",
          "    modes: [sidecar]",
          "skill_constraints:",
          "  frontmatter_required: [name, description]",
          "  forbidden_runtime_paths: []",
          "",
        ].join("\n"),
      );
      writeFileSync(
        path.join(dir, "content/molds/m/index.md"),
        `---
type: mold
name: m
axis: generic
tags: [mold]
status: draft
created: 2026-06-18
revised: 2026-06-18
revision: 1
summary: CLI meta-injection cast test mold summary.
references:
  - kind: cli-command
    ref: "[[add]]"
    used_at: runtime
    load: upfront
    mode: sidecar
    evidence: corpus-observed
---

# m

Use the cli-command reference.
`,
      );
      writeFileSync(
        path.join(dir, "content/cli/galaxy-tool-cache/add.md"),
        `---
type: cli-command
tool: galaxy-tool-cache
command: add
package: "@galaxy-tool-util/cli"
tags: [cli-command]
status: draft
created: 2026-06-18
revised: 2026-06-18
revision: 1
summary: Fetch a tool and cache it.
---

# \`galaxy-tool-cache add\`

Body prose only — no flag list; options come from the package meta.
`,
      );

      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code, `stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);
      const sidecar = JSON.parse(
        readFileSync(path.join(dir, "casts/claude/skills/m/references/cli/add.json"), "utf8"),
      );
      expect(sidecar.package).toBe("@galaxy-tool-util/cli");
      expect(sidecar.description).toMatch(/Fetch a tool/i);
      expect(Array.isArray(sidecar.options)).toBe(true);
      const galaxyUrl = sidecar.options.find((o: { flags: string }) =>
        o.flags.includes("--galaxy-url"),
      );
      expect(galaxyUrl?.description).toMatch(/after the ToolShed/i);
      expect(sidecar.body).not.toContain("## Flags");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("cast-mold companion files", () => {
  function writeCompanionFixture(
    dir: string,
    opts: {
      declareCompanions: boolean;
      /** Path of the sibling, relative to the note's directory. May name a subdirectory. */
      siblingName?: string;
      /** Name it only inside a fenced block, which is payload rather than a read instruction. */
      bodyMentionsSiblingInFence?: boolean;
    },
  ): void {
    const sibling = opts.siblingName ?? "bundled-note.spec.yml";
    mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
    mkdirSync(path.join(dir, "content/research/bundled-note"), { recursive: true });
    mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
    // The verifier loads the provenance schema relative to cwd; mirror it.
    mkdirSync(path.join(dir, "scripts/lib/schemas"), { recursive: true });
    writeFileSync(
      path.join(dir, "scripts/lib/schemas/cast-provenance.schema.json"),
      readFileSync(path.join(repoRoot, "scripts/lib/schemas/cast-provenance.schema.json"), "utf8"),
    );
    writeFileSync(
      path.join(dir, "casts/claude/_target.yml"),
      [
        "name: claude",
        "provenance_schema_version: 4",
        "bundle_path: skills/{mold}",
        "required_outputs: [SKILL.md, _provenance.json]",
        "kinds:",
        "  research:",
        "    dst_dir: references/notes/",
        "    dst_extension: .md",
        "    modes: [verbatim]",
        "skill_constraints:",
        "  frontmatter_required: [name, description]",
        "  forbidden_runtime_paths: []",
        "",
      ].join("\n"),
    );
    writeFileSync(
      path.join(dir, "content/molds/m/index.md"),
      `---
type: mold
name: m
axis: generic
tags: [mold]
status: draft
created: 2026-05-07
revised: 2026-05-07
revision: 1
summary: Companion-copy cast test mold summary.
references:
  - kind: research
    ref: "[[bundled-note]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    trigger: When reasoning about the bundled spec.
---

# m

Use the bundled note reference.
`,
    );
    const companionsFm = opts.declareCompanions ? `companions:\n  - ${sibling}\n` : "";
    const mention = opts.bodyMentionsSiblingInFence
      ? `\`\`\`vendored-view\nfile: ${sibling}\n\`\`\`\n`
      : `Consume \`${sibling}\` for the structured spec.\n`;
    writeFileSync(
      path.join(dir, "content/research/bundled-note/index.md"),
      `---
type: research
title: Bundled note
tags: [research/component]
status: draft
created: 2026-05-07
revised: 2026-05-07
revision: 1
summary: A multi-file note carrying a structured spec beside it for casting to bundle.
${companionsFm}---

${mention}`,
    );
    const siblingAbs = path.join(dir, "content/research/bundled-note", sibling);
    mkdirSync(path.dirname(siblingAbs), { recursive: true });
    writeFileSync(siblingAbs, "spec: true\n");
  }

  it("copies declared companion files next to the note and records companion_of", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-companion-"));
    seedReferenceContract(dir);
    try {
      writeCompanionFixture(dir, { declareCompanions: true });
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code, `stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);

      const companionPath = path.join(
        dir,
        "casts/claude/skills/m/references/notes/bundled-note.spec.yml",
      );
      expect(existsSync(companionPath), "companion file should land in the bundle").toBe(true);
      expect(readFileSync(companionPath, "utf8")).toBe("spec: true\n");

      const prov = JSON.parse(
        readFileSync(path.join(dir, "casts/claude/skills/m/_provenance.json"), "utf8"),
      );
      const companion = prov.refs.find(
        (ref: { dst: string }) => ref.dst === "references/notes/bundled-note.spec.yml",
      );
      expect(companion, "companion ref recorded in provenance").toBeTruthy();
      expect(companion.companion_of).toBe("references/notes/bundled-note.md");
      expect(companion.kind).toBe("research");
      expect(companion.src_hash).toBe(companion.dst_hash);

      const verify = execVerify(dir, "m");
      expect(verify.code, `stderr: ${verify.stderr}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("verifier rejects a bundled note pointing at an undeclared sibling", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-companion-neg-"));
    seedReferenceContract(dir);
    try {
      writeCompanionFixture(dir, { declareCompanions: false });
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code, `stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);
      // The sibling is named in the note body but never declared/copied.
      expect(
        existsSync(path.join(dir, "casts/claude/skills/m/references/notes/bundled-note.spec.yml")),
      ).toBe(false);

      const verify = execVerify(dir, "m");
      expect(verify.code).not.toBe(0);
      expect(verify.stderr).toContain("bundled-note.spec.yml");
      expect(verify.stderr).toContain("not in the bundle");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // The sibling here does NOT share the note's basename, which is the case the old `<stem>.*`
  // scan could not see. `gxformat2.schema.json` sat one hyphen from `gxformat2-schema.md` and
  // went unreported for the whole life of that check; the fix was to list the note's directory
  // instead of guessing at names.
  it("verifier rejects an undeclared sibling that does not share the note's basename", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-unpaired-"));
    seedReferenceContract(dir);
    try {
      writeCompanionFixture(dir, {
        declareCompanions: false,
        siblingName: "structural.schema.json",
      });
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code, `stderr: ${r.stderr}`).toBe(0);

      const verify = execVerify(dir, "m");
      expect(verify.code, "an unpaired undeclared sibling must be reported").not.toBe(0);
      expect(verify.stderr).toContain("structural.schema.json");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // A fenced block is payload, not an instruction to open a file — the same line this repo
  // already draws for wiki links. `galaxy-collection-semantics` names its site-only MyST
  // rendering inside a ```vendored-myst block, and that must not read as "go read this".
  it("verifier ignores a sibling named only inside a fenced block", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-fenced-"));
    seedReferenceContract(dir);
    try {
      writeCompanionFixture(dir, {
        declareCompanions: false,
        siblingName: "site-only.myst",
        bodyMentionsSiblingInFence: true,
      });
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code, `stderr: ${r.stderr}`).toBe(0);

      const verify = execVerify(dir, "m");
      expect(verify.code, `a fenced mention is not a read instruction: ${verify.stderr}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("prunes a bundle file no ref claims, and reports it under --check", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-orphan-"));
    seedReferenceContract(dir);
    try {
      writeCompanionFixture(dir, { declareCompanions: true });
      expect(runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]).code).toBe(0);

      // Stand in for a companion that was declared once and then undeclared: casting wrote it,
      // nothing claims it now, and before pruning existed it stayed in the bundle forever while
      // provenance and SKILL.md both said it was gone.
      const orphan = path.join(dir, "casts/claude/skills/m/references/notes/left-behind.yml");
      writeFileSync(orphan, "stale: true\n");

      const checked = runTsx(foundryBuild, [
        "cast",
        "m",
        "--target=claude",
        "--check",
        "--root",
        dir,
      ]);
      expect(checked.code, "--check must not pass with an orphan present").not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain("left-behind.yml");
      expect(existsSync(orphan), "--check must not delete anything").toBe(true);

      expect(runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]).code).toBe(0);
      expect(existsSync(orphan), "a normal cast prunes it").toBe(false);
      // The files that ARE claimed survive.
      expect(
        existsSync(path.join(dir, "casts/claude/skills/m/references/notes/bundled-note.spec.yml")),
      ).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("carries a companion that lives in a subdirectory of the note", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-nested-"));
    seedReferenceContract(dir);
    try {
      writeCompanionFixture(dir, { declareCompanions: true, siblingName: "vendor/spec.yml" });
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code, `stderr: ${r.stderr}`).toBe(0);

      // Nested dst, not flattened: the note names `vendor/spec.yml` and the bundle mirrors it,
      // so a vendored tree whose files reference each other by relative path still resolves.
      const nested = path.join(dir, "casts/claude/skills/m/references/notes/vendor/spec.yml");
      expect(existsSync(nested), "nested companion should mirror its path in the bundle").toBe(
        true,
      );

      const prov = JSON.parse(
        readFileSync(path.join(dir, "casts/claude/skills/m/_provenance.json"), "utf8"),
      );
      const companion = prov.refs.find(
        (ref: { dst: string }) => ref.dst === "references/notes/vendor/spec.yml",
      );
      expect(companion, "nested companion recorded in provenance").toBeTruthy();
      expect(companion.companion_of).toBe("references/notes/bundled-note.md");

      expect(execVerify(dir, "m").code).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // The disposition is declared once, per companion, on the kind. These cases are the whole
  // contract the verifier reads out of it. `_target.yml` used to answer this question with a
  // hand-written list naming `eval.md` and `refinement.md` — two of the eight — so nothing below
  // except the first case would have failed a bundle before.
  describe("companions the kind layer says never travel", () => {
    function castThenPlant(
      dir: string,
      plant: (bundle: string) => void,
    ): ReturnType<typeof execVerify> {
      writeCompanionFixture(dir, { declareCompanions: true });
      expect(runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]).code).toBe(0);
      plant(path.join(dir, "casts/claude/skills/m"));
      return execVerify(dir, "m");
    }

    it.each([
      ["eval.md", "foundry-only"],
      ["scenarios.md", "foundry-only"],
      ["changes.md", "foundry-only"],
      ["README.md", "foundry-only"],
      ["cast-skill-verification.md", "cast-input"],
    ])("rejects a bundle carrying %s (%s)", (file, disposition) => {
      const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-forbidden-"));
      seedReferenceContract(dir);
      try {
        const verify = castThenPlant(dir, (bundle) => {
          writeFileSync(path.join(bundle, file), "Foundry-only content.\n");
        });
        expect(verify.code, `${file} must not survive verification`).not.toBe(0);
        expect(verify.stderr).toContain(file);
        expect(verify.stderr).toContain(disposition);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    // A directory-shaped companion is matched as a directory. `refinements/` and `refinement.md`
    // are different companions, and a name matching the wrong type is neither of them.
    it("rejects a refinements/ directory, and not a file of the same name", () => {
      const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-refinements-"));
      seedReferenceContract(dir);
      try {
        const asDirectory = castThenPlant(dir, (bundle) => {
          mkdirSync(path.join(bundle, "refinements"));
          writeFileSync(path.join(bundle, "refinements/2026-07-30.md"), "entry\n");
        });
        expect(asDirectory.code, "a refinements/ journal must not ship").not.toBe(0);
        expect(asDirectory.stderr).toContain("refinements");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }

      const other = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-refinements-file-"));

      seedReferenceContract(other);
      try {
        const asFile = castThenPlant(other, (bundle) => {
          writeFileSync(path.join(bundle, "refinements"), "not the journal\n");
        });
        expect(
          asFile.code,
          `a file named 'refinements' is not the declared directory: ${asFile.stderr}`,
        ).toBe(0);
      } finally {
        rmSync(other, { recursive: true, force: true });
      }
    });

    // `examples/` is declared `bundled` by both `mold` and `pipeline`. A name any kind packages
    // must stay packageable even though other names beside it in the same declaration do not.
    it("accepts an examples/ directory, which a kind declares bundled", () => {
      const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-examples-"));
      seedReferenceContract(dir);
      try {
        const verify = castThenPlant(dir, (bundle) => {
          mkdirSync(path.join(bundle, "examples"));
          writeFileSync(path.join(bundle, "examples/fixture.json"), "{}\n");
        });
        expect(verify.code, `a bundled companion must survive: ${verify.stderr}`).toBe(0);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    // The check has only a basename to go on, so a note whose own vendored sidecar happens to be
    // called `README.md` would collide with the mold companion of that name. Provenance breaks the
    // tie: a file some ref claims went through the manifest and is that note's to ship.
    it("accepts a companion a ref claims, even where the name collides with a mold's", () => {
      const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-collision-"));
      seedReferenceContract(dir);
      try {
        writeCompanionFixture(dir, { declareCompanions: true, siblingName: "README.md" });
        expect(runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]).code).toBe(0);
        expect(
          existsSync(path.join(dir, "casts/claude/skills/m/references/notes/README.md")),
          "the note's own README should be carried",
        ).toBe(true);

        const verify = execVerify(dir, "m");
        expect(verify.code, `a claimed companion is not a stray: ${verify.stderr}`).toBe(0);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});

function execVerify(cwd: string, mold: string): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(tsxBin, [castVerify, mold, "--target=claude"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    const err = e as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      code: typeof err.status === "number" ? err.status : 1,
      stdout: typeof err.stdout === "string" ? err.stdout : (err.stdout?.toString() ?? ""),
      stderr: typeof err.stderr === "string" ? err.stderr : (err.stderr?.toString() ?? ""),
    };
  }
}

describe("validate-artifact process runner", () => {
  it("uses exit code and captures stdout/stderr as opaque evidence", async () => {
    const { runProcessValidation } =
      await import("../packages/build-cli/src/commands/validate-artifact.js");
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-validate-"));
    seedReferenceContract(dir);
    const artifact = path.join(dir, "artifact.json");
    writeFileSync(artifact, "{}\n");
    const result = runProcessValidation(
      {
        artifact_id: "artifact-x",
        direction: "output",
        schema: "[[schema-x]]",
        validator_bin: process.execPath,
        args: ["-e", "console.log('diagnostic only')", "{artifact_path}"],
      },
      artifact,
    );
    expect(result.status).toBe("passed");
    expect(result.exit_code).toBe(0);
    expect(result.stdout).toContain("diagnostic only");
    expect(result.artifact_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.stdout_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("foundry-build validate-artifact records process evidence in provenance", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-validate-cli-"));
    seedReferenceContract(dir);
    const artifact = path.join(dir, "artifact.json");
    const verify = path.join(dir, "_verify.json");
    const provenance = path.join(dir, "_provenance.json");
    writeFileSync(artifact, "{}\n");
    writeFileSync(
      verify,
      JSON.stringify(
        {
          verify_schema_version: 1,
          entries: [
            {
              artifact_id: "artifact-x",
              direction: "output",
              schema: "[[schema-x]]",
              validator_bin: process.execPath,
              args: ["-e", "console.error('diagnostic stderr')", "{artifact_path}"],
            },
          ],
        },
        null,
        2,
      ),
    );
    writeFileSync(
      provenance,
      JSON.stringify(
        {
          provenance_schema_version: 2,
          cast_target: "test",
          mold: { name: "m", path: "content/molds/m/index.md" },
          refs: [],
        },
        null,
        2,
      ),
    );

    const r = runTsx(foundryBuild, [
      "validate-artifact",
      "artifact-x",
      artifact,
      "--verify",
      verify,
      "--provenance",
      provenance,
    ]);
    expect(r.code, `stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);
    const updated = JSON.parse(readFileSync(provenance, "utf8"));
    expect(updated.validation_results).toHaveLength(1);
    expect(updated.validation_results[0]).toMatchObject({
      artifact_id: "artifact-x",
      path: artifact,
      validator_bin: process.execPath,
      status: "passed",
      exit_code: 0,
      stderr: "diagnostic stderr\n",
    });
  });

  it("validate-artifact preserves results for different paths with the same artifact id", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-validate-many-"));
    seedReferenceContract(dir);
    const artifactA = path.join(dir, "a.json");
    const artifactB = path.join(dir, "b.json");
    const verify = path.join(dir, "_verify.json");
    const provenance = path.join(dir, "_provenance.json");
    writeFileSync(artifactA, "{}\n");
    writeFileSync(artifactB, "{}\n");
    writeFileSync(
      verify,
      JSON.stringify(
        {
          verify_schema_version: 1,
          entries: [
            {
              artifact_id: "artifact-x",
              direction: "output",
              schema: "[[schema-x]]",
              validator_bin: process.execPath,
              args: ["-e", "process.exit(0)", "{artifact_path}"],
            },
          ],
        },
        null,
        2,
      ),
    );
    writeFileSync(
      provenance,
      JSON.stringify(
        {
          provenance_schema_version: 2,
          cast_target: "test",
          mold: { name: "m", path: "content/molds/m/index.md" },
          refs: [],
        },
        null,
        2,
      ),
    );

    for (const artifact of [artifactA, artifactB]) {
      const r = runTsx(foundryBuild, [
        "validate-artifact",
        "artifact-x",
        artifact,
        "--verify",
        verify,
        "--provenance",
        provenance,
      ]);
      expect(r.code, `stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);
    }

    const updated = JSON.parse(readFileSync(provenance, "utf8"));
    expect(updated.validation_results.map((r: { path: string }) => r.path).sort()).toEqual(
      [artifactA, artifactB].sort(),
    );
  });
});

describe("cast-mold negative cases", () => {
  it("unknown mold fails fast", () => {
    const r = runTsx(castMold, ["does-not-exist", "--target=claude", "--check"]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toContain("mold source missing");
  });

  it("--check on a never-cast mold leaves no bundle directory behind", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-check-"));
    seedReferenceContract(dir);
    try {
      mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
      writeFileSync(
        path.join(dir, "casts/claude/_target.yml"),
        [
          "name: claude",
          "provenance_schema_version: 4",
          "bundle_path: skills/{mold}",
          "required_outputs: [SKILL.md, _provenance.json]",
          "kinds: {}",
          "skill_constraints:",
          "  frontmatter_required: [name, description]",
          "  forbidden_runtime_paths: []",
          "",
        ].join("\n"),
      );
      writeFileSync(
        path.join(dir, "content/molds/m/index.md"),
        `---
type: mold
name: m
axis: generic
tags: [mold]
status: draft
created: 2026-05-07
revised: 2026-05-07
revision: 1
summary: Never-cast mold used to check that --check stays read-only.
references: []
---

# m

Body.
`,
      );

      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir, "--check"]);
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("SKILL.md");
      expect(existsSync(path.join(dir, "casts/claude/skills/m"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("cast-mold license → redistribution-policy enforcement", () => {
  // Temp repo: one mold referencing one research note (verbatim). Enforcement resolves
  // against the shipped table, so the scaffold no longer has to plant a copy of it.
  function scaffold(dir: string, noteFrontmatter: string, extraLicenseFile?: string): void {
    mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
    mkdirSync(path.join(dir, "content/research/note-x"), { recursive: true });
    mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
    if (extraLicenseFile) {
      mkdirSync(path.join(dir, "LICENSES"), { recursive: true });
      writeFileSync(path.join(dir, extraLicenseFile), "TEST LICENSE TEXT\n");
    }
    writeFileSync(
      path.join(dir, "casts/claude/_target.yml"),
      [
        "name: claude",
        "provenance_schema_version: 4",
        "bundle_path: skills/{mold}",
        "required_outputs: [SKILL.md, _provenance.json]",
        "kinds:",
        "  research:",
        "    dst_dir: references/notes/",
        "    dst_extension: .md",
        "    modes: [verbatim]",
        "skill_constraints:",
        "  frontmatter_required: [name, description]",
        "  forbidden_runtime_paths: []",
        "",
      ].join("\n"),
    );
    writeFileSync(
      path.join(dir, "content/molds/m/index.md"),
      `---
type: mold
name: m
axis: generic
tags: [mold]
status: draft
created: 2026-05-07
revised: 2026-05-07
revision: 1
summary: License enforcement cast test mold summary.
references:
  - kind: research
    ref: "[[note-x]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
---

# m

Use the research reference.
`,
    );
    writeFileSync(path.join(dir, "content/research/note-x/index.md"), noteFrontmatter);
  }

  const noteBody = "\n\n# Note X\n\nThird-party prose.\n";

  it("refuses verbatim carry of an own-words-only license", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-lic-owf-"));
    seedReferenceContract(dir);
    try {
      scaffold(
        dir,
        `---
type: research
title: Note X
tags: [research]
status: draft
created: 2026-05-07
revised: 2026-05-07
revision: 1
summary: Own-words-only note that must not be carried verbatim.
license: CC-BY-NC-SA-2.0
---${noteBody}`,
      );
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("own-words-only");
      // The note declares no `derived:` posture, so it is pass-through by default and stays
      // governed. The remedy named is summarizing the source, not picking another transform —
      // no mode was ever the answer, so the message stops offering one.
      expect(r.stderr).toContain("cannot be carried into a cast");
      expect(r.stderr).not.toContain("mode=");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // A refused cast leaves no manifest describing the bundle it declined to finish.
  //
  // `_verify.json` was always deferred past the error gate for this reason; `_required_tools.json`
  // was not, and got written before the gate that then aborted the run. Both are contributed
  // files now and travel one path, so this pins the property for the mechanism rather than for
  // whichever file happened to have it.
  it("writes no bundle manifest for a cast it refuses", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-refused-"));
    seedReferenceContract(dir);
    try {
      scaffold(
        dir,
        `---
type: research
title: Note X
tags: [research]
status: draft
created: 2026-05-07
revised: 2026-05-07
revision: 1
summary: Own-words-only note that must not be carried verbatim.
license: CC-BY-NC-SA-2.0
---${noteBody}`,
      );
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code).not.toBe(0);
      const bundle = path.join(dir, "casts/claude/skills/m");
      expect(existsSync(path.join(bundle, "_verify.json"))).toBe(false);
      expect(existsSync(path.join(bundle, "_required_tools.json"))).toBe(false);
      expect(existsSync(path.join(bundle, "_provenance.json"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("carries a verbatim-ok license and hashes its license_file into provenance", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-lic-ok-"));
    seedReferenceContract(dir);
    try {
      scaffold(
        dir,
        `---
type: research
title: Note X
tags: [research]
status: draft
created: 2026-05-07
revised: 2026-05-07
revision: 1
summary: Verbatim-ok note carried under MIT with a license file.
license: MIT
license_file: LICENSES/test.LICENSE
---${noteBody}`,
        "LICENSES/test.LICENSE",
      );
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code, `stderr: ${r.stderr}`).toBe(0);
      const prov = JSON.parse(
        readFileSync(path.join(dir, "casts/claude/skills/m/_provenance.json"), "utf8"),
      );
      const ref = prov.refs.find((x: { kind: string }) => x.kind === "research");
      expect(ref.license).toBe("MIT");
      expect(ref.license_file).toBe("LICENSES/test.LICENSE");
      expect(ref.license_file_hash).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// A cast bundle is read outside the site, so the SKILL.md body carries the wiki link's human
// text and drops the syntax. No mold body in this corpus uses an anchor or an alias, so
// re-casting every skill cannot exercise those branches — they are only covered here.
describe("stripWikiLinks", () => {
  it("keeps the bare target, drops an anchor, and prefers an explicit alias", async () => {
    const { stripWikiLinks } = await import("../packages/build-cli/src/commands/cast-mold.js");
    expect(stripWikiLinks("See [[summarize-nextflow]] first.")).toBe(
      "See summarize-nextflow first.",
    );
    expect(stripWikiLinks("See [[summarize-nextflow#Procedure]].")).toBe("See summarize-nextflow.");
    expect(stripWikiLinks("See [[summarize-nextflow|the summary Mold]].")).toBe(
      "See the summary Mold.",
    );
    expect(stripWikiLinks("See [[summarize-nextflow#Procedure|its procedure]].")).toBe(
      "See its procedure.",
    );
  });

  it("rewrites every link on a line and leaves text without links alone", async () => {
    const { stripWikiLinks } = await import("../packages/build-cli/src/commands/cast-mold.js");
    expect(stripWikiLinks("Per [[a]] and [[b]], do the thing.")).toBe("Per a and b, do the thing.");
    expect(stripWikiLinks("No links here at all.")).toBe("No links here at all.");
  });

  // A payload that yields no text would otherwise delete itself silently.
  it("leaves a degenerate payload as authored rather than emitting nothing", async () => {
    const { stripWikiLinks } = await import("../packages/build-cli/src/commands/cast-mold.js");
    expect(stripWikiLinks("An [[#anchor-only]] ref.")).toBe("An [[#anchor-only]] ref.");
  });
});

// Re-casting the corpus proves the 47 committed skill documents still render byte for byte, but
// it cannot show that the caster renders what it is GIVEN rather than a list it knows. These
// pin the part the oracle cannot see: hand a section list nothing in this repo would produce,
// and get exactly that back.
describe("the skill document is the sections it was handed", () => {
  it("renders them in order, and nothing it was not given", async () => {
    const { renderSkillMarkdown } = await import(
      "../packages/build-cli/src/commands/cast-mold.js"
    );
    const doc = renderSkillMarkdown({
      moldName: "m",
      meta: { summary: "Summarize a thing." },
      lede: "Lede line.",
      sections: [
        { title: "Second", body: "- b" },
        { title: "First", body: "prose, not a list" },
      ],
    });
    expect(doc).toBe(
      [
        "---",
        "name: m",
        'description: "Summarize a thing."',
        "---",
        "",
        "# m",
        "",
        "Lede line.",
        "",
        "## Second",
        "",
        "- b",
        "",
        "## First",
        "",
        "prose, not a list",
        "",
      ].join("\n"),
    );
    // The names this instance happens to use are the instance's, not the caster's.
    expect(doc).not.toContain("## Outputs");
    expect(doc).not.toContain("## Procedure");
  });

  it("takes the description from the summary, stripped of link syntax and quote-safe", async () => {
    const { renderSkillMarkdown } = await import(
      "../packages/build-cli/src/commands/cast-mold.js"
    );
    const doc = renderSkillMarkdown({
      moldName: "m",
      meta: { summary: 'Handle a "quoted" [[thing|name]].' },
      lede: "L",
      sections: [],
    });
    expect(doc).toContain('description: "Handle a \\"quoted\\" name."');
  });

  // A skill that requires no tools has said something. A reader who finds no heading cannot
  // tell that from a caster that never asked.
  it("says so for an empty section rather than dropping the heading", async () => {
    const { bulletSection } = await import("../packages/build-cli/src/commands/cast-mold.js");
    expect(bulletSection("Required Tools", []).body).toBe("- None declared.");
    expect(bulletSection("Required Tools", [], "- None, and none assumed.").body).toBe(
      "- None, and none assumed.",
    );
    expect(bulletSection("Required Tools", ["- a", "- b"]).body).toBe("- a\n- b");
  });
});

// Casting, the validator and pipeline assembly each answer "which slug reaches which note?",
// and all three used to answer it separately. They agreed by hand; assemble-pipeline's copy
// even carried a comment claiming parity rather than holding it.
describe("second addresses are one rule, not three", () => {
  it("gives a cli-command note the address a Mold author writes", async () => {
    const { GALAXY_SLUG_ALIASES } = await import("../packages/build-cli/src/lib/slug-map.js");
    expect(GALAXY_SLUG_ALIASES({ type: "cli-command", tool: "gxwf", command: "validate" })).toEqual(
      ["gxwf validate"],
    );
  });

  it("gives no second address to a note that has not earned one", async () => {
    const { GALAXY_SLUG_ALIASES } = await import("../packages/build-cli/src/lib/slug-map.js");
    // Right type, but no command to compound with — the address would be the tool's own.
    expect(GALAXY_SLUG_ALIASES({ type: "cli-command", tool: "gxwf" })).toEqual([]);
    expect(GALAXY_SLUG_ALIASES({ type: "cli-tool", tool: "gxwf", command: "validate" })).toEqual([]);
    expect(GALAXY_SLUG_ALIASES({ type: "research" })).toEqual([]);
  });
});

// The `cast:` blocks in reference_contract.yml replaced three sets of kind-name literals in
// cast-mold.ts. A declaration that nothing reads is documentation, so each test below breaks
// one declaration and asserts the cast NOTICES — the same way the companion dispositions were
// shown to be load-bearing rather than asserted to be.
describe("reference_contract.yml cast declarations are load-bearing", () => {
  const contractPath = path.join(repoRoot, "reference_contract.yml");

  /**
   * Cast the real corpus against a MUTATED contract, without touching the real contract.
   *
   * The obvious version — overwrite `reference_contract.yml`, run, restore in a `finally` —
   * is not safe here, and not merely in theory. vitest runs test files in parallel and three
   * sibling suites call `loadReferenceContract()` on this path at module scope, so a
   * concurrent worker (or a `make check-casts` in another shell) reads a contract with a
   * kind's `cast:` block deleted and fails for reasons that have nothing to do with it. The
   * `finally` also does not cover SIGINT or a timeout kill, and `yaml.dump` round-trips away
   * every comment in the file — including the block documenting `cast:` itself, which is
   * exactly the prose this repo treats as load-bearing.
   *
   * So the mutated contract goes in a temp root beside symlinks to the real tree.
   *
   * Two things this helper OWNS rather than leaves to its callers, both learned the hard way:
   *
   * It runs the cast itself, always with `--check`. The root it builds symlinks the whole real
   * `casts/` tree, and a caller that forgot `--check` would rewrite `SKILL.md`, rewrite
   * `_provenance.json`, and `unlinkSync` committed reference files in the tracked tree — while
   * exiting 0 and looking like a passing test. "Every caller remembers" is not a property of a
   * helper that hands out a path and lets callers compose argv.
   *
   * And it asserts a CONTROL first: the same root with the contract UNMUTATED must cast clean.
   * Without that, `expect(code).not.toBe(0)` is satisfied by any environmental breakage in the
   * root, and these two tests were in fact passing that way — the root omitted `LICENSES/`, so
   * both Molds failed on `license_file missing` whether or not the declaration was honoured.
   * The mutation must be the ONLY reason the cast stops working, and the only way to know that
   * is to run it without one.
   */
  function castWithMutatedContract(
    moldName: string,
    mutate: (kinds: Record<string, Record<string, unknown>>) => void,
  ): { code: number; stdout: string; stderr: string } {
    const build = (root: string, mutated: boolean): void => {
      const doc = yaml.load(readFileSync(contractPath, "utf8")) as {
        kinds: Record<string, Record<string, unknown>>;
      };
      if (mutated) mutate(doc.kinds);
      writeFileSync(path.join(root, "reference_contract.yml"), yaml.dump(doc));
      // Everything the caster reads out of the repo root. `LICENSES/` is not optional: refs
      // carrying `license_file:` are hashed against it, and its absence is an error.
      for (const name of ["content", "casts", "LICENSES"]) {
        symlinkSync(path.join(repoRoot, name), path.join(root, name));
      }
    };
    const run = (root: string) =>
      runTsx(foundryBuild, ["cast", moldName, "--target=claude", "--check", "--root", root]);

    const controlRoot = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-control-"));
    try {
      build(controlRoot, false);
      const control = run(controlRoot);
      expect(
        control.code,
        `control (unmutated contract) must cast clean, else the real assertion below proves ` +
          `nothing about the declaration:\n${control.stderr}`,
      ).toBe(0);
    } finally {
      rmSync(controlRoot, { recursive: true, force: true });
    }

    const root = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-contract-"));
    try {
      build(root, true);
      return run(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  // Replaces `SUPPORTED_KINDS` / `NOT_IMPLEMENTED_KINDS`: castability is the presence of the
  // block, so deleting it has to be enough to stop the cast.
  it("a kind with no cast: block is refused, and says so as a deliberate gap", () => {
    const r = castWithMutatedContract("summarize-nextflow", (kinds) => {
      delete kinds.research!.cast;
    });
    expect(r.code).not.toBe(0);
    expect(r.stderr).toContain("kind=research is not castable");
  });

  // Replaces `if (r.kind !== "research" && r.kind !== "pattern") continue`. With companions
  // switched off for the kind, the files the note declares stop being claimed by any ref and
  // the bundle's own orphan check is what reports them.
  it("companions: false stops a kind's notes carrying their declared companions", () => {
    const r = castWithMutatedContract("author-galaxy-tool-wrapper", (kinds) => {
      kinds.research!.cast = {
        ...(kinds.research!.cast as Record<string, unknown>),
        companions: false,
      };
    });
    expect(r.code).not.toBe(0);
    expect(r.stderr).toContain("orphan (no ref claims it)");
  });
});

// `default_mode` and `slug_field` are declarations no committed Mold exercises: every
// reference in the corpus names its own `mode`, and no cli-tool note's directory differs
// from its `tool:`. That makes them exactly the declarations most likely to rot into
// decoration, so they are exercised here against fixtures built to tell the difference.
describe("cast declarations the corpus does not currently exercise", () => {
  function targetYml(
    kind: string,
    dstDir: string,
    ext: string,
    modes: string,
    bundlePath = "skills/{mold}",
  ): string {
    return [
      "name: claude",
      "provenance_schema_version: 4",
      `bundle_path: ${bundlePath}`,
      "required_outputs: [SKILL.md, _provenance.json]",
      "kinds:",
      `  ${kind}:`,
      `    dst_dir: ${dstDir}`,
      `    dst_extension: ${ext}`,
      `    modes: ${modes}`,
      "skill_constraints:",
      "  frontmatter_required: [name, description]",
      "  forbidden_runtime_paths: []",
      "",
    ].join("\n");
  }

  function contractYml(kind: string, cast: Record<string, unknown>): string {
    return yaml.dump({
      kinds: {
        [kind]: { label: kind, description: `${kind} refs.`, ref_shape: "wiki-link", cast },
      },
    });
  }

  // A ref that names no `mode` takes the kind's declared default. Same fixture cast twice,
  // differing only in the declaration: sidecar serializes to JSON, verbatim copies markdown.
  it("default_mode decides the transform for a ref that names no mode", () => {
    for (const [mode, expected] of [
      ["sidecar", "references/cli/c.json"],
      ["verbatim", "references/cli/c.md"],
    ] as const) {
      const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-defaultmode-"));
      try {
        mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
        mkdirSync(path.join(dir, "content/cli/t"), { recursive: true });
        mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
        writeFileSync(
          path.join(dir, "casts/claude/_target.yml"),
          targetYml(
            "cli-command",
            "references/cli/",
            mode === "sidecar" ? ".json" : ".md",
            "[verbatim, sidecar]",
          ),
        );
        writeFileSync(
          path.join(dir, "reference_contract.yml"),
          contractYml("cli-command", { resolve: "note", default_mode: mode, companions: false }),
        );
        writeFileSync(
          path.join(dir, "content/molds/m/index.md"),
          `---\ntype: mold\nname: m\naxis: generic\ntags: [mold]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\nsummary: Default-mode cast test mold summary.\nreferences:\n  - kind: cli-command\n    ref: "[[c]]"\n    used_at: runtime\n    load: upfront\n    evidence: corpus-observed\n---\n\n# m\n\nBody.\n`,
        );
        writeFileSync(
          path.join(dir, "content/cli/t/c.md"),
          `---\ntype: cli-command\ntool: t\ncommand: c\nsummary: A command.\ntags: [cli]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\n---\n\nBody of c.\n`,
        );
        const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
        expect(r.code, `stderr: ${r.stderr}`).toBe(0);
        const prov = JSON.parse(
          readFileSync(path.join(dir, "casts/claude/skills/m/_provenance.json"), "utf8"),
        );
        expect(prov.refs[0].mode).toBe(mode);
        expect(prov.refs[0].dst).toBe(expected);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  // The bundled filename comes from the declared frontmatter field, not the note's directory.
  it("slug_field names the bundled file; without it the note's own slug does", () => {
    for (const [slugField, expected] of [
      ["tool", "references/cli/real-name.md"],
      [undefined, "references/cli/some-dir.md"],
    ] as const) {
      const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-slugfield-"));
      try {
        mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
        mkdirSync(path.join(dir, "content/cli/some-dir"), { recursive: true });
        mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
        writeFileSync(
          path.join(dir, "casts/claude/_target.yml"),
          targetYml("cli-tool", "references/cli/", ".md", "[verbatim]"),
        );
        writeFileSync(
          path.join(dir, "reference_contract.yml"),
          contractYml("cli-tool", {
            resolve: "note",
            default_mode: "verbatim",
            companions: false,
            ...(slugField ? { slug_field: slugField } : {}),
          }),
        );
        writeFileSync(
          path.join(dir, "content/molds/m/index.md"),
          `---\ntype: mold\nname: m\naxis: generic\ntags: [mold]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\nsummary: Slug-field cast test mold summary.\nreferences:\n  - kind: cli-tool\n    ref: "[[some-dir]]"\n    used_at: runtime\n    load: upfront\n    mode: verbatim\n    evidence: corpus-observed\n---\n\n# m\n\nBody.\n`,
        );
        writeFileSync(
          path.join(dir, "content/cli/some-dir/index.md"),
          `---\ntype: cli-tool\ntool: real-name\nsummary: A tool whose directory is not its name.\ntags: [cli]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\n---\n\nBody.\n`,
        );
        const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
        expect(r.code, `stderr: ${r.stderr}`).toBe(0);
        const prov = JSON.parse(
          readFileSync(path.join(dir, "casts/claude/skills/m/_provenance.json"), "utf8"),
        );
        expect(prov.refs[0].dst).toBe(expected);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  // A refused cast writes no manifest describing the bundle it declined to finish.
  //
  // `_verify.json` was always deferred past the error gate for exactly this reason, and its
  // comment said so. `_required_tools.json` was not: it reconciled before the gate, so a cast
  // that then aborted left a fresh tools manifest beside stale provenance. Both are contributed
  // files now and share one write, after the gate.
  //
  // Needs BOTH a resolvable cli-tool ref (so a manifest is owed) and a broken one (so the cast
  // refuses) — with no tools required the manifest is absent either way and proves nothing.
  it("writes no tools manifest for a cast it refuses", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-refused-tools-"));
    try {
      mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
      mkdirSync(path.join(dir, "content/cli/real-tool"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
      writeFileSync(
        path.join(dir, "casts/claude/_target.yml"),
        targetYml("cli-tool", "references/cli/", ".md", "[verbatim]"),
      );
      writeFileSync(
        path.join(dir, "reference_contract.yml"),
        contractYml("cli-tool", { resolve: "note", default_mode: "verbatim", companions: false }),
      );
      writeFileSync(
        path.join(dir, "content/molds/m/index.md"),
        `---\ntype: mold\nname: m\naxis: generic\ntags: [mold]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\nsummary: Refused-cast tools manifest test mold summary.\nreferences:\n  - kind: cli-tool\n    ref: "[[real-tool]]"\n    used_at: runtime\n    load: upfront\n    mode: verbatim\n    evidence: corpus-observed\n  - kind: cli-tool\n    ref: "[[does-not-exist]]"\n    used_at: runtime\n    load: upfront\n    mode: verbatim\n    evidence: corpus-observed\n---\n\n# m\n\nBody.\n`,
      );
      writeFileSync(
        path.join(dir, "content/cli/real-tool/index.md"),
        `---\ntype: cli-tool\ntool: real-tool\norigin: pypi\ninvoke: real-tool\nsummary: A tool the mold really needs.\ntags: [cli]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\n---\n\nBody.\n`,
      );
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code).not.toBe(0);
      const bundle = path.join(dir, "casts/claude/skills/m");
      expect(existsSync(path.join(bundle, "_required_tools.json"))).toBe(false);
      expect(existsSync(path.join(bundle, "_verify.json"))).toBe(false);
      expect(existsSync(path.join(bundle, "_provenance.json"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Where a bundle lands is the target's to declare. Cast the same Mold under two different
  // `bundle_path` templates and the bundle moves — the caster, the verifier, the pipeline
  // assembler and the site all answer to this one line.
  it("bundle_path decides where the bundle lands", () => {
    for (const [template, expected] of [
      ["skills/{mold}", "casts/claude/skills/m"],
      ['"{mold}"', "casts/claude/m"],
      ["bundles/{mold}/v1", "casts/claude/bundles/m/v1"],
    ] as const) {
      const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-bundlepath-"));
      try {
        mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
        mkdirSync(path.join(dir, "content/patterns"), { recursive: true });
        mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
        writeFileSync(
          path.join(dir, "casts/claude/_target.yml"),
          targetYml("pattern", "references/patterns/", ".md", "[verbatim]", template),
        );
        writeFileSync(
          path.join(dir, "reference_contract.yml"),
          contractYml("pattern", {
            resolve: "note",
            default_mode: "verbatim",
            companions: false,
          }),
        );
        writeFileSync(
          path.join(dir, "content/molds/m/index.md"),
          `---\ntype: mold\nname: m\naxis: generic\ntags: [mold]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\nsummary: Bundle-path cast test mold summary.\nreferences:\n  - kind: pattern\n    ref: "[[p]]"\n    used_at: runtime\n    load: upfront\n    mode: verbatim\n    evidence: corpus-observed\n---\n\n# m\n\nBody.\n`,
        );
        writeFileSync(
          path.join(dir, "content/patterns/p.md"),
          `---\ntype: pattern\ntitle: P\nsummary: A pattern.\ntags: [pattern]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\n---\n\nBody of p.\n`,
        );
        const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
        expect(r.code, `stderr: ${r.stderr}`).toBe(0);
        expect(existsSync(path.join(dir, expected, "SKILL.md"))).toBe(true);
        expect(existsSync(path.join(dir, expected, "_provenance.json"))).toBe(true);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  // `bundle_path: {mold}` is not the string it looks like — unquoted braces are YAML
  // flow-mapping syntax, so it loads as an object. Easy to write, and without a check where the
  // value is read it surfaces as a TypeError three frames away.
  it("says so when bundle_path is an unquoted {mold}", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-bundlepathyaml-"));
    try {
      mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
      writeFileSync(
        path.join(dir, "casts/claude/_target.yml"),
        targetYml("pattern", "references/patterns/", ".md", "[verbatim]", "{mold}"),
      );
      writeFileSync(
        path.join(dir, "reference_contract.yml"),
        contractYml("pattern", { resolve: "note", default_mode: "verbatim", companions: false }),
      );
      writeFileSync(
        path.join(dir, "content/molds/m/index.md"),
        `---\ntype: mold\nname: m\naxis: generic\ntags: [mold]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\nsummary: Bundle-path YAML trap test mold summary.\n---\n\n# m\n\nBody.\n`,
      );
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("bundle_path must be a string");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // The package named in a SKILL.md validation row is the one the schema note declares ships
  // the bin, not one the caster infers from "has a subcommand" — that inference would put a
  // single instance's CLI package name in code every instance runs.
  it("validator_package names the package the validation row cites", () => {
    for (const [declared, expected] of [
      ["", "@acme/schema-pkg"],
      ['validator_package: "@acme/cli-pkg"', "@acme/cli-pkg"],
    ] as const) {
      const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-validatorpkg-"));
      try {
        mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
        mkdirSync(path.join(dir, "content/schemas"), { recursive: true });
        mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
        writeFileSync(
          path.join(dir, "casts/claude/_target.yml"),
          targetYml("schema", "references/schemas/", ".schema.json", "[verbatim]"),
        );
        writeFileSync(
          path.join(dir, "reference_contract.yml"),
          contractYml("schema", {
            resolve: "note",
            default_mode: "verbatim",
            companions: false,
          }),
        );
        writeFileSync(
          path.join(dir, "content/molds/m/index.md"),
          `---\ntype: mold\nname: m\naxis: generic\ntags: [mold]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\nsummary: Validator-package cast test mold summary.\noutput_artifacts:\n  - id: a\n    kind: json\n    default_filename: a.json\n    schema: "[[s]]"\n    description: An artifact.\nreferences:\n  - kind: schema\n    ref: "[[s]]"\n    used_at: runtime\n    load: upfront\n    mode: verbatim\n    evidence: corpus-observed\n---\n\n# m\n\nBody.\n`,
        );
        writeFileSync(
          path.join(dir, "content/schemas/s.md"),
          `---\ntype: schema\nname: s\ntitle: S\nsummary: A schema.\ntags: [meta]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\npackage: "@acme/schema-pkg"\nvalidator_bin: acme\nvalidator_subcommand: validate-s\n${declared}\n---\n\nBody of s.\n`,
        );
        const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
        const skill = readFileSync(path.join(dir, "casts/claude/skills/m/SKILL.md"), "utf8");
        expect(skill, `stderr: ${r.stderr}`).toContain(expected);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  // Committed sample runs are checked against the schema the Mold declares for its OWN output,
  // not whichever schema ref comes first — that one has no stated relationship to what the runs
  // contain. This Mold declares two schema refs and names the SECOND as its output schema, so
  // which one the caster reaches for is the whole assertion.
  it("runs are validated against the Mold's declared output schema, not the first ref", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-runs-"));
    try {
      mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
      mkdirSync(path.join(dir, "content/schemas"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude/skills/m/runs/sample"), { recursive: true });
      writeFileSync(
        path.join(dir, "casts/claude/skills/m/runs/sample/summary.json"),
        JSON.stringify({ count: "not-a-number" }) + "\n",
      );
      writeFileSync(
        path.join(dir, "casts/claude/_target.yml"),
        targetYml("schema", "references/schemas/", ".md", "[verbatim]"),
      );
      writeFileSync(
        path.join(dir, "reference_contract.yml"),
        contractYml("schema", { resolve: "note", default_mode: "verbatim", companions: false }),
      );
      writeFileSync(
        path.join(dir, "content/molds/m/index.md"),
        `---\ntype: mold\nname: m\naxis: generic\ntags: [mold]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\nsummary: Runs-validation cast test mold summary.\noutput_artifacts:\n  - id: a\n    kind: json\n    default_filename: a.json\n    schema: "[[second]]"\n    description: An artifact.\nreferences:\n  - kind: schema\n    ref: "[[first]]"\n    used_at: runtime\n    load: upfront\n    mode: verbatim\n    evidence: corpus-observed\n  - kind: schema\n    ref: "[[second]]"\n    used_at: runtime\n    load: upfront\n    mode: verbatim\n    evidence: corpus-observed\n---\n\n# m\n\nBody.\n`,
      );
      for (const name of ["first", "second"]) {
        writeFileSync(
          path.join(dir, `content/schemas/${name}.md`),
          `---\ntype: schema\nname: ${name}\ntitle: ${name}\nsummary: A schema note.\ntags: [meta]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\npackage: "@acme/schema-pkg"\n---\n\nBody of ${name}.\n`,
        );
      }
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      // The bundled dst of a `resolve: note` schema is the note itself, so Ajv fails to load it
      // — which is incidental. What the assertion pins is WHICH file it reached for.
      expect(r.stderr).toContain("second.md: not loadable as a JSON Schema");
      expect(r.stderr).not.toContain("first.md: not loadable as a JSON Schema");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // The sidecar builder is reached on the mode alone. Gating it on `kind === "cli-command"` as
  // well would put a second check behind the target's `modes` list, which can only ever
  // disagree with it. A kind the target lets take `sidecar` gets one.
  it("sidecar dispatches on the declared mode, not on the kind's name", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-sidecarkind-"));
    try {
      mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
      mkdirSync(path.join(dir, "content/research/r"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
      writeFileSync(
        path.join(dir, "casts/claude/_target.yml"),
        targetYml("research", "references/notes/", ".json", "[sidecar]"),
      );
      writeFileSync(
        path.join(dir, "reference_contract.yml"),
        contractYml("research", {
          resolve: "note",
          default_mode: "sidecar",
          companions: false,
        }),
      );
      writeFileSync(
        path.join(dir, "content/molds/m/index.md"),
        `---\ntype: mold\nname: m\naxis: generic\ntags: [mold]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\nsummary: Sidecar-kind cast test mold summary.\nreferences:\n  - kind: research\n    ref: "[[r]]"\n    used_at: runtime\n    load: upfront\n    mode: sidecar\n    evidence: corpus-observed\n---\n\n# m\n\nBody.\n`,
      );
      writeFileSync(
        path.join(dir, "content/research/r/index.md"),
        `---\ntype: research\ntitle: R\nsummary: A note.\ntags: [research]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\n---\n\nBody of r.\n`,
      );
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code, `stderr: ${r.stderr}`).toBe(0);
      const sidecar = JSON.parse(
        readFileSync(path.join(dir, "casts/claude/skills/m/references/notes/r.json"), "utf8"),
      );
      expect(sidecar.body).toContain("Body of r.");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // The vocabulary is the gate, and it closes before the caster runs.
  //
  // Renderers are registered per mode, so a mode with nothing behind it is a real failure state
  // — but not one this instance can reach. We implement every mode the substrate ships, so
  // membership in the vocabulary already means renderable, and anything else is refused when the
  // contract loads rather than when a ref reaches the renderer table. Worth pinning: it is the
  // property that lets the caster's own "no renderer" branch stay defensive.
  //
  // The mode below is invented for the test. Naming a real term would tie the assertion to
  // whichever word the substrate happens to have retired.
  it("refuses an unimplemented mode at the vocabulary, before any renderer is consulted", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-norenderer-"));
    try {
      mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
      mkdirSync(path.join(dir, "content/research/r"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
      writeFileSync(
        path.join(dir, "casts/claude/_target.yml"),
        targetYml("research", "references/notes/", ".txt", "[paraphrase]"),
      );
      writeFileSync(
        path.join(dir, "reference_contract.yml"),
        contractYml("research", { resolve: "note", default_mode: "paraphrase", companions: false }),
      );
      writeFileSync(
        path.join(dir, "content/molds/m/index.md"),
        `---\ntype: mold\nname: m\naxis: generic\ntags: [mold]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\nsummary: Unrendered-mode cast test mold summary.\nreferences:\n  - kind: research\n    ref: "[[r]]"\n    used_at: runtime\n    load: upfront\n    mode: paraphrase\n    evidence: corpus-observed\n---\n\n# m\n\nBody.\n`,
      );
      writeFileSync(
        path.join(dir, "content/research/r/index.md"),
        `---\ntype: research\ntitle: R\nsummary: A note.\ntags: [research]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\n---\n\nBody of r.\n`,
      );
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("not in this instance's `modes` vocabulary");
      expect(r.stderr).toContain("paraphrase");
      // The refusal is total: a mode we cannot render must not leave a half-cast bundle behind.
      expect(existsSync(path.join(dir, "casts/claude/skills/m/_provenance.json"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// Two behaviour changes the 47-Mold byte-identity gate cannot see, because no committed
// content takes either path. Pinned so they read as decisions rather than accidents.
describe("cast declarations: stricter than before, on purpose", () => {
  function fixture(dir: string, ref: string): void {
    mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
    mkdirSync(path.join(dir, "content/patterns"), { recursive: true });
    mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
    writeFileSync(
      path.join(dir, "casts/claude/_target.yml"),
      [
        "name: claude",
        "provenance_schema_version: 4",
        "bundle_path: skills/{mold}",
        "required_outputs: [SKILL.md, _provenance.json]",
        "kinds:",
        "  pattern:",
        "    dst_dir: references/patterns/",
        "    dst_extension: .md",
        "    modes: [verbatim]",
        "skill_constraints:",
        "  frontmatter_required: [name, description]",
        "  forbidden_runtime_paths: []",
        "",
      ].join("\n"),
    );
    writeFileSync(
      path.join(dir, "reference_contract.yml"),
      yaml.dump({
        kinds: {
          pattern: {
            label: "Pattern",
            description: "Pattern refs.",
            ref_shape: "wiki-link",
            cast: { resolve: "note", default_mode: "verbatim", companions: false },
          },
        },
      }),
    );
    writeFileSync(
      path.join(dir, "content/molds/m/index.md"),
      `---\ntype: mold\nname: m\naxis: generic\ntags: [mold]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\nsummary: Ref-shape cast test mold summary.\nreferences:\n  - kind: pattern\n    ref: ${ref}\n    used_at: runtime\n    load: upfront\n    mode: verbatim\n    evidence: corpus-observed\n---\n\n# m\n\nBody.\n`,
    );
    writeFileSync(
      path.join(dir, "content/patterns/p.md"),
      `---\ntype: pattern\ntitle: P\nsummary: A pattern.\ntags: [mold]\nstatus: draft\ncreated: 2026-06-18\nrevised: 2026-06-18\nrevision: 1\n---\n\nBody of p.\n`,
    );
  }

  // resolveWikiLink accepts the bare inner text, so an unbracketed ref would resolve for every
  // kind if nothing checked the shape first. A kind that declares `ref_shape: wiki-link` and
  // then accepts a non-wiki-link is a declaration that means nothing.
  it("refuses a bare ref for a kind declaring ref_shape: wiki-link", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-refshape-"));
    try {
      fixture(dir, '"p"');
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("must be a [[wiki-link]]");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("still accepts the bracketed form", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-refshape-ok-"));
    try {
      fixture(dir, '"[[p]]"');
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // A declared slug_field the note does not carry is an error, not a fall back to the note's
  // own slug — falling back would silently rename every bundled file of the kind on a typo'd
  // field name.
  it("refuses a note missing the field its kind declares as slug_field", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-slugmissing-"));
    try {
      fixture(dir, '"[[p]]"');
      const contract = yaml.load(
        readFileSync(path.join(dir, "reference_contract.yml"), "utf8"),
      ) as { kinds: Record<string, Record<string, Record<string, unknown>>> };
      contract.kinds.pattern!.cast!.slug_field = "no_such_field";
      writeFileSync(path.join(dir, "reference_contract.yml"), yaml.dump(contract));
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("no_such_field");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // The parser rejects an unknown key inside a cast: block rather than dropping it, which is
  // the failure mode it exists to prevent in the shared parser.
  it("refuses an unknown field inside a cast: block", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-unknownkey-"));
    try {
      fixture(dir, '"[[p]]"');
      const contract = yaml.load(
        readFileSync(path.join(dir, "reference_contract.yml"), "utf8"),
      ) as { kinds: Record<string, Record<string, Record<string, unknown>>> };
      contract.kinds.pattern!.cast!.slug_feild = "tool";
      writeFileSync(path.join(dir, "reference_contract.yml"), yaml.dump(contract));
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("slug_feild");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// Nothing here uses an LLM phase, pinned as a check rather than asserted in a commit message:
// every reference is a mode the caster renders, no bundle carries an LLM-produced fragment, and
// no provenance entry is waiting for one. If a Mold ever needs a mode a model produces, these
// are the tests that have to change first — and changing them is the decision to build that
// phase, made explicitly.
// The wire shape, named here rather than imported from the caster: these tests read committed
// records, so what they must agree with is the JSON on disk, not the type that produced it.
interface CommittedRefEntry {
  mode?: string;
  source?: string;
  pending_llm?: boolean;
  src?: string;
  src_hash?: string;
  dst_hash?: string;
}

describe("casting is deterministic end to end", () => {
  // Floors, not inventories. Each assertion below scans the tree and reports the offenders it
  // found, which is a shape that passes just as green on nothing as on everything: rename
  // `_provenance.json`, rename the `refs` key, move `content/molds/`, and a test whose entire
  // job is to license a deletion reports zero offenders because it read zero records. These
  // numbers are deliberately well under the current corpus (47 Molds, ~253 declared refs, ~277
  // recorded refs, ~255 of them verbatim) so ordinary authoring never trips them — they exist
  // to fail loudly the moment a scan collapses, the same guard `design-docs.test.ts` puts on
  // its own path lookup.
  const SOME_MOLDS = 40;
  const SOME_REFS = 200;

  /**
   * Every committed bundle's provenance, with the skip accounted for rather than silent.
   *
   * The pipeline harness bundles legitimately carry `_assembly.json` instead — that is the
   * only reason a bundle may have no provenance, so it is asserted rather than assumed. A
   * `continue` on a missing file cannot tell "this one is a harness" from "the filename
   * changed and I am now reading nothing."
   */
  function provenanceRecords(): Array<{ bundle: string; refs: CommittedRefEntry[] }> {
    const skills = path.join(repoRoot, "casts/claude/skills");
    const records: Array<{ bundle: string; refs: CommittedRefEntry[] }> = [];
    for (const bundle of readdirSync(skills)) {
      const provPath = path.join(skills, bundle, "_provenance.json");
      if (!existsSync(provPath)) {
        expect(existsSync(path.join(skills, bundle, "_assembly.json"))).toBe(true);
        continue;
      }
      const prov = JSON.parse(readFileSync(provPath, "utf8")) as { refs?: CommittedRefEntry[] };
      expect(Array.isArray(prov.refs)).toBe(true);
      records.push({ bundle, refs: prov.refs! });
    }
    expect(records.length).toBeGreaterThanOrEqual(SOME_MOLDS);
    expect(records.reduce((n, r) => n + r.refs.length, 0)).toBeGreaterThanOrEqual(SOME_REFS);
    return records;
  }

  // Mirrors the modes `GALAXY_HOOKS.renderers` registers. Named here rather than imported
  // because the caster does not export the table, and this test wants to disagree with it
  // loudly if a renderer is ever dropped without the corpus following.
  const RENDERED_MODES = ["verbatim", "sidecar"];

  it("every Mold ref declares a mode the caster renders", () => {
    const offenders: string[] = [];
    let refsScanned = 0;
    let moldsScanned = 0;
    for (const moldDir of readdirSync(path.join(repoRoot, "content/molds"))) {
      const notePath = path.join(repoRoot, "content/molds", moldDir, "index.md");
      if (!existsSync(notePath)) continue;
      const front = readFileSync(notePath, "utf8").match(/^---\n([\s\S]*?)\n---/);
      if (!front) continue;
      moldsScanned += 1;
      const meta = yaml.load(front[1]!) as { references?: Array<{ mode?: string }> };
      for (const ref of meta.references ?? []) {
        refsScanned += 1;
        if (ref.mode && !RENDERED_MODES.includes(ref.mode)) {
          offenders.push(`${moldDir}: ${ref.mode}`);
        }
      }
    }
    expect(moldsScanned).toBeGreaterThanOrEqual(SOME_MOLDS);
    expect(refsScanned).toBeGreaterThanOrEqual(SOME_REFS);
    expect(offenders).toEqual([]);
  });

  it("no committed cast carries an LLM fragment or an unfilled one", () => {
    const offenders: string[] = [];
    for (const { bundle, refs } of provenanceRecords()) {
      for (const ref of refs) {
        if (ref.source !== "deterministic" || ref.pending_llm) offenders.push(bundle);
      }
    }
    expect(offenders).toEqual([]);
  });

  // The verbatim guarantee, stated as the equality that proves it. This is what went stale in
  // seven bundles unnoticed, and it costs one pass over the tree to keep honest.
  it("every verbatim ref proves itself with src_hash == dst_hash", () => {
    const offenders: string[] = [];
    let verbatimRefs = 0;
    for (const { bundle, refs } of provenanceRecords()) {
      for (const ref of refs) {
        if (ref.mode !== "verbatim") continue;
        verbatimRefs += 1;
        if (ref.src_hash !== ref.dst_hash) offenders.push(`${bundle}: ${ref.src}`);
      }
    }
    expect(verbatimRefs).toBeGreaterThanOrEqual(SOME_REFS);
    expect(offenders).toEqual([]);
  });
});
