// Renders one `RunModel` into a self-contained page.
//
// Pure: same model in, same bytes out. Every derived value was computed in Node, because the page
// is opened from a `file://` URL where `fetch` is blocked — a client-rendered dashboard would be
// blank on a double click, which is the main way this gets opened. The manifest is still inlined
// so the page carries its own data, but nothing rendered depends on reading it back.

import { escapeAttr, escapeHtml, humanBytes, jsonScriptBody, shortInstant } from "../lib/html.js";
import { DASHBOARD_CSS, DASHBOARD_JS } from "./run-dashboard-assets.js";
import type {
  ArtifactPreview,
  DerivedView,
  FeedbackEntry,
  OpenRequirementsEntry,
  RunArtifact,
  RunModel,
  UnmappedFile,
} from "../lib/run-model.js";

export const GENERATOR_MARKER = "generated-by: foundry-build run-dashboard v1";

export interface RenderOptions {
  siteBase: string;
  manifestJson: string;
  commandLine: string;
}

// ---- small builders --------------------------------------------------------------------------

function link(href: string | null, label: string, extraClass = ""): string {
  const text = escapeHtml(label);
  if (!href) return text;
  const cls = extraClass ? ` class="${escapeAttr(extraClass)}"` : "";
  return `<a href="${escapeAttr(href)}"${cls}>${text}</a>`;
}

function badge(value: string, state?: string): string {
  const stateAttr = state ? ` data-state="${escapeAttr(state)}"` : "";
  return `<span class="badge" data-v="${escapeAttr(value)}"${stateAttr}>${escapeHtml(value)}</span>`;
}

function section(id: string, title: string, tail: string, body: string): string {
  return [
    `<section id="${escapeAttr(id)}">`,
    `<div class="section-rule"><h2>${escapeHtml(title)}</h2><span class="section-tail">${escapeHtml(tail)}</span></div>`,
    body,
    "</section>",
  ].join("\n");
}

function empty(message: string): string {
  return `<p class="empty">${escapeHtml(message)}</p>`;
}

function prose(value: string | null): string {
  return value ? `<p class="prose-block">${escapeHtml(value)}</p>` : "";
}

// ---- header ----------------------------------------------------------------------------------

function renderHeader(model: RunModel, options: RenderOptions): string {
  const run = model.run;
  const chips = [
    `<span class="chip chip-accent">${escapeHtml(run.pipeline)}</span>`,
    `<span class="chip">rev ${escapeHtml(String(run.pipeline_source_revision))}</span>`,
    `<span class="chip">${escapeHtml(run.harness_name)}</span>`,
    `<span class="chip${run.provenance === "reconstructed" ? " chip-warn" : ""}">${escapeHtml(run.provenance)}</span>`,
    ...run.options_observed.map((option) => `<span class="chip">--${escapeHtml(option)}</span>`),
  ].join("");

  const pipelineHref = options.siteBase ? `${options.siteBase}/pipelines/${run.pipeline}/` : null;

  const banners: string[] = [];
  if (run.provenance === "reconstructed") {
    // Say what was actually recovered rather than reciting the worst case. A run with a feedback
    // ledger has a real phase roster, and a checkpointed one has a real timeline; claiming those
    // are lost would understate the page the reader is looking at.
    const recovered: string[] = [];
    if (model.feedback) recovered.push("the feedback ledger supplied the phase roster");
    if (model.timeline) recovered.push("the checkpoint history supplied the timeline");
    const stillMissing = model.artifacts.every((artifact) => artifact.written_by_phase === null)
      ? " Which phase wrote each file is not recorded anywhere, so the artifact table attributes by declaration rather than by fact."
      : "";
    banners.push(
      `<div class="banner"><p><strong>Reconstructed, not recorded.</strong> This run carries no <code>foundry-run.yml</code>, so its pipeline was inferred from the files on disk and the phase order comes from today's assembled harness${recovered.length ? `, though ${escapeHtml(recovered.join(" and "))}` : ""}.${stillMissing} ${escapeHtml(String(model.health.files_attributed))} of ${escapeHtml(String(model.health.files_seen))} files map to a declared artifact.</p></div>`,
    );
  }
  if (!run.assembly_matches_checkout) {
    banners.push(
      `<div class="banner"><p><strong>The harness changed since this run.</strong> Phase numbers and declared artifacts below describe the committed pipeline as it stands now, not the one this run read.</p></div>`,
    );
  }
  const errors = model.warnings.filter((warning) => warning.code === "pipeline-conflict");
  for (const warning of errors) {
    banners.push(
      `<div class="banner banner-error"><p><strong>Sources disagree.</strong> ${escapeHtml(warning.message)}</p></div>`,
    );
  }

  return [
    `<header class="page-head">`,
    `<p class="eyebrow">conversion run</p>`,
    `<h1>${escapeHtml(run.slug)}</h1>`,
    `<p class="lede">${link(pipelineHref, run.pipeline)} — ${escapeHtml(shortInstant(run.started_at))} to ${escapeHtml(shortInstant(run.finished_at))}, ${escapeHtml(humanBytes(run.total_bytes))} on disk.</p>`,
    `<div class="chips">${chips}</div>`,
    "</header>",
    ...banners,
  ].join("\n");
}

function renderHealth(model: RunModel): string {
  const tiles = model.health.tiles
    .map((tile) =>
      [
        `<a class="tile" data-state="${escapeAttr(tile.state)}" href="${escapeAttr(tile.anchor)}">`,
        `<div class="tile-label">${escapeHtml(tile.label)}</div>`,
        `<div class="tile-value">${escapeHtml(tile.value)}</div>`,
        `<div class="tile-detail">${escapeHtml(tile.detail)}</div>`,
        "</a>",
      ].join(""),
    )
    .join("\n");
  return `<div class="tiles">${tiles}</div>`;
}

// ---- phases ----------------------------------------------------------------------------------

function renderPhases(model: RunModel): string {
  const furthest = model.health.furthest_phase;
  const stops = model.phases
    .map((phase) => {
      const classes = [
        "stop",
        phase.kind === "branch" ? "stop-branch" : "stop-mold",
        phase.n === furthest ? "stop-furthest" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const name =
        phase.kind === "branch"
          ? escapeHtml(phase.pattern ?? "branch")
          : link(phase.site_href, phase.skill ?? "unnamed");
      const tags: string[] = [];
      if (phase.loop) {
        tags.push(
          `<span class="stop-tag">loop${phase.iterations ? ` ×${escapeHtml(String(phase.iterations))}` : ""}</span>`,
        );
      }
      if (phase.selected) {
        tags.push(`<span class="stop-tag">→ ${escapeHtml(phase.selected)}</span>`);
      }
      const note =
        phase.status_source === "unknown"
          ? "no source recorded this phase"
          : `${phase.status} · from ${phase.status_source.replace("-", " ")}`;
      return [
        `<li class="${classes}" data-status="${escapeAttr(phase.status)}" data-phase-filter="${escapeAttr(String(phase.n))}">`,
        `<span class="stop-marker" aria-hidden="true"></span>`,
        `<span class="stop-num">${String(phase.n).padStart(2, "0")}</span>`,
        `<span class="stop-name">${name}</span>`,
        tags.join(""),
        `<span class="stop-note">${escapeHtml(note)}</span>`,
        "</li>",
      ].join("");
    })
    .join("\n");
  return `<ol class="subway">${stops}</ol>`;
}

// ---- artifacts -------------------------------------------------------------------------------

const PRESENCE_STATE: Record<string, string> = {
  present: "ok",
  missing: "error",
  "not-yet-due": "warn",
  "optional-absent": "warn",
};

function renderArtifactRow(artifact: RunArtifact): string {
  const phase = artifact.written_by_phase ?? artifact.producing_phases[0] ?? null;
  const fileCell = artifact.path
    ? `<a href="${escapeAttr(`./${artifact.path}`)}">${escapeHtml(artifact.declared_filename)}</a>`
    : escapeHtml(artifact.declared_filename);
  return [
    `<tr data-row data-presence="${escapeAttr(artifact.presence)}" data-kind="${escapeAttr(artifact.kind)}">`,
    `<td class="num" data-value="${escapeAttr(String(phase ?? 999))}">phase ${escapeHtml(String(phase ?? "—"))}</td>`,
    `<td class="mono">${link(artifact.site_href, artifact.id)}</td>`,
    `<td class="mono">${fileCell}</td>`,
    `<td class="mono">${escapeHtml(artifact.kind)}</td>`,
    `<td>${badge(artifact.presence, PRESENCE_STATE[artifact.presence])}</td>`,
    `<td class="num" data-value="${escapeAttr(String(artifact.size_bytes ?? 0))}">${escapeHtml(humanBytes(artifact.size_bytes))}</td>`,
    `<td class="num">${escapeHtml(shortInstant(artifact.mtime))}</td>`,
    `<td class="num">${artifact.variants.length ? escapeHtml(String(artifact.variants.length)) : "—"}</td>`,
    "</tr>",
  ].join("");
}

function renderDerived(view: DerivedView): string {
  if (view.kind === "gxwf-steps") {
    const drafty = view.steps.filter((step) => step.drafty).length;
    const rows = view.steps
      .map((step) =>
        [
          `<tr>`,
          `<td class="mono">${escapeHtml(step.id)}</td>`,
          `<td>${escapeHtml(step.label ?? "—")}</td>`,
          `<td class="mono">${escapeHtml(step.tool_id ?? "—")}</td>`,
          `<td>${step.drafty ? badge("drafty", "warn") : badge("resolved", "ok")}</td>`,
          `<td class="mono">${escapeHtml(step.todos.join(", ") || "—")}</td>`,
          "</tr>",
        ].join(""),
      )
      .join("");
    return [
      `<p class="panel-sub">${escapeHtml(view.class ?? "workflow")} — ${view.steps.length} step(s), ${drafty} still drafty, ${view.inputs.length} input(s), ${view.outputs.length} output(s).</p>`,
      `<table class="data-table"><thead><tr><th>step</th><th>label</th><th>tool</th><th>state</th><th>plan keys</th></tr></thead><tbody>${rows}</tbody></table>`,
    ].join("\n");
  }

  if (view.kind === "validation-summary" || view.kind === "key-value") {
    const rows = (view.kind === "validation-summary" ? view.rows : view.pairs)
      .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`)
      .join("");
    return `<dl class="kv">${rows}</dl>`;
  }

  if (view.kind === "test-result") {
    const counts = view.counts
      .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`)
      .join("");
    const cases = view.cases
      .map(
        (row) =>
          `<tr><td class="mono">${escapeHtml(row.name)}</td><td>${badge(row.status)}</td></tr>`,
      )
      .join("");
    return [
      `<dl class="kv">${counts}</dl>`,
      cases
        ? `<table class="data-table"><thead><tr><th>case</th><th>status</th></tr></thead><tbody>${cases}</tbody></table>`
        : "",
    ].join("\n");
  }

  const columns = [...new Set(view.pins.flatMap((pin) => Object.keys(pin)))];
  const head = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = view.pins
    .map(
      (pin) =>
        `<tr>${columns.map((column) => `<td class="mono">${escapeHtml(pin[column] ?? "—")}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderPreview(preview: ArtifactPreview | null, idBase: string): string {
  if (!preview) return empty("not on disk.");
  if (!preview.embedded && !preview.derived) {
    return `<p class="empty">Not embedded: ${escapeHtml(preview.skip_reason ?? "unavailable")}.</p>`;
  }

  const tabs: Array<{ id: string; label: string; body: string }> = [];
  if (preview.derived) {
    tabs.push({ id: `${idBase}-derived`, label: "derived", body: renderDerived(preview.derived) });
  }
  if (preview.outline?.length) {
    const items = preview.outline
      .map(
        (entry) =>
          `<li data-depth="${escapeAttr(String(entry.depth))}">${escapeHtml(entry.text)}</li>`,
      )
      .join("");
    tabs.push({
      id: `${idBase}-outline`,
      label: "outline",
      body: `<ul class="outline">${items}</ul>`,
    });
  }
  if (preview.body !== null) {
    const note = preview.truncated
      ? `<p class="panel-sub">Elided in the middle; open the file for the whole thing.</p>`
      : "";
    tabs.push({
      id: `${idBase}-raw`,
      label: "raw",
      body: `${note}<pre class="source">${escapeHtml(preview.body)}</pre>`,
    });
  }
  if (!tabs.length) return empty("nothing to show.");

  const buttons = tabs
    .map(
      (tab, index) =>
        `<button class="tab" type="button" data-tab="${escapeAttr(tab.id)}" aria-selected="${index === 0}">${escapeHtml(tab.label)}</button>`,
    )
    .join("");
  const panels = tabs
    .map(
      (tab, index) =>
        `<div class="tabpanel" id="${escapeAttr(tab.id)}"${index === 0 ? "" : " hidden"}>${tab.body}</div>`,
    )
    .join("\n");
  return `<div data-tabs><div class="tabs">${buttons}</div>${panels}</div>`;
}

function renderArtifactPanel(artifact: RunArtifact): string {
  const meta: string[] = [
    `<dt>declared by</dt><dd>${escapeHtml(artifact.producing_skills.join(", ") || "—")} (phase ${escapeHtml(artifact.producing_phases.join(", ") || "—")})</dd>`,
    `<dt>consumed at</dt><dd>${escapeHtml(artifact.consuming_phases.join(", ") || "nothing downstream reads it")}</dd>`,
    `<dt>schema</dt><dd>${artifact.schema ? link(artifact.schema_href, artifact.schema.replace(/[[\]]/g, "")) : "none declared"}</dd>`,
    `<dt>sha256</dt><dd class="mono">${escapeHtml(artifact.sha256 ?? artifact.hash_skipped_reason ?? "—")}</dd>`,
  ];
  if (artifact.writes.length) {
    const writes = artifact.writes
      .map(
        (write) =>
          `phase ${write.phase ?? "—"}${write.iteration ? ` step ${write.iteration}` : ""} at ${shortInstant(write.at)}`,
      )
      .join("; ");
    meta.push(`<dt>written</dt><dd>${escapeHtml(writes)}</dd>`);
  }

  const variants = artifact.variants.length
    ? [
        `<p class="panel-sub">Kept-aside copies — each one marks a hand edit.</p>`,
        `<table class="data-table"><thead><tr><th>file</th><th>size</th><th>vs current</th><th>modified</th></tr></thead><tbody>`,
        ...artifact.variants.map(
          (variant) =>
            `<tr><td class="mono">${escapeHtml(variant.basename)}</td><td class="num">${escapeHtml(humanBytes(variant.size_bytes))}</td><td class="num">${variant.bytes_delta === null ? "—" : escapeHtml(`${variant.bytes_delta > 0 ? "+" : ""}${variant.bytes_delta} B`)}</td><td class="num">${escapeHtml(shortInstant(variant.mtime))}</td></tr>`,
        ),
        "</tbody></table>",
      ].join("")
    : "";

  return [
    `<details class="panel" id="artifact-${escapeAttr(artifact.id)}">`,
    `<summary><span class="panel-title">${escapeHtml(artifact.id)}</span>${badge(artifact.presence, PRESENCE_STATE[artifact.presence])}<span class="panel-sub">${escapeHtml(artifact.declared_filename)}</span></summary>`,
    `<div class="panel-body">`,
    `<p class="lede">${escapeHtml(artifact.description)}</p>`,
    `<dl class="kv">${meta.join("")}</dl>`,
    variants,
    renderPreview(artifact.preview, `artifact-${artifact.id}`),
    "</div></details>",
  ].join("\n");
}

function renderArtifacts(model: RunModel): string {
  if (!model.artifacts.length) return empty("this pipeline declares no artifacts.");
  const rows = model.artifacts
    .slice()
    .sort(
      (a, b) =>
        (a.written_by_phase ?? a.producing_phases[0] ?? 99) -
          (b.written_by_phase ?? b.producing_phases[0] ?? 99) || a.id.localeCompare(b.id),
    )
    .map(renderArtifactRow)
    .join("\n");

  const filters = ["present", "missing", "not-yet-due", "optional-absent"]
    .map(
      (value) =>
        `<button class="filter" type="button" data-filter="presence" data-value="${escapeAttr(value)}" aria-pressed="false">${escapeHtml(value)}</button>`,
    )
    .join("");

  const panels = model.artifacts.map(renderArtifactPanel).join("\n");

  return [
    `<div class="controls" data-controls="artifact-rows">`,
    filters,
    `<input class="search" type="search" data-search placeholder="search artifacts" aria-label="search artifacts">`,
    `<button class="filter" type="button" data-reset>reset</button>`,
    `<span class="section-tail" data-count></span>`,
    "</div>",
    `<table class="data-table" data-sortable><thead><tr>`,
    `<th data-sort="number">phase</th><th data-sort="text">artifact</th><th data-sort="text">file</th><th data-sort="text">kind</th><th data-sort="text">presence</th><th data-sort="number">size</th><th data-sort="text">modified</th><th data-sort="number">copies</th>`,
    `</tr></thead><tbody id="artifact-rows">${rows}</tbody></table>`,
    `<div class="controls"><button class="filter" type="button" data-toggle-all="artifact-panels">expand all</button></div>`,
    `<div id="artifact-panels">${panels}</div>`,
  ].join("\n");
}

// ---- obligations -----------------------------------------------------------------------------

const OBLIGATION_ORDER: Record<string, number> = { surrendered: 0, open: 1, resolved: 2 };

function renderObligation(entry: OpenRequirementsEntry): string {
  const chain = [
    entry.raised_by ? link(entry.raised_by_href, entry.raised_by) : "—",
    "→",
    entry.resolved_by ? link(entry.resolved_by_href, entry.resolved_by) : "still open",
  ].join(" ");
  return [
    `<details class="panel" data-row data-status="${escapeAttr(entry.status)}" data-kind="${escapeAttr(entry.kind ?? "gap")}">`,
    `<summary><span class="panel-title">${escapeHtml(entry.id)}</span>${badge(entry.status)}${entry.blocking ? badge("blocking", "error") : ""}${entry.kind ? badge(entry.kind) : ""}<span class="panel-sub">${chain}</span></summary>`,
    `<div class="panel-body">`,
    entry.unmet ? `<dl class="kv"><dt>unmet</dt><dd>${escapeHtml(entry.unmet)}</dd></dl>` : "",
    prose(entry.missing),
    entry.units ? `<dl class="kv"><dt>units</dt><dd>${escapeHtml(entry.units)}</dd></dl>` : "",
    entry.because
      ? `<dl class="kv"><dt>because</dt><dd>${escapeHtml(entry.because)}</dd></dl>`
      : "",
    prose(entry.note),
    "</div></details>",
  ].join("\n");
}

function renderObligations(model: RunModel): string {
  const ledger = model.open_requirements;
  if (!ledger) return empty("this run carries no open-requirements ledger.");

  const counts = ledger.counts;
  const repair = ledger.topology_repair;
  const repairBlock = repair
    ? [
        `<p class="panel-sub">Topology repair: ${repair.escalations} escalation(s) against a cap of ${repair.cap}. Open blockers after each: ${repair.open_history.join(" → ") || "not recorded"}.</p>`,
        `<div class="meter"><span style="width:${Math.min(100, repair.cap ? (repair.escalations / repair.cap) * 100 : 0)}%"></span></div>`,
      ].join("")
    : "";

  const filters = ["surrendered", "open", "resolved"]
    .map(
      (value) =>
        `<button class="filter" type="button" data-filter="status" data-value="${escapeAttr(value)}" aria-pressed="false">${escapeHtml(value)}</button>`,
    )
    .join("");

  const entries = ledger.entries
    .slice()
    .sort(
      (a, b) =>
        (OBLIGATION_ORDER[a.status] ?? 3) - (OBLIGATION_ORDER[b.status] ?? 3) ||
        a.id.localeCompare(b.id),
    )
    .map(renderObligation)
    .join("\n");

  return [
    `<p class="lede">${counts.open} open, ${counts.resolved} resolved, ${counts.surrendered} surrendered, ${counts.dropped} deliberately dropped. ${counts.blocking_open} open entr${counts.blocking_open === 1 ? "y is" : "ies are"} blocking.</p>`,
    repairBlock,
    `<div class="controls" data-controls="obligation-rows">${filters}<input class="search" type="search" data-search placeholder="search obligations" aria-label="search obligations"><button class="filter" type="button" data-reset>reset</button><span class="section-tail" data-count></span></div>`,
    `<div id="obligation-rows">${entries || empty("the ledger is empty.")}</div>`,
  ].join("\n");
}

// ---- feedback --------------------------------------------------------------------------------

function renderFeedbackEntry(entry: FeedbackEntry): string {
  const subject = entry.subject_label
    ? link(entry.subject_href, entry.subject_label)
    : escapeHtml(entry.subject_locator ?? "unattributed");
  return [
    `<details class="panel" data-row data-severity="${escapeAttr(entry.severity ?? "unspecified")}" data-kind="${escapeAttr(entry.kind ?? "unspecified")}" data-status="${escapeAttr(entry.status ?? "open")}">`,
    `<summary><span class="panel-title">${escapeHtml(entry.id)}</span>${entry.severity ? badge(entry.severity) : ""}${entry.kind ? badge(entry.kind) : ""}<span class="panel-sub">${subject}</span></summary>`,
    `<div class="panel-body">`,
    prose(entry.what),
    entry.expected
      ? `<dl class="kv"><dt>expected</dt><dd>${escapeHtml(entry.expected)}</dd></dl>`
      : "",
    entry.evidence
      ? `<dl class="kv"><dt>evidence</dt><dd>${escapeHtml(entry.evidence)}</dd></dl>`
      : "",
    `<dl class="kv"><dt>raised by</dt><dd>${escapeHtml(entry.raised_by ?? "—")}${entry.raised_by_phase ? ` (phase ${entry.raised_by_phase})` : ""}</dd><dt>observed at</dt><dd class="mono">${escapeHtml(entry.observed_foundry_head?.slice(0, 12) ?? "—")}${entry.observed_revision ? ` rev ${entry.observed_revision}` : ""}</dd><dt>issue</dt><dd>${escapeHtml(entry.issue ?? "not filed")}</dd></dl>`,
    "</div></details>",
  ].join("\n");
}

function renderFeedback(model: RunModel): string {
  const ledger = model.feedback;
  if (!ledger) {
    return empty(
      "the run was not invoked with feedback mode, so nothing was recorded about the Foundry itself.",
    );
  }
  if (!ledger.entries.length) {
    return empty("feedback mode was on and no entries were appended.");
  }

  const severities = ["blocker", "major", "minor"];
  const filters = severities
    .map(
      (value) =>
        `<button class="filter" type="button" data-filter="severity" data-value="${escapeAttr(value)}" aria-pressed="false">${escapeHtml(value)}</button>`,
    )
    .join("");
  const kindFilters = Object.keys(ledger.counts.by_kind)
    .map(
      (value) =>
        `<button class="filter" type="button" data-filter="kind" data-value="${escapeAttr(value)}" aria-pressed="false">${escapeHtml(value)}</button>`,
    )
    .join("");

  const rank = (entry: FeedbackEntry): number => severities.indexOf(entry.severity ?? "minor");
  const entries = ledger.entries
    .slice()
    .sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id))
    .map(renderFeedbackEntry)
    .join("\n");

  return [
    `<p class="lede">${ledger.counts.total} entr${ledger.counts.total === 1 ? "y" : "ies"} about the Foundry's own assets. Triage them with the <code>report-foundry-run-feedback</code> skill rather than filing from here.</p>`,
    `<div class="controls" data-controls="feedback-rows">${filters}${kindFilters}<input class="search" type="search" data-search placeholder="search feedback" aria-label="search feedback"><button class="filter" type="button" data-reset>reset</button><span class="section-tail" data-count></span></div>`,
    `<div id="feedback-rows">${entries}</div>`,
  ].join("\n");
}

// ---- timeline --------------------------------------------------------------------------------

function renderGrowth(model: RunModel): string {
  const series = model.timeline?.size_series ?? [];
  if (!series.length) return "";
  const width = 720;
  const height = 140;
  const charts = series
    .map((entry) => {
      const maxBytes = Math.max(...entry.points.map((point) => point.bytes), 1);
      const step = entry.points.length > 1 ? width / (entry.points.length - 1) : width;
      const points = entry.points
        .map(
          (point, index) =>
            `${(index * step).toFixed(1)},${(height - (point.bytes / maxBytes) * height).toFixed(1)}`,
        )
        .join(" ");
      return [
        `<div class="growth">`,
        `<p class="panel-sub">${escapeHtml(entry.filename)} — ${entry.points.length} commits, ending at ${escapeHtml(humanBytes(entry.points[entry.points.length - 1]!.bytes))}.</p>`,
        `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="size of ${escapeAttr(entry.filename)} across commits" preserveAspectRatio="none">`,
        `<polyline fill="none" stroke="var(--brand)" stroke-width="2" points="${points}" />`,
        "</svg>",
        "</div>",
      ].join("");
    })
    .join("\n");
  return charts;
}

function renderTimeline(model: RunModel): string {
  const timeline = model.timeline;
  if (!timeline) {
    return empty(
      "no checkpoint history — re-run with --checkpoint to get a per-phase and per-iteration record.",
    );
  }
  const commits = timeline.commits
    .map((commit) => {
      const files = commit.files.length
        ? `${commit.files.length} file(s), +${commit.files.reduce((sum, file) => sum + file.added, 0)}/-${commit.files.reduce((sum, file) => sum + file.deleted, 0)}`
        : "no file changes";
      return [
        `<div class="commit" data-kind="${escapeAttr(commit.kind)}" data-failed="${commit.failed}">`,
        `<span class="commit-sha">${escapeHtml(commit.short)}</span>`,
        `<span class="commit-date">${escapeHtml(shortInstant(commit.date))}</span>`,
        `<span class="commit-subject">${escapeHtml(commit.subject)}</span>`,
        `<span class="stop-note">${escapeHtml(files)}</span>`,
        "</div>",
      ].join("");
    })
    .join("\n");

  return [
    `<p class="lede">${timeline.commit_count} checkpoint commit(s). Unrecognized and failed commits are kept — they are where a run's real story tends to be.</p>`,
    renderGrowth(model),
    `<div>${commits}</div>`,
  ].join("\n");
}

// ---- evaluation ------------------------------------------------------------------------------

function renderEvaluation(model: RunModel): string {
  const evaluation = model.evaluation;
  if (!evaluation) return "";

  const usage = Object.entries(evaluation.usage)
    .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(String(value))}</dd>`)
    .join("");

  const trials = evaluation.trials
    .map(
      (trial) =>
        `<tr${trial.trial === evaluation.selected_trial ? ' class="stop-furthest"' : ""}><td class="num">${trial.trial}</td><td>${badge(trial.status)}</td><td class="num">${trial.phase_count}</td><td class="num">${escapeHtml(String(trial.failed_phase ?? "—"))}</td></tr>`,
    )
    .join("");

  const body = [
    `<dl class="kv"><dt>engine</dt><dd>${escapeHtml(evaluation.engine.name)} · ${escapeHtml(evaluation.engine.provider)} · ${escapeHtml(evaluation.engine.model)}${evaluation.engine.thinking ? ` · thinking ${escapeHtml(evaluation.engine.thinking)}` : ""}</dd>`,
    `<dt>sandbox</dt><dd>${escapeHtml(evaluation.sandbox.mode)}, network ${escapeHtml(evaluation.sandbox.network_policy)}</dd>`,
    `<dt>duration</dt><dd>${escapeHtml((evaluation.duration_ms / 1000).toFixed(1))} s</dd></dl>`,
    usage ? `<p class="panel-sub">Usage</p><dl class="kv">${usage}</dl>` : "",
    `<table class="data-table"><thead><tr><th>trial</th><th>status</th><th>phases</th><th>failed at</th></tr></thead><tbody>${trials}</tbody></table>`,
  ].join("\n");

  return section("evaluation", "Evaluation", "what it cost and how it was run", body);
}

// ---- unmapped --------------------------------------------------------------------------------

const UNMAPPED_EXPLANATION: Record<string, string> = {
  "cross-pipeline":
    "declared by a different pipeline — either the detection is wrong or two runs were mixed",
  "sub-mold": "declared by a Mold a phase invokes internally rather than by a phase itself",
  "tool-output": "output of a tool the run drove, not an artifact any Mold declares",
  narrative: "written about the run rather than by it",
  directory: "summarized, never walked",
  undeclared: "no Mold declares this — should it be an output artifact?",
  derivative: "a copy kept aside before a change",
};

function renderUnmappedGroup(cls: string, files: UnmappedFile[]): string {
  const rows = files
    .map((file) => {
      const summary = file.dir_summary
        ? `${file.dir_summary.entry_count} file(s)`
        : escapeHtml(humanBytes(file.size_bytes));
      const owners = file.declared_by_pipelines.length
        ? file.declared_by_pipelines
        : file.declared_by_skills;
      const extra = owners.length ? escapeHtml(owners.join(", ")) : "—";
      return `<tr><td class="mono"><a href="${escapeAttr(`./${file.relpath}`)}">${escapeHtml(file.relpath)}</a></td><td class="num">${summary}</td><td class="num">${escapeHtml(shortInstant(file.mtime))}</td><td class="mono">${extra}</td></tr>`;
    })
    .join("");
  return [
    `<details class="panel"${cls === "cross-pipeline" ? " open" : ""}>`,
    `<summary><span class="panel-title">${escapeHtml(cls)}</span><span class="panel-sub">${files.length} — ${escapeHtml(UNMAPPED_EXPLANATION[cls] ?? "")}</span></summary>`,
    `<div class="panel-body"><table class="data-table"><thead><tr><th>path</th><th>size</th><th>modified</th><th>declared by</th></tr></thead><tbody>${rows}</tbody></table></div>`,
    "</details>",
  ].join("\n");
}

function renderUnmapped(model: RunModel): string {
  if (!model.unmapped.length) {
    return empty(
      `every file in this run is a declared artifact. ${model.ignored_count} path(s) ignored.`,
    );
  }
  const groups = new Map<string, UnmappedFile[]>();
  for (const file of model.unmapped) {
    const list = groups.get(file.class) ?? [];
    list.push(file);
    groups.set(file.class, list);
  }
  const order = [
    "cross-pipeline",
    "sub-mold",
    "tool-output",
    "narrative",
    "directory",
    "undeclared",
  ];
  const blocks = order
    .filter((cls) => groups.has(cls))
    .map((cls) => renderUnmappedGroup(cls, groups.get(cls)!))
    .join("\n");
  return [
    `<p class="lede">${model.health.files_attributed} of ${model.health.files_seen} files map to a declared artifact. The rest are below. ${model.ignored_count} path(s) were ignored entirely.</p>`,
    blocks,
  ].join("\n");
}

// ---- page ------------------------------------------------------------------------------------

export function renderRunDashboard(model: RunModel, options: RenderOptions): string {
  const title = `${model.run.slug} — ${model.run.pipeline}`;

  const warnings = model.warnings.length
    ? [
        `<details class="panel"><summary><span class="panel-title">${model.warnings.length} reader warning(s)</span></summary><div class="panel-body"><ul>`,
        ...model.warnings.map(
          (warning) =>
            `<li><code>${escapeHtml(warning.code)}</code> — ${escapeHtml(warning.message)}</li>`,
        ),
        "</ul></div></details>",
      ].join("")
    : "";

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    // Enforced rather than asserted: the page loads nothing over a network, ever.
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'">`,
    `<title>${escapeHtml(title)}</title>`,
    `<style>${DASHBOARD_CSS}</style>`,
    "</head>",
    "<body>",
    `<!-- ${GENERATOR_MARKER} -->`,
    '<div class="wrap">',
    renderHeader(model, options),
    renderHealth(model),
    section("phases", "Phases", "where the run got to", renderPhases(model)),
    section(
      "artifacts",
      "Artifacts",
      "what it declared and what is on disk",
      renderArtifacts(model),
    ),
    section("obligations", "Obligations", "what the workflow still owes", renderObligations(model)),
    section(
      "feedback",
      "Foundry feedback",
      "what the run showed to be wrong with the Foundry",
      renderFeedback(model),
    ),
    model.evaluation
      ? renderEvaluation(model)
      : section("timeline", "Timeline", "how the draft grew", renderTimeline(model)),
    section("unmapped", "Everything else", "files no Mold declares", renderUnmapped(model)),
    `<footer class="page-foot">`,
    warnings,
    `<p class="mono">${escapeHtml(options.commandLine)}</p>`,
    `<p>run manifest schema v${model.run_manifest_schema_version} · generated ${escapeHtml(shortInstant(model.generated_at))} · Foundry ${escapeHtml(model.generator.foundry_head?.slice(0, 12) ?? "unknown")} · build-cli ${escapeHtml(model.generator.package_version)}</p>`,
    "</footer>",
    "</div>",
    `<script type="application/json" id="run-manifest">${jsonScriptBody(options.manifestJson)}</script>`,
    `<script>${DASHBOARD_JS}</script>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}
