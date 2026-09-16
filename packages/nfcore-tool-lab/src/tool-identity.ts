import { SaxesParser } from "saxes";

const suffix = " (Nextflow Module Automated Conversion)";

export function inspectXml(xml: string, expectedRoot: string): Record<string, string> {
  const parser = new SaxesParser({ xmlns: false });
  let root: Record<string, string> | undefined;
  parser.on("xmldecl", (declaration) => {
    if (declaration.encoding && !/^utf-?8$/i.test(declaration.encoding))
      throw new Error("XML must use UTF-8 encoding");
  });
  parser.on("doctype", () => {
    throw new Error("DOCTYPE declarations are not accepted");
  });
  parser.on("opentag", (tag) => {
    if (root) return;
    if (tag.name !== expectedRoot) throw new Error(`XML root must be <${expectedRoot}>`);
    root = tag.attributes;
  });
  parser.write(xml).close();
  if (!root) throw new Error(`XML root must be <${expectedRoot}>`);
  return root;
}

function openingTag(xml: string): { start: number; end: number } {
  let start = xml.startsWith("\uFEFF") ? 1 : 0;
  for (;;) {
    while (/\s/.test(xml[start] ?? "") && start < xml.length) start++;
    const terminator = xml.startsWith("<?", start)
      ? "?>"
      : xml.startsWith("<!--", start)
        ? "-->"
        : null;
    if (!terminator) break;
    start = xml.indexOf(terminator, start) + terminator.length;
  }
  let quote: string | null = null;
  for (let end = start; end < xml.length; end++) {
    const char = xml[end]!;
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === "'" || char === '"') quote = char;
    else if (char === ">") return { start, end: end + 1 };
  }
  throw new Error("missing XML opening tag");
}

function escapeAttribute(value: string, quote: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll("\r", "&#13;")
    .replaceAll("\n", "&#10;")
    .replaceAll("\t", "&#9;")
    .replaceAll(quote, quote === '"' ? "&quot;" : "&apos;");
}

export function prepareToolIdentity(
  xml: string,
  id: string,
): {
  xml: string;
  originalId: string;
  originalName: string;
  name: string;
} {
  const attributes = inspectXml(xml, "tool");
  const originalId = attributes.id;
  const originalName = attributes.name;
  if (!originalId?.trim() || !originalName?.trim())
    throw new Error("tool XML must have nonempty id and name attributes");
  if (originalId.startsWith("nfcore_compat_") && originalId !== id)
    throw new Error("existing lab tool ID does not match the source module");
  const name = originalName.endsWith(suffix) ? originalName : `${originalName}${suffix}`;
  const { start, end } = openingTag(xml);
  const opening = xml
    .slice(start, end)
    .replace(
      /([^\s=/>]+)(\s*=\s*)(["'])([\s\S]*?)\3/g,
      (whole: string, attribute: string, equals: string, quote: string) => {
        if (attribute !== "id" && attribute !== "name") return whole;
        const value = attribute === "id" ? id : name;
        if (value === attributes[attribute]) return whole;
        return `${attribute}${equals}${quote}${escapeAttribute(value, quote)}${quote}`;
      },
    );
  const result = xml.slice(0, start) + opening + xml.slice(end);
  inspectXml(result, "tool");
  return { xml: result, originalId, originalName, name };
}
