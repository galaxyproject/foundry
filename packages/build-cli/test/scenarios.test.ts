import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { parseScenarioCases, resolveScenarioFixture } from "../src/lib/scenarios.js";

test("parses Case sections and quoted or unquoted fixture values consistently", () => {
  expect(
    parseScenarioCases(`
##  Case: unquoted fixture

- fixture: workflow-fixtures/demo
- expect: success

## Case: quoted fixture

- fixture: \`workflow-fixtures/other\` (small)
`),
  ).toEqual([
    expect.objectContaining({ name: "unquoted fixture", fixture: "workflow-fixtures/demo" }),
    expect.objectContaining({ name: "quoted fixture", fixture: "workflow-fixtures/other" }),
  ]);
});

test("resolves repository-relative and scenarios-relative fixtures without leaving the repo", () => {
  const root = mkdtempSync(path.join(tmpdir(), "foundry-scenarios-"));
  const scenariosPath = path.join(root, "content/pipelines/demo/scenarios.md");
  const localFixture = path.join(root, "content/pipelines/demo/examples/input.md");
  const rootFixture = path.join(root, "workflow-fixtures/demo");
  mkdirSync(path.dirname(localFixture), { recursive: true });
  mkdirSync(rootFixture, { recursive: true });
  writeFileSync(localFixture, "input");

  expect(resolveScenarioFixture(root, scenariosPath, "examples/input.md")).toEqual(
    expect.objectContaining({
      absolutePath: localFixture,
      repositoryPath: "content/pipelines/demo/examples/input.md",
      materialized: true,
    }),
  );
  expect(resolveScenarioFixture(root, scenariosPath, "workflow-fixtures/demo")).toEqual(
    expect.objectContaining({ absolutePath: rootFixture, materialized: true }),
  );
  expect(() => resolveScenarioFixture(root, scenariosPath, "../outside")).toThrow(
    "fixture escapes repository root",
  );
});
