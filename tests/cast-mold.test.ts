import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const castMold = path.join(repoRoot, "scripts", "cast-mold.ts");
const foundryBuild = path.join(repoRoot, "packages", "build-cli", "src", "bin", "foundry-build.ts");
const castVerify = path.join(repoRoot, "scripts", "cast-skill-verify.ts");
// Resolve the repo-local tsx binary by absolute path. Invoking `npx tsx` from a
// temp-dir cwd can't see local node_modules and auto-installs tsx into the
// shared npx cache; two such installs racing across test files corrupt it.
const tsxBin = path.join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");

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

  it("foundry-build cast --check catches stale _verify.json", () => {
    const verifyPath = path.join(
      repoRoot,
      "casts",
      "claude",
      "skills",
      "summarize-nextflow",
      "_verify.json",
    );
    const original = readFileSync(verifyPath, "utf8");
    try {
      writeFileSync(
        verifyPath,
        JSON.stringify({ verify_schema_version: 1, entries: [] }, null, 2) + "\n",
      );
      const r = runTsx(foundryBuild, ["cast", "summarize-nextflow", "--target=claude", "--check"]);
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("_verify.json");
    } finally {
      writeFileSync(verifyPath, original);
    }
  });

  it("provenance is schema v3 and lists deterministic refs", () => {
    const provPath = path.join(
      repoRoot,
      "casts",
      "claude",
      "skills",
      "summarize-nextflow",
      "_provenance.json",
    );
    const prov = JSON.parse(readFileSync(provPath, "utf8"));
    expect(prov.provenance_schema_version).toBe(3);
    expect(prov.cast_target).toBe("claude");
    expect(Array.isArray(prov.refs)).toBe(true);
    expect(prov.refs.length).toBeGreaterThan(0);
    for (const r of prov.refs) {
      expect(r.source).toBe("deterministic");
      expect(r.pending_llm).toBeUndefined();
      expect(r.src_hash).toBe(r.dst_hash);
    }
    // Refs sorted by (kind, src) for stability.
    const keys = prov.refs.map((r: { kind: string; src: string }) => `${r.kind}:${r.src}`);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
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

  it("dst paths use strict 1:1 source basename for verbatim refs", () => {
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
      // cli-tool notes live at content/cli/<tool>/index.md; their dst is renamed
      // to references/cli/<tool>.md so tool notes don't all collide on index.md.
      if (r.kind === "cli-tool") continue;
      expect(path.basename(r.dst)).toBe(path.basename(r.src));
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
  it("copies prompt_file sidecars using the prompt wrapper slug", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-prompt-"));
    try {
      mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
      mkdirSync(path.join(dir, "content/prompts"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
      writeFileSync(
        path.join(dir, "casts/claude/_target.yml"),
        [
          "name: claude",
          "provenance_schema_version: 3",
          "required_outputs: [SKILL.md, _provenance.json]",
          "kinds:",
          "  prompt:",
          "    dst_dir: references/prompts/",
          "    dst_extension: .md",
          "    modes: [verbatim]",
          "condense_prompts: {}",
          "skill_constraints:",
          "  frontmatter_required: [name, description]",
          "  forbidden_runtime_paths: []",
          "  forbid_packaged_files: []",
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
ai_generated: false
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
        path.join(dir, "content/prompts/prompt-x.md"),
        `---
type: prompt
title: Prompt X
tags: [prompt]
status: draft
created: 2026-05-07
revised: 2026-05-07
revision: 1
ai_generated: false
summary: Prompt wrapper summary for cast sidecar behavior.
prompt_file: prompt-x.upstream.prompt
---

Wrapper body should not be copied.
`,
      );
      writeFileSync(path.join(dir, "content/prompts/prompt-x.upstream.prompt"), "RAW PROMPT\n");

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
      expect(prov.refs[0].src).toBe("content/prompts/prompt-x.upstream.prompt");
      expect(prov.refs[0].dst).toBe("references/prompts/prompt-x.md");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("cast-mold cli-command meta injection", () => {
  it("embeds args/options from the package meta subpath and leaves the body flag-free", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-cli-"));
    try {
      mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
      mkdirSync(path.join(dir, "content/cli/galaxy-tool-cache"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
      writeFileSync(
        path.join(dir, "casts/claude/_target.yml"),
        [
          "name: claude",
          "provenance_schema_version: 3",
          "required_outputs: [SKILL.md, _provenance.json]",
          "kinds:",
          "  cli-command:",
          "    dst_dir: references/cli/",
          "    dst_extension: .json",
          "    modes: [sidecar]",
          "condense_prompts: {}",
          "skill_constraints:",
          "  frontmatter_required: [name, description]",
          "  forbidden_runtime_paths: []",
          "  forbid_packaged_files: []",
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
ai_generated: false
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
ai_generated: false
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
      const galaxyUrl = sidecar.options.find((o: { flags: string }) => o.flags.includes("--galaxy-url"));
      expect(galaxyUrl?.description).toMatch(/after the ToolShed/i);
      expect(sidecar.body).not.toContain("## Flags");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("cast-mold companion files", () => {
  function writeCompanionFixture(dir: string, opts: { declareCompanions: boolean }): void {
    mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
    mkdirSync(path.join(dir, "content/research"), { recursive: true });
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
        "provenance_schema_version: 3",
        "required_outputs: [SKILL.md, _provenance.json]",
        "kinds:",
        "  research:",
        "    dst_dir: references/notes/",
        "    dst_extension: .md",
        "    modes: [verbatim, condense]",
        "condense_prompts: {}",
        "skill_constraints:",
        "  frontmatter_required: [name, description]",
        "  forbidden_runtime_paths: []",
        "  forbid_packaged_files: []",
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
ai_generated: false
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
    const companionsFm = opts.declareCompanions ? "companions:\n  - bundled-note.spec.yml\n" : "";
    writeFileSync(
      path.join(dir, "content/research/bundled-note.md"),
      `---
type: research
title: Bundled note
tags: [research/component]
status: draft
created: 2026-05-07
revised: 2026-05-07
revision: 1
ai_generated: false
summary: A multi-file note; consume bundled-note.spec.yml for the structured spec.
${companionsFm}---

Consume \`bundled-note.spec.yml\` for the structured spec.
`,
    );
    writeFileSync(path.join(dir, "content/research/bundled-note.spec.yml"), "spec: true\n");
  }

  it("copies declared companion files next to the note and records companion_of", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-companion-"));
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
      expect(verify.stderr).toContain("not present in the bundle");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
});

describe("cast-mold license → redistribution-policy enforcement", () => {
  // Temp repo: one mold referencing one research note (verbatim), plus a copy of
  // the real license-policy.yml so enforcement resolves against the true table.
  function scaffold(dir: string, noteFrontmatter: string, extraLicenseFile?: string): void {
    mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
    mkdirSync(path.join(dir, "content/research"), { recursive: true });
    mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
    writeFileSync(
      path.join(dir, "license-policy.yml"),
      readFileSync(path.join(repoRoot, "license-policy.yml"), "utf8"),
    );
    if (extraLicenseFile) {
      mkdirSync(path.join(dir, "LICENSES"), { recursive: true });
      writeFileSync(path.join(dir, extraLicenseFile), "TEST LICENSE TEXT\n");
    }
    writeFileSync(
      path.join(dir, "casts/claude/_target.yml"),
      [
        "name: claude",
        "provenance_schema_version: 3",
        "required_outputs: [SKILL.md, _provenance.json]",
        "kinds:",
        "  research:",
        "    dst_dir: references/notes/",
        "    dst_extension: .md",
        "    modes: [verbatim, condense]",
        "condense_prompts: {}",
        "skill_constraints:",
        "  frontmatter_required: [name, description]",
        "  forbidden_runtime_paths: []",
        "  forbid_packaged_files: []",
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
ai_generated: false
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
    writeFileSync(path.join(dir, "content/research/note-x.md"), noteFrontmatter);
  }

  const noteBody = "\n\n# Note X\n\nThird-party prose.\n";

  it("refuses verbatim carry of an own-words-only license", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-lic-owf-"));
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
ai_generated: false
summary: Own-words-only note that must not be carried verbatim.
license: CC-BY-NC-SA-2.0
---${noteBody}`,
      );
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("own-words-only");
      expect(r.stderr).toContain("forbids mode=verbatim");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("carries a verbatim-ok license and hashes its license_file into provenance", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-lic-ok-"));
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
ai_generated: false
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
