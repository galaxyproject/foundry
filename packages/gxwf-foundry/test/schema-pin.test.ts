// `--schema-sha256`: a skill bundle pins the schema it was cast with; a validator carrying a
// different one must refuse before judging the artifact.

import { createHash } from "node:crypto";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildProgram } from "../src/program.js";
import { summaryNextflowSchema } from "@galaxy-foundry/summarize-nextflow";
import { galaxyToolSummarySchema } from "../src/index.js";
import { SCHEMA_SKEW_EXIT, schemaSha256 } from "../src/lib/schema-pin.js";

const MINIMAL = fileURLToPath(
  new URL("./fixtures/galaxy-tool-summary/minimal.json", import.meta.url),
);
const WRONG = "0".repeat(64);

class Exited extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

async function run(...args: string[]): Promise<{ code: number; out: string; err: string }> {
  const realExit = process.exit;
  const realOut = process.stdout.write;
  const realErr = process.stderr.write;
  let out = "";
  let err = "";
  let code = 0;
  process.exit = ((c?: number) => {
    code = c ?? 0;
    throw new Exited(code);
  }) as typeof process.exit;
  process.stdout.write = ((chunk: unknown) => {
    out += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: unknown) => {
    err += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  try {
    await buildProgram().parseAsync(["node", "foundry", ...args]);
  } catch (e) {
    if (!(e instanceof Exited)) throw e;
  } finally {
    process.exit = realExit;
    process.stdout.write = realOut;
    process.stderr.write = realErr;
  }
  return { code, out, err };
}

describe("schemaSha256", () => {
  it("hashes the bytes cast writes for a package-export schema", () => {
    const castBytes = JSON.stringify(summaryNextflowSchema, null, 2) + "\n";
    expect(schemaSha256(summaryNextflowSchema)).toBe(
      createHash("sha256").update(castBytes).digest("hex"),
    );
  });
});

describe("--schema-sha256", () => {
  const pin = schemaSha256(galaxyToolSummarySchema);

  it("refuses with the skew exit code before validating", async () => {
    const r = await run("validate-galaxy-tool-summary", "--schema-sha256", WRONG, MINIMAL);
    expect(r.code).toBe(SCHEMA_SKEW_EXIT);
    expect(r.err).toContain("schema skew");
    expect(r.err).toContain(pin);
    expect(r.err).toContain(WRONG);
    expect(r.out).toBe("");
  });

  it("validates normally when the pin matches", async () => {
    const r = await run("validate-galaxy-tool-summary", "--schema-sha256", pin, MINIMAL);
    expect(r.code).toBe(0);
    expect(r.out).toBe(`${MINIMAL}: valid\n`);
  });

  it("checks only the pin when no artifact is given", async () => {
    const r = await run("validate-galaxy-tool-summary", "--schema-sha256", pin);
    expect(r.code).toBe(0);
    expect(r.out).toContain("schema matches");
  });

  it("fails a pin-only check on skew", async () => {
    const r = await run("validate-galaxy-tool-summary", "--schema-sha256", WRONG);
    expect(r.code).toBe(SCHEMA_SKEW_EXIT);
  });

  it("still requires an artifact without a pin", async () => {
    const r = await run("validate-galaxy-tool-summary");
    expect(r.code).toBe(1);
    expect(r.err).toContain("missing required argument");
  });

  it("is offered by every single-schema validate-* command", () => {
    const missing = buildProgram()
      .commands.filter((c) => c.name().startsWith("validate-") && c.name() !== "validate-markdown")
      .filter((c) => !c.options.some((o) => o.long === "--schema-sha256"))
      .map((c) => c.name());
    expect(missing).toEqual([]);
  });
});
