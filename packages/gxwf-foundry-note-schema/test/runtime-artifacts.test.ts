import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadRuntimeArtifactRegistry, runtimeModeOption, runtimeProducerId } from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

function writeRegistry(body: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "runtime-artifacts-"));
  const file = path.join(dir, "runtime_artifacts.yml");
  writeFileSync(file, body);
  return file;
}

describe("runtime artifact registry", () => {
  it("loads the repository feedback producer", () => {
    const loaded = loadRuntimeArtifactRegistry(path.join(repoRoot, "runtime_artifacts.yml"));

    expect(loaded.errors).toEqual([]);
    expect(loaded.registry.artifacts.get("foundry-feedback-ledger")).toMatchObject({
      kind: "yaml",
      default_filename: "foundry-feedback.ledger.yml",
      protocol: "[[foundry-feedback-ledger]]",
      producer: {
        kind: "runtime-mode",
        option: "feedback",
        initializer: "harness-or-first-skill",
      },
    });
  });

  it("loads the repository run record, which no flag turns on", () => {
    const loaded = loadRuntimeArtifactRegistry(path.join(repoRoot, "runtime_artifacts.yml"));

    expect(loaded.errors).toEqual([]);
    const record = loaded.registry.artifacts.get("foundry-run-manifest")!;
    expect(record).toMatchObject({
      kind: "yaml",
      default_filename: "foundry-run.yml",
      protocol: "[[foundry-run-manifest]]",
      producer: { kind: "harness", initializer: "harness" },
    });
    expect(runtimeModeOption(record)).toBeNull();
    expect(runtimeProducerId(record)).toBe("runtime:harness");
  });

  it("gives an opt-in artifact a producer id naming its flag", () => {
    const loaded = loadRuntimeArtifactRegistry(path.join(repoRoot, "runtime_artifacts.yml"));
    const feedback = loaded.registry.artifacts.get("foundry-feedback-ledger")!;
    expect(runtimeModeOption(feedback)).toBe("feedback");
    expect(runtimeProducerId(feedback)).toBe("runtime:feedback");
  });

  it("rejects a harness producer that also names a flag", () => {
    // "always written" and "written when someone passes --x" are different claims about a run;
    // an artifact carrying both would leave a reader unable to tell which one it is.
    const file = writeRegistry(
      [
        "version: 1",
        "artifacts:",
        "  thing:",
        "    kind: yaml",
        "    default_filename: thing.yml",
        '    protocol: "[[foundry-run-manifest]]"',
        "    producer:",
        "      kind: harness",
        "      option: thing",
        "      initializer: harness",
        "",
      ].join("\n"),
    );
    const loaded = loadRuntimeArtifactRegistry(file);
    expect(loaded.errors).toContain(
      "artifacts.thing.producer.option: must be absent for a harness producer",
    );
    expect(loaded.registry.artifacts.has("thing")).toBe(false);
  });

  it("rejects an unknown producer kind", () => {
    const file = writeRegistry(
      [
        "version: 1",
        "artifacts:",
        "  thing:",
        "    kind: yaml",
        "    default_filename: thing.yml",
        '    protocol: "[[foundry-run-manifest]]"',
        "    producer:",
        "      kind: whenever",
        "      initializer: harness",
        "",
      ].join("\n"),
    );
    const loaded = loadRuntimeArtifactRegistry(file);
    expect(loaded.errors).toContain(
      "artifacts.thing.producer.kind: must be runtime-mode or harness",
    );
  });

  it("still requires a runtime-mode producer to name its flag", () => {
    const file = writeRegistry(
      [
        "version: 1",
        "artifacts:",
        "  thing:",
        "    kind: yaml",
        "    default_filename: thing.yml",
        '    protocol: "[[foundry-run-manifest]]"',
        "    producer:",
        "      kind: runtime-mode",
        "      initializer: harness-or-first-skill",
        "",
      ].join("\n"),
    );
    const loaded = loadRuntimeArtifactRegistry(file);
    expect(loaded.errors).toContain("artifacts.thing.producer.option: must be kebab-case");
  });
});
