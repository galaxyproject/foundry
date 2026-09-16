import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { SaxesParser } from "saxes";
import { parse } from "yaml";
import type { LabPublicationRecord } from "./index.js";

export interface StageCheck {
  id: string;
  status: "passed" | "failed" | "needs_review" | "not_run";
  message: string;
}

export const sha256 = (bytes: string | Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("expected an object");
  return value as Record<string, unknown>;
}

export function nonempty(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("expected a nonempty string");
  return value;
}

export function readRegular(filename: string): Buffer {
  if (!lstatSync(filename).isFile()) throw new Error(`not a regular file: ${filename}`);
  return readFileSync(filename);
}

export function treeFiles(root: string, current = root, ignoreGit = false): string[] {
  if (!lstatSync(current).isDirectory()) throw new Error(`not a directory: ${current}`);
  const result: string[] = [];
  for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (ignoreGit && entry.name === ".git") continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) result.push(...treeFiles(root, absolute, ignoreGit));
    else {
      if (!entry.isFile()) throw new Error(`unsupported file or symbolic link: ${absolute}`);
      result.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }
  return result;
}

export function bundleHash(directory: string): string {
  const hash = createHash("sha256");
  for (const filename of treeFiles(directory)) {
    hash
      .update(filename)
      .update("\0")
      .update(readRegular(path.join(directory, filename)))
      .update("\0");
  }
  return hash.digest("hex");
}

export function checkConversionIdentity(
  publication: LabPublicationRecord,
  packageDir: string,
  castBundleDir: string,
  conversionRunFile: string,
  toolFilename: string,
): string {
  const provenance = record(
    parse(readRegular(path.join(packageDir, "_provenance.yml")).toString("utf8")),
  );
  const generated = record(provenance.generated);
  const castProvenance = record(
    JSON.parse(readRegular(path.join(castBundleDir, "_provenance.json")).toString("utf8")),
  );
  const mold = record(castProvenance.mold);
  if (
    mold.name !== generated.by_mold ||
    mold.revision !== generated.mold_revision ||
    castProvenance.cast_target !== generated.cast_target
  )
    throw new Error(
      "converter name, Mold revision, or cast target does not match the supplied bundle",
    );
  const castSha = bundleHash(castBundleDir);
  if (generated.cast_artifact_sha !== castSha)
    throw new Error(
      `conversion cast_artifact_sha does not match the supplied cast bundle (${castSha}); provenance is not repaired`,
    );
  const run = record(JSON.parse(readRegular(conversionRunFile).toString("utf8")));
  const invocation = record(run.invocation);
  if (
    run.run_schema_version !== 1 ||
    run.status !== "passed" ||
    invocation.skill !== "convert-nfcore-module-to-galaxy-tool" ||
    invocation.skill_sha256 !== castSha
  )
    throw new Error("conversion run must identify a passed run of the supplied converter bundle");
  if (!Array.isArray(run.artifacts)) throw new Error("conversion run is missing artifact hashes");
  for (const [id, filename] of [
    ["galaxy-tool", toolFilename],
    ["galaxy-tool-macros", "macros.xml"],
    ["galaxy-tool-provenance", "_provenance.yml"],
  ]) {
    const matches = run.artifacts.map(record).filter((a) => a.id === id);
    const artifact = matches[0];
    if (
      matches.length !== 1 ||
      artifact?.status !== "present" ||
      artifact.path !== filename ||
      artifact.sha256 !== publication.input_sha256[filename!]
    )
      throw new Error(`conversion run artifact does not match input: ${id}`);
  }
  return `Bundle ${castSha} and the three conversion artifacts match the supplied local run record; this is consistency verification, not a signed upstream attestation.`;
}

export function toolTests(xml: string): number {
  const parser = new SaxesParser();
  const elements: string[] = [];
  let count = 0;
  parser.on("doctype", () => {
    throw new Error("DOCTYPE declarations are not accepted");
  });
  parser.on("opentag", (tag) => {
    elements.push(tag.name);
    if (elements.join("/") === "tool/tests/test") count++;
    if (elements.join("/") === "tool/tests/expand")
      throw new Error("macro-expanded tests are not supported by this staging gate yet");
  });
  parser.on("closetag", () => {
    elements.pop();
  });
  parser.write(xml).close();
  if (!count) throw new Error("wrapper must declare at least one real Galaxy test");
  return count;
}

export function destinationInventory(directory: string, publication: LabPublicationRecord): string {
  const target = path.join(directory, publication.destination_path);
  if (existsSync(target))
    throw new Error(
      `destination already exists; updates are not supported: ${publication.destination_path}`,
    );
  const inventory: string[] = [];
  const collisions: string[] = [];
  for (const filename of treeFiles(directory, directory, true)) {
    if (filename.endsWith(".xml")) {
      let id: string | undefined;
      const parser = new SaxesParser();
      let first = true;
      parser.on("doctype", () => {
        throw new Error(`unsupported DOCTYPE in destination XML: ${filename}`);
      });
      parser.on("opentag", (tag) => {
        if (first && tag.name === "tool") id = tag.attributes.id as string | undefined;
        first = false;
      });
      parser.write(readRegular(path.join(directory, filename)).toString("utf8")).close();
      if (id) {
        inventory.push(`${filename}\0tool\0${id}`);
        if (id === publication.tool.id) collisions.push(`tool ID in ${filename}`);
      }
    }
    if (path.posix.basename(filename) === ".shed.yml") {
      const shed = record(parse(readRegular(path.join(directory, filename)).toString("utf8")));
      const names = [shed.name];
      for (const field of ["repositories", "auto_tool_repositories", "suite"] as const) {
        if (shed[field] !== undefined) {
          if (field === "repositories") names.push(...Object.keys(record(shed[field])));
          else
            throw new Error(
              `unsupported destination ${field} metadata in ${filename}; inventory requires review`,
            );
        }
      }
      for (const name of names)
        if (typeof name === "string") {
          inventory.push(`${filename}\0shed\0${name}`);
          if (name === publication.tool.id) collisions.push(`Shed name in ${filename}`);
        }
    }
  }
  if (collisions.length) throw new Error(`destination name collision: ${collisions.join("; ")}`);
  return `No tool/Shed-name collisions or existing destination in supplied local snapshot; inventory SHA-256 ${sha256(inventory.sort().join("\n"))}. Recheck against current remote before pushing.`;
}

export function reviewChecks(
  filename: string | undefined,
  publication: LabPublicationRecord,
  testCount: number,
): StageCheck[] {
  const ids = ["licensing", "coverage"];
  if (!filename)
    return ids.map((id) => ({
      id,
      status: "needs_review",
      message: "No hash-bound maintainer review was supplied.",
    }));
  let review: Record<string, unknown>;
  try {
    review = record(JSON.parse(readRegular(filename).toString("utf8")));
    if (review.schema_version !== 1) throw new Error("unsupported review schema_version");
    nonempty(review.reviewer);
    const hashes = record(review.input_sha256);
    const keys = Object.keys(publication.input_sha256).sort();
    if (
      JSON.stringify(Object.keys(hashes).sort()) !== JSON.stringify(keys) ||
      keys.some((key) => hashes[key] !== publication.input_sha256[key])
    )
      throw new Error("review input hashes do not match this conversion and selected assets");
  } catch (error) {
    return ids.map((id) => ({
      id,
      status: "failed",
      message: `Invalid review: ${(error as Error).message}`,
    }));
  }
  return ids.map((id) => {
    try {
      const section = record(review[id]);
      const notes = nonempty(section.notes);
      if (section.status === "needs_review") return { id, status: "needs_review", message: notes };
      if (section.status !== "approved")
        throw new Error("review status must be approved or needs_review");
      if (id === "licensing") {
        if (!Array.isArray(section.evidence)) throw new Error("license evidence is required");
        const components = new Set(
          section.evidence.map((item) => {
            const entry = record(item);
            nonempty(entry.license);
            nonempty(entry.reference);
            return nonempty(entry.component);
          }),
        );
        for (const component of ["nf-core-module", "wrapper", "software", "test-data"])
          if (!components.has(component))
            throw new Error(`license evidence missing for ${component}`);
      } else {
        if (!Array.isArray(section.cases) || !section.cases.length)
          throw new Error("reviewed upstream case inventory is required");
        const names = new Set<string>();
        const covered = new Set<number>();
        for (const value of section.cases) {
          const entry = record(value);
          const name = nonempty(entry.upstream_test);
          if (names.has(name)) throw new Error("duplicate upstream case");
          names.add(name);
          if (entry.galaxy_test_index === null) nonempty(entry.omission_reason);
          else {
            const index = entry.galaxy_test_index;
            if (!Number.isSafeInteger(index) || Number(index) < 0 || Number(index) >= testCount)
              throw new Error("coverage index is outside the wrapper's zero-based test range");
            covered.add(Number(index));
          }
        }
        if (!testCount || covered.size !== testCount)
          throw new Error("coverage must account for every emitted Galaxy test");
      }
      return {
        id,
        status: "passed",
        message: `Maintainer attestation by ${review.reviewer}: ${notes}. Upstream completeness and license eligibility are human-reviewed, not inferred.`,
      };
    } catch (error) {
      return { id, status: "failed", message: `Invalid ${id} review: ${(error as Error).message}` };
    }
  });
}
