// The committed emulated runs stay readable.
//
// These five directories under `casts/claude/_emulated-runs/` predate the run record, so they only
// exercise the degraded path — and that is the point. They are the regression guard on
// reconstruction: if a Mold renames an output or a pipeline gains a phase, the reconstruction
// either still names the right pipeline or this fails.

import { readdirSync, statSync } from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { buildRunModel, serializeRunManifest } from "../packages/build-cli/src/lib/run-manifest.js";
import {
  buildPipelineIndex,
  type PipelineIndex,
} from "../packages/build-cli/src/lib/run-reconstruct.js";
import type { RunModel } from "../packages/build-cli/src/lib/run-model.js";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const EMULATED = path.join(REPO_ROOT, "casts/claude/_emulated-runs");
const FIXED_CLOCK = () => new Date("2026-09-18T12:00:00.000Z");

const EXPECTED_PIPELINE: Record<string, string> = {
  "nf-core-demo": "nextflow-to-galaxy",
  "cwl-userguide-1st-workflow": "cwl-to-galaxy",
  "ga4gh-challenge-cwl-galaxy-5step": "cwl-to-galaxy",
  "salmon-rnaseq-cwl-galaxy-5step": "cwl-to-galaxy",
  "mgnify-seqprep-subwf": "cwl-to-galaxy",
};

let index: PipelineIndex;
beforeAll(() => {
  index = buildPipelineIndex(REPO_ROOT);
});

function read(slug: string): RunModel {
  return buildRunModel({
    runDir: path.join(EMULATED, slug),
    repoRoot: REPO_ROOT,
    pipelineIndex: index,
    reconstruct: true,
    now: FIXED_CLOCK,
  });
}

describe("the committed emulated runs", () => {
  const slugs = readdirSync(EMULATED).filter((name) =>
    statSync(path.join(EMULATED, name)).isDirectory(),
  );

  it("are all covered by this test", () => {
    expect(slugs.sort()).toEqual(Object.keys(EXPECTED_PIPELINE).sort());
  });

  for (const slug of Object.keys(EXPECTED_PIPELINE)) {
    describe(slug, () => {
      it("is reconstructed to the right pipeline, and says it was reconstructed", () => {
        const model = read(slug);
        expect(model.run.pipeline).toBe(EXPECTED_PIPELINE[slug]);
        expect(model.run.provenance).toBe("reconstructed");
      });

      it("claims nothing the filesystem cannot support", () => {
        const model = read(slug);
        // No record and no checkpoint history means no per-phase attribution and no timeline.
        expect(model.artifacts.every((artifact) => artifact.written_by_phase === null)).toBe(true);
        expect(model.timeline).toBeNull();
        expect(model.phases.every((phase) => phase.iterations === null)).toBe(true);
      });

      it("finds at least one declared artifact and keeps every path inside the run", () => {
        const model = read(slug);
        expect(model.health.artifacts_present).toBeGreaterThan(0);
        for (const artifact of model.artifacts) {
          if (!artifact.path) continue;
          expect(path.isAbsolute(artifact.path)).toBe(false);
          expect(artifact.path.startsWith("..")).toBe(false);
        }
        for (const file of model.unmapped) {
          expect(path.isAbsolute(file.relpath)).toBe(false);
          expect(file.relpath.startsWith("..")).toBe(false);
        }
      });

      it("serializes to a manifest that round-trips and names each artifact once", () => {
        const model = read(slug);
        const manifest = JSON.parse(serializeRunManifest(model)) as RunModel;
        expect(manifest.run_manifest_schema_version).toBe(1);
        const ids = manifest.artifacts.map((artifact) => artifact.id);
        expect(new Set(ids).size).toBe(ids.length);
      });
    });
  }

  it("classifies the hand-added scratch files in the CWL runs", () => {
    const model = read("ga4gh-challenge-cwl-galaxy-5step");
    const byPath = new Map(model.unmapped.map((file) => [file.relpath, file.class]));
    expect(byPath.get("run-summary.md")).toBe("narrative");
    expect(byPath.get("extract.mjs")).toBe("undeclared");
    expect(byPath.get("normalized")).toBe("directory");
  });
});
