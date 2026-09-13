// The gate these back exists because a fixture is a claim. Every committed
// example artifact says "this is what that Mold emits", and until #510 nothing
// checked one — `make check` reads the corpus, the casts and the generated
// notes, and walks straight past `examples/`. The claim and the evidence drifted
// apart silently, which is exactly how a scenario ends up bound to a fixture
// that cannot produce it.

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildValidatorRegistry,
  findFixtures,
  resolveValidatorSource,
} from "../scripts/lib/artifact-fixtures";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function scratchRepo(): string {
  return mkdtempSync(path.join(tmpdir(), "foundry-fixtures-"));
}

function writeVerify(root: string, slug: string, entries: unknown[]): void {
  const dir = path.join(root, "casts", "claude", "skills", slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "_verify.json"),
    JSON.stringify({ verify_schema_version: 1, entries }, null, 2),
  );
}

describe("validator registry", () => {
  it("collects the validator each cast declares for an artifact", () => {
    const root = scratchRepo();
    writeVerify(root, "a", [
      {
        artifact_id: "summary-thing",
        default_filename: "summary-thing.json",
        validator_bin: "foundry",
        args: ["validate-summary-thing", "{artifact_path}"],
      },
    ]);
    const registry = buildValidatorRegistry(root);
    expect(registry.get("summary-thing.json")).toMatchObject({
      artifactId: "summary-thing",
      bin: "foundry",
    });
  });

  it("accepts two casts declaring the same artifact identically", () => {
    const root = scratchRepo();
    const entry = {
      artifact_id: "summary-thing",
      default_filename: "summary-thing.json",
      validator_bin: "foundry",
      args: ["validate-summary-thing", "{artifact_path}"],
    };
    writeVerify(root, "producer", [entry]);
    writeVerify(root, "consumer", [{ ...entry, direction: "input" }]);
    expect(buildValidatorRegistry(root).get("summary-thing.json")?.declaredBy).toHaveLength(2);
  });

  // Picking a winner would make the gate's verdict depend on readdir order.
  it("refuses to guess when two casts disagree about how to validate one artifact", () => {
    const root = scratchRepo();
    writeVerify(root, "a", [
      {
        artifact_id: "summary-thing",
        default_filename: "summary-thing.json",
        validator_bin: "foundry",
        args: ["validate-summary-thing", "{artifact_path}"],
      },
    ]);
    writeVerify(root, "b", [
      {
        artifact_id: "summary-thing",
        default_filename: "summary-thing.json",
        validator_bin: "foundry",
        args: ["validate-something-else", "{artifact_path}"],
      },
    ]);
    expect(() => buildValidatorRegistry(root)).toThrow(/conflicting validators/);
  });

  it("ignores entries that declare no validator", () => {
    const root = scratchRepo();
    writeVerify(root, "a", [{ artifact_id: "prose", default_filename: "notes.md" }]);
    expect(buildValidatorRegistry(root).size).toBe(0);
  });
});

describe("fixture discovery", () => {
  const registry = new Map([
    [
      "summary-thing.json",
      { artifactId: "summary-thing", bin: "foundry", args: [], declaredBy: [] },
    ],
  ]);

  it("matches a tracked file by its declared default filename", () => {
    const found = findFixtures(repoRoot, registry, [
      "content/molds/x/examples/clean/summary-thing.json",
      "content/molds/x/examples/clean/README.md",
    ]);
    expect(found.map((f) => f.file)).toEqual(["content/molds/x/examples/clean/summary-thing.json"]);
  });

  // Package fixtures are exercised by their own unit tests and legitimately
  // include deliberately invalid inputs; sweeping them would fail the build for
  // doing their job.
  it("skips package test fixtures", () => {
    expect(
      findFixtures(repoRoot, registry, ["packages/gxwf-foundry/test/bad/summary-thing.json"]),
    ).toEqual([]);
  });
});

describe("validator resolution", () => {
  it("maps a cast's bare bin name back to its workspace source", () => {
    const source = resolveValidatorSource(repoRoot, "foundry");
    expect(path.relative(repoRoot, source)).toBe(
      path.join("packages", "gxwf-foundry", "src", "bin", "foundry.ts"),
    );
  });

  it("names the bin it could not resolve", () => {
    expect(() => resolveValidatorSource(repoRoot, "not-a-real-bin")).toThrow(/not-a-real-bin/);
  });
});

describe("the live corpus", () => {
  // Without this the gate can quietly become a no-op: rename an artifact, drop a
  // validator declaration, and check-fixtures still exits 0 having checked
  // nothing at all.
  it("declares at least one deterministic validator", () => {
    expect(buildValidatorRegistry(repoRoot).size).toBeGreaterThan(0);
  });

  it("finds committed fixtures to check", () => {
    expect(findFixtures(repoRoot).length).toBeGreaterThan(0);
  });
});
