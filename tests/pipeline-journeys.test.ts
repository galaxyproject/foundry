import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadTagRegistry } from "@galaxy-foundry/tag-registry";

import { readMarkdown } from "../packages/build-cli/src/lib/frontmatter.js";
import {
  PIPELINE_JOURNEYS,
  groupPipelinesByJourney,
  pipelineJourney,
} from "../site/src/lib/pipeline-journeys.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const pipelineRoot = path.join(repoRoot, "content", "pipelines");

const journeys = readdirSync(pipelineRoot)
  .sort()
  .map((slug) => {
    const { meta } = readMarkdown(path.join(pipelineRoot, slug, "index.md"));
    const tags = Array.isArray(meta?.tags)
      ? meta.tags.filter((tag): tag is string => typeof tag === "string")
      : [];
    return { slug, journey: pipelineJourney(tags) };
  });

describe("pipeline journey taxonomy", () => {
  it("matches the registered journey facet", () => {
    const registry = loadTagRegistry(path.join(repoRoot, "meta_tags.yml"));
    const registered = registry
      .allTags()
      .filter((tag) => registry.facetOf(tag) === "journey")
      .map((tag) => tag.slice("journey/".length));
    expect([...PIPELINE_JOURNEYS].sort()).toEqual(registered.sort());
  });

  it("classifies every pipeline with exactly one supported journey", () => {
    expect(new Set(journeys.map(({ journey }) => journey))).toEqual(new Set(PIPELINE_JOURNEYS));
  });

  it("groups active pipeline entries and sorts each journey by title", () => {
    const entries = [
      { id: "pipelines/z", data: { status: "draft", tags: ["journey/direct-build"], title: "Z" } },
      { id: "pipelines/old", data: { status: "archived", tags: ["journey/plan"], title: "Old" } },
      { id: "pipelines/a", data: { status: "draft", tags: ["journey/direct-build"], title: "A" } },
    ];
    const grouped = groupPipelinesByJourney(entries);
    expect(grouped["direct-build"].map(({ slug }) => slug)).toEqual(["a", "z"]);
    expect(grouped.plan).toEqual([]);
  });

  it("keeps the public route inventory intentional", () => {
    expect(Object.fromEntries(journeys.map(({ slug, journey }) => [slug, journey]))).toEqual({
      "cwl-to-galaxy": "direct-build",
      "galaxy-workflow-maturation": "existing-workflow",
      "galaxy-workflow-review": "existing-workflow",
      "interview-to-galaxy": "direct-build",
      "interview-to-workflow-brief": "plan",
      "nextflow-to-cwl": "direct-build",
      "nextflow-to-galaxy": "direct-build",
      "nextflow-to-workflow-brief": "plan",
      "paper-to-cwl": "direct-build",
      "paper-to-galaxy": "direct-build",
      "paper-to-workflow-brief": "plan",
      "update-interview-to-galaxy": "existing-workflow",
      "workflow-brief-to-galaxy": "build-from-plan",
    });
  });
});
