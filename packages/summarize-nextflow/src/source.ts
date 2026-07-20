import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export class SummarizeNextflowInputError extends Error {
  readonly exitCode = 1;

  constructor(message: string) {
    super(message);
    this.name = "SummarizeNextflowInputError";
  }
}

export class SummarizeNextflowResolutionError extends Error {
  readonly exitCode = 2;

  constructor(message: string) {
    super(message);
    this.name = "SummarizeNextflowResolutionError";
  }
}

export interface ResolvedSource {
  /** Directory to hand to the resolver. */
  root: string;
  /** Normalized remote URL, or null when the caller gave a local tree with no origin. */
  url: string | null;
  /** Full commit SHA of the inspected revision, or null when not a git checkout. */
  version: string | null;
  cleanup: () => void;
}

export function isRemoteSource(pathOrUrl: string): boolean {
  return /^https?:\/\//u.test(pathOrUrl);
}

export function normalizeGitUrl(url: string): string {
  const scpStyle = /^([^@]+@[^:]+):(.+)$/u.exec(url);
  if (scpStyle) return `ssh://${scpStyle[1]}/${scpStyle[2]}`;
  return url;
}

// Refs reach git as an argument-array element, never a shell string, but a ref
// starting with `-` would still be read as a flag.
function assertRefShape(pin: string): void {
  if (pin.length === 0 || pin.startsWith("-") || /[\s\0]/u.test(pin)) {
    throw new SummarizeNextflowInputError(`invalid --pin ref: ${JSON.stringify(pin)}`);
  }
}

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function tryGit(cwd: string, args: string[]): string | null {
  try {
    return git(cwd, args);
  } catch {
    return null;
  }
}

/**
 * Acquire the tree to summarize. An unpinned local directory is used in place;
 * anything else is materialized into a temporary detached checkout outside the
 * caller's repository, which is never switched, reset, or otherwise mutated.
 */
export function resolveSource(pathOrUrl: string, pin?: string): ResolvedSource {
  if (pin !== undefined) assertRefShape(pin);

  if (!isRemoteSource(pathOrUrl)) {
    const localRoot = resolve(pathOrUrl);
    if (!existsSync(localRoot) || !statSync(localRoot).isDirectory()) {
      throw new SummarizeNextflowInputError(`pipeline path not found: ${pathOrUrl}`);
    }
    if (!pin) {
      return {
        root: localRoot,
        url: null,
        version: null,
        cleanup: () => {},
      };
    }
    const origin = tryGit(localRoot, ["remote", "get-url", "origin"]);
    return checkoutInto(localRoot, pin, origin ? normalizeGitUrl(origin) : null);
  }

  return checkoutInto(pathOrUrl, pin, normalizeGitUrl(pathOrUrl));
}

function checkoutInto(source: string, pin: string | undefined, url: string | null): ResolvedSource {
  const temp = mkdtempSync(join(tmpdir(), "summarize-nextflow-src-"));
  const root = join(temp, "pipeline");
  const cleanup = () => {
    rmSync(temp, { recursive: true, force: true });
  };
  try {
    // Unpinned clones only ever need the tip; a pin may name any reachable
    // commit, so those take the full history.
    const cloneArgs = pin
      ? ["clone", "--quiet", "--no-checkout", source, root]
      : ["clone", "--quiet", "--depth", "1", source, root];
    try {
      git(temp, cloneArgs);
    } catch (err) {
      throw new SummarizeNextflowResolutionError(`failed to clone ${source}: ${messageOf(err)}`);
    }
    if (pin) {
      const commit = resolvePinnedCommit(root, pin);
      if (!commit) {
        throw new SummarizeNextflowResolutionError(
          `--pin ${pin} does not name a commit in ${source}`,
        );
      }
      try {
        git(root, ["checkout", "--quiet", "--detach", commit]);
      } catch (err) {
        throw new SummarizeNextflowResolutionError(
          `failed to check out --pin ${pin} from ${source}: ${messageOf(err)}`,
        );
      }
    }
    return {
      root,
      url,
      version: tryGit(root, ["rev-parse", "HEAD"]),
      cleanup,
    };
  } catch (err) {
    cleanup();
    throw err;
  }
}

// Tags and SHAs resolve directly; a bare branch name only exists as
// `origin/<name>` in a fresh clone, and rev-parse does not DWIM that.
function resolvePinnedCommit(root: string, pin: string): string | null {
  for (const candidate of [pin, `origin/${pin}`]) {
    const commit = tryGit(root, ["rev-parse", "--verify", "--quiet", `${candidate}^{commit}`]);
    if (commit) return commit;
  }
  return null;
}

function messageOf(err: unknown): string {
  if (err && typeof err === "object" && "stderr" in err) {
    const stderr = (err as { stderr?: unknown }).stderr;
    if (typeof stderr === "string" && stderr.trim()) return stderr.trim();
  }
  return err instanceof Error ? err.message : String(err);
}
