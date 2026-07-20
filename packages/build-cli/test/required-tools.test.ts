import { describe, expect, it } from "vitest";

import {
  renderInstallCommand,
  renderPackageSpec,
  type RequiredTool,
} from "../src/lib/required-tools.js";

function tool(overrides: Partial<RequiredTool>): RequiredTool {
  return {
    tool: "planemo",
    origin: "pypi",
    package: "planemo",
    invoke: "planemo",
    source: "referenced",
    ...overrides,
  };
}

describe("renderPackageSpec", () => {
  it("pins a bare pypi version with ==", () => {
    expect(renderPackageSpec("planemo", "0.75.45", "pypi")).toBe("planemo==0.75.45");
  });

  it("leaves an unversioned package alone", () => {
    expect(renderPackageSpec("planemo", undefined, "pypi")).toBe("planemo");
  });

  it("does not double up an operator already in the pin", () => {
    expect(renderPackageSpec("planemo", ">=0.75", "pypi")).toBe("planemo>=0.75");
    expect(renderPackageSpec("planemo", "~=0.75.45", "pypi")).toBe("planemo~=0.75.45");
    expect(renderPackageSpec("planemo", "==0.75.45", "pypi")).toBe("planemo==0.75.45");
  });

  it("emits a PEP 508 direct reference for a VCS pin", () => {
    expect(renderPackageSpec("planemo", "git+https://github.com/o/planemo@abc123", "pypi")).toBe(
      "planemo @ git+https://github.com/o/planemo@abc123",
    );
  });

  it("uses npm's @ separator for versions, ranges, and URLs alike", () => {
    expect(renderPackageSpec("gxwf", "1.2.3", "npm")).toBe("gxwf@1.2.3");
    expect(renderPackageSpec("gxwf", "^1.2", "npm")).toBe("gxwf@^1.2");
    expect(renderPackageSpec("gxwf", "git+https://github.com/o/gxwf", "npm")).toBe(
      "gxwf@git+https://github.com/o/gxwf",
    );
  });
});

describe("renderInstallCommand", () => {
  it("renders a bare pypi pin unquoted", () => {
    expect(renderInstallCommand(tool({ package_version: "0.75.45" }))).toBe(
      "`uv tool install planemo==0.75.45` (or `pip install planemo==0.75.45`).",
    );
  });

  it("quotes a range pin so the shell does not treat > as a redirect", () => {
    expect(renderInstallCommand(tool({ package_version: ">=0.75" }))).toBe(
      "`uv tool install 'planemo>=0.75'` (or `pip install 'planemo>=0.75'`).",
    );
  });

  it("quotes a VCS direct reference", () => {
    const rendered = renderInstallCommand(
      tool({ package_version: "git+https://github.com/o/planemo@abc123" }),
    );
    expect(rendered).toBe(
      "`uv tool install 'planemo @ git+https://github.com/o/planemo@abc123'` " +
        "(or `pip install 'planemo @ git+https://github.com/o/planemo@abc123'`).",
    );
  });

  it("renders npm installs", () => {
    expect(
      renderInstallCommand(
        tool({ tool: "gxwf", origin: "npm", package: "gxwf", package_version: "1.2.3" }),
      ),
    ).toBe("`npm install -g gxwf@1.2.3`.");
  });
});
