import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { buildRunModel, serializeRunManifest } from "../src/lib/run-manifest.js";
import { buildPipelineIndex, type PipelineIndex } from "../src/lib/run-reconstruct.js";
import { createSiteLinker } from "../src/lib/run-links.js";
import type { SiteLinker } from "../src/lib/run-manifest.js";
import type { RunModel, UnmappedFile } from "../src/lib/run-model.js";
import { DASHBOARD_CSS, DASHBOARD_JS } from "../src/render/run-dashboard-assets.js";
import { renderRunDashboard, type RenderOptions } from "../src/render/run-dashboard-html.js";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const TINY = path.join(REPO_ROOT, "packages/build-cli/test/fixtures/runs/tiny-nextflow-run");
const SITE_BASE = "https://galaxyproject.github.io/foundry";

let index: PipelineIndex;
beforeAll(() => {
  index = buildPipelineIndex(REPO_ROOT);
});

function linker(base = SITE_BASE): SiteLinker {
  return createSiteLinker({ repoRoot: REPO_ROOT, base });
}

function tinyModel(): RunModel {
  return buildRunModel({
    runDir: TINY,
    repoRoot: REPO_ROOT,
    pipelineIndex: index,
    now: () => new Date("2026-09-18T12:00:00.000Z"),
    linker: linker(),
  });
}

function render(model: RunModel, options: Partial<RenderOptions> = {}): string {
  return renderRunDashboard(model, {
    manifestJson: serializeRunManifest(model),
    commandLine: "foundry-build run-dashboard tiny-nextflow-run",
    ...options,
  });
}

function manifestBody(html: string): string {
  const open = '<script type="application/json" id="run-manifest">';
  const start = html.indexOf(open) + open.length;
  return html.slice(start, html.indexOf("</script>", start));
}

/** The page a reader sees, without the embedded manifest that repeats every value. */
function withoutManifest(html: string): string {
  return html.slice(0, html.indexOf('<script type="application/json"'));
}

function unmappedFile(overrides: Partial<UnmappedFile>): UnmappedFile {
  return {
    relpath: "notes.log",
    class: "narrative",
    size_bytes: 12,
    mtime: "2026-09-18T12:00:00.000Z",
    sha256: null,
    attached_to: null,
    declared_by_pipelines: [],
    declared_by_skills: [],
    dir_summary: null,
    preview: null,
    ...overrides,
  };
}

describe("embedded manifest", () => {
  it("survives a value that would put the HTML parser into a script-escape state", () => {
    const model = tinyModel();
    model.open_requirements!.entries[0]!.note = "<!--<script> & </script> \u2028 -->";
    const manifest = serializeRunManifest(model);
    const html = render(model, { manifestJson: manifest });
    const body = manifestBody(html);
    expect(body).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(body)).toEqual(JSON.parse(manifest));
    expect(html.match(/<script/g)).toHaveLength(2);
  });
});

describe("banners", () => {
  const DRIFT = "The harness changed since this run.";

  it("claim drift only when the recorded assembly differs from the checkout", () => {
    const model = tinyModel();
    model.run.assembly_matches_checkout = null;
    expect(render(model)).not.toContain(DRIFT);
    model.run.assembly_matches_checkout = true;
    expect(render(model)).not.toContain(DRIFT);
    model.run.assembly_matches_checkout = false;
    expect(render(model)).toContain(DRIFT);
  });

  it("say a record on disk could not be read, rather than that there is none", () => {
    const model = tinyModel();
    model.run.provenance = "reconstructed";
    expect(render(model)).toContain("carries no <code>foundry-run.yml</code>");
    model.warnings.push({
      code: "run-record-unparseable",
      message: "foundry-run.yml: bad indentation",
      subject: "foundry-run.yml",
    });
    const html = withoutManifest(render(model));
    expect(html).not.toContain("carries no <code>foundry-run.yml</code>");
    expect(html).toContain("could not be read");
  });

  it("raise a stated-pipeline disagreement to the top of the page", () => {
    const model = tinyModel();
    model.warnings.push({
      code: "pipeline-sources-disagree",
      message: "foundry-run.yml says nextflow-to-galaxy, the feedback ledger says nextflow-to-cwl",
    });
    expect(withoutManifest(render(model))).toContain(
      "<strong>Sources disagree.</strong> foundry-run.yml says nextflow-to-galaxy",
    );
  });
});

describe("phase stops", () => {
  it("filter artifacts by an exact phase attribute, not by searching text", () => {
    const model = tinyModel();
    const html = render(model);
    for (const phase of model.phases) {
      expect(html).toContain(`data-phase-filter="${phase.n}"`);
    }
    const rows = html.match(/<tr data-row[^>]*>/g) ?? [];
    expect(rows.length).toBe(model.artifacts.length);
    for (const row of rows) expect(row).toMatch(/ data-phase="(\d+|none)"/);
    expect(html).toContain('data-filter="phase"');
  });

  it("names every status source in words", () => {
    const model = tinyModel();
    model.phases[0]!.status_source = "artifact-presence";
    expect(render(model)).toContain("from artifact presence");
  });
});

describe("file links", () => {
  it("are relative to the run directory when the page is written beside it", () => {
    const model = tinyModel();
    const html = render(model, { runDir: TINY, outDir: TINY });
    expect(html).toContain('href="./galaxy-workflow-draft.gxwf.yml"');
  });

  it("climb back to the run directory when --out writes the page elsewhere", () => {
    const model = tinyModel();
    const outDir = mkdtempSync(path.join(tmpdir(), "run-dashboard-out-"));
    const html = render(model, { runDir: TINY, outDir });
    const relative = path.relative(outDir, TINY).split(path.sep).join("/");
    expect(html).toContain(`href="${relative}/galaxy-workflow-draft.gxwf.yml"`);
    expect(html).not.toContain('href="./galaxy-workflow-draft.gxwf.yml"');
  });

  it("encode each path segment", () => {
    const model = tinyModel();
    const artifact = model.artifacts.find((entry) => entry.path)!;
    artifact.path = "sub dir/we#ird?na me.log";
    model.unmapped.push(unmappedFile({ relpath: "odd/a&b #1.txt" }));
    const html = render(model, { runDir: TINY, outDir: TINY });
    expect(html).toContain('href="./sub%20dir/we%23ird%3Fna%20me.log"');
    expect(html).toContain('href="./odd/a%26b%20%231.txt"');
  });
});

describe("artifact validation", () => {
  it("shows the check's result with links to its output, relative to where the page is", () => {
    const model = tinyModel();
    const artifact = model.artifacts.find((entry) => entry.path)!;
    artifact.presence = "failed";
    artifact.validation = {
      validator: "gxwf-lint",
      status: "failed",
      exit_code: 3,
      stdout: "phases/02/stdout.log",
      stderr: "phases/02/std err.log",
    };
    const outDir = mkdtempSync(path.join(tmpdir(), "run-dashboard-out-"));
    const html = withoutManifest(render(model, { runDir: TINY, outDir }));
    const up = path.relative(outDir, TINY).split(path.sep).join("/");
    const panel = html.slice(html.indexOf(`id="artifact-${artifact.id}"`));
    expect(panel).toContain("gxwf-lint");
    expect(panel).toContain("exit 3");
    expect(panel).toContain(`href="${up}/phases/02/stdout.log"`);
    expect(panel).toContain(`href="${up}/phases/02/std%20err.log"`);
    expect(html).toMatch(/<span class="badge" data-v="failed" data-state="error">failed<\/span>/);
  });
});

describe("pipeline link", () => {
  it("comes from the site linker", () => {
    const html = render(tinyModel(), { linker: linker(`${SITE_BASE}/`) });
    expect(html).toContain(`<a href="${SITE_BASE}/pipelines/nextflow-to-galaxy/">`);
  });

  it("encodes the slug and normalizes the base", () => {
    const root = mkdtempSync(path.join(tmpdir(), "run-dashboard-links-"));
    mkdirSync(path.join(root, "content/pipelines/a b#c"), { recursive: true });
    writeFileSync(path.join(root, "content/pipelines/a b#c/index.md"), "");
    const site = createSiteLinker({ repoRoot: root, base: "https://example.org/x//" });
    expect(site.pipeline("a b#c")).toBe("https://example.org/x/pipelines/a%20b%23c/");
    expect(site.pipeline("absent")).toBeNull();
  });

  it("is plain text when the linker has nothing for it", () => {
    const html = render(tinyModel(), { linker: linker("") });
    expect(html).not.toContain("/pipelines/nextflow-to-galaxy/");
  });
});

describe("without scripting", () => {
  it("shows every tab panel and hides only the controls that need a script", () => {
    const html = render(tinyModel());
    expect(html).toMatch(/class="tabpanel"/);
    expect(html).not.toMatch(/<div[^>]*class="tabpanel"[^>]*hidden/);
    for (const tag of html.match(/<div class="(?:controls|tabs)[^"]*"[^>]*>/g) ?? []) {
      expect(tag).toContain("js-only");
    }
    expect(DASHBOARD_CSS).toContain("html:not(.js) .js-only");
    expect(DASHBOARD_JS).toContain('document.documentElement.classList.add("js")');
  });

  it("ships a script that parses", () => {
    expect(() => new Function(DASHBOARD_JS)).not.toThrow();
  });
});

describe("unmapped files", () => {
  it("show their preview, collapsed", () => {
    const model = tinyModel();
    model.unmapped.push(
      unmappedFile({
        preview: {
          mode: "text",
          embedded: true,
          truncated: false,
          bytes_embedded: 20,
          body: "an unmapped log body",
          outline: null,
          derived: null,
          skip_reason: null,
        },
      }),
    );
    const html = render(model);
    const at = html.indexOf("an unmapped log body");
    expect(at).toBeGreaterThan(-1);
    const panel = html.lastIndexOf("<details", at);
    expect(html.slice(panel, html.indexOf(">", panel))).not.toContain(" open");
  });

  it("render a class that has no place in the usual order", () => {
    const model = tinyModel();
    model.unmapped.push(unmappedFile({ relpath: "draft.yml.bak", class: "derivative" }));
    expect(withoutManifest(render(model))).toContain("draft.yml.bak");
  });
});

describe("ledgers", () => {
  it("say a ledger on disk could not be read, rather than calling it empty", () => {
    const model = tinyModel();
    model.open_requirements = {
      ...model.open_requirements!,
      unreadable: "bad indentation at line 3",
      entries: [],
    };
    model.feedback = { ...model.feedback!, unreadable: "not a mapping", entries: [] };
    const html = withoutManifest(render(model));
    expect(html).toContain("bad indentation at line 3");
    expect(html).toContain("not a mapping");
    expect(html).not.toContain("the ledger is empty.");
    expect(html).not.toContain("no entries were appended");
  });
});

describe("layout and theme", () => {
  it("scrolls wide tables inside their own box", () => {
    const html = render(tinyModel());
    const tables = html.match(/<table/g)?.length ?? 0;
    expect(tables).toBeGreaterThan(0);
    expect(html.match(/<div class="table-scroll"><table/g)?.length).toBe(tables);
    expect(DASHBOARD_CSS).toMatch(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/);
  });

  it("declares both color schemes", () => {
    expect(DASHBOARD_CSS).toContain("color-scheme: light dark");
  });

  it("keeps the light warning color at AA contrast on the page surfaces", () => {
    const warn = /:root\s*\{[^}]*--warn:\s*(#[0-9a-f]{6})/i.exec(DASHBOARD_CSS)![1]!;
    expect(contrast(warn, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(warn, "#f6f7f9")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("accessibility", () => {
  it("marks preview tabs up as a tab list", () => {
    const html = render(tinyModel());
    const tabs = html.match(/<button[^>]*role="tab"[^>]*>/g) ?? [];
    expect(tabs.length).toBeGreaterThan(0);
    expect(html).toContain('role="tablist"');
    for (const tab of tabs) {
      const controls = /aria-controls="([^"]+)"/.exec(tab)![1]!;
      expect(html).toMatch(new RegExp(`id="${controls}" role="tabpanel"`));
    }
  });

  it("reports sort order on the header that was sorted", () => {
    expect(DASHBOARD_JS).toContain("aria-sort");
  });
});

function contrast(foreground: string, background: string): number {
  const luminance = (hex: string): number => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light! + 0.05) / (dark! + 0.05);
}
