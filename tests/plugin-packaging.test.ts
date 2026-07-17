import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const pluginRoot = path.join(repoRoot, "casts", "claude");

function readJson(relativePath: string): Record<string, any> {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function skillFiles(): string[] {
  const skillsRoot = path.join(pluginRoot, "skills");
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(skillsRoot, entry.name, "SKILL.md"))
    .filter(existsSync)
    .sort();
}

function skillDirectories(): string[] {
  return readdirSync(path.join(pluginRoot, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

describe("dual-runtime plugin packaging", () => {
  const claudeManifest = readJson("casts/claude/.claude-plugin/plugin.json");
  const codexManifest = readJson("casts/claude/.codex-plugin/plugin.json");
  const marketplace = readJson(".agents/plugins/marketplace.json");

  it("points both runtimes at one plugin identity and skill tree", () => {
    expect(codexManifest.name).toBe(claudeManifest.name);
    expect(codexManifest.version).toBe(claudeManifest.version);
    expect(codexManifest.skills).toBe("./skills/");
    expect(existsSync(path.join(pluginRoot, codexManifest.skills))).toBe(true);
    expect(existsSync(path.join(repoRoot, "casts", "codex", "skills"))).toBe(false);
  });

  it("publishes the shared plugin through the repo Codex marketplace", () => {
    const entry = marketplace.plugins.find(
      (candidate: { name?: string }) => candidate.name === codexManifest.name,
    );
    expect(entry).toBeDefined();
    expect(entry.source).toEqual({ source: "local", path: "./casts/claude" });
    expect(path.resolve(repoRoot, entry.source.path)).toBe(pluginRoot);
    expect(entry.policy).toEqual({ installation: "AVAILABLE", authentication: "ON_INSTALL" });
    expect(typeof entry.category).toBe("string");
  });

  it("keeps generated skill frontmatter in the shared portable core", () => {
    const failures: string[] = [];
    for (const skillPath of skillFiles()) {
      const parsed = matter(readFileSync(skillPath, "utf8"));
      const keys = Object.keys(parsed.data).sort();
      if (keys.join(",") !== "description,name") {
        failures.push(`${path.relative(repoRoot, skillPath)}: ${keys.join(", ")}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("keeps non-skill artifacts outside the discovered skills directory", () => {
    const missing = skillDirectories().filter(
      (directory) => !existsSync(path.join(pluginRoot, "skills", directory, "SKILL.md")),
    );
    expect(missing).toEqual([]);
  });

  it("rejects runtime-side substitutions from shared skill instructions", () => {
    const forbidden = ["$ARGUMENTS", "${CLAUDE_SKILL_DIR}"];
    const failures: string[] = [];
    for (const skillPath of skillFiles()) {
      const body = readFileSync(skillPath, "utf8");
      for (const token of forbidden) {
        if (body.includes(token)) failures.push(`${path.relative(repoRoot, skillPath)}: ${token}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
