import { fromMarkdown } from "mdast-util-from-markdown";
import { toString } from "mdast-util-to-string";
import type { SchemaDiagnostic, SchemaValidationResult } from "./lib/validator.js";

export interface MarkdownSectionSchema {
  heading: string;
  match?: "exact" | "prefix" | "word-prefix";
  requireSuffix?: boolean;
  min?: number;
  max?: number;
  content?: boolean;
  sections?: readonly MarkdownSectionSchema[];
  messages?: { missing?: string; excess?: string };
}

export interface MarkdownDocumentSchema {
  name: string;
  title?: "required";
  caseSensitive?: boolean;
  sections: readonly MarkdownSectionSchema[];
}

export interface MarkdownSection {
  heading: string;
  line: number;
  body: string;
  sections: MarkdownSection[];
}

export interface MarkdownDocument {
  title: string;
  sections: MarkdownSection[];
}

type Node = ReturnType<typeof fromMarkdown>["children"][number];
const normalize = (heading: string): string => heading.trim().replace(/\s+/g, " ");

function sections(
  markdown: string,
  nodes: Node[],
  depth: number,
  boundary = markdown.length,
): MarkdownSection[] {
  return nodes.flatMap((node, index) => {
    if (node.type !== "heading" || node.depth !== depth) return [];
    const next = nodes.findIndex(
      (candidate, candidateIndex) =>
        candidateIndex > index && candidate.type === "heading" && candidate.depth <= depth,
    );
    const end = next === -1 ? nodes.length : next;
    const endOffset = nodes[end]?.position?.start.offset ?? boundary;
    return [
      {
        heading: toString(node),
        line: node.position!.start.line,
        body: markdown.slice(node.position!.end.offset!, endOffset).trim(),
        sections: sections(markdown, nodes.slice(index + 1, end), depth + 1, endOffset),
      },
    ];
  });
}

export function parseMarkdownDocument(markdown: string): MarkdownDocument {
  const nodes = fromMarkdown(markdown).children;
  const title = nodes.find((node) => node.type === "heading" && node.depth === 1);
  return { title: title ? toString(title) : "", sections: sections(markdown, nodes, 2) };
}

function hasContent(markdown: string): boolean {
  return fromMarkdown(markdown).children.some((node) => {
    if (node.type === "heading" || node.type === "thematicBreak") return false;
    if (node.type === "html") return node.value.replace(/<!--[\s\S]*?-->/g, "").trim().length > 0;
    return toString(node, { includeHtml: false }).trim().length > 0;
  });
}

export function matchesMarkdownHeading(
  heading: string,
  rule: MarkdownSectionSchema,
  caseSensitive = false,
): boolean {
  const normalized = normalize(heading);
  const expected = normalize(rule.heading);
  const actual = caseSensitive ? normalized : normalized.toLowerCase();
  const target = caseSensitive ? expected : expected.toLowerCase();
  if (!rule.match || rule.match === "exact") return actual === target;
  if (!actual.startsWith(target)) return false;
  const suffix = actual.slice(target.length);
  if (rule.requireSuffix && !suffix.trim()) return false;
  return rule.match !== "word-prefix" || !/^\w/.test(suffix);
}

export function validateMarkdownDocument(
  data: unknown,
  schema: MarkdownDocumentSchema,
): SchemaValidationResult {
  const errors: SchemaDiagnostic[] = [];
  const report = (
    path: string,
    message: string,
    keyword: string,
    params: Record<string, unknown> = {},
  ): void => {
    errors.push({ path, message, keyword, params });
  };
  if (typeof data !== "string") {
    report("document", `${schema.name} must be Markdown text`, "type");
    return { valid: false, errors };
  }
  if (schema.title === "required") {
    const nodes = fromMarkdown(data).children;
    const titles = nodes.filter((node) => node.type === "heading" && node.depth === 1);
    const firstHeading = nodes.find((node) => node.type === "heading");
    if (titles.length !== 1 || !toString(titles[0]).trim() || firstHeading !== titles[0]) {
      report(
        "document",
        "Expected one nonempty level-one document title before the sections",
        "title",
      );
    }
  }
  const check = (
    siblings: MarkdownSection[],
    rules: readonly MarkdownSectionSchema[],
    level: number,
    parent?: MarkdownSection,
  ): void => {
    for (const rule of rules) {
      const matches = siblings.filter((section) =>
        matchesMarkdownHeading(section.heading, rule, schema.caseSensitive),
      );
      const label = `${"#".repeat(level)} ${rule.heading}`;
      if (matches.length < (rule.min ?? 0)) {
        report(
          parent ? `line ${parent.line}` : "document",
          rule.messages?.missing ?? `Missing ${label}`,
          "required-section",
          { heading: rule.heading, min: rule.min, actual: matches.length },
        );
      }
      if (rule.max !== undefined && matches.length > rule.max) {
        for (const excess of matches.slice(rule.max)) {
          report(
            `line ${excess.line}`,
            rule.messages?.excess ??
              (rule.max === 0
                ? `Forbidden ${label}`
                : rule.max === 1
                  ? `Duplicate ${label}`
                  : `Too many ${label} sections (maximum ${rule.max})`),
            rule.max === 0
              ? "forbidden-section"
              : rule.max === 1
                ? "duplicate-section"
                : "section-count",
            { heading: rule.heading, max: rule.max, actual: matches.length },
          );
        }
      }
      for (const section of matches) {
        if (rule.content && !hasContent(section.body)) {
          report(
            `line ${section.line}`,
            `${rule.heading} needs content; state unknowns or none explicitly`,
            "section-content",
            { heading: rule.heading },
          );
        }
        if (rule.sections) check(section.sections, rule.sections, level + 1, section);
      }
    }
  };
  check(parseMarkdownDocument(data).sections, schema.sections, 2);
  return { valid: errors.length === 0, errors };
}
