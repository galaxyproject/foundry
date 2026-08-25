import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadRuntimeArtifactRegistry } from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

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
});
