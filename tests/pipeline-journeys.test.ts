import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { readMarkdown } from "../packages/build-cli/src/lib/frontmatter.js";
import {
  PIPELINE_JOURNEYS,
  pipelineJourney,
  type PipelineJourney,
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
  it("classifies every pipeline with exactly one supported journey", () => {
    expect(journeys).toHaveLength(13);
    expect(new Set(journeys.map(({ journey }) => journey))).toEqual(new Set(PIPELINE_JOURNEYS));
  });

  it("keeps the public route inventory intentional", () => {
    const counts = Object.fromEntries(
      PIPELINE_JOURNEYS.map((journey) => [
        journey,
        journeys.filter((pipeline) => pipeline.journey === journey).length,
      ]),
    ) as Record<PipelineJourney, number>;

    expect(counts).toEqual({
      "direct-build": 6,
      plan: 3,
      "build-from-plan": 1,
      "existing-workflow": 3,
    });

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
