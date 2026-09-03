// Pins the runner's observable surface — stdout, stderr, exit code — because that surface is
// what every `foundry validate-*` page under content/cli/foundry/ documents. All six claimed
// silence on success while the runner has always printed `<path>: valid`; nothing caught it.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runJsonValidator } from "../src/lib/run-json-validator.js";
import { galaxyToolSummaryValidator } from "../src/index.js";

const MINIMAL = fileURLToPath(
  new URL("./fixtures/galaxy-tool-summary/minimal.json", import.meta.url),
);

class Exited extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

const run = (target: string): { code: number; out: string; err: string } => {
  const realExit = process.exit;
  const realOut = process.stdout.write;
  const realErr = process.stderr.write;
  let out = "";
  let err = "";
  let code = -1;
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
    runJsonValidator(target, galaxyToolSummaryValidator);
  } catch (e) {
    if (!(e instanceof Exited)) throw e;
  } finally {
    process.exit = realExit;
    process.stdout.write = realOut;
    process.stderr.write = realErr;
  }
  return { code, out, err };
};

describe("runJsonValidator", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "foundry-runner-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("announces the valid document on stdout and exits 0", () => {
    const r = run(MINIMAL);
    expect(r.code).toBe(0);
    expect(r.out).toBe(`${MINIMAL}: valid\n`);
    expect(r.err).toBe("");
  });

  it("writes diagnostics and a count to stderr, exits 3", () => {
    const target = path.join(dir, "wrong.json");
    writeFileSync(target, JSON.stringify({ not: "a manifest" }));
    const r = run(target);
    expect(r.code).toBe(3);
    expect(r.out).toBe("");
    expect(r.err).toMatch(/^\s{2}\S.*\(\w+\)$/m);
    expect(r.err).toMatch(new RegExp(`: \\d+ error\\(s\\)\n$`));
  });

  it("exits 1 on a file it cannot read", () => {
    const r = run(path.join(dir, "absent.json"));
    expect(r.code).toBe(1);
    expect(r.out).toBe("");
    expect(r.err).toMatch(/^error reading /);
  });
});
