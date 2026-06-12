// Harness-CLI install-requirement rollup. Walks a flat list of typed cli-tool /
// cli-command references, resolves each to its parent cli-tool note's install
// metadata, dedups by tool slug, and renders the "Required Tools" / "Bootstrap"
// manifest lines. Shared by per-Mold casting (cast-mold) and pipeline assembly
// (assemble-pipeline) so both surfaces compute the manifest identically.

import type { Frontmatter } from "./types.js";
import { resolveWikiLink } from "./wiki-links.js";

export interface RequiredTool {
  tool: string;
  origin: string;
  package: string;
  package_version?: string;
  invoke: string;
  invoke_fallback?: string;
  availability_check?: string;
  docs_url?: string;
  /** Bundled markdown reference (relative to bundle root) when one was copied. */
  reference?: string;
  /** Why this tool is required: "referenced" (explicit) or "implied-by-command:<subcommand>". */
  source: "referenced" | "implied";
  /** For implied tools, the subcommand notes that pulled them in. */
  implied_by?: string[];
}

/** Minimal ref shape the aggregator consumes; satisfied by cast's ProvenanceRefEntry. */
export interface RequiredToolRef {
  kind: string;
  src: string;
  dst?: string;
}

/**
 * Resolve a Mold's cli-tool / cli-command `references` to `{ kind, src }` entries
 * — the cli-relevant slice of cast's resolveMoldRef, without the casting machinery.
 * Feeds aggregateRequiredTools at pipeline-assembly time (no bundle copy, no `dst`).
 */
export function moldCliRefs(
  moldMeta: Frontmatter | undefined,
  slugMap: Map<string, string>,
): RequiredToolRef[] {
  const refs = Array.isArray(moldMeta?.references) ? moldMeta.references : [];
  const out: RequiredToolRef[] = [];
  for (const r of refs) {
    if (typeof r !== "object" || r === null || Array.isArray(r)) continue;
    const rec = r as Record<string, unknown>;
    const kind = typeof rec.kind === "string" ? rec.kind : "";
    if (kind !== "cli-tool" && kind !== "cli-command") continue;
    const src = resolveWikiLink(rec.ref, slugMap);
    if (!src) continue;
    out.push({ kind, src });
  }
  return out;
}

export function aggregateRequiredTools(
  refs: RequiredToolRef[],
  metaByPath: Map<string, Frontmatter>,
  slugMap: Map<string, string>,
): RequiredTool[] {
  const tools = new Map<string, RequiredTool>();

  const intern = (
    toolNotePath: string,
    source: "referenced" | "implied",
    impliedBy?: string,
    reference?: string,
  ): void => {
    const meta = metaByPath.get(toolNotePath);
    if (!meta || meta.type !== "cli-tool") return;
    const slug = typeof meta.tool === "string" ? meta.tool : "";
    if (!slug) return;
    const existing = tools.get(slug);
    if (existing) {
      if (source === "referenced") existing.source = "referenced";
      if (impliedBy && !existing.implied_by?.includes(impliedBy)) {
        existing.implied_by = [...(existing.implied_by ?? []), impliedBy];
      }
      if (reference && !existing.reference) existing.reference = reference;
      return;
    }
    tools.set(slug, {
      tool: slug,
      origin: typeof meta.origin === "string" ? meta.origin : "",
      package: typeof meta.package === "string" ? meta.package : "",
      package_version: typeof meta.package_version === "string" ? meta.package_version : undefined,
      invoke: typeof meta.invoke === "string" ? meta.invoke : "",
      invoke_fallback: typeof meta.invoke_fallback === "string" ? meta.invoke_fallback : undefined,
      availability_check:
        typeof meta.availability_check === "string" ? meta.availability_check : undefined,
      docs_url: typeof meta.docs_url === "string" ? meta.docs_url : undefined,
      reference,
      source,
      implied_by: impliedBy ? [impliedBy] : undefined,
    });
  };

  for (const r of refs) {
    if (r.kind === "cli-tool") {
      intern(r.src, "referenced", undefined, r.dst);
    } else if (r.kind === "cli-command") {
      const cmdMeta = metaByPath.get(r.src);
      const toolSlug = typeof cmdMeta?.tool === "string" ? cmdMeta.tool : "";
      if (!toolSlug) continue;
      const toolNotePath = slugMap.get(toolSlug);
      const subSlug =
        typeof cmdMeta?.command === "string" ? `${toolSlug} ${cmdMeta.command}` : toolSlug;
      if (!toolNotePath || metaByPath.get(toolNotePath)?.type !== "cli-tool") {
        console.warn(
          `warn: cli-command ${subSlug} references tool=${toolSlug} but no content/cli/${toolSlug}/index.md cli-tool note exists; Required Tools entry will be missing.`,
        );
        continue;
      }
      intern(toolNotePath, "implied", subSlug);
    }
  }

  return [...tools.values()].sort((a, b) => a.tool.localeCompare(b.tool));
}

export function renderInstallCommand(tool: RequiredTool): string {
  const versioned = tool.package_version;
  if (tool.origin === "pypi") {
    const spec = versioned ? `${tool.package}==${versioned}` : tool.package;
    return `\`uv tool install ${spec}\` (or \`pip install ${spec}\`).`;
  }
  if (tool.origin === "npm") {
    const spec = versioned ? `${tool.package}@${versioned}` : tool.package;
    return `\`npm install -g ${spec}\`.`;
  }
  return `Install ${tool.package}${versioned ? `@${versioned}` : ""} from ${tool.origin}.`;
}

export function requiredToolRows(tools: RequiredTool[]): string[] {
  return tools.map((t) => {
    const lines = [`- **\`${t.invoke}\`** (${t.tool}). ${renderInstallCommand(t)}`];
    if (t.invoke_fallback) lines.push(`  Ephemeral run: \`${t.invoke_fallback}\`.`);
    if (t.availability_check) lines.push(`  Check: \`${t.availability_check}\`.`);
    if (t.docs_url) lines.push(`  Docs: ${t.docs_url}`);
    if (t.reference) lines.push(`  Bundled reference: \`${t.reference}\`.`);
    return lines.join("\n");
  });
}
