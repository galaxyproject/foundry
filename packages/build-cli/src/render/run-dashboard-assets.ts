// The dashboard's inline stylesheet and script.
//
// Both are plain strings inlined into the page. The dashboard is opened from a `file://` URL, so
// there is no origin to fetch from and no build step to run; everything it needs has to be in the
// one file. The palette and the component vocabulary are ported by hand from the Foundry site's
// tokens rather than imported, because importing would mean shipping a Tailwind build to style
// about thirty classes.

export const DASHBOARD_CSS = `
:root {
  --brand: #25537b;
  --chrome: #2c3143;
  --accent: #e8c547;
  --surface: #ffffff;
  --surface-raised: #f6f7f9;
  --surface-hover: #eef1f5;
  --text: #1a1d23;
  --text-secondary: #4a5160;
  --text-muted: #6b7280;
  --border: #d9dee6;
  --border-subtle: #e8ebf0;
  --link: #25537b;
  --rail: #b7c3d2;
  --ok: #18794e;
  --warn: #b7791f;
  --error: #c53030;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  --sans: system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --brand: #6fa5d4;
    --chrome: #161b22;
    --surface: #0d1117;
    --surface-raised: #161b22;
    --surface-hover: #1c232c;
    --text: #e6edf3;
    --text-secondary: #b3bdc9;
    --text-muted: #8b949e;
    --border: #2b323c;
    --border-subtle: #21262d;
    --link: #6fa5d4;
    --rail: #3d4552;
    --ok: #4ac07f;
    --warn: #e0b341;
    --error: #f2777a;
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--surface);
  color: var(--text);
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.55;
}

.wrap { max-width: 1180px; margin: 0 auto; padding: 32px 16px 96px; }

a { color: var(--link); }
a:hover { text-decoration: underline; }
code, pre, .mono { font-family: var(--mono); }

/* ---- header ---- */

.page-head { border-bottom: 1px solid var(--border); padding-bottom: 20px; margin-bottom: 24px; }
.eyebrow {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 6px;
}
h1 { font-size: 26px; margin: 0 0 8px; font-weight: 650; }
h2 { font-size: 18px; margin: 0; font-weight: 620; }
.lede { color: var(--text-secondary); margin: 0; max-width: 72ch; }

.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.chip {
  font-family: var(--mono);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  color: var(--text-secondary);
}
.chip-accent { border-color: var(--brand); color: var(--brand); }
.chip-warn { border-color: var(--warn); color: var(--warn); }

.banner {
  border: 1px solid var(--warn);
  border-left-width: 4px;
  background: color-mix(in srgb, var(--warn) 8%, transparent);
  padding: 10px 14px;
  border-radius: 4px;
  margin: 16px 0;
}
.banner-error { border-color: var(--error); background: color-mix(in srgb, var(--error) 8%, transparent); }
.banner p { margin: 4px 0; }

/* ---- sections ---- */

section { margin: 40px 0 0; scroll-margin-top: 16px; }
.section-rule {
  display: flex;
  align-items: baseline;
  gap: 10px;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 6px;
  margin-bottom: 16px;
}
.section-tail { font-family: var(--mono); font-size: 12px; color: var(--text-muted); }
.empty { color: var(--text-muted); font-style: italic; }

/* ---- health tiles ---- */

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin: 0;
}
.tile {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px 12px;
  background: var(--surface-raised);
  display: block;
  text-decoration: none;
  color: inherit;
}
.tile:hover { background: var(--surface-hover); text-decoration: none; }
.tile-label {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.tile-value { font-family: var(--mono); font-size: 19px; margin: 2px 0; }
.tile-detail { font-size: 12px; color: var(--text-secondary); }
.tile[data-state="ok"] { border-left: 3px solid var(--ok); }
.tile[data-state="warn"] { border-left: 3px solid var(--warn); }
.tile[data-state="error"] { border-left: 3px solid var(--error); }

/* ---- subway map ---- */

.subway { list-style: none; margin: 0; padding: 0 0 0 28px; position: relative; }
.subway::before {
  content: "";
  position: absolute;
  left: 9px;
  top: 10px;
  bottom: 10px;
  width: 2px;
  background: var(--rail);
}
.stop { position: relative; padding: 7px 0 7px 6px; display: flex; gap: 10px; align-items: baseline; }
.stop-marker {
  position: absolute;
  left: -24px;
  top: 12px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--surface);
  border: 2px solid var(--rail);
}
.stop-branch .stop-marker { border-radius: 2px; transform: rotate(45deg); }
.stop[data-status="done"] .stop-marker { background: var(--ok); border-color: var(--ok); }
.stop[data-status="failed"] .stop-marker { background: var(--error); border-color: var(--error); }
.stop[data-status="running"] .stop-marker { background: var(--warn); border-color: var(--warn); }
.stop.stop-furthest .stop-marker { box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 55%, transparent); }
.stop-num { font-family: var(--mono); font-size: 12px; color: var(--text-muted); min-width: 22px; }
.stop-name { font-weight: 560; }
.stop-tag {
  font-family: var(--mono);
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}
.stop-note { font-size: 12px; color: var(--text-muted); }

/* ---- tables ---- */

.data-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.data-table th {
  text-align: left;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  padding: 6px 8px 6px 0;
  white-space: nowrap;
}
.data-table td { border-bottom: 1px solid var(--border-subtle); padding: 6px 8px 6px 0; vertical-align: top; }
.data-table tbody tr:hover { background: var(--surface-hover); }
.data-table .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.sortable { cursor: pointer; user-select: none; }
.sortable::after { content: " ⇅"; opacity: 0.35; }

.badge {
  font-family: var(--mono);
  font-size: 10.5px;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid var(--border);
  white-space: nowrap;
}
.badge[data-state="ok"], .badge[data-v="present"], .badge[data-v="done"], .badge[data-v="resolved"], .badge[data-v="complete"] {
  border-color: var(--ok); color: var(--ok);
}
.badge[data-state="error"], .badge[data-v="missing"], .badge[data-v="failed"], .badge[data-v="blocker"] {
  border-color: var(--error); color: var(--error);
}
.badge[data-state="warn"], .badge[data-v="running"], .badge[data-v="open"], .badge[data-v="surrendered"], .badge[data-v="major"] {
  border-color: var(--warn); color: var(--warn);
}

/* ---- filters ---- */

.controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.filter {
  font-family: var(--mono);
  font-size: 11.5px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  color: var(--text-secondary);
  cursor: pointer;
}
.filter[aria-pressed="true"] { background: var(--brand); border-color: var(--brand); color: #fff; }
.search {
  font-family: var(--mono);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  min-width: 200px;
}
.hidden-row { display: none; }

/* ---- detail panels ---- */

details.panel {
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  margin: 8px 0;
  background: var(--surface-raised);
}
details.panel > summary {
  cursor: pointer;
  padding: 8px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
}
details.panel > summary::-webkit-details-marker { display: none; }
details.panel > summary::before { content: "▸"; color: var(--text-muted); margin-right: 4px; }
details.panel[open] > summary::before { content: "▾"; }
.panel-body { padding: 0 12px 12px; }
.panel-title { font-family: var(--mono); font-weight: 600; }
.panel-sub { font-size: 12px; color: var(--text-muted); }

.tabs { display: flex; gap: 4px; margin: 10px 0 8px; flex-wrap: wrap; }
.tab {
  font-family: var(--mono);
  font-size: 11.5px;
  padding: 3px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
}
.tab[aria-selected="true"] { background: var(--brand); border-color: var(--brand); color: #fff; }
.tabpanel[hidden] { display: none; }

pre.source {
  margin: 0;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  overflow: auto;
  max-height: 460px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.kv { display: grid; grid-template-columns: max-content 1fr; gap: 2px 14px; font-size: 13px; margin: 0; }
.kv dt { font-family: var(--mono); font-size: 11.5px; color: var(--text-muted); }
.kv dd { margin: 0; }

.outline { margin: 0; padding-left: 18px; font-size: 13px; color: var(--text-secondary); }
.outline li[data-depth="1"] { font-weight: 600; color: var(--text); }
.outline li[data-depth="3"], .outline li[data-depth="4"] { color: var(--text-muted); }

.prose-block { white-space: pre-wrap; margin: 4px 0; }

/* ---- timeline ---- */

.commit { display: flex; gap: 10px; align-items: baseline; padding: 3px 0; font-size: 13px; }
.commit-sha { font-family: var(--mono); font-size: 11.5px; color: var(--text-muted); }
.commit-date { font-family: var(--mono); font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.commit[data-kind="ad-hoc"] .commit-subject { color: var(--text-muted); font-style: italic; }
.commit[data-failed="true"] .commit-subject { color: var(--error); }
.growth { border: 1px solid var(--border-subtle); border-radius: 6px; padding: 10px; background: var(--surface-raised); }
.growth svg { display: block; width: 100%; height: auto; }

.meter { height: 8px; border-radius: 999px; background: var(--border-subtle); overflow: hidden; margin: 6px 0; }
.meter > span { display: block; height: 100%; background: var(--warn); }

footer.page-foot {
  margin-top: 56px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .wrap { padding: 20px 16px 72px; }
  .data-table { font-size: 12.5px; }
  h1 { font-size: 21px; }
}
`;

/**
 * Filtering, sorting, tabs and copy buttons.
 *
 * Every one of these is an enhancement: filters start in the show-everything state, expandables
 * are native `details`, and every anchor is a real fragment link — so with scripting off the page
 * is fully readable, just unfiltered. Nothing here renders content or assigns markup from data.
 */
export const DASHBOARD_JS = `
(function () {
  "use strict";

  function rows(scope) {
    return Array.prototype.slice.call(scope.querySelectorAll("[data-row]"));
  }

  function applyFilters(group) {
    var active = {};
    group.querySelectorAll("[data-filter]").forEach(function (button) {
      if (button.getAttribute("aria-pressed") !== "true") return;
      var key = button.getAttribute("data-filter");
      (active[key] = active[key] || []).push(button.getAttribute("data-value"));
    });
    var search = group.querySelector("[data-search]");
    var needle = search ? search.value.trim().toLowerCase() : "";
    var target = document.getElementById(group.getAttribute("data-controls"));
    if (!target) return;
    var shown = 0;
    rows(target).forEach(function (row) {
      var visible = true;
      Object.keys(active).forEach(function (key) {
        if (active[key].indexOf(row.getAttribute("data-" + key)) === -1) visible = false;
      });
      if (visible && needle) visible = (row.textContent || "").toLowerCase().indexOf(needle) !== -1;
      row.classList.toggle("hidden-row", !visible);
      if (visible) shown += 1;
    });
    var count = group.querySelector("[data-count]");
    if (count) count.textContent = shown + " of " + rows(target).length;
  }

  document.querySelectorAll("[data-controls]").forEach(function (group) {
    group.querySelectorAll("[data-filter]").forEach(function (button) {
      button.addEventListener("click", function () {
        var pressed = button.getAttribute("aria-pressed") === "true";
        button.setAttribute("aria-pressed", pressed ? "false" : "true");
        applyFilters(group);
      });
    });
    var search = group.querySelector("[data-search]");
    if (search) search.addEventListener("input", function () { applyFilters(group); });
    var reset = group.querySelector("[data-reset]");
    if (reset) {
      reset.addEventListener("click", function () {
        group.querySelectorAll("[data-filter]").forEach(function (button) {
          button.setAttribute("aria-pressed", "false");
        });
        if (search) search.value = "";
        applyFilters(group);
      });
    }
  });

  document.querySelectorAll("table[data-sortable]").forEach(function (table) {
    var body = table.tBodies[0];
    if (!body) return;
    table.querySelectorAll("th[data-sort]").forEach(function (header, column) {
      header.classList.add("sortable");
      header.setAttribute("tabindex", "0");
      var descending = false;
      function sort() {
        descending = !descending;
        var numeric = header.getAttribute("data-sort") === "number";
        var ordered = Array.prototype.slice.call(body.rows).sort(function (a, b) {
          var left = a.cells[column] ? a.cells[column].getAttribute("data-value") || a.cells[column].textContent : "";
          var right = b.cells[column] ? b.cells[column].getAttribute("data-value") || b.cells[column].textContent : "";
          var result = numeric
            ? (parseFloat(left) || 0) - (parseFloat(right) || 0)
            : String(left).localeCompare(String(right));
          return descending ? -result : result;
        });
        ordered.forEach(function (row) { body.appendChild(row); });
      }
      header.addEventListener("click", sort);
      header.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); sort(); }
      });
    });
  });

  document.querySelectorAll("[data-tabs]").forEach(function (group) {
    var tabs = Array.prototype.slice.call(group.querySelectorAll("[data-tab]"));
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (other) {
          var selected = other === tab;
          other.setAttribute("aria-selected", selected ? "true" : "false");
          var panel = document.getElementById(other.getAttribute("data-tab"));
          if (panel) panel.hidden = !selected;
        });
      });
    });
  });

  document.querySelectorAll("[data-toggle-all]").forEach(function (button) {
    button.addEventListener("click", function () {
      var target = document.getElementById(button.getAttribute("data-toggle-all"));
      if (!target) return;
      var panels = Array.prototype.slice.call(target.querySelectorAll("details"));
      var opening = panels.some(function (panel) { return !panel.open; });
      panels.forEach(function (panel) { panel.open = opening; });
      button.textContent = opening ? "collapse all" : "expand all";
    });
  });

  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      var text = button.getAttribute("data-copy");
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(function () {
        var original = button.textContent;
        button.textContent = "copied";
        setTimeout(function () { button.textContent = original; }, 1200);
      });
    });
  });

  document.querySelectorAll("[data-phase-filter]").forEach(function (stop) {
    stop.addEventListener("click", function () {
      var phase = stop.getAttribute("data-phase-filter");
      var group = document.querySelector('[data-controls="artifact-rows"]');
      if (!group) return;
      var search = group.querySelector("[data-search]");
      if (search) { search.value = "phase " + phase; search.dispatchEvent(new Event("input")); }
      var section = document.getElementById("artifacts");
      if (section) section.scrollIntoView({ behavior: "smooth" });
    });
  });
})();
`;
