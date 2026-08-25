import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bundledPolicy } from "@galaxy-foundry/license-policy";
import { buildNoteSchema, loadReferenceContract } from "@galaxy-foundry/note-schema";
import { loadTagRegistry } from "@galaxy-foundry/tag-registry";
import { validateData, validateDirectory } from "../packages/build-cli/src/commands/validate.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const TAGS_PATH = path.join(repoRoot, "meta_tags.yml");

function loadRealSchema() {
  return buildNoteSchema({
    tags: loadTagRegistry(TAGS_PATH),
    contract: loadReferenceContract(path.join(repoRoot, "reference_contract.yml")),
    licensePolicy: bundledPolicy(),
  });
}

const baseRequired = (overrides: Record<string, unknown> = {}) => ({
  type: "pattern",
  tags: ["target/galaxy"],
  status: "draft",
  created: "2026-04-30",
  revised: "2026-04-30",
  revision: 1,
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
    tags: ["source/nextflow", "target/galaxy"],
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

  // `companions:` names files RELATIVE TO THE NOTE'S DIRECTORY, so a vendored subtree is
  // declarable. `cwl-v1.2-schemas` is the case: its seven upstream schemas live one level down,
  // and while the field admitted no separator they could not be declared at all.
  const researchRequired = (overrides: Record<string, unknown> = {}) =>
    baseRequired({ type: "research", tags: ["target/galaxy"], ...overrides });

  it("accepts a companion path inside the note's own subdirectory", () => {
    const r = validateData(researchRequired({ companions: ["cwl-v1.2/Workflow.yml"] }), schema);
    expect(r.errors).toEqual([]);
  });

  // The character class allows `.` and `-`, so `..` is a legal-looking SEGMENT. Without an
  // explicit check a note could reach out of its directory and bundle a file it does not own —
  // which, for a flat-note era holdover, would have meant any file in the collection.
  it("rejects a companion path that climbs out of the note's directory", () => {
    const r = validateData(researchRequired({ companions: ["../galaxy-xsd/galaxy.xsd"] }), schema);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  // `pattern` is a flat note, so the directory a companion would resolve against is
  // `content/patterns/` — shared by every pattern. There is no "its own" file to name.
  it("rejects companions on a flat-note kind", () => {
    const r = validateData(patternRequired({ companions: ["x.yml"] }), schema);
    expect(r.errors.some((e) => /companions/.test(e))).toBe(true);
  });

  it("rejects unknown fields", () => {
    const r = validateData(patternRequired({ bogus: "x" }), schema);
    expect(r.errors.some((e) => /bogus/.test(e))).toBe(true);
  });

  it("redirects when 'schema' is set on an input_artifact", () => {
    const r = validateData(
      baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
      baseRequired({ type: "pipeline", tags: ["target/galaxy"], title: "X" }),
      schema,
    );
    expect(r.errors.some((e) => /phases/.test(e))).toBe(true);
  });

  it("accepts pipeline with phases array", () => {
    const r = validateData(
      baseRequired({
        type: "pipeline",
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
        name: "x",
        axis: "generic",
        loop_endstate: ["not", "a", "string"],
      }),
      schema,
    );
    expect(r.errors.some((e) => /loop_endstate/.test(e))).toBe(true);
  });

  it("rejects mold missing axis", () => {
    const r = validateData(
      baseRequired({ type: "mold", tags: ["target/galaxy"], name: "x" }),
      schema,
    );
    expect(r.errors.some((e) => /axis/.test(e))).toBe(true);
  });

  it("source-specific mold requires source", () => {
    const r = validateData(
      baseRequired({ type: "mold", tags: ["target/galaxy"], name: "x", axis: "source-specific" }),
      schema,
    );
    expect(r.errors.some((e) => /source/.test(e))).toBe(true);
  });

  it("accepts typed references metadata", () => {
    const r = validateData(
      baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "x",
        axis: "generic",
        references: [
          {
            kind: "research",
            ref: "[[component-x]]",
            used_at: "runtime",
            load: "on-demand",
            mode: "verbatim",
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
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
        tags: ["prompt/galaxy-internal", "target/galaxy"],
        title: "Galaxy Prompt",
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
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("warns when operation patterns omit iwc_exemplars during migration", () => {
    writeFm(path.join(dir, "patterns/pattern-x.md"), patternRequired({ title: "Pattern X" }));

    const r = validateDirectory({
      directory: dir,
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
        tags: ["target/galaxy"],
        title: "P",
        phases: [{ mold: "[[some-pattern]]" }],
      }),
    });
    writeFm(path.join(dir, "patterns/some-pattern.md"), {
      ...patternRequired({ type: "pattern", tags: ["target/galaxy"], title: "Some Pattern" }),
    });

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("accepts pipeline eval.md and scenarios.md siblings", () => {
    writeFm(path.join(dir, "molds/mold-a/index.md"), {
      ...baseRequired({ type: "mold", tags: ["target/galaxy"], name: "mold-a", axis: "generic" }),
    });
    writeFm(path.join(dir, "pipelines/p/index.md"), {
      ...baseRequired({
        type: "pipeline",
        tags: ["target/galaxy"],
        title: "P",
        phases: [{ mold: "[[mold-a]]" }],
      }),
    });
    writeFileSync(
      path.join(dir, "pipelines/p/eval.md"),
      "# P eval\n\n## Property: end to end\n\n- check: deterministic\n- assertion: final workflow validates\n",
    );
    writeFileSync(
      path.join(dir, "pipelines/p/scenarios.md"),
      "# P scenarios\n\n## Case: demo\n\n- fixture: nf-core/demo\n- expect: validates\n",
    );
    const r = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
    expect(r.errors).toBe(0);
  });

  it("errors on frontmatter in a pipeline sibling", () => {
    writeFm(path.join(dir, "molds/mold-a/index.md"), {
      ...baseRequired({ type: "mold", tags: ["target/galaxy"], name: "mold-a", axis: "generic" }),
    });
    writeFm(path.join(dir, "pipelines/p/index.md"), {
      ...baseRequired({
        type: "pipeline",
        tags: ["target/galaxy"],
        title: "P",
        phases: [{ mold: "[[mold-a]]" }],
      }),
    });
    writeFileSync(path.join(dir, "pipelines/p/eval.md"), "---\ntype: junk\n---\n\nbad\n");
    const r = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("errors on an undeclared file in a pipeline directory", () => {
    writeFm(path.join(dir, "molds/mold-a/index.md"), {
      ...baseRequired({ type: "mold", tags: ["target/galaxy"], name: "mold-a", axis: "generic" }),
    });
    writeFm(path.join(dir, "pipelines/p/index.md"), {
      ...baseRequired({
        type: "pipeline",
        tags: ["target/galaxy"],
        title: "P",
        phases: [{ mold: "[[mold-a]]" }],
      }),
    });
    expect(validateDirectory({ directory: dir, tagsPath: TAGS_PATH }).errors).toBe(0);
    writeFileSync(path.join(dir, "pipelines/p/notes.md"), "stray notes\n");
    // An error rather than a warning, now that the kind declares its own layout: a file the kind
    // does not name is indistinguishable from a misnamed one, and `notes.md` beside a pipeline is
    // as likely to be a typo'd `scenarios.md` as a deliberate choice.
    expect(
      validateDirectory({ directory: dir, tagsPath: TAGS_PATH }).errors,
    ).toBeGreaterThanOrEqual(1);
  });

  // The residue: markdown under the content root that no collection claims. It used to be
  // accounted for by silence — nothing routed `log.md`, so the walker skipped it, and skipped
  // anything else unrouted by the same rule.
  describe("markdown no collection claims", () => {
    it("errors on a file that is neither note, companion, nor declared non-note", () => {
      writeFm(path.join(dir, "patterns/foo.md"), patternRequired());
      expect(validateDirectory({ directory: dir, tagsPath: TAGS_PATH }).errors).toBe(0);

      writeFileSync(path.join(dir, "notes-to-self.md"), "# scratch\n");
      expect(validateDirectory({ directory: dir, tagsPath: TAGS_PATH }).errors).toBe(1);
    });

    it("errors inside a collection's own directory, where no note owns the file", () => {
      writeFm(path.join(dir, "patterns/foo.md"), patternRequired());
      // `content/patterns/` is a flat collection: nothing there is a directory note, so no
      // companion declaration covers this and the layout check never looks.
      writeFileSync(path.join(dir, "patterns/README.md"), "# orientation\n");
      expect(validateDirectory({ directory: dir, tagsPath: TAGS_PATH }).errors).toBe(1);
    });

    it("accepts what NOT_NOTES declares", () => {
      writeFm(path.join(dir, "patterns/foo.md"), patternRequired());
      writeFileSync(path.join(dir, "Dashboard.md"), "# Dashboard\n");
      writeFileSync(path.join(dir, "Index.md"), "# Index\n");
      writeFileSync(path.join(dir, "log.md"), "# Log\n");
      mkdirSync(path.join(dir, "meta"), { recursive: true });
      writeFileSync(path.join(dir, "meta/glossary.md"), "# Glossary\n");
      expect(validateDirectory({ directory: dir, tagsPath: TAGS_PATH }).errors).toBe(0);
    });

    // Exactly one, not two. A directory note's own directory belongs to the companion check,
    // which names the kind that failed to declare the file — the more useful sentence of the
    // two, and worth nothing if a second check repeats it in weaker words.
    it("leaves a stray beside a directory note to the kind that did not declare it", () => {
      writeFm(path.join(dir, "molds/mold-a/index.md"), {
        ...baseRequired({ type: "mold", tags: ["target/galaxy"], name: "mold-a", axis: "generic" }),
      });
      writeFileSync(path.join(dir, "molds/mold-a/scenario.md"), "# misnamed\n");
      expect(validateDirectory({ directory: dir, tagsPath: TAGS_PATH }).errors).toBe(1);
    });

    // A companion directory is declared as a whole, so its CONTENTS are the note's business and
    // not the residue's — one level down or four.
    it("ignores markdown nested under a declared companion directory", () => {
      writeFm(path.join(dir, "molds/mold-a/index.md"), {
        ...baseRequired({ type: "mold", tags: ["target/galaxy"], name: "mold-a", axis: "generic" }),
      });
      mkdirSync(path.join(dir, "molds/mold-a/examples/case-1"), { recursive: true });
      writeFileSync(path.join(dir, "molds/mold-a/examples/case-1/README.md"), "# fixture\n");
      expect(validateDirectory({ directory: dir, tagsPath: TAGS_PATH }).errors).toBe(0);
    });
  });

  it("does not warn on an examples/ subdir of scenario fixtures in a pipeline directory", () => {
    writeFm(path.join(dir, "molds/mold-a/index.md"), {
      ...baseRequired({ type: "mold", tags: ["target/galaxy"], name: "mold-a", axis: "generic" }),
    });
    writeFm(path.join(dir, "pipelines/p/index.md"), {
      ...baseRequired({
        type: "pipeline",
        tags: ["target/galaxy"],
        title: "P",
        phases: [{ mold: "[[mold-a]]" }],
      }),
    });
    const before = validateDirectory({ directory: dir, tagsPath: TAGS_PATH }).warnings;
    mkdirSync(path.join(dir, "pipelines/p/examples"), { recursive: true });
    writeFileSync(
      path.join(dir, "pipelines/p/examples/UC_issue.md"),
      "# Interview input\n\nno frontmatter\n",
    );
    writeFileSync(
      path.join(dir, "pipelines/p/examples/UC_extracted.ga"),
      '{"a_galaxy_workflow":"true"}\n',
    );
    const after = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
    expect(after.errors).toBe(0);
    expect(after.warnings).toBe(before);
  });

  // Was a warning from a `pipelines`-only branch. It is an error now, and from the general
  // check: `content/pipelines/**/index.md` is what the collection claims, so a flat file there
  // is content nothing routes — the same failure as a stray anywhere else, and no longer worth
  // a rule of its own.
  it("errors on a flat .md file under content/pipelines/", () => {
    writeFm(path.join(dir, "molds/mold-a/index.md"), {
      ...baseRequired({ type: "mold", tags: ["target/galaxy"], name: "mold-a", axis: "generic" }),
    });
    writeFm(path.join(dir, "pipelines/p/index.md"), {
      ...baseRequired({
        type: "pipeline",
        tags: ["target/galaxy"],
        title: "P",
        phases: [{ mold: "[[mold-a]]" }],
      }),
    });
    const before = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
    expect(before.errors).toBe(0);
    writeFileSync(path.join(dir, "pipelines/stray.md"), "not a directory note\n");
    const after = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
    expect(after.errors).toBe(1);
    expect(after.warnings).toBe(before.warnings);
  });

  it("resolves a pipeline's [branch] phase to molds", () => {
    writeFm(path.join(dir, "pipelines/p/index.md"), {
      ...baseRequired({
        type: "pipeline",
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
        name: "discover",
        axis: "generic",
        status: "reviewed",
      }),
    });
    writeFm(path.join(dir, "molds/author/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "author",
        axis: "generic",
        status: "reviewed",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("validates typed reference targets", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
            trigger: "When the component is in scope.",
          },
          {
            kind: "pattern",
            ref: "[[pattern-x]]",
            used_at: "cast-time",
            load: "upfront",
            mode: "verbatim",
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
    writeFm(path.join(dir, "research/component-x/index.md"), {
      ...baseRequired({ type: "research", tags: ["target/galaxy"] }),
    });
    writeFm(path.join(dir, "patterns/pattern-x.md"), {
      ...patternRequired({ type: "pattern", tags: ["target/galaxy"], title: "Pattern X" }),
    });
    writeFm(path.join(dir, "schemas/schema-x.md"), {
      ...baseRequired({
        type: "schema",
        tags: ["target/galaxy"],
        name: "schema-x",
        title: "Schema X",
        package: "@example/schema-x",
        package_export: "schemaX",
      }),
    });
    writeFm(path.join(dir, "prompts/prompt-x/index.md"), {
      ...baseRequired({
        type: "prompt",
        tags: ["prompt/galaxy-internal", "target/galaxy"],
        title: "Prompt X",
      }),
    });
    writeFileSync(path.join(dir, "prompts/prompt-x/upstream.prompt"), "Prompt body\n");

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  // The companion is named by convention, so the only way to get this wrong is to omit it.
  // The note below is otherwise valid: what fails is the empty directory beside it.
  it("rejects a prompt note with no upstream.prompt beside it", () => {
    writeFm(path.join(dir, "prompts/prompt-x/index.md"), {
      ...baseRequired({
        type: "prompt",
        tags: ["prompt/galaxy-internal", "target/galaxy"],
        title: "Prompt X",
      }),
    });

    const missing = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
    expect(missing.errors).toBeGreaterThanOrEqual(1);

    writeFileSync(path.join(dir, "prompts/prompt-x/upstream.prompt"), "Prompt body\n");
    const present = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
    expect(present.errors).toBe(0);
  });

  it("resolves CLI command references by tool and command", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
        tags: ["cli/gxwf"],
        tool: "gxwf",
        command: "validate",
        package: "@galaxy-tool-util/cli",
        source_url:
          "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  // The note-vs-companion distinction, which nothing checked before a kind declared its layout.
  // `cli-tool` declares `companions: []` and sits in a directory full of markdown — every sibling
  // `.md` is a `cli-command` NOTE. A layout check that guessed from the extension would report
  // every documented subcommand in the corpus as a stray.
  //
  // These two use a content root literally named `content`, because `validateCliTools` requires a
  // cli-tool to live at `content/cli/<tool>/index.md` and matches the path as a suffix. Both
  // assertions are absolute counts, not deltas, so nothing here passes on a coincidence.
  const cliVault = (): string => {
    const contentRoot = path.join(dir, "content");
    mkdirSync(path.join(contentRoot, "cli/gxwf"), { recursive: true });
    writeFm(path.join(contentRoot, "cli/gxwf/index.md"), {
      ...baseRequired({
        type: "cli-tool",
        tags: ["cli/gxwf"],
        tool: "gxwf",
        origin: "npm",
        package: "@galaxy-tool-util/cli",
        invoke: "gxwf",
      }),
    });
    return contentRoot;
  };

  it("does not treat a cli-tool's sibling command notes as undeclared companions", () => {
    const contentRoot = cliVault();
    writeFm(path.join(contentRoot, "cli/gxwf/validate.md"), {
      ...baseRequired({
        type: "cli-command",
        tags: ["cli/gxwf"],
        tool: "gxwf",
        command: "validate",
        package: "@galaxy-tool-util/cli",
        source_url:
          "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json",
      }),
    });

    expect(validateDirectory({ directory: contentRoot, tagsPath: TAGS_PATH }).errors).toBe(0);
  });

  it("does flag a non-note file beside a cli-tool, which declares no companions", () => {
    const contentRoot = cliVault();
    writeFileSync(path.join(contentRoot, "cli/gxwf/gxwf.json"), "{}\n");

    expect(
      validateDirectory({ directory: contentRoot, tagsPath: TAGS_PATH }).errors,
    ).toBeGreaterThanOrEqual(1);
  });

  it("rejects a CLI command absent from the upstream CLI metadata", () => {
    writeFm(path.join(dir, "cli/gxwf/not-real.md"), {
      ...baseRequired({
        type: "cli-command",
        tags: ["cli/gxwf"],
        tool: "gxwf",
        command: "not-real",
        package: "@galaxy-tool-util/cli",
        source_url:
          "https://github.com/jmchilton/galaxy-tool-util-ts/tree/main/packages/cli/spec/gxwf.json",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  // `source_url` is owed by exactly the pages that summarize someone else's document, which is
  // every cli-command except the ones this repository implements. Both directions are asserted
  // because only one of them fails loudly: a missing field is a page a reader cannot check, and a
  // present one on our own command is a link back to the tree the reader is already in.
  it("rejects a CLI command with no source_url to check the page against", () => {
    writeFm(path.join(dir, "cli/gxwf/validate.md"), {
      ...baseRequired({
        type: "cli-command",
        tags: ["cli/gxwf"],
        tool: "gxwf",
        command: "validate",
        package: "@galaxy-tool-util/cli",
      }),
    });

    const r = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("rejects a source_url on a command this repository implements", () => {
    writeFm(path.join(dir, "cli/foundry/validate-tests-format.md"), {
      ...baseRequired({
        type: "cli-command",
        tags: ["cli/foundry"],
        tool: "foundry",
        command: "validate-tests-format",
        package: "@galaxy-foundry/foundry",
        source_url:
          "https://github.com/galaxyproject/foundry/blob/main/packages/foundry/src/program.ts",
      }),
    });

    const r = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("accepts a command this repository implements with no source_url", () => {
    writeFm(path.join(dir, "cli/foundry/validate-tests-format.md"), {
      ...baseRequired({
        type: "cli-command",
        tags: ["cli/foundry"],
        tool: "foundry",
        command: "validate-tests-format",
        package: "@galaxy-foundry/foundry",
      }),
    });

    const r = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
    expect(r.errors).toBe(0);
  });

  it("rejects typed references that resolve to the wrong type", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
      ...patternRequired({ type: "pattern", tags: ["target/galaxy"], title: "Not Research" }),
    });

    const r = validateDirectory({
      directory: dir,
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
    writeFm(path.join(dir, "research/not-a-pattern/index.md"), {
      ...baseRequired({ type: "research", tags: ["target/galaxy"] }),
    });

    const r = validateDirectory({
      directory: dir,
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
        tags: ["target/galaxy"],
        name: "x",
        title: "X",
        package: "@some-org/x",
        upstream: "https://github.com/some-org/x/blob/main/x.schema.json",
      }),
    });

    const r = validateDirectory({
      directory: dir,
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
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("requires verification for hypothesis references", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
    writeFm(path.join(dir, "research/component-x/index.md"), {
      ...baseRequired({ type: "research", tags: ["target/galaxy"] }),
    });

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("rejects on-demand references that omit triggers", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
    writeFm(path.join(dir, "research/component-x/index.md"), {
      ...baseRequired({ type: "research", tags: ["target/galaxy"] }),
    });

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    // An error, not a warning: an on-demand reference that names no trigger states no
    // condition under which the cast should read it, so it is unreachable at runtime.
    // The note schema is what raises it.
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("flags Mold source layout drift", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFm(path.join(dir, "molds/m/notes.md"), {
      ...patternRequired({ title: "Unexpected Note" }),
    });

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("accepts a Mold eval plan without frontmatter", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("accepts a declared sibling and rejects an undeclared one", () => {
    // `usage.md` was an allowlisted mold sibling with zero instances in the corpus and no code
    // reading it. The mold kind no longer declares it, so it is now exactly as undeclared as a
    // typo would be — which is the whole point of a kind stating its own layout.
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: basic\n\n- check: deterministic\n- assertion: x\n",
    );
    writeFileSync(
      path.join(dir, "molds/m/refinement.md"),
      "# m refinement\n\nIs field x pulling weight?\n",
    );

    expect(validateDirectory({ directory: dir, tagsPath: TAGS_PATH }).errors).toBe(0);

    writeFileSync(path.join(dir, "molds/m/usage.md"), "# m usage\n\nSample run.\n");
    expect(
      validateDirectory({ directory: dir, tagsPath: TAGS_PATH }).errors,
    ).toBeGreaterThanOrEqual(1);
  });

  it("allowlists scenarios.md and accepts Property sections in eval.md", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
      tagsPath: TAGS_PATH,
    });
    expect(withoutScenarios.errors).toBe(0);

    writeFileSync(
      path.join(dir, "molds/m/scenarios.md"),
      "# m scenarios\n\n## Case: basic\n\n- fixture: synthetic\n- expect: 1\n",
    );
    const withScenarios = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(withScenarios.errors).toBe(0);
    // A well-formed scenarios.md does not merely avoid a warning — it CLEARS one. The mold kind
    // declares it `recommended`, so its absence is the warning, which is the check the old
    // allowlist could not express: an allowlist can only say a file is permitted.
    expect(withScenarios.warnings).toBeLessThan(withoutScenarios.warnings);
  });

  it("warns when scenarios.md lacks a Case section", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: p\n\n- check: deterministic\n- assertion: x\n",
    );
    // Baseline with a WELL-FORMED scenarios.md, not with none: a missing one is its own warning
    // now, so measuring from absent would net out to zero and prove nothing about the content check.
    writeFileSync(
      path.join(dir, "molds/m/scenarios.md"),
      "# m scenarios\n\n## Case: basic\n\n- fixture: synthetic\n- expect: 1\n",
    );
    const before = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    }).warnings;

    writeFileSync(
      path.join(dir, "molds/m/scenarios.md"),
      "# m scenarios\n\nProse only, no case sections.\n",
    );
    const after = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(after.errors).toBe(0);
    expect(after.warnings).toBeGreaterThan(before);
  });

  it("warns when a scenarios.md case binds no fixture", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: p\n\n- check: deterministic\n- assertion: x\n",
    );
    // Well-formed baseline, for the reason above: absence is its own warning now.
    writeFileSync(
      path.join(dir, "molds/m/scenarios.md"),
      "# m scenarios\n\n## Case: basic\n\n- fixture: synthetic\n- expect: 1\n",
    );
    const before = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    }).warnings;

    writeFileSync(
      path.join(dir, "molds/m/scenarios.md"),
      "# m scenarios\n\n## Case: c\n\n- expect: something\n",
    );
    const after = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(after.errors).toBe(0);
    expect(after.warnings).toBeGreaterThan(before);
  });

  it("warns when eval.md uses a Case section (oracle must stay abstract)", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({ type: "mold", tags: ["target/galaxy"], name: "m", axis: "generic" }),
    });
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: p\n\n- check: deterministic\n- assertion: holds for all inputs\n",
    );
    const before = validateDirectory({ directory: dir, tagsPath: TAGS_PATH }).warnings;
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Property: p\n\n- check: deterministic\n- assertion: holds for all inputs\n\n## Case: concrete\n\n- fixture: y\n- expect: z\n",
    );
    const after = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
    expect(after.errors).toBe(0);
    expect(after.warnings).toBeGreaterThan(before);
  });

  it("errors on an undeclared file in a Mold directory", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFileSync(path.join(dir, "molds/m/scratch.md"), "stray notes\n");

    // The case the mechanism exists for. `scratch.md` is what a typo'd `scenarios.md` looks like,
    // and the validator's walker drops anything the collection table does not claim — so before the
    // kind declared its layout, a misnamed companion and a deliberate non-note were the same thing.
    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("errors on an undeclared subdirectory in a Mold directory", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "m",
        axis: "generic",
      }),
    });
    mkdirSync(path.join(dir, "molds/m/scratch"), { recursive: true });

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("accepts refinement journal entries with valid frontmatter", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("warns on refinement journal entries missing frontmatter", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("errors on related_molds that do not resolve, on a note that is not a mold", () => {
    writeFm(path.join(dir, "patterns/pattern-r.md"), {
      ...patternRequired({ title: "Pattern R" }),
      related_molds: ["[[ghost-mold]]"],
    });

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("errors when related_molds resolves to a note that is not a mold", () => {
    writeFm(path.join(dir, "patterns/pattern-s.md"), {
      ...patternRequired({ title: "Pattern S" }),
      related_molds: ["[[pattern-t]]"],
    });
    writeFm(path.join(dir, "patterns/pattern-t.md"), patternRequired({ title: "Pattern T" }));

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("errors on body wiki-links that do not resolve", () => {
    mkdirSync(path.dirname(path.join(dir, "patterns/pattern-x.md")), { recursive: true });
    writeFileSync(
      path.join(dir, "patterns/pattern-x.md"),
      `---\n${Object.entries(patternRequired({ title: "Pattern X" }))
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join("\n")}\n---\n\nBody cites [[ghost-target]] in prose.\n`,
    );

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("ignores body wiki-links inside fenced or inline code", () => {
    const fm = baseRequired({
      type: "research",
      tags: ["target/galaxy"],
    });
    mkdirSync(path.dirname(path.join(dir, "research/component-x/index.md")), { recursive: true });
    writeFileSync(
      path.join(dir, "research/component-x/index.md"),
      `---\n${Object.entries(fm)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(
          "\n",
        )}\n---\n\nInline \`[[ghost-inline]]\` and fenced:\n\n\`\`\`\n[[ghost-fenced]]\n\`\`\`\n`,
    );

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBe(0);
  });

  it("warns on schema reference with evidence=hypothesis", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
        name: "schema-x",
        title: "Schema X",
        package: "@example/schema-x",
        package_export: "schemaX",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("warns when a stub mold body declares references", () => {
    mkdirSync(path.join(dir, "molds/m"), { recursive: true });
    const fm = baseRequired({
      type: "mold",
      tags: ["target/galaxy"],
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
    writeFm(path.join(dir, "research/component-x/index.md"), {
      ...baseRequired({ type: "research", tags: ["target/galaxy"] }),
    });

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("warns on refinement journal entries with bad decision vocab", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("accepts artifact handoff between two molds", () => {
    writeFm(path.join(dir, "molds/producer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("accepts a consumer artifact produced by a registered runtime mode", () => {
    writeFm(path.join(dir, "molds/consumer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "consumer",
        axis: "generic",
        input_artifacts: [
          {
            id: "runtime-ledger",
            description: "Runtime ledger initialized by an enabled harness mode.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "research/runtime-ledger/index.md"), {
      ...baseRequired({ type: "research", tags: ["target/galaxy"] }),
    });
    writeFileSync(
      path.join(dir, "runtime_artifacts.yml"),
      [
        "version: 1",
        "artifacts:",
        "  runtime-ledger:",
        "    kind: yaml",
        "    default_filename: runtime.ledger.yml",
        '    protocol: "[[runtime-ledger]]"',
        "    producer:",
        "      kind: runtime-mode",
        "      option: feedback",
        "      initializer: harness-or-first-skill",
        "",
      ].join("\n"),
    );

    const r = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
    expect(r.errors).toBe(0);
  });

  it("rejects a runtime artifact id that collides with a Mold producer", () => {
    writeFm(path.join(dir, "molds/producer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "producer",
        axis: "generic",
        output_artifacts: [
          {
            id: "runtime-ledger",
            kind: "yaml",
            default_filename: "runtime.ledger.yml",
            description: "Conflicting Mold output for the runtime-produced ledger.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "research/runtime-ledger/index.md"), {
      ...baseRequired({ type: "research", tags: ["target/galaxy"] }),
    });
    writeFileSync(
      path.join(dir, "runtime_artifacts.yml"),
      [
        "version: 1",
        "artifacts:",
        "  runtime-ledger:",
        "    kind: yaml",
        "    default_filename: runtime.ledger.yml",
        '    protocol: "[[runtime-ledger]]"',
        "    producer:",
        "      kind: runtime-mode",
        "      option: feedback",
        "      initializer: harness-or-first-skill",
        "",
      ].join("\n"),
    );

    const r = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("rejects unknown fields in the runtime artifact registry", () => {
    writeFileSync(
      path.join(dir, "runtime_artifacts.yml"),
      [
        "version: 1",
        "artifacts:",
        "  runtime-ledger:",
        "    kind: yaml",
        "    default_filename: runtime.ledger.yml",
        '    protocol: "[[runtime-ledger]]"',
        "    typo: true",
        "    producer:",
        "      kind: runtime-mode",
        "      option: feedback",
        "      initializer: harness-or-first-skill",
        "",
      ].join("\n"),
    );

    const r = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("rejects a consumer artifact with no producer", () => {
    writeFm(path.join(dir, "molds/consumer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("rejects an artifact schema wiki-link that resolves to non-schema", () => {
    writeFm(path.join(dir, "molds/producer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("accepts an artifact schema wiki-link to a schema note", () => {
    writeFm(path.join(dir, "molds/producer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
        name: "schema-x",
        title: "Schema X",
        package: "@example/schema-x",
        package_export: "schemaX",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("rejects inconsistent schemas across producers of the same artifact id", () => {
    writeFm(path.join(dir, "molds/producer-a/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
        name: "schema-x",
        title: "Schema X",
        package: "@example/schema-x",
        package_export: "schemaX",
      }),
    });
    writeFm(path.join(dir, "schemas/schema-y.md"), {
      ...baseRequired({
        type: "schema",
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
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
        tags: ["target/galaxy"],
        name: "consumer",
        axis: "generic",
        input_artifacts: [{ id: "summary-x", description: "Upstream structured summary." }],
      }),
    });
    // Out-of-order pipeline: consumer first, producer second.
    writeFm(path.join(dir, "pipelines/bad-order/index.md"), {
      ...baseRequired({
        type: "pipeline",
        tags: ["target/galaxy"],
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
        tagsPath: TAGS_PATH,
      });
      expect(r.errors).toBe(0);
    } finally {
      process.stdout.write = before;
    }
    expect(captured).toMatch(/input_artifact 'summary-x' has no prior phase producing it/);
  });

  const writeRoleFixture = (pipelinePhases: unknown[]) => {
    writeFm(path.join(dir, "molds/producer-a/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "producer-a",
        axis: "generic",
        output_artifacts: [
          {
            id: "brief-a",
            kind: "json",
            default_filename: "brief-a.json",
            description: "Interface brief in the A source flavor.",
          },
        ],
      }),
    });
    // Produced by a Mold this pipeline never runs — the alternative flavor.
    writeFm(path.join(dir, "molds/producer-b/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "producer-b",
        axis: "generic",
        output_artifacts: [
          {
            id: "brief-b",
            kind: "json",
            default_filename: "brief-b.json",
            description: "Interface brief in the B source flavor.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "molds/consumer/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "consumer",
        axis: "generic",
        input_artifacts: [
          {
            id: "brief-a",
            role: "brief",
            description: "Interface brief when running the A pipeline.",
          },
          {
            id: "brief-b",
            role: "brief",
            description: "Interface brief when running the B pipeline.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "pipelines/p/index.md"), {
      ...baseRequired({
        type: "pipeline",
        tags: ["target/galaxy"],
        title: "P",
        phases: pipelinePhases,
      }),
    });
  };

  const captureValidate = () => {
    const before = process.stdout.write;
    let captured = "";
    process.stdout.write = (chunk: any) => {
      captured += String(chunk);
      return true;
    };
    try {
      const r = validateDirectory({ directory: dir, tagsPath: TAGS_PATH });
      expect(r.errors).toBe(0);
    } finally {
      process.stdout.write = before;
    }
    return captured;
  };

  it("accepts a phase whose input role one prior phase satisfies", () => {
    writeRoleFixture([{ mold: "[[producer-a]]" }, { mold: "[[consumer]]" }]);
    expect(captureValidate()).not.toMatch(/brief-b|role 'brief'/);
  });

  it("warns when no prior phase satisfies an input role", () => {
    writeRoleFixture([{ mold: "[[consumer]]" }, { mold: "[[producer-a]]" }]);
    expect(captureValidate()).toMatch(
      /phases\[0\]: no prior phase produces any input_artifact for role 'brief' \(brief-a, brief-b\)/,
    );
  });

  const findingsByHeader = (captured: string): Map<string, string[]> => {
    const blocks = new Map<string, string[]>();
    let current = "";
    for (const line of captured.split("\n")) {
      const header = /^(\S.*):$/.exec(line);
      if (header?.[1] !== undefined) {
        current = header[1];
        if (!blocks.has(current)) blocks.set(current, []);
        continue;
      }
      const finding = /^ {2}(?:ERROR|WARN) {2,}(.*)$/.exec(line);
      if (finding?.[1] !== undefined) blocks.get(current)?.push(finding[1]);
    }
    return blocks;
  };

  it("files a finding under its own path when its checks are not adjacent", () => {
    writeFm(path.join(dir, "molds/producer-x/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "producer-x",
        axis: "generic",
        output_artifacts: [
          {
            id: "summary-x",
            kind: "json",
            default_filename: "summary-x.json",
            description: "Structured summary the consumer reads.",
          },
        ],
      }),
    });
    writeFm(path.join(dir, "molds/consumer-x/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["target/galaxy"],
        name: "consumer-x",
        axis: "generic",
        input_artifacts: [
          { id: "summary-x", description: "Structured summary produced upstream." },
        ],
      }),
    });
    // Warns from the artifact pass and again from the companion pass, with both Molds between.
    writeFm(path.join(dir, "pipelines/zeta/index.md"), {
      ...baseRequired({
        type: "pipeline",
        tags: ["target/galaxy"],
        title: "Zeta",
        phases: [{ mold: "[[consumer-x]]" }],
      }),
    });

    const blocks = findingsByHeader(captureValidate());
    expect(blocks.get(path.join(dir, "pipelines/zeta/index.md"))).toEqual([
      "phases[0]: input_artifact 'summary-x' has no prior phase producing it in this pipeline",
      expect.stringContaining("should have eval.md"),
      expect.stringContaining("should have scenarios.md"),
    ]);
    expect(blocks.get(path.join(dir, "molds/producer-x/index.md"))).toHaveLength(2);
  });
});
