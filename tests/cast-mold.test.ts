import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const castMold = path.join(repoRoot, "scripts", "cast-mold.ts");
const foundryBuild = path.join(repoRoot, "packages", "build-cli", "src", "bin", "foundry-build.ts");
const castVerify = path.join(repoRoot, "scripts", "cast-skill-verify.ts");

function runTsx(script: string, args: string[]): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync("npx", ["tsx", script, ...args], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    const err = e as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      code: typeof err.status === "number" ? err.status : 1,
      stdout: typeof err.stdout === "string" ? err.stdout : err.stdout?.toString() ?? "",
      stderr: typeof err.stderr === "string" ? err.stderr : err.stderr?.toString() ?? "",
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

  it("provenance is schema v2 and lists deterministic refs", () => {
    const provPath = path.join(repoRoot, "casts", "claude", "skills", "summarize-nextflow", "_provenance.json");
    const prov = JSON.parse(readFileSync(provPath, "utf8"));
    expect(prov.provenance_schema_version).toBe(2);
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
  });

  it("dst paths use strict 1:1 source basename for verbatim refs", () => {
    const provPath = path.join(repoRoot, "casts", "claude", "skills", "summarize-nextflow", "_provenance.json");
    const prov = JSON.parse(readFileSync(provPath, "utf8"));
    for (const r of prov.refs) {
      if (r.mode !== "verbatim") continue;
      // Package-vendored schema refs use a `package://...#export` src marker; the
      // dst basename derives from the schema note slug, not the export name.
      if (typeof r.src === "string" && r.src.startsWith("package://")) continue;
      expect(path.basename(r.dst)).toBe(path.basename(r.src));
    }
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
  });

  it("SKILL.md is rendered from Mold metadata, references, and body", () => {
    const skillPath = path.join(repoRoot, "casts", "claude", "skills", "summarize-nextflow", "SKILL.md");
    const text = readFileSync(skillPath, "utf8");
    expect(text).toContain("This skill was deterministically cast from its Mold");
    expect(text).toContain("## Inputs");
    expect(text).toContain("## Outputs");
    expect(text).toContain("`summary-nextflow`");
    expect(text).toContain("references/schemas/summary-nextflow.schema.json");
    expect(text).toContain("## Procedure");
    expect(text).toContain("Read a Nextflow pipeline source tree");
    expect(text).not.toMatch(/\[\[[^\]]+\]\]/);
  });

  it("rejects unknown flags", () => {
    const r = runTsx(castVerify, ["summarize-nextflow", "--target=claude", "--bogus"]);
    expect(r.code).not.toBe(0);
  });
});

describe("artifact-contract inheritance", () => {
  it("consumer input inherits schema and producers from the producer's output_artifact", async () => {
    const { buildProducerIndex, readArtifactContracts } = await import(
      "../packages/build-cli/src/commands/cast-mold.js"
    );
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
          input_artifacts: [
            { id: "summary-x", description: "Upstream summary used for binding." },
          ],
        },
      ],
    ]);
    const idx = buildProducerIndex(meta);
    const contracts = readArtifactContracts(
      meta.get("content/molds/consumer/index.md")!,
      idx,
    );
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

  it("drops inherited_schema when producers disagree on the schema", async () => {
    const { buildProducerIndex, readArtifactContracts } = await import(
      "../packages/build-cli/src/commands/cast-mold.js"
    );
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
    const contracts = readArtifactContracts(
      meta.get("content/molds/consumer/index.md")!,
      idx,
    );
    expect(contracts!.consumes[0]?.inherited_schema).toBeUndefined();
    expect(contracts!.consumes[0]?.producers).toEqual(["producer-a", "producer-b"]);
  });
});

describe("cast-mold negative cases", () => {
  it("unknown mold fails fast", () => {
    const r = runTsx(castMold, ["does-not-exist", "--target=claude", "--check"]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toContain("mold source missing");
  });
});
