// One answer to "does this file on disk match what we would write?", for every command that
// renders a deterministic artifact and offers a `--check` gate over it.
//
// The decision ships in @galaxy-foundry/cast. This module is the seam, so a call site that
// already imports `reconcile` from here does not have to name the package.
//
// One dialect stays out of it on purpose: `writeOrCheck` in content-notes.ts, which handles a
// single artifact and exits the process on drift. The commands here reconcile many artifacts
// and report them together, so they need drift as a VALUE rather than as an exit. Both are
// real; neither subsumes the other, and collapsing them would give one of the two callers a
// worse error.

export {
  driftOf,
  recordedHash,
  reconcile,
  reconcileText,
  sha256File,
  sha256Text,
  type Drift,
} from "@galaxy-foundry/cast";
