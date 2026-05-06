import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DESIGN_DOCS_FILE = path.join(REPO_ROOT, "site/src/lib/design-docs.ts");
const DOCS_DIR = path.join(REPO_ROOT, "docs");

function extractSources(): string[] {
  const text = fs.readFileSync(DESIGN_DOCS_FILE, "utf-8");
  const matches = text.matchAll(/source:\s*['"]([^'"]+)['"]/g);
  return [...matches].flatMap((m) => (m[1] ? [m[1]] : []));
}

describe("site design-docs", () => {
  it("references at least one source", () => {
    expect(extractSources().length).toBeGreaterThan(0);
  });

  it("every DESIGN_DOCS source exists in docs/", () => {
    const missing = extractSources().filter(
      (source) => !fs.existsSync(path.join(DOCS_DIR, source)),
    );
    expect(missing).toEqual([]);
  });
});
