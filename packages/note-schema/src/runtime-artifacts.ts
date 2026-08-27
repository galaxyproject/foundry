import { existsSync, readFileSync } from "node:fs";

import { WIKI_LINK_RE } from "@galaxy-foundry/wiki-links";
import yaml from "js-yaml";

const ARTIFACT_ID_RE = /^[a-z][a-z0-9-]*$/;
const ARTIFACT_KINDS = new Set(["json", "markdown", "yaml", "text", "other"]);

export interface RuntimeArtifactDefinition {
  id: string;
  kind: string;
  default_filename: string;
  protocol: string;
  producer: {
    kind: "runtime-mode";
    option: string;
    initializer: "harness-or-first-skill";
  };
}

export interface RuntimeArtifactRegistry {
  version: 1;
  artifacts: ReadonlyMap<string, RuntimeArtifactDefinition>;
}

export interface RuntimeArtifactLoad {
  registry: RuntimeArtifactRegistry;
  errors: string[];
}

const EMPTY_REGISTRY: RuntimeArtifactRegistry = { version: 1, artifacts: new Map() };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unknownKeys(value: Record<string, unknown>, allowed: readonly string[]): string[] {
  const known = new Set(allowed);
  return Object.keys(value).filter((key) => !known.has(key));
}

/** Load and strictly validate the repository-level runtime artifact registry. */
export function loadRuntimeArtifactRegistry(filePath: string): RuntimeArtifactLoad {
  if (!existsSync(filePath)) return { registry: EMPTY_REGISTRY, errors: [] };

  let parsed: unknown;
  try {
    parsed = yaml.load(readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      registry: EMPTY_REGISTRY,
      errors: [`invalid YAML: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  const root = record(parsed);
  if (!root) return { registry: EMPTY_REGISTRY, errors: ["root must be a mapping"] };

  const errors = unknownKeys(root, ["version", "artifacts"]).map(
    (key) => `${key}: unknown registry field`,
  );
  if (root.version !== 1) errors.push("version: must be 1");
  const rawArtifacts = record(root.artifacts);
  if (!rawArtifacts) {
    errors.push("artifacts: must be a mapping");
    return { registry: EMPTY_REGISTRY, errors };
  }

  const artifacts = new Map<string, RuntimeArtifactDefinition>();
  for (const [id, raw] of Object.entries(rawArtifacts)) {
    const at = `artifacts.${id}`;
    if (!ARTIFACT_ID_RE.test(id)) errors.push(`${at}: id must be kebab-case`);
    const artifact = record(raw);
    if (!artifact) {
      errors.push(`${at}: must be a mapping`);
      continue;
    }
    for (const key of unknownKeys(artifact, ["kind", "default_filename", "protocol", "producer"])) {
      errors.push(`${at}.${key}: unknown artifact field`);
    }

    const kind = artifact.kind;
    if (typeof kind !== "string" || !ARTIFACT_KINDS.has(kind)) {
      errors.push(`${at}.kind: must be json, markdown, yaml, text, or other`);
    }
    const defaultFilename = artifact.default_filename;
    if (typeof defaultFilename !== "string" || defaultFilename.length === 0) {
      errors.push(`${at}.default_filename: must be a non-empty string`);
    }
    const protocol = artifact.protocol;
    if (typeof protocol !== "string" || !WIKI_LINK_RE.test(protocol)) {
      errors.push(`${at}.protocol: must be a [[wiki-link]]`);
    }

    const producer = record(artifact.producer);
    if (!producer) {
      errors.push(`${at}.producer: must be a mapping`);
      continue;
    }
    for (const key of unknownKeys(producer, ["kind", "option", "initializer"])) {
      errors.push(`${at}.producer.${key}: unknown producer field`);
    }
    if (producer.kind !== "runtime-mode") {
      errors.push(`${at}.producer.kind: must be runtime-mode`);
    }
    if (typeof producer.option !== "string" || !ARTIFACT_ID_RE.test(producer.option)) {
      errors.push(`${at}.producer.option: must be kebab-case`);
    }
    if (producer.initializer !== "harness-or-first-skill") {
      errors.push(`${at}.producer.initializer: must be harness-or-first-skill`);
    }

    const ownErrors = errors.filter(
      (error) => error.startsWith(`${at}.`) || error.startsWith(`${at}:`),
    );
    if (
      ownErrors.length === 0 &&
      typeof kind === "string" &&
      typeof defaultFilename === "string" &&
      typeof protocol === "string" &&
      producer.kind === "runtime-mode" &&
      typeof producer.option === "string" &&
      producer.initializer === "harness-or-first-skill"
    ) {
      artifacts.set(id, {
        id,
        kind,
        default_filename: defaultFilename,
        protocol,
        producer: {
          kind: producer.kind,
          option: producer.option,
          initializer: producer.initializer,
        },
      });
    }
  }

  return { registry: { version: 1, artifacts }, errors };
}

export function requireRuntimeArtifactRegistry(filePath: string): RuntimeArtifactRegistry {
  const loaded = loadRuntimeArtifactRegistry(filePath);
  if (loaded.errors.length > 0) {
    throw new Error(
      `${filePath}: invalid runtime artifact registry\n${loaded.errors.map((error) => `- ${error}`).join("\n")}`,
    );
  }
  return loaded.registry;
}
