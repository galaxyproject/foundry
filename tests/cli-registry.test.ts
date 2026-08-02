import { describe, expect, it } from "vitest";

import { indexProgram, loadCliRegistry, type CliProgramView } from "../site/src/lib/cli-registry";

describe("cli metadata registry", () => {
  it("indexes commands by tool and command name", () => {
    const program: CliProgramView = {
      name: "gxwf",
      description: "Galaxy workflow operations",
      commands: [
        {
          name: "validate",
          fullName: "gxwf validate",
          description: "Validate Galaxy workflow files",
          synopsis: "gxwf validate [options] <file>",
          args: [{ raw: "file", name: "file", required: true, variadic: false }],
          options: [
            {
              flags: "--json",
              name: "json",
              description: "Output structured JSON report",
              takesArgument: false,
              optionalArgument: false,
              negatable: false,
            },
          ],
        },
      ],
    };

    const registry = indexProgram(
      program,
      "@galaxy-tool-util/cli",
      "1.2.3",
      "https://example.test/spec.json",
    );

    expect(Object.keys(registry)).toEqual(["gxwf/validate"]);
    expect(registry["gxwf/validate"]?.command.synopsis).toBe("gxwf validate [options] <file>");
    expect(registry["gxwf/validate"]?.package).toBe("@galaxy-tool-util/cli");
    expect(registry["gxwf/validate"]?.version).toBe("1.2.3");
  });

  it("tolerates package releases without the metadata subpath", async () => {
    const registry = await loadCliRegistry();
    expect(registry).toBeTypeOf("object");
  });
});
