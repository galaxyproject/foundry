import { fromMarkdown } from "mdast-util-from-markdown";
import { toString } from "mdast-util-to-string";
import type { SchemaDiagnostic, SchemaValidationResult } from "./lib/validator.js";

export interface WorkflowBriefSectionDefinition {
  heading: string;
  required: boolean;
  subsections?: readonly string[];
}

export const workflowBriefSections: readonly WorkflowBriefSectionDefinition[] = [
  { heading: "Objective", required: true },
  { heading: "Sources", required: true },
  { heading: "Scope", required: true, subsections: ["Included", "Excluded"] },
  { heading: "Inputs and outputs", required: true },
  { heading: "Constraints", required: true },
  { heading: "Environment", required: true, subsections: ["Authoring", "Execution"] },
  { heading: "Acceptance criteria", required: true },
  { heading: "Open questions", required: true },
  { heading: "Decisions and learning", required: false },
  { heading: "Related artifacts", required: false },
];

export interface WorkflowBriefSection {
  heading: string;
  line: number;
  body: string;
  sections: WorkflowBriefSection[];
}

export interface WorkflowBrief {
  title: string;
  sections: WorkflowBriefSection[];
}

type Node = ReturnType<typeof fromMarkdown>["children"][number];
const normalize = (heading: string): string => heading.trim().replace(/\s+/g, " ").toLowerCase();

function sections(
  markdown: string,
  nodes: Node[],
  depth: number,
  boundary = markdown.length,
): WorkflowBriefSection[] {
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

export function parseWorkflowBrief(markdown: string): WorkflowBrief {
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

export function validateWorkflowBrief(data: unknown): SchemaValidationResult {
  const errors: SchemaDiagnostic[] = [];
  const report = (path: string, message: string, keyword: string): void => {
    errors.push({ path, message, keyword, params: {} });
  };
  if (typeof data !== "string") {
    report("document", "Workflow Brief must be Markdown text", "type");
    return { valid: false, errors };
  }
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
  const brief = parseWorkflowBrief(data);
  const check = (
    siblings: WorkflowBriefSection[],
    heading: string,
    required: boolean,
    level: number,
  ): WorkflowBriefSection | undefined => {
    const matches = siblings.filter((section) => normalize(section.heading) === normalize(heading));
    if (matches.length === 0 && required)
      report("document", `Missing ${"#".repeat(level)} ${heading}`, "required-section");
    for (const duplicate of matches.slice(1))
      report(
        `line ${duplicate.line}`,
        `Duplicate ${"#".repeat(level)} ${heading}`,
        "duplicate-section",
      );
    for (const section of matches) {
      if (!hasContent(section.body))
        report(
          `line ${section.line}`,
          `${heading} needs content; state unknowns or none explicitly`,
          "section-content",
        );
    }
    return matches[0];
  };
  for (const definition of workflowBriefSections) {
    const section = check(brief.sections, definition.heading, definition.required, 2);
    if (section)
      for (const heading of definition.subsections ?? []) check(section.sections, heading, true, 3);
  }
  return { valid: errors.length === 0, errors };
}
