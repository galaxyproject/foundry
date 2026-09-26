import { describe, expect, it } from "vitest";
import { toFormat2, toNative } from "@galaxy-tool-util/schema";

describe("gxwf dependency numeric input bounds", () => {
  it.each([
    { type: "int", min: 0, max: 5 },
    { type: "float", min: 0.5 },
    { type: "float", max: 2.5 },
  ])("preserves $type input bounds through native conversion", (input) => {
    const native = toNative({
      class: "GalaxyWorkflow",
      inputs: { n: input },
      outputs: {},
      steps: {},
    });
    expect(native.steps["0"].tool_state).toMatchObject({
      validators: [
        {
          type: "in_range",
          negate: false,
          ...("min" in input ? { min: input.min } : {}),
          ...("max" in input ? { max: input.max } : {}),
        },
      ],
    });
    expect(toFormat2(native).inputs[0]).toMatchObject({ id: "n", ...input });
  });
});
