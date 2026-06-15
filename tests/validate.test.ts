import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadSchema, loadTags } from "../packages/build-cli/src/lib/schema.js";
import { validateData, validateDirectory } from "../packages/build-cli/src/commands/validate.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const SCHEMA_PATH = path.join(repoRoot, "meta_schema.yml");
const TAGS_PATH = path.join(repoRoot, "meta_tags.yml");

function loadRealSchema() {
  return loadSchema(SCHEMA_PATH, loadTags(TAGS_PATH));
}

const baseRequired = (overrides: Record<string, unknown> = {}) => ({
  type: "pattern",
  tags: ["pattern"],
  status: "draft",
  created: "2026-04-30",
  revised: "2026-04-30",
  revision: 1,
  ai_generated: false,
  summary: "A short summary that meets the minimum length requirement.",
  title: "Test Pattern",
  ...overrides,
});

const patternRequired = (overrides: Record<string, unknown> = {}) =>
  baseRequired({
    pattern_kind: "operation",
    evidence: "corpus-observed",
    ...overrides,
  });

const sourcePatternRequired = (overrides: Record<string, unknown> = {}) =>
  baseRequired({
    type: "source-pattern",
    tags: ["source-pattern", "source/nextflow", "target/galaxy"],
    source: "nextflow",
    target: "galaxy",
    source_pattern_kind: "operator",
    implemented_by_patterns: ["[[pattern-x]]"],
    title: "Nextflow Source Pattern",
    ...overrides,
  });

describe("validateData (per-file)", () => {
  const schema = loadRealSchema();

  it("accepts a minimal pattern", () => {
    const r = validateData(patternRequired(), schema);
    expect(r.errors).toEqual([]);
  });

  it("rejects missing required fields", () => {
    const r = validateData({ type: "pattern" }, schema);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("rejects unknown fields", () => {
    const r = validateData(patternRequired({ bogus: "x" }), schema);
    expect(r.errors.some((e) => /bogus/.test(e))).toBe(true);
  });

  it("redirects when 'schema' is set on an input_artifact", () => {
    const r = validateData(
      baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "consumer",
        axis: "generic",
        input_artifacts: [
          {
            id: "summary-x",
            schema: "[[schema-x]]",
            description: "Upstream structured summary used for binding.",
          },
        ],
      }),
      schema,
    );
    const msg = r.errors.find((e) => /input_artifacts\.0/.test(e)) ?? "";
    expect(msg).toMatch(/'schema' is producer-owned/);
    expect(msg).toMatch(/output_artifacts\[\]\.schema/);
  });

  it("rejects pipeline missing phases", () => {
    const r = validateData(
      baseRequired({ type: "pipeline", tags: ["pipeline"], title: "X" }),
      schema,
    );
    expect(r.errors.some((e) => /phases/.test(e))).toBe(true);
  });

  it("accepts pipeline with phases array", () => {
    const r = validateData(
      baseRequired({
        type: "pipeline",
        tags: ["pipeline"],
        title: "X",
        phases: [{ mold: "[[summarize-paper]]" }],
      }),
      schema,
    );
    expect(r.errors).toEqual([]);
  });

  it("accepts pipeline harness_notes array of strings", () => {
    const r = validateData(
      baseRequired({
        type: "pipeline",
        tags: ["pipeline"],
        title: "X",
        phases: [{ mold: "[[summarize-paper]]" }],
        harness_notes: ["Replaces the prior-art hand-authored nf-to-galaxy skill."],
      }),
      schema,
    );
    expect(r.errors).toEqual([]);
  });

  it("rejects harness_notes that is not an array of strings", () => {
    const r = validateData(
      baseRequired({
        type: "pipeline",
        tags: ["pipeline"],
        title: "X",
        phases: [{ mold: "[[summarize-paper]]" }],
        harness_notes: [{ note: "wrong shape" }],
      }),
      schema,
    );
    expect(r.errors.some((e) => /harness_notes/.test(e))).toBe(true);
  });

  it("accepts mold loop_endstate prose", () => {
    const r = validateData(
      baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "advance-galaxy-draft-step",
        axis: "generic",
        loop_endstate:
          "It owns its own endstate oracle (`gxwf draft-next-step`); re-invoke until it reports `draft: false`.",
      }),
      schema,
    );
    expect(r.errors).toEqual([]);
  });

  it("rejects loop_endstate that is not a string", () => {
    const r = validateData(
      baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "x",
        axis: "generic",
        loop_endstate: ["not", "a", "string"],
      }),
      schema,
    );
    expect(r.errors.some((e) => /loop_endstate/.test(e))).toBe(true);
  });

  it("rejects mold missing axis", () => {
    const r = validateData(baseRequired({ type: "mold", tags: ["mold"], name: "x" }), schema);
    expect(r.errors.some((e) => /axis/.test(e))).toBe(true);
  });

  it("source-specific mold requires source", () => {
    const r = validateData(
      baseRequired({ type: "mold", tags: ["mold"], name: "x", axis: "source-specific" }),
      schema,
    );
    expect(r.errors.some((e) => /source/.test(e))).toBe(true);
  });

  it("accepts typed references metadata", () => {
    const r = validateData(
      baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "x",
        axis: "generic",
        references: [
          {
            kind: "research",
            ref: "[[component-x]]",
            used_at: "runtime",
            load: "on-demand",
            mode: "condense",
            evidence: "hypothesis",
            purpose: "Explain when to load this reference.",
            trigger: "When the runtime task needs component details.",
            verification:
              "Run the generated skill on a real fixture and confirm this reference helps.",
          },
        ],
      }),
      schema,
    );
    expect(r.errors).toEqual([]);
  });

  it("rejects unknown typed reference fields", () => {
    const r = validateData(
      baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "x",
        axis: "generic",
        references: [
          {
            kind: "research",
            ref: "[[component-x]]",
            used_at: "runtime",
            load: "on-demand",
            mode: "verbatim",
            evidence: "corpus-observed",
            bogus: "x",
          },
        ],
      }),
      schema,
    );
    expect(r.errors.some((e) => /bogus/.test(e))).toBe(true);
  });

  it("requires evidence on typed references", () => {
    const r = validateData(
      baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "x",
        axis: "generic",
        references: [
          {
            kind: "research",
            ref: "[[component-x]]",
            used_at: "runtime",
            load: "on-demand",
            mode: "verbatim",
          },
        ],
      }),
      schema,
    );
    expect(r.errors.some((e) => /evidence/.test(e))).toBe(true);
  });

  it("rejects bad date format", () => {
    const r = validateData(patternRequired({ created: "not-a-date" }), schema);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("rejects whitespace-only wiki link", () => {
    const r = validateData(patternRequired({ parent_pattern: "[[   ]]" }), schema);
    expect(r.errors.some((e) => /whitespace-only/.test(e))).toBe(true);
  });

  it("warns on tag coherence drift", () => {
    const r = validateData(patternRequired({ tags: ["mold"] }), schema);
    expect(r.warnings.some((w) => /expected 'pattern'/.test(w))).toBe(true);
  });

  it("accepts source-pattern metadata", () => {
    const r = validateData(
      sourcePatternRequired({
        review_triggers: ["unmatched keys need review"],
      }),
      schema,
    );
    expect(r.errors).toEqual([]);
  });

  it("accepts prompt metadata", () => {
    const r = validateData(
      baseRequired({
        type: "prompt",
        tags: ["prompt", "prompt/galaxy-internal", "target/galaxy"],
        title: "Galaxy Prompt",
        prompt_file: "galaxy-prompt.upstream.prompt",
      }),
      schema,
    );
    expect(r.errors).toEqual([]);
  });

  it("requires source-pattern implementation links", () => {
    const r = validateData(sourcePatternRequired({ implemented_by_patterns: undefined }), schema);
    expect(r.errors.some((e) => /implemented_by_patterns/.test(e))).toBe(true);
  });

  it("accepts iwc_exemplars metadata", () => {
    const r = validateData(
      patternRequired({
        iwc_exemplars: [
          {
            workflow: "transcriptomics/rnaseq-pe/rnaseq-pe",
            steps: [{ label: "Map strandedness", id: 12 }],
            why: "Shows workflow enum values mapped into downstream tool dialect.",
            confidence: "high",
          },
        ],
      }),
      schema,
    );
    expect(r.errors).toEqual([]);
  });

  it("requires label or id for iwc_exemplars steps", () => {
    const r = validateData(
      patternRequired({
        iwc_exemplars: [
          {
            workflow: "transcriptomics/rnaseq-pe/rnaseq-pe",
            steps: [{}],
            why: "Shows workflow enum values mapped into downstream tool dialect.",
            confidence: "high",
          },
        ],
      }),
      schema,
    );
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

// ---- Cross-file integration ----

function writeFm(file: string, fm: Record<string, unknown>): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const yaml = Object.entries(fm)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  writeFileSync(file, `---\n${yaml}\n---\n\nbody\n`);
}

describe("validateDirectory (cross-file)", () => {
  let dir: string;

  beforeEach((ctx) => {
    const safe = ctx.task.name.replace(/[^a-z0-9]+/gi, "-");
    dir = path.join(repoRoot, `.tmp-test-vault-${safe}`);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("validates a tiny vault end-to-end", () => {
    writeFm(path.join(dir, "patterns/foo.md"), patternRequired());

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.filesChecked).toBe(1);
  });

  it("accepts verified evidence with an existing verification path", () => {
    const workflowFile = path.join(dir, "verification-workflows/gate.gxformat2.yml");
    mkdirSync(path.dirname(workflowFile), { recursive: true });
    writeFileSync(workflowFile, "class: GalaxyWorkflow\n");
    writeFm(
      path.join(dir, "patterns/pattern-x.md"),
      patternRequired({
        title: "Pattern X",
        evidence: "corpus-and-verified",
        verification_paths: [path.relative(repoRoot, workflowFile)],
      }),
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("rejects a missing verification path", () => {
    writeFm(
      path.join(dir, "patterns/pattern-x.md"),
      patternRequired({
        title: "Pattern X",
        evidence: "corpus-and-verified",
        verification_paths: ["verification/workflows/missing/gate.gxformat2.yml"],
      }),
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("rejects structurally verified evidence without verification paths", () => {
    writeFm(
      path.join(dir, "patterns/pattern-x.md"),
      patternRequired({
        title: "Pattern X",
        evidence: "structurally-verified",
      }),
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("rejects corpus-observed evidence with verification paths", () => {
    const workflowFile = path.join(dir, "verification-workflows/gate.gxformat2.yml");
    mkdirSync(path.dirname(workflowFile), { recursive: true });
    writeFileSync(workflowFile, "class: GalaxyWorkflow\n");
    writeFm(
      path.join(dir, "patterns/pattern-x.md"),
      patternRequired({
        title: "Pattern X",
        verification_paths: [path.relative(repoRoot, workflowFile)],
      }),
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("accepts abstract IWC workflow IDs in iwc_exemplars", () => {
    writeFm(
      path.join(dir, "patterns/pattern-x.md"),
      patternRequired({
        title: "Pattern X",
        iwc_exemplars: [
          {
            workflow: "transcriptomics/rnaseq-pe/rnaseq-pe",
            steps: [{ label: "Map strandedness", id: "12" }],
            why: "Shows workflow enum values mapped into downstream tool dialect.",
            confidence: "high",
          },
        ],
      }),
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("rejects generated IWC paths in iwc_exemplars", () => {
    writeFm(
      path.join(dir, "patterns/pattern-x.md"),
      patternRequired({
        title: "Pattern X",
        iwc_exemplars: [
          {
            workflow: "$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:270-299",
            why: "Shows workflow enum values mapped into downstream tool dialect.",
            confidence: "high",
          },
        ],
      }),
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("warns when operation patterns omit iwc_exemplars during migration", () => {
    writeFm(path.join(dir, "patterns/pattern-x.md"), patternRequired({ title: "Pattern X" }));

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("flags pipeline phase resolving to non-Mold", () => {
    // Pipeline references [[some-pattern]], but the file is a pattern, not a mold.
    writeFm(path.join(dir, "pipelines/p/index.md"), {
      ...baseRequired({
        type: "pipeline",
        tags: ["pipeline"],
        title: "P",
        phases: [{ mold: "[[some-pattern]]" }],
      }),
    });
    writeFm(path.join(dir, "patterns/some-pattern.md"), {
      ...patternRequired({ type: "pattern", tags: ["pattern"], title: "Some Pattern" }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("accepts pipeline eval.md and scenarios.md siblings", () => {
    writeFm(path.join(dir, "molds/mold-a/index.md"), {
      ...baseRequired({ type: "mold", tags: ["mold"], name: "mold-a", axis: "generic" }),
    });
    writeFm(path.join(dir, "pipelines/p/index.md"), {
      ...baseRequired({ type: "pipeline", tags: ["pipeline"], title: "P", phases: [{ mold: "[[mold-a]]" }] }),
    });
    writeFileSync(
      path.join(dir, "pipelines/p/eval.md"),
      "# P eval\n\n## Property: end to end\n\n- check: deterministic\n- assertion: final workflow validates\n",
    );
    writeFileSync(
      path.join(dir, "pipelines/p/scenarios.md"),
      "# P scenarios\n\n## Case: demo\n\n- fixture: nf-core/demo\n- expect: validates\n",
    );
    const r = validateDirectory({ directory: dir, schemaPath: SCHEMA_PATH, tagsPath: TAGS_PATH });
    expect(r.errors).toBe(0);
  });

  it("errors on frontmatter in a pipeline sibling", () => {
    writeFm(path.join(dir, "molds/mold-a/index.md"), {
      ...baseRequired({ type: "mold", tags: ["mold"], name: "mold-a", axis: "generic" }),
    });
    writeFm(path.join(dir, "pipelines/p/index.md"), {
      ...baseRequired({ type: "pipeline", tags: ["pipeline"], title: "P", phases: [{ mold: "[[mold-a]]" }] }),
    });
    writeFileSync(path.join(dir, "pipelines/p/eval.md"), "---\ntype: junk\n---\n\nbad\n");
    const r = validateDirectory({ directory: dir, schemaPath: SCHEMA_PATH, tagsPath: TAGS_PATH });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("warns on an unexpected file in a pipeline directory", () => {
    writeFm(path.join(dir, "molds/mold-a/index.md"), {
      ...baseRequired({ type: "mold", tags: ["mold"], name: "mold-a", axis: "generic" }),
    });
    writeFm(path.join(dir, "pipelines/p/index.md"), {
      ...baseRequired({ type: "pipeline", tags: ["pipeline"], title: "P", phases: [{ mold: "[[mold-a]]" }] }),
    });
    const before = validateDirectory({ directory: dir, schemaPath: SCHEMA_PATH, tagsPath: TAGS_PATH }).warnings;
    writeFileSync(path.join(dir, "pipelines/p/notes.md"), "stray notes\n");
    const after = validateDirectory({ directory: dir, schemaPath: SCHEMA_PATH, tagsPath: TAGS_PATH });
    expect(after.errors).toBe(0);
    expect(after.warnings).toBeGreaterThan(before);
  });

  it("warns on a flat .md file under content/pipelines/", () => {
    writeFm(path.join(dir, "molds/mold-a/index.md"), {
      ...baseRequired({ type: "mold", tags: ["mold"], name: "mold-a", axis: "generic" }),
    });
    writeFm(path.join(dir, "pipelines/p/index.md"), {
      ...baseRequired({ type: "pipeline", tags: ["pipeline"], title: "P", phases: [{ mold: "[[mold-a]]" }] }),
    });
    const before = validateDirectory({ directory: dir, schemaPath: SCHEMA_PATH, tagsPath: TAGS_PATH }).warnings;
    writeFileSync(path.join(dir, "pipelines/stray.md"), "not a directory note\n");
    const after = validateDirectory({ directory: dir, schemaPath: SCHEMA_PATH, tagsPath: TAGS_PATH });
    expect(after.errors).toBe(0);
    expect(after.warnings).toBeGreaterThan(before);
  });

  it("resolves a pipeline's [branch] phase to molds", () => {
    writeFm(path.join(dir, "pipelines/p/index.md"), {
      ...baseRequired({
        type: "pipeline",
        tags: ["pipeline"],
        title: "P",
        phases: [
          {
            branch: "discover-or-author",
            branches: ["[[discover]]", { fallthrough: "[[author]]" }],
          },
        ],
      }),
    });
    writeFm(path.join(dir, "molds/discover/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "discover",
        axis: "generic",
        status: "reviewed",
      }),
    });
    writeFm(path.join(dir, "molds/author/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "author",
        axis: "generic",
        status: "reviewed",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("validates typed reference targets", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
        references: [
          {
            kind: "research",
            ref: "[[component-x]]",
            used_at: "runtime",
            load: "on-demand",
            mode: "verbatim",
            evidence: "corpus-observed",
          },
          {
            kind: "pattern",
            ref: "[[pattern-x]]",
            used_at: "cast-time",
            load: "upfront",
            mode: "condense",
            evidence: "corpus-observed",
          },
          {
            kind: "schema",
            ref: "[[schema-x]]",
            used_at: "both",
            load: "upfront",
            mode: "verbatim",
            evidence: "cast-validated",
          },
          {
            kind: "prompt",
            ref: "[[prompt-x]]",
            used_at: "runtime",
            load: "upfront",
            mode: "verbatim",
            evidence: "corpus-observed",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "research/component-x.md"), {
      ...baseRequired({ type: "research", tags: ["research/component"], subtype: "component" }),
    });
    writeFm(path.join(dir, "patterns/pattern-x.md"), {
      ...patternRequired({ type: "pattern", tags: ["pattern"], title: "Pattern X" }),
    });
    writeFm(path.join(dir, "schemas/schema-x.md"), {
      ...baseRequired({
        type: "schema",
        tags: ["schema"],
        name: "schema-x",
        title: "Schema X",
        package: "@example/schema-x",
        package_export: "schemaX",
      }),
    });
    writeFm(path.join(dir, "prompts/prompt-x.md"), {
      ...baseRequired({
        type: "prompt",
        tags: ["prompt", "prompt/galaxy-internal", "target/galaxy"],
        title: "Prompt X",
        prompt_file: "prompt-x.upstream.prompt",
      }),
    });
    writeFileSync(path.join(dir, "prompts/prompt-x.upstream.prompt"), "Prompt body\n");

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("rejects prompt notes with missing prompt_file", () => {
    writeFm(path.join(dir, "prompts/prompt-x.md"), {
      ...baseRequired({
        type: "prompt",
        tags: ["prompt", "prompt/galaxy-internal", "target/galaxy"],
        title: "Prompt X",
        prompt_file: "missing.upstream.prompt",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("resolves CLI command references by tool and command", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
        references: [
          {
            kind: "cli-command",
            ref: "[[gxwf validate]]",
            used_at: "runtime",
            load: "on-demand",
            mode: "sidecar",
            evidence: "corpus-observed",
            trigger: "After editing a Galaxy workflow.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "cli/gxwf/validate.md"), {
      ...baseRequired({
        type: "cli-command",
        tags: ["cli-command", "cli/gxwf"],
        tool: "gxwf",
        command: "validate",
        package: "@galaxy-tool-util/cli",
        upstream:
          "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("rejects CLI command notes missing upstream metadata", () => {
    writeFm(path.join(dir, "cli/gxwf/not-real.md"), {
      ...baseRequired({
        type: "cli-command",
        tags: ["cli-command", "cli/gxwf"],
        tool: "gxwf",
        command: "not-real",
        package: "@galaxy-tool-util/cli",
        upstream:
          "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("rejects typed references that resolve to the wrong type", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
        references: [
          {
            kind: "research",
            ref: "[[not-research]]",
            used_at: "runtime",
            load: "on-demand",
            mode: "verbatim",
            evidence: "corpus-observed",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "patterns/not-research.md"), {
      ...patternRequired({ type: "pattern", tags: ["pattern"], title: "Not Research" }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("validates source-pattern implementation links", () => {
    writeFm(
      path.join(dir, "source-patterns/nextflow/source-x.md"),
      sourcePatternRequired({
        implemented_by_patterns: ["[[pattern-x]]"],
      }),
    );
    writeFm(path.join(dir, "patterns/pattern-x.md"), patternRequired({ title: "Pattern X" }));

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("rejects source-pattern links that do not resolve", () => {
    writeFm(
      path.join(dir, "source-patterns/nextflow/source-x.md"),
      sourcePatternRequired({
        implemented_by_patterns: ["[[missing-pattern]]"],
      }),
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("rejects source-pattern links that resolve to non-patterns", () => {
    writeFm(
      path.join(dir, "source-patterns/nextflow/source-x.md"),
      sourcePatternRequired({
        implemented_by_patterns: ["[[not-a-pattern]]"],
      }),
    );
    writeFm(path.join(dir, "research/not-a-pattern.md"), {
      ...baseRequired({ type: "research", tags: ["research/component"], subtype: "component" }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("rejects a vendored schema missing license_file", () => {
    mkdirSync(path.join(dir, "schemas"), { recursive: true });
    writeFileSync(path.join(dir, "schemas/x.schema.json"), "{}");
    writeFm(path.join(dir, "schemas/x.md"), {
      ...baseRequired({
        type: "schema",
        tags: ["schema"],
        name: "x",
        title: "X",
        package: "@some-org/x",
        upstream: "https://github.com/some-org/x/blob/main/x.schema.json",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("accepts a vendored schema with license_file resolving inside the vault", () => {
    mkdirSync(path.join(dir, "LICENSES"), { recursive: true });
    writeFileSync(path.join(dir, "LICENSES/some-org.LICENSE"), "MIT License\n\nCopyright …\n");
    mkdirSync(path.join(dir, "schemas"), { recursive: true });
    writeFileSync(path.join(dir, "schemas/x.schema.json"), "{}");
    writeFm(path.join(dir, "schemas/x.md"), {
      ...baseRequired({
        type: "schema",
        tags: ["schema"],
        name: "x",
        title: "X",
        package: "@some-org/x",
        upstream: "https://github.com/some-org/x/blob/main/x.schema.json",
        license: "MIT",
        license_file: "LICENSES/some-org.LICENSE",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("rejects a license_file pointing at a missing file", () => {
    mkdirSync(path.join(dir, "schemas"), { recursive: true });
    writeFileSync(path.join(dir, "schemas/x.schema.json"), "{}");
    writeFm(path.join(dir, "schemas/x.md"), {
      ...baseRequired({
        type: "schema",
        tags: ["schema"],
        name: "x",
        title: "X",
        package: "@some-org/x",
        upstream: "https://github.com/some-org/x/blob/main/x.schema.json",
        license: "MIT",
        license_file: "LICENSES/does-not-exist.LICENSE",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("does not require license_file for Foundry-authored schemas", () => {
    mkdirSync(path.join(dir, "schemas"), { recursive: true });
    writeFileSync(path.join(dir, "schemas/x.schema.json"), "{}");
    writeFm(path.join(dir, "schemas/x.md"), {
      ...baseRequired({
        type: "schema",
        tags: ["schema"],
        name: "x",
        title: "X",
        package: "@galaxy-foundry/x-schema",
        upstream:
          "https://github.com/galaxyproject/foundry/blob/main/packages/x-schema/src/x.schema.json",
        license: "MIT",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("requires verification for hypothesis references", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
        references: [
          {
            kind: "research",
            ref: "[[component-x]]",
            used_at: "runtime",
            load: "on-demand",
            mode: "verbatim",
            evidence: "hypothesis",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "research/component-x.md"), {
      ...baseRequired({ type: "research", tags: ["research/component"], subtype: "component" }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("warns when on-demand references omit triggers", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
        references: [
          {
            kind: "research",
            ref: "[[component-x]]",
            used_at: "runtime",
            load: "on-demand",
            mode: "verbatim",
            evidence: "corpus-observed",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "research/component-x.md"), {
      ...baseRequired({ type: "research", tags: ["research/component"], subtype: "component" }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("flags Mold source layout drift", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFm(path.join(dir, "molds/m/notes.md"), {
      ...patternRequired({ title: "Unexpected Note" }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("accepts a Mold eval plan without frontmatter", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: basic\n\n- check: deterministic\n- assertion: synthetic\n",
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("accepts usage.md and refinement.md siblings without frontmatter", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: basic\n\n- check: deterministic\n- assertion: x\n",
    );
    writeFileSync(path.join(dir, "molds/m/usage.md"), "# m usage\n\nSample run.\n");
    writeFileSync(
      path.join(dir, "molds/m/refinement.md"),
      "# m refinement\n\nIs field x pulling weight?\n",
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("allowlists scenarios.md and accepts Property sections in eval.md", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: p\n\n- check: deterministic\n- assertion: holds for all inputs\n",
    );
    const withoutScenarios = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(withoutScenarios.errors).toBe(0);

    writeFileSync(
      path.join(dir, "molds/m/scenarios.md"),
      "# m scenarios\n\n## Case: basic\n\n- fixture: synthetic\n- expect: 1\n",
    );
    const withScenarios = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(withScenarios.errors).toBe(0);
    // valid scenarios.md is allowlisted and well-formed: adds no warning
    expect(withScenarios.warnings).toBe(withoutScenarios.warnings);
  });

  it("warns when scenarios.md lacks a Case section", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: p\n\n- check: deterministic\n- assertion: x\n",
    );
    const before = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    }).warnings;

    writeFileSync(
      path.join(dir, "molds/m/scenarios.md"),
      "# m scenarios\n\nProse only, no case sections.\n",
    );
    const after = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(after.errors).toBe(0);
    expect(after.warnings).toBeGreaterThan(before);
  });

  it("warns when a scenarios.md case binds no fixture", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: p\n\n- check: deterministic\n- assertion: x\n",
    );
    const before = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    }).warnings;

    writeFileSync(
      path.join(dir, "molds/m/scenarios.md"),
      "# m scenarios\n\n## Case: c\n\n- expect: something\n",
    );
    const after = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(after.errors).toBe(0);
    expect(after.warnings).toBeGreaterThan(before);
  });

  it("warns when eval.md uses a Case section (oracle must stay abstract)", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({ type: "mold", tags: ["mold"], name: "m", axis: "generic" }),
    });
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: p\n\n- check: deterministic\n- assertion: holds for all inputs\n",
    );
    const before = validateDirectory({ directory: dir, schemaPath: SCHEMA_PATH, tagsPath: TAGS_PATH }).warnings;
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: p\n\n- check: deterministic\n- assertion: holds for all inputs\n\n## Case: concrete\n\n- fixture: y\n- expect: z\n",
    );
    const after = validateDirectory({ directory: dir, schemaPath: SCHEMA_PATH, tagsPath: TAGS_PATH });
    expect(after.errors).toBe(0);
    expect(after.warnings).toBeGreaterThan(before);
  });

  it("warns on unexpected files in a Mold directory", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFileSync(path.join(dir, "molds/m/scratch.md"), "stray notes\n");

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("warns on unexpected subdirectories in a Mold directory", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
      }),
    });
    mkdirSync(path.join(dir, "molds/m/scratch"), { recursive: true });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("accepts refinement journal entries with valid frontmatter", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: basic\n\n- check: deterministic\n- assertion: x\n",
    );
    mkdirSync(path.join(dir, "molds/m/refinements"), { recursive: true });
    writeFileSync(
      path.join(dir, "molds/m/refinements/2026-05-04-probe.md"),
      "---\nmold: m\ndate: 2026-05-04\nintent: ablate field foo\ndecision: open-question\n---\n\nNotes.\n",
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("warns on refinement journal entries missing frontmatter", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: basic\n\n- check: deterministic\n- assertion: x\n",
    );
    mkdirSync(path.join(dir, "molds/m/refinements"), { recursive: true });
    writeFileSync(
      path.join(dir, "molds/m/refinements/2026-05-04-probe.md"),
      "no frontmatter here\n",
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("warns on body wiki-links that do not resolve", () => {
    mkdirSync(path.dirname(path.join(dir, "patterns/pattern-x.md")), { recursive: true });
    writeFileSync(
      path.join(dir, "patterns/pattern-x.md"),
      `---\n${Object.entries(patternRequired({ title: "Pattern X" }))
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join("\n")}\n---\n\nBody cites [[ghost-target]] in prose.\n`,
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("ignores body wiki-links inside fenced or inline code", () => {
    const fm = baseRequired({
      type: "research",
      tags: ["research/component"],
      subtype: "component",
    });
    mkdirSync(path.dirname(path.join(dir, "research/component-x.md")), { recursive: true });
    writeFileSync(
      path.join(dir, "research/component-x.md"),
      `---\n${Object.entries(fm)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(
          "\n",
        )}\n---\n\nInline \`[[ghost-inline]]\` and fenced:\n\n\`\`\`\n[[ghost-fenced]]\n\`\`\`\n`,
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBe(0);
  });

  it("warns on schema reference with evidence=hypothesis", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
        references: [
          {
            kind: "schema",
            ref: "[[schema-x]]",
            used_at: "both",
            load: "upfront",
            mode: "verbatim",
            evidence: "hypothesis",
            verification: "Run cast and confirm output validates.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "schemas/schema-x.md"), {
      ...baseRequired({
        type: "schema",
        tags: ["schema"],
        name: "schema-x",
        title: "Schema X",
        package: "@example/schema-x",
        package_export: "schemaX",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("warns when a stub mold body declares references", () => {
    mkdirSync(path.join(dir, "molds/m"), { recursive: true });
    const fm = baseRequired({
      type: "mold",
      tags: ["mold"],
      name: "m",
      axis: "generic",
      references: [
        {
          kind: "research",
          ref: "[[component-x]]",
          used_at: "runtime",
          load: "on-demand",
          mode: "verbatim",
          evidence: "corpus-observed",
          trigger: "x",
        },
      ],
    });
    writeFileSync(
      path.join(dir, "molds/m/index.md"),
      `---\n${Object.entries(fm)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join("\n")}\n---\n\n# m\n\nStub. Replace with real content later.\n`,
    );
    writeFm(path.join(dir, "research/component-x.md"), {
      ...baseRequired({ type: "research", tags: ["research/component"], subtype: "component" }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("warns on refinement journal entries with bad decision vocab", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: basic\n\n- check: deterministic\n- assertion: x\n",
    );
    mkdirSync(path.join(dir, "molds/m/refinements"), { recursive: true });
    writeFileSync(
      path.join(dir, "molds/m/refinements/2026-05-04-probe.md"),
      "---\nmold: m\ndate: 2026-05-04\nintent: x\ndecision: bogus-value\n---\n\n",
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("accepts artifact handoff between two molds", () => {
    writeFm(path.join(dir, "molds/producer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "producer",
        axis: "generic",
        output_artifacts: [
          {
            id: "summary-x",
            kind: "json",
            default_filename: "summary-x.json",
            description: "Structured summary that downstream Molds bind to.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "molds/consumer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "consumer",
        axis: "generic",
        input_artifacts: [
          {
            id: "summary-x",
            description: "Structured summary produced by an upstream Mold.",
          },
        ],
      }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("rejects a consumer artifact with no producer", () => {
    writeFm(path.join(dir, "molds/consumer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "consumer",
        axis: "generic",
        input_artifacts: [
          {
            id: "summary-missing",
            description: "Structured summary that nobody declares producing.",
          },
        ],
      }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("rejects an artifact schema wiki-link that resolves to non-schema", () => {
    writeFm(path.join(dir, "molds/producer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "producer",
        axis: "generic",
        output_artifacts: [
          {
            id: "summary-x",
            kind: "json",
            default_filename: "summary-x.json",
            schema: "[[not-a-schema]]",
            description: "Structured summary tied to a wrong-typed wiki-link.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "patterns/not-a-schema.md"), {
      ...patternRequired({ title: "Not A Schema" }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("accepts an artifact schema wiki-link to a schema note", () => {
    writeFm(path.join(dir, "molds/producer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "producer",
        axis: "generic",
        output_artifacts: [
          {
            id: "summary-x",
            kind: "json",
            default_filename: "summary-x.json",
            schema: "[[schema-x]]",
            description: "Structured summary with a real schema declared.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "schemas/schema-x.md"), {
      ...baseRequired({
        type: "schema",
        tags: ["schema"],
        name: "schema-x",
        title: "Schema X",
        package: "@example/schema-x",
        package_export: "schemaX",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("rejects inconsistent schemas across producers of the same artifact id", () => {
    writeFm(path.join(dir, "molds/producer-a/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "producer-a",
        axis: "generic",
        output_artifacts: [
          {
            id: "summary-x",
            kind: "json",
            default_filename: "summary-x.json",
            schema: "[[schema-x]]",
            description: "Structured summary from one branch producer.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "molds/producer-b/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "producer-b",
        axis: "generic",
        output_artifacts: [
          {
            id: "summary-x",
            kind: "json",
            default_filename: "summary-x.json",
            schema: "[[schema-y]]",
            description: "Structured summary from another branch producer.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "schemas/schema-x.md"), {
      ...baseRequired({
        type: "schema",
        tags: ["schema"],
        name: "schema-x",
        title: "Schema X",
        package: "@example/schema-x",
        package_export: "schemaX",
      }),
    });
    writeFm(path.join(dir, "schemas/schema-y.md"), {
      ...baseRequired({
        type: "schema",
        tags: ["schema"],
        name: "schema-y",
        title: "Schema Y",
        package: "@example/schema-y",
        package_export: "schemaY",
      }),
    });

    const before = process.stdout.write;
    let captured = "";
    process.stdout.write = (chunk: any) => {
      captured += String(chunk);
      return true;
    };
    try {
      const r = validateDirectory({
        directory: dir,
        schemaPath: SCHEMA_PATH,
        tagsPath: TAGS_PATH,
      });
      expect(r.errors).toBeGreaterThanOrEqual(1);
    } finally {
      process.stdout.write = before;
    }
    expect(captured).toMatch(/inconsistent producer schemas/);
  });

  it("warns when only some producers of an artifact id declare a schema", () => {
    writeFm(path.join(dir, "molds/producer-a/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "producer-a",
        axis: "generic",
        output_artifacts: [
          {
            id: "summary-x",
            kind: "json",
            default_filename: "summary-x.json",
            schema: "[[schema-x]]",
            description: "Structured summary from one branch producer.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "molds/producer-b/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "producer-b",
        axis: "generic",
        output_artifacts: [
          {
            id: "summary-x",
            kind: "json",
            default_filename: "summary-x.json",
            description: "Structured summary from another branch producer.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "schemas/schema-x.md"), {
      ...baseRequired({
        type: "schema",
        tags: ["schema"],
        name: "schema-x",
        title: "Schema X",
        package: "@example/schema-x",
        package_export: "schemaX",
      }),
    });

    const before = process.stdout.write;
    let captured = "";
    process.stdout.write = (chunk: any) => {
      captured += String(chunk);
      return true;
    };
    try {
      const r = validateDirectory({
        directory: dir,
        schemaPath: SCHEMA_PATH,
        tagsPath: TAGS_PATH,
      });
      expect(r.errors).toBe(0);
      expect(r.warnings).toBeGreaterThanOrEqual(1);
    } finally {
      process.stdout.write = before;
    }
    expect(captured).toMatch(/mixed schema coverage/);
  });

  it("rejects an artifact schema whose target schema note lacks package_export", () => {
    writeFm(path.join(dir, "molds/producer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "producer",
        axis: "generic",
        output_artifacts: [
          {
            id: "summary-x",
            kind: "json",
            default_filename: "summary-x.json",
            schema: "[[schema-x]]",
            description: "Structured summary with an under-declared schema note.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "schemas/schema-x.md"), {
      ...baseRequired({
        type: "schema",
        tags: ["schema"],
        name: "schema-x",
        title: "Schema X",
        package: "@example/schema-x",
      }),
    });

    const before = process.stdout.write;
    let captured = "";
    process.stdout.write = (chunk: any) => {
      captured += String(chunk);
      return true;
    };
    try {
      const r = validateDirectory({
        directory: dir,
        schemaPath: SCHEMA_PATH,
        tagsPath: TAGS_PATH,
      });
      expect(r.errors).toBeGreaterThanOrEqual(1);
    } finally {
      process.stdout.write = before;
    }
    expect(captured).toMatch(/package_export/);
  });

  it("rejects schema validator_bin missing from package bin map", () => {
    writeFm(path.join(dir, "schemas/schema-x.md"), {
      ...baseRequired({
        type: "schema",
        tags: ["schema"],
        name: "schema-x",
        title: "Schema X",
        package: "@galaxy-foundry/schema-x",
        package_export: "schemaX",
        validator_bin: "validate-schema-x",
      }),
    });
    mkdirSync(path.join(dir, "packages/schema-x"), { recursive: true });
    writeFileSync(
      path.join(dir, "packages/schema-x/package.json"),
      JSON.stringify({ name: "@galaxy-foundry/schema-x", bin: {} }, null, 2),
    );

    const before = process.stdout.write;
    let captured = "";
    process.stdout.write = (chunk: any) => {
      captured += String(chunk);
      return true;
    };
    try {
      const r = validateDirectory({
        directory: dir,
        schemaPath: SCHEMA_PATH,
        tagsPath: TAGS_PATH,
      });
      expect(r.errors).toBeGreaterThanOrEqual(1);
    } finally {
      process.stdout.write = before;
    }
    expect(captured).toMatch(/validator_bin 'validate-schema-x'/);
    expect(captured).toMatch(/package\.json bin map/);
  });

  it("warns when a pipeline phase consumes an artifact no prior phase produces", () => {
    writeFm(path.join(dir, "molds/producer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "producer",
        axis: "generic",
        output_artifacts: [
          {
            id: "summary-x",
            kind: "json",
            default_filename: "summary-x.json",
            description: "Structured summary that downstream Molds bind to.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "molds/consumer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "consumer",
        axis: "generic",
        input_artifacts: [{ id: "summary-x", description: "Upstream structured summary." }],
      }),
    });
    // Out-of-order pipeline: consumer first, producer second.
    writeFm(path.join(dir, "pipelines/bad-order/index.md"), {
      ...baseRequired({
        type: "pipeline",
        tags: ["pipeline"],
        title: "Bad Order",
        phases: [{ mold: "[[consumer]]" }, { mold: "[[producer]]" }],
      }),
    });

    const before = process.stdout.write;
    let captured = "";
    process.stdout.write = (chunk: any) => {
      captured += String(chunk);
      return true;
    };
    try {
      const r = validateDirectory({
        directory: dir,
        schemaPath: SCHEMA_PATH,
        tagsPath: TAGS_PATH,
      });
      expect(r.errors).toBe(0);
    } finally {
      process.stdout.write = before;
    }
    expect(captured).toMatch(/input_artifact 'summary-x' has no prior phase producing it/);
  });
});
