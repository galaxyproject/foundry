import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildPipelineIndex,
  detectPipeline,
  PipelineUndeterminedError,
  scorePipelines,
  type PipelineIndex,
} from "../src/lib/run-reconstruct.js";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

let index: PipelineIndex | null = null;
function pipelineIndex(): PipelineIndex {
  if (!index) index = buildPipelineIndex(REPO_ROOT);
  return index;
}

function filenamesOf(pipeline: string): string[] {
  return (pipelineIndex().declared.get(pipeline) ?? []).map((output) => output.default_filename);
}

describe("pipeline detection from filenames", () => {
  it("names a nextflow run from its own summary", () => {
    const detection = detectPipeline(
      ["summary-nextflow.json", "nextflow-galaxy-interface.md", "nextflow-galaxy-data-flow.md"],
      pipelineIndex(),
    );
    expect(detection.pipeline).toBe("nextflow-to-galaxy");
    expect(detection.confidence).toBe("inferred");
  });

  it("names a CWL run", () => {
    const detection = detectPipeline(
      ["summary-cwl.json", "cwl-galaxy-interface.md", "cwl-galaxy-data-flow.md"],
      pipelineIndex(),
    );
    expect(detection.pipeline).toBe("cwl-to-galaxy");
  });

  it("refuses to choose between pipelines that declare the same filenames", () => {
    // `paper-to-galaxy` and `interview-to-galaxy` start from the same `freeform-summary.md` and are
    // identical downstream, so no file on disk can separate them. Guessing would mislabel every
    // paper run while every link on the page still resolved, which is the worst failure available.
    expect(() => detectPipeline(filenamesOf("paper-to-galaxy"), pipelineIndex())).toThrow(
      PipelineUndeterminedError,
    );
    try {
      detectPipeline(filenamesOf("paper-to-galaxy"), pipelineIndex());
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("paper-to-galaxy");
      expect(message).toContain("interview-to-galaxy");
      expect(message).toContain("--pipeline");
    }
  });

  it("refuses when the evidence is too thin to name anything", () => {
    expect(() => detectPipeline(["open-requirements.ledger.yml"], pipelineIndex())).toThrow(
      PipelineUndeterminedError,
    );
  });

  it("counts a file the candidate cannot explain against it", () => {
    const scores = scorePipelines(
      ["summary-cwl.json", "cwl-galaxy-interface.md", "summary-nextflow.json"],
      pipelineIndex(),
    );
    const cwl = scores.find((score) => score.pipeline === "cwl-to-galaxy")!;
    expect(cwl.foreign).toBeGreaterThan(0);
    expect(scores[0]!.pipeline).toBe("cwl-to-galaxy");
  });

  it("takes an explicit flag over anything inferred", () => {
    const detection = detectPipeline(["summary-nextflow.json"], pipelineIndex(), {
      flagPipeline: "nextflow-to-cwl",
    });
    expect(detection.pipeline).toBe("nextflow-to-cwl");
    expect(detection.confidence).toBe("flag");
  });

  it("keeps a stated pipeline but reports a genuine disagreement", () => {
    const detection = detectPipeline(
      ["summary-cwl.json", "cwl-galaxy-interface.md", "cwl-galaxy-data-flow.md"],
      pipelineIndex(),
      { recordPipeline: "nextflow-to-galaxy" },
    );
    expect(detection.pipeline).toBe("nextflow-to-galaxy");
    expect(detection.conflict?.best_inferred).toBe("cwl-to-galaxy");
  });

  it("does not call a tie a disagreement", () => {
    // The stated pipeline and its indistinguishable twin score identically; saying they conflict
    // would fire a warning on every paper and interview run forever.
    const detection = detectPipeline(filenamesOf("paper-to-galaxy"), pipelineIndex(), {
      recordPipeline: "paper-to-galaxy",
    });
    expect(detection.pipeline).toBe("paper-to-galaxy");
    expect(detection.conflict).toBeNull();
  });
});
