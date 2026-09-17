import {
  matchesMarkdownHeading,
  parseMarkdownDocument,
  scenariosMarkdownSchema,
} from "@galaxy-foundry/gxwf-foundry";
import { existsSync } from "node:fs";
import path from "node:path";

export interface ScenarioCase {
  name: string;
  body: string;
  fixture?: string;
  fixturePath?: string;
}

function fixtureFromBody(body: string): Pick<ScenarioCase, "fixture" | "fixturePath"> {
  const raw = body.match(/^-[ \t]*fixture:[ \t]*(.+?)[ \t]*$/m)?.[1]?.trim();
  if (!raw) return {};
  if (!raw.startsWith("`")) {
    return { fixture: raw, fixturePath: /^\S+$/.test(raw) ? raw : undefined };
  }
  const closing = raw.indexOf("`", 1);
  const fixture = closing > 1 ? raw.slice(1, closing) : undefined;
  return { fixture, fixturePath: fixture };
}

export interface ScenarioFixtureResolution {
  absolutePath: string;
  repositoryPath: string;
  materialized: boolean;
}

/** Resolve the two established fixture styles: repository-relative and scenarios.md-relative. */
export function resolveScenarioFixture(
  repoRoot: string,
  scenariosPath: string,
  fixture: string,
): ScenarioFixtureResolution {
  if (path.isAbsolute(fixture)) {
    throw new Error(`fixture must be repository-relative: ${fixture}`);
  }
  if (fixture.split(/[\\/]/).includes("..")) {
    throw new Error(`fixture escapes repository root: ${fixture}`);
  }
  const candidates = [
    path.resolve(repoRoot, fixture),
    path.resolve(path.dirname(scenariosPath), fixture),
  ];
  const absolutePath = candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]!;
  const relation = path.relative(repoRoot, absolutePath);
  if (relation.startsWith("..") || path.isAbsolute(relation)) {
    throw new Error(`fixture escapes repository root: ${fixture}`);
  }
  return {
    absolutePath,
    repositoryPath: relation.split(path.sep).join("/"),
    materialized: existsSync(absolutePath),
  };
}

/** Parse the shared `scenarios.md` Case/fixture vocabulary after frontmatter is stripped. */
export function parseScenarioCases(source: string): ScenarioCase[] {
  const rule = scenariosMarkdownSchema.sections[0]!;
  return parseMarkdownDocument(source).sections.flatMap((section) => {
    if (!matchesMarkdownHeading(section.heading, rule, scenariosMarkdownSchema.caseSensitive))
      return [];
    const name = section.heading.slice(rule.heading.length).trim();
    const body = section.body;
    return [{ name, body, ...fixtureFromBody(body) }];
  });
}
