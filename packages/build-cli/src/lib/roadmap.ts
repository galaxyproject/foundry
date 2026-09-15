const ROADMAP_LABELS = ["roadmap/main", "roadmap/substep", "roadmap/off"] as const;

export const DEFAULT_ROADMAP_REPO = "galaxyproject/foundry";
export const DEFAULT_ROADMAP_PATH = "content/meta/roadmap.md";

export interface RoadmapIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  labels: string[];
  repo: string;
  url: string;
}

export interface RoadmapMetadata {
  issues: RoadmapIssue[];
  childrenByMain: Map<number, RoadmapIssue[]>;
}

interface IssueLink {
  number: number;
  title: string;
  line: number;
  start: number;
  end: number;
  raw: string;
}

interface RoadmapModel {
  mains: Map<number, RoadmapIssue>;
  substeps: Map<number, RoadmapIssue>;
  off: Map<number, RoadmapIssue>;
  parentBySubstep: Map<number, number>;
}

export async function fetchRoadmapMetadata(repo = DEFAULT_ROADMAP_REPO): Promise<RoadmapMetadata> {
  const merged = new Map<number, RoadmapIssue>();
  for (const label of ROADMAP_LABELS) {
    for (const issue of await fetchIssuesByLabel(repo, label)) merged.set(issue.number, issue);
  }

  const mains = [...merged.values()].filter((issue) => issue.labels.includes("roadmap/main"));
  const childEntries = await Promise.all(
    mains.map(async (main) => [main.number, await fetchSubIssues(repo, main.number)] as const),
  );
  return { issues: [...merged.values()], childrenByMain: new Map(childEntries) };
}

export function validateRoadmap(
  markdown: string,
  metadata: RoadmapMetadata,
  repo = DEFAULT_ROADMAP_REPO,
): string[] {
  const errors: string[] = [];
  const model = buildRoadmapModel(metadata, repo, errors);
  const lines = markdown.split(/\r?\n/);
  const allLinks = extractIssueLinks(lines, repo);

  validateGlobalLinkCounts(allLinks, model, errors);

  const glanceLine = uniqueHeading(lines, "## At a glance", errors);
  const workLine = uniqueHeading(lines, "## Work areas", errors);
  if (glanceLine === undefined || workLine === undefined || glanceLine >= workLine) {
    if (glanceLine !== undefined && workLine !== undefined) {
      errors.push("roadmap: '## At a glance' must appear before '## Work areas'");
    }
    return errors;
  }

  const glanceOrder = validateAtAGlance(
    lines.slice(glanceLine + 1, workLine),
    glanceLine + 1,
    model,
    repo,
    errors,
  );
  const detailOrder = validateWorkAreas(
    lines.slice(workLine + 1),
    workLine + 1,
    model,
    repo,
    errors,
  );
  if (
    glanceOrder.length === model.mains.size &&
    detailOrder.length === model.mains.size &&
    glanceOrder.some((number, index) => detailOrder[index] !== number)
  ) {
    errors.push("roadmap: main issue order differs between 'At a glance' and 'Work areas'");
  }

  return errors;
}

function buildRoadmapModel(
  metadata: RoadmapMetadata,
  repo: string,
  errors: string[],
): RoadmapModel {
  const mains = new Map<number, RoadmapIssue>();
  const substeps = new Map<number, RoadmapIssue>();
  const off = new Map<number, RoadmapIssue>();

  for (const issue of metadata.issues) {
    const labels = ROADMAP_LABELS.filter((label) => issue.labels.includes(label));
    if (labels.length > 1) {
      errors.push(
        `metadata: issue #${issue.number} has mutually exclusive labels: ${labels.join(", ")}`,
      );
      continue;
    }
    if (labels[0] === "roadmap/main") mains.set(issue.number, issue);
    else if (labels[0] === "roadmap/substep") substeps.set(issue.number, issue);
    else if (labels[0] === "roadmap/off") off.set(issue.number, issue);
  }

  const parents = new Map<number, number[]>();
  for (const [mainNumber, children] of metadata.childrenByMain) {
    if (!mains.has(mainNumber)) {
      errors.push(`metadata: native children supplied for non-main issue #${mainNumber}`);
      continue;
    }
    for (const child of children) {
      if (child.repo.toLowerCase() !== repo.toLowerCase()) {
        errors.push(
          `metadata: main #${mainNumber} has cross-repository sub-issue ${child.repo}#${child.number}`,
        );
        continue;
      }
      if (!child.labels.includes("roadmap/substep")) {
        errors.push(
          `metadata: main #${mainNumber} has native sub-issue #${child.number} without roadmap/substep`,
        );
        continue;
      }
      const issueParents = parents.get(child.number) ?? [];
      issueParents.push(mainNumber);
      parents.set(child.number, issueParents);
    }
  }

  const parentBySubstep = new Map<number, number>();
  for (const number of [...substeps.keys()].sort((a, b) => a - b)) {
    const issueParents = parents.get(number) ?? [];
    if (issueParents.length === 0) {
      errors.push(`metadata: roadmap/substep #${number} has no roadmap/main parent`);
    } else if (issueParents.length > 1) {
      errors.push(
        `metadata: roadmap/substep #${number} has multiple parents: ${issueParents
          .map((parent) => `#${parent}`)
          .join(", ")}`,
      );
    } else {
      parentBySubstep.set(number, issueParents[0] as number);
    }
  }

  return { mains, substeps, off, parentBySubstep };
}

function validateGlobalLinkCounts(links: IssueLink[], model: RoadmapModel, errors: string[]): void {
  const counts = new Map<number, IssueLink[]>();
  for (const link of links) {
    const occurrences = counts.get(link.number) ?? [];
    occurrences.push(link);
    counts.set(link.number, occurrences);
  }

  for (const [number, issue] of model.mains) {
    const occurrences = counts.get(number) ?? [];
    if (occurrences.length !== 2) {
      errors.push(
        `roadmap: main #${number} (${issue.title}) appears ${occurrences.length} times; expected 2`,
      );
    }
  }
  for (const [number, issue] of model.substeps) {
    const occurrences = counts.get(number) ?? [];
    if (occurrences.length !== 1) {
      errors.push(
        `roadmap: substep #${number} (${issue.title}) appears ${occurrences.length} times; expected 1`,
      );
    }
  }
  for (const [number, issue] of model.off) {
    for (const occurrence of counts.get(number) ?? []) {
      errors.push(
        `roadmap:${occurrence.line}: issue #${number} is labeled roadmap/off (${issue.title})`,
      );
    }
  }
}

function validateAtAGlance(
  lines: string[],
  lineOffset: number,
  model: RoadmapModel,
  repo: string,
  errors: string[],
): number[] {
  const order: number[] = [];
  const seen = new Set<number>();
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    if (!line.trim()) continue;
    const lineNumber = lineOffset + index + 1;
    if (!line.startsWith("- ")) {
      errors.push(`roadmap:${lineNumber}: 'At a glance' must contain only one-line bullets`);
      continue;
    }
    const links = extractIssueLinks([line], repo, lineNumber - 1);
    if (links.length !== 1) {
      errors.push(`roadmap:${lineNumber}: topline bullet must contain exactly one issue link`);
      continue;
    }
    const link = links[0] as IssueLink;
    const issue = model.mains.get(link.number);
    if (!issue) {
      errors.push(`roadmap:${lineNumber}: topline link #${link.number} is not a roadmap/main`);
      continue;
    }
    if (seen.has(link.number)) {
      errors.push(`roadmap:${lineNumber}: duplicate topline for main #${link.number}`);
      continue;
    }
    seen.add(link.number);
    order.push(link.number);
    validateLinkTitle(link, issue, errors);
    const prefix = line.slice(0, link.start).trim();
    const suffix = line.slice(link.end).trim();
    if (prefix !== "-")
      errors.push(`roadmap:${lineNumber}: issue link must start the topline bullet`);
    const titleIsSentence = /[.!?]$/.test(link.title.trim());
    if ((!titleIsSentence && suffix !== ".") || (titleIsSentence && suffix !== "")) {
      errors.push(`roadmap:${lineNumber}: topline must be the linked issue title as one sentence`);
    }
  }

  for (const [number, issue] of model.mains) {
    if (!seen.has(number))
      errors.push(`roadmap: missing topline for main #${number} (${issue.title})`);
  }
  return order;
}

function validateWorkAreas(
  lines: string[],
  lineOffset: number,
  model: RoadmapModel,
  repo: string,
  errors: string[],
): number[] {
  const headings: Array<{ index: number; link: IssueLink }> = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    if (!line.startsWith("### ")) continue;
    const lineNumber = lineOffset + index + 1;
    const links = extractIssueLinks([line], repo, lineNumber - 1);
    if (links.length !== 1 || lines[index]?.trim() !== `### ${links[0]?.raw ?? ""}`) {
      errors.push(
        `roadmap:${lineNumber}: work-area heading must be exactly one linked issue title`,
      );
      continue;
    }
    headings.push({ index, link: links[0] as IssueLink });
  }

  const order: number[] = [];
  const seen = new Set<number>();
  for (let headingIndex = 0; headingIndex < headings.length; headingIndex++) {
    const heading = headings[headingIndex] as { index: number; link: IssueLink };
    const issue = model.mains.get(heading.link.number);
    if (!issue) {
      errors.push(
        `roadmap:${heading.link.line}: work-area heading #${heading.link.number} is not a roadmap/main`,
      );
      continue;
    }
    if (seen.has(issue.number)) {
      errors.push(`roadmap:${heading.link.line}: duplicate work area for main #${issue.number}`);
      continue;
    }
    seen.add(issue.number);
    order.push(issue.number);
    validateLinkTitle(heading.link, issue, errors);

    const next = headings[headingIndex + 1]?.index ?? lines.length;
    validateWorkAreaBody(
      lines.slice(heading.index + 1, next),
      lineOffset + heading.index + 1,
      issue,
      metadataChildren(model, issue.number),
      repo,
      errors,
    );
  }

  for (const [number, issue] of model.mains) {
    if (!seen.has(number))
      errors.push(`roadmap: missing work area for main #${number} (${issue.title})`);
  }
  return order;
}

function validateWorkAreaBody(
  lines: string[],
  lineOffset: number,
  main: RoadmapIssue,
  children: RoadmapIssue[],
  repo: string,
  errors: string[],
): void {
  const markers = lines
    .map((line, index) => (line.trim() === "**Substeps**" ? index : -1))
    .filter((index) => index >= 0);

  if (children.length === 0) {
    validateDescription(lines, lineOffset, main, errors);
    if (markers.length > 0) {
      errors.push(
        `roadmap:${lineOffset}: main #${main.number} must omit the Substeps section when it has no native substeps`,
      );
    }
    for (const link of extractIssueLinks(lines, repo, lineOffset)) {
      errors.push(
        `roadmap:${link.line}: substep #${link.number} is not a native child of main #${main.number}`,
      );
    }
    return;
  }

  if (markers.length !== 1) {
    errors.push(
      `roadmap:${lineOffset}: main #${main.number} must contain exactly one '**Substeps**' marker`,
    );
    return;
  }
  const marker = markers[0] as number;
  validateDescription(lines.slice(0, marker), lineOffset, main, errors);

  const childLines = lines
    .slice(marker + 1)
    .map((line, index) => ({ line, number: lineOffset + marker + index + 2 }))
    .filter(({ line }) => line.trim());

  const expected = new Map(children.map((child) => [child.number, child]));
  const seen = new Set<number>();
  for (const entry of childLines) {
    const task = /^- \[([ xX])\] /.exec(entry.line);
    const links = extractIssueLinks([entry.line], repo, entry.number - 1);
    const link = links[0];
    const prefix = link ? entry.line.slice(0, link.start).trim() : "";
    if (
      !task ||
      !link ||
      links.length !== 1 ||
      prefix !== task[0].trim() ||
      entry.line.slice(link?.end).trim()
    ) {
      errors.push(`roadmap:${entry.number}: substep must be one checkbox issue link`);
      continue;
    }
    const child = expected.get(link.number);
    if (!child) {
      errors.push(
        `roadmap:${entry.number}: substep #${link.number} is not a native child of main #${main.number}`,
      );
      continue;
    }
    if (seen.has(link.number)) {
      errors.push(`roadmap:${entry.number}: duplicate substep #${link.number}`);
      continue;
    }
    seen.add(link.number);
    validateLinkTitle(link, child, errors);
    const checked = task[1]?.toLowerCase() === "x";
    if (checked !== (child.state === "closed")) {
      errors.push(
        `roadmap:${entry.number}: substep #${link.number} checkbox disagrees with ${child.state} state`,
      );
    }
  }
  for (const [number, child] of expected) {
    if (!seen.has(number)) {
      errors.push(
        `roadmap: main #${main.number} is missing native substep #${number} (${child.title})`,
      );
    }
  }
}

function validateDescription(
  lines: string[],
  lineOffset: number,
  main: RoadmapIssue,
  errors: string[],
): void {
  const description = lines.join("\n").trim();
  const paragraphs = description.split(/\n\s*\n/).filter((paragraph) => paragraph.trim());
  if (paragraphs.length !== 1) {
    errors.push(
      `roadmap:${lineOffset}: main #${main.number} needs exactly one descriptive paragraph`,
    );
  }
}

function metadataChildren(model: RoadmapModel, mainNumber: number): RoadmapIssue[] {
  return [...model.parentBySubstep]
    .filter(([, parent]) => parent === mainNumber)
    .map(([number]) => model.substeps.get(number))
    .filter((issue): issue is RoadmapIssue => issue !== undefined);
}

function validateLinkTitle(link: IssueLink, issue: RoadmapIssue, errors: string[]): void {
  const expected = `#${issue.number} — ${issue.title.trim()}`;
  if (normalizeTitle(link.title) !== normalizeTitle(expected)) {
    errors.push(
      `roadmap:${link.line}: link text for #${issue.number} is '${link.title}', expected '${expected}'`,
    );
  }
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ");
}

function uniqueHeading(lines: string[], heading: string, errors: string[]): number | undefined {
  const matches = lines.flatMap((line, index) => (line.trim() === heading ? [index] : []));
  if (matches.length !== 1) {
    errors.push(`roadmap: expected exactly one '${heading}' heading, found ${matches.length}`);
    return undefined;
  }
  return matches[0];
}

function extractIssueLinks(lines: string[], repo: string, lineOffset = 0): IssueLink[] {
  const escapedRepo = repo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `\\[([^\\]]+)\\]\\((https://github\\.com/${escapedRepo}/issues/(\\d+))\\)`,
    "g",
  );
  const links: IssueLink[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    for (const match of line.matchAll(pattern)) {
      const start = match.index ?? 0;
      links.push({
        number: Number(match[3]),
        title: match[1] ?? "",
        line: lineOffset + index + 1,
        start,
        end: start + match[0].length,
        raw: match[0],
      });
    }
  }
  return links;
}

async function fetchIssuesByLabel(repo: string, label: string): Promise<RoadmapIssue[]> {
  const issues: RoadmapIssue[] = [];
  for (let page = 1; ; page++) {
    const query = new URLSearchParams({
      state: "all",
      labels: label,
      per_page: "100",
      page: String(page),
    });
    const batch = await githubJson(`/repos/${repo}/issues?${query}`);
    if (!Array.isArray(batch)) throw new Error(`GitHub returned a non-array for label ${label}`);
    for (const raw of batch) {
      if (isRecord(raw) && raw.pull_request) {
        throw new Error(
          `roadmap label ${label} is attached to pull request #${String(raw.number)}`,
        );
      }
      issues.push(normalizeIssue(raw, repo));
    }
    if (batch.length < 100) return issues;
  }
}

async function fetchSubIssues(repo: string, mainNumber: number): Promise<RoadmapIssue[]> {
  const raw = await githubJson(`/repos/${repo}/issues/${mainNumber}/sub_issues?per_page=100`);
  if (!Array.isArray(raw))
    throw new Error(`GitHub returned non-array sub-issues for #${mainNumber}`);
  return raw.map((issue) => normalizeIssue(issue, repoFromApiIssue(issue)));
}

async function githubJson(apiPath: string): Promise<unknown> {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com${apiPath}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "galaxy-foundry-roadmap-validator",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${apiPath}: ${await response.text()}`);
  }
  return response.json() as Promise<unknown>;
}

function normalizeIssue(raw: unknown, repo: string): RoadmapIssue {
  if (!isRecord(raw)) throw new Error("GitHub returned a malformed issue");
  const state = raw.state;
  if (state !== "open" && state !== "closed") {
    throw new Error(`GitHub issue #${String(raw.number)} has invalid state ${String(state)}`);
  }
  if (!Array.isArray(raw.labels))
    throw new Error(`GitHub issue #${String(raw.number)} has no labels`);
  const labels = raw.labels.map((label) => {
    if (!isRecord(label) || typeof label.name !== "string") {
      throw new Error(`GitHub issue #${String(raw.number)} has a malformed label`);
    }
    return label.name;
  });
  if (typeof raw.number !== "number" || typeof raw.title !== "string") {
    throw new Error("GitHub returned an issue without a number or title");
  }
  return {
    number: raw.number,
    title: raw.title,
    state,
    labels,
    repo,
    url:
      typeof raw.html_url === "string"
        ? raw.html_url
        : `https://github.com/${repo}/issues/${raw.number}`,
  };
}

function repoFromApiIssue(raw: unknown): string {
  if (!isRecord(raw) || typeof raw.repository_url !== "string") {
    throw new Error("GitHub sub-issue has no repository_url");
  }
  const match = /\/repos\/([^/]+\/[^/]+)$/.exec(raw.repository_url);
  if (!match?.[1]) throw new Error(`invalid GitHub repository_url: ${raw.repository_url}`);
  return match[1];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
