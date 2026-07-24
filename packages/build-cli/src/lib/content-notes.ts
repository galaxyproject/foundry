import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readMarkdown } from "./frontmatter.js";
import { fileSlug, findMdFiles } from "./walk.js";

export interface ContentNote {
  path: string;
  relPath: string;
  slug: string;
  title: string;
  summary: string;
  status: string;
  revised: string;
  revision: number;
  type: string;
  tags: string[];
}

export interface DashboardSection {
  label: string;
  type: string;
}

export function loadContentNotes(contentRoot = "content"): ContentNote[] {
  const notes: ContentNote[] = [];
  for (const filePath of findMdFiles(contentRoot)) {
    const parsed = readMarkdown(filePath);
    if (!parsed.hasFrontmatter) continue;
    const meta = parsed.meta;
    const type = stringValue(meta.type);
    const tags = arrayOfStrings(meta.tags);
    if (!type || tags.length === 0) continue;
    const slug = fileSlug(filePath);
    notes.push({
      path: filePath,
      relPath: path.relative(contentRoot, filePath),
      slug,
      title: noteTitle(meta, slug),
      summary: stringValue(meta.summary) || "",
      status: stringValue(meta.status) || "draft",
      revised: stringValue(meta.revised) || "0000-00-00",
      revision: numberValue(meta.revision) ?? 1,
      type,
      tags,
    });
  }
  return notes;
}

export function loadDashboardSections(filePath = "dashboard_sections.json"): DashboardSection[] {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const label = stringValue(record.label);
    const type = stringValue(record.type);
    return label && type ? [{ label, type }] : [];
  });
}

export function sortByRevisedDesc(notes: ContentNote[]): ContentNote[] {
  return [...notes].sort((a, b) => {
    const dateCmp = b.revised.localeCompare(a.revised);
    if (dateCmp !== 0) return dateCmp;
    return a.slug.localeCompare(b.slug);
  });
}

export function sortByTitle(notes: ContentNote[]): ContentNote[] {
  return [...notes].sort((a, b) => a.title.localeCompare(b.title) || a.slug.localeCompare(b.slug));
}

export function wikiLink(note: ContentNote): string {
  return `[[${note.slug}]]`;
}

export function writeOrCheck(filePath: string, content: string, check: boolean): void {
  const normalized = content.endsWith("\n") ? content : `${content}\n`;
  if (check) {
    let existing = "";
    try {
      existing = readFileSync(filePath, "utf8");
    } catch {
      process.stderr.write(`${filePath} is missing\n`);
      process.exit(1);
    }
    if (existing !== normalized) {
      process.stderr.write(`${filePath} is out of date; run generator without --check\n`);
      process.exit(1);
    }
    return;
  }
  writeFileSync(filePath, normalized);
}

export function markdownTable(rows: string[][]): string {
  if (rows.length === 0) return "";
  const header = rows[0] ?? [];
  const sep = header.map(() => "---");
  return [header, sep, ...rows.slice(1)]
    .map((row) => `| ${row.map(escapeTableCell).join(" | ")} |`)
    .join("\n");
}

function noteTitle(meta: Record<string, unknown>, slug: string): string {
  return stringValue(meta.title) || stringValue(meta.name) || titleFromSlug(slug);
}

function titleFromSlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
