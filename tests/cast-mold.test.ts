import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fileSlug } from "../packages/build-cli/src/lib/walk.js";

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
    try {
      mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
      mkdirSync(path.join(dir, "content/prompts/prompt-x"), { recursive: true });
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
      const galaxyUrl = sidecar.options.find((o: { flags: string }) => o.flags.includes("--galaxy-url"));
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
    try {
      writeCompanionFixture(dir, { declareCompanions: false, siblingName: "structural.schema.json" });
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
    try {
      writeCompanionFixture(dir, { declareCompanions: true });
      expect(runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]).code).toBe(0);

      // Stand in for a companion that was declared once and then undeclared: casting wrote it,
      // nothing claims it now, and before pruning existed it stayed in the bundle forever while
      // provenance and SKILL.md both said it was gone.
      const orphan = path.join(dir, "casts/claude/skills/m/references/notes/left-behind.yml");
      writeFileSync(orphan, "stale: true\n");

      const checked = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--check", "--root", dir]);
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
    try {
      writeCompanionFixture(dir, { declareCompanions: true, siblingName: "vendor/spec.yml" });
      const r = runTsx(foundryBuild, ["cast", "m", "--target=claude", "--root", dir]);
      expect(r.code, `stderr: ${r.stderr}`).toBe(0);

      // Nested dst, not flattened: the note names `vendor/spec.yml` and the bundle mirrors it,
      // so a vendored tree whose files reference each other by relative path still resolves.
      const nested = path.join(dir, "casts/claude/skills/m/references/notes/vendor/spec.yml");
      expect(existsSync(nested), "nested companion should mirror its path in the bundle").toBe(true);

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
      ["casting.md", "cast-input"],
      ["cast-skill-verification.md", "cast-input"],
    ])("rejects a bundle carrying %s (%s)", (file, disposition) => {
      const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-forbidden-"));
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

  it("--check on a never-cast mold leaves no bundle directory behind", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "foundry-cast-check-"));
    try {
      mkdirSync(path.join(dir, "content/molds/m"), { recursive: true });
      mkdirSync(path.join(dir, "casts/claude"), { recursive: true });
      writeFileSync(
        path.join(dir, "casts/claude/_target.yml"),
        [
          "name: claude",
          "provenance_schema_version: 3",
          "required_outputs: [SKILL.md, _provenance.json]",
          "kinds: {}",
          "condense_prompts: {}",
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
    expect(stripWikiLinks("See [[summarize-nextflow]] first.")).toBe("See summarize-nextflow first.");
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
