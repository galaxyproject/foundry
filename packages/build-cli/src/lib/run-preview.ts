// Turns an artifact's bytes into something worth reading on one page.
//
// Two levels. Every text artifact gets a *raw* view — pretty-printed for JSON, a heading outline
// for Markdown, head-and-tail for a log. A handful of known artifact ids also get a *derived* view
// that answers the question the artifact exists to answer: how many steps are still drafty, did
// validation pass, which tools got pinned. The derived view is the reason to open the dashboard
// rather than the file.
//
// No Markdown renderer is shipped. A dependency or a hand-rolled parser buys formatting on a
// surface where the raw source is honest, greppable, and already what the author wrote.

import yaml from "js-yaml";

import type { ArtifactPreview, DerivedView } from "./run-model.js";
import type { ScannedEntry } from "./run-scan.js";

/** Head and tail of a long log, with the elision stated rather than silent. */
const LOG_HEAD_LINES = 40;
const LOG_TAIL_LINES = 120;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function scalar(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `${value.length} item(s)`;
  return "…";
}

function markdownOutline(text: string): Array<{ depth: number; text: string }> {
  const out: Array<{ depth: number; text: string }> = [];
  let fenced = false;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const match = /^(#{1,4})\s+(.*\S)\s*$/.exec(line);
    if (match) out.push({ depth: match[1]!.length, text: match[2]! });
  }
  return out;
}

function elideLog(text: string): { body: string; truncated: boolean } {
  const lines = text.split("\n");
  if (lines.length <= LOG_HEAD_LINES + LOG_TAIL_LINES) return { body: text, truncated: false };
  const head = lines.slice(0, LOG_HEAD_LINES);
  const tail = lines.slice(-LOG_TAIL_LINES);
  const elided = lines.length - head.length - tail.length;
  return {
    body: [...head, "", `... ${elided} lines elided ...`, "", ...tail].join("\n"),
    truncated: true,
  };
}

// ---- derived views -------------------------------------------------------------------------

/**
 * A gxformat2 workflow or draft, reduced to its step table.
 *
 * On a real run the draft is around 100 KB of YAML and the only questions asked of it are which
 * steps are still unresolved and what they are waiting on. `_plan_*` keys and `TODO` sentinels are
 * how a draft marks that, so they are what the table surfaces.
 */
function gxwfSteps(text: string): DerivedView | null {
  let parsed: unknown;
  try {
    parsed = yaml.load(text);
  } catch {
    return null;
  }
  const root = asRecord(parsed);
  if (!root) return null;
  const cls = typeof root.class === "string" ? root.class : null;
  if (!cls || !/GalaxyWorkflow/i.test(cls)) return null;

  const names = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        const row = asRecord(item);
        return (row && (scalar(row.id) || scalar(row.label))) || `#${index + 1}`;
      });
    }
    const row = asRecord(value);
    return row ? Object.keys(row) : [];
  };

  const rawSteps = root.steps;
  const stepRows: Array<[string, Record<string, unknown>]> = Array.isArray(rawSteps)
    ? rawSteps.map((item, index) => {
        const row = asRecord(item) ?? {};
        return [scalar(row.id) || scalar(row.label) || `step-${index + 1}`, row];
      })
    : Object.entries(asRecord(rawSteps) ?? {}).map(([key, value]) => [key, asRecord(value) ?? {}]);

  const steps = stepRows.map(([id, row]) => {
    const toolId = scalar(row.tool_id) || null;
    const todos = Object.keys(row).filter((key) => key.startsWith("_plan"));
    const drafty =
      !toolId ||
      /^TODO/i.test(toolId) ||
      todos.length > 0 ||
      /TODO/i.test(scalar(row.tool_version));
    return {
      id,
      label: scalar(row.label) || null,
      tool_id: toolId,
      drafty,
      todos,
    };
  });

  return {
    kind: "gxwf-steps",
    class: cls,
    inputs: names(root.inputs),
    outputs: names(root.outputs),
    steps,
  };
}

function validationSummary(value: unknown): DerivedView | null {
  const root = asRecord(value);
  if (!root) return null;
  const coverage = asRecord(root.coverage);
  const rows: Array<[string, string]> = [];
  if (root.status !== undefined) rows.push(["status", scalar(root.status)]);
  if (root.status_rationale !== undefined) rows.push(["rationale", scalar(root.status_rationale)]);
  for (const [key, entry] of Object.entries(coverage ?? {})) {
    if (typeof entry === "number" || typeof entry === "boolean" || typeof entry === "string") {
      rows.push([key, String(entry)]);
    }
  }
  if (!rows.length) return null;
  return { kind: "validation-summary", status: scalar(root.status) || null, rows };
}

function testResult(value: unknown): DerivedView | null {
  const root = asRecord(value);
  if (!root) return null;
  const counts: Array<[string, string]> = [];
  const summary = asRecord(root.summary);
  for (const [key, entry] of Object.entries(summary ?? {})) {
    if (typeof entry === "number") counts.push([key, String(entry)]);
  }
  for (const key of ["result", "executed_end_to_end", "workflow_invoked", "any_tool_job_ran"]) {
    if (root[key] !== undefined) counts.push([key, scalar(root[key])]);
  }

  const cases: Array<{ name: string; status: string }> = [];
  if (Array.isArray(root.tests)) {
    root.tests.forEach((item, index) => {
      const row = asRecord(item);
      const data = asRecord(row?.data);
      const name = scalar(row?.id) || scalar(data?.test_index) || `test ${index + 1}`;
      const status = scalar(data?.status) || scalar(row?.status) || "unreported";
      cases.push({ name, status });
    });
  }
  if (!counts.length && !cases.length) return null;
  return { kind: "test-result", result: scalar(root.result) || null, counts, cases };
}

function toolPins(value: unknown): DerivedView | null {
  const root = asRecord(value);
  if (!root) return null;
  const candidates = [root.pins, root.tools, root.candidates, root.selected].find((entry) =>
    Array.isArray(entry),
  );
  const rows = Array.isArray(candidates) ? candidates : [root];
  const pins = rows
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const out: Record<string, string> = {};
      for (const key of [
        "tool_id",
        "owner",
        "name",
        "changeset_revision",
        "revision",
        "tool_shed",
      ]) {
        if (row[key] !== undefined) out[key] = scalar(row[key]);
      }
      return Object.keys(out).length ? out : null;
    })
    .filter((row): row is Record<string, string> => row !== null);
  return pins.length ? { kind: "tool-pins", pins } : null;
}

function keyValue(value: unknown): DerivedView | null {
  const root = asRecord(value);
  if (!root) return null;
  const pairs: Array<[string, string]> = Object.entries(root)
    .filter(([, entry]) => typeof entry !== "object" || entry === null || Array.isArray(entry))
    .slice(0, 24)
    .map(([key, entry]) => [key, scalar(entry)]);
  return pairs.length ? { kind: "key-value", pairs } : null;
}

/**
 * Which derived view an artifact id gets.
 *
 * Keyed by id rather than by filename so a run that renamed a file still gets the right view, and
 * so adding a Mold means adding one line here rather than a filename pattern.
 */
const DERIVED_BY_ID: Record<string, (text: string) => DerivedView | null> = {
  "galaxy-workflow-draft": gxwfSteps,
  "galaxy-workflow": gxwfSteps,
  "iwc-exemplar-gxformat2": gxwfSteps,
  "starting-galaxy-workflow": gxwfSteps,
  "galaxy-workflow-validation-result": (text) => validationSummary(safeJson(text)),
  "workflow-test-result": (text) => testResult(safeJson(text)),
  "galaxy-tool-pin": (text) => toolPins(safeJson(text)),
  "galaxy-tool-summary": (text) => keyValue(safeJson(text)),
  "summary-nextflow": (text) => keyValue(safeJson(text)),
  "summary-cwl": (text) => keyValue(safeJson(text)),
  "test-data-refs": (text) => keyValue(safeJson(text)),
};

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---- entry point ---------------------------------------------------------------------------

export function derivePreview(
  artifactId: string | null,
  kind: string,
  entry: ScannedEntry,
): ArtifactPreview {
  if (entry.text === null) {
    return {
      mode: "none",
      embedded: false,
      truncated: false,
      bytes_embedded: 0,
      body: null,
      outline: null,
      derived: null,
      skip_reason: entry.text_skip_reason ?? "no text available",
    };
  }

  const text = entry.text;
  let derived: DerivedView | null = null;
  if (artifactId && DERIVED_BY_ID[artifactId]) {
    try {
      derived = DERIVED_BY_ID[artifactId]!(text) ?? null;
    } catch {
      derived = null;
    }
  }

  if (kind === "json") {
    const parsed = safeJson(text);
    const body = parsed === null ? text : JSON.stringify(parsed, null, 2);
    return {
      mode: "json",
      embedded: true,
      truncated: false,
      bytes_embedded: Buffer.byteLength(body, "utf8"),
      body,
      outline: null,
      derived,
      skip_reason: null,
    };
  }

  if (kind === "markdown") {
    return {
      mode: "markdown",
      embedded: true,
      truncated: false,
      bytes_embedded: Buffer.byteLength(text, "utf8"),
      body: text,
      outline: markdownOutline(text),
      derived,
      skip_reason: null,
    };
  }

  if (kind === "yaml") {
    return {
      mode: "yaml",
      embedded: true,
      truncated: false,
      bytes_embedded: Buffer.byteLength(text, "utf8"),
      body: text,
      outline: null,
      derived,
      skip_reason: null,
    };
  }

  const { body, truncated } = elideLog(text);
  return {
    mode: truncated ? "tail" : "text",
    embedded: true,
    truncated,
    bytes_embedded: Buffer.byteLength(body, "utf8"),
    body,
    outline: null,
    derived,
    skip_reason: null,
  };
}

/** A log or narrative file that is not a declared artifact still gets an elided body. */
export function unmappedPreview(entry: ScannedEntry): ArtifactPreview | null {
  if (entry.text === null) {
    if (!entry.text_skip_reason) return null;
    return {
      mode: "none",
      embedded: false,
      truncated: false,
      bytes_embedded: 0,
      body: null,
      outline: null,
      derived: null,
      skip_reason: entry.text_skip_reason,
    };
  }
  const isMarkdown = /\.(md|markdown)$/i.test(entry.basename);
  if (isMarkdown) {
    return {
      mode: "markdown",
      embedded: true,
      truncated: false,
      bytes_embedded: Buffer.byteLength(entry.text, "utf8"),
      body: entry.text,
      outline: markdownOutline(entry.text),
      derived: null,
      skip_reason: null,
    };
  }
  const { body, truncated } = elideLog(entry.text);
  return {
    mode: truncated ? "tail" : "text",
    embedded: true,
    truncated,
    bytes_embedded: Buffer.byteLength(body, "utf8"),
    body,
    outline: null,
    derived: null,
    skip_reason: null,
  };
}
