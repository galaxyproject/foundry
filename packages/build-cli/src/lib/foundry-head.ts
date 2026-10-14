// The Foundry commit a run reads, recorded so an old run is never resolved against today's casts.

import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";

/**
 * The commit `repoRoot` is checked out at, linked worktrees included. Null outside a git
 * checkout, and null when `repoRoot` merely sits inside some other repository.
 */
export function foundryHead(repoRoot: string): string | null {
  try {
    const [top, head] = execFileSync(
      "git",
      ["-C", repoRoot, "rev-parse", "--show-toplevel", "--verify", "--quiet", "HEAD"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    )
      .trim()
      .split("\n");
    return top && head && realpathSync(top) === realpathSync(repoRoot) ? head : null;
  } catch {
    return null;
  }
}
