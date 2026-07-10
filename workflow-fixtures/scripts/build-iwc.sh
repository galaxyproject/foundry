#!/usr/bin/env bash
# Materialize the IWC corpus and emit cleaned format2 workflows.
#
# Steps:
#   1. Clone/update iwc-src/ at the SHA pinned in fixtures.yaml (iwc: section).
#   2. gxwf clean-tree  iwc-src/workflows -> iwc-cleaned/
#   3. gxwf convert-tree iwc-cleaned --to format2 -> iwc-format2/
#
# Usage:
#   scripts/build-iwc.sh
#   VERIFY=1 scripts/build-iwc.sh   # assert HEAD matches pinned SHA
#
# Deps: git, node, npx.

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
src="$root/iwc-src"
cleaned="$root/iwc-cleaned"
out="$root/iwc-format2"

repo="$(node "$root/scripts/read-fixture-manifest.mjs" iwc repo)"
sha="$(node "$root/scripts/read-fixture-manifest.mjs" iwc sha)"

if [ ! -d "$src/.git" ]; then
  echo ">> cloning $repo into $src"
  git clone --quiet "$repo" "$src"
fi
echo ">> fetching + checking out $sha"
git -C "$src" fetch --quiet origin
git -C "$src" -c advice.detachedHead=false checkout --quiet "$sha"
if [ "${VERIFY:-0}" = "1" ]; then
  head=$(git -C "$src" rev-parse HEAD)
  [ "$head" = "$sha" ] || { echo "!! HEAD $head != pinned $sha" >&2; exit 1; }
fi

# gxwf from the workspace install, so the version tracks the pin in the repo
# root package.json + pnpm-lock.yaml (bump there, run pnpm install, no edit here).
GXWF=(pnpm exec gxwf)

echo ">> cleaning workflows -> $cleaned"
rm -rf "$cleaned"
# clean-tree exits non-zero when any file was changed; that's expected, not an error.
"${GXWF[@]}" clean-tree "$src/workflows" --output-dir "$cleaned" || true
in_count=$(find "$src/workflows" -name '*.ga' | wc -l | tr -d ' ')
clean_count=$(find "$cleaned" -name '*.ga' | wc -l | tr -d ' ')
[ "$in_count" = "$clean_count" ] || { echo "!! clean-tree wrote $clean_count of $in_count" >&2; exit 1; }

echo ">> converting to format2 -> $out"
rm -rf "$out"
"${GXWF[@]}" convert-tree "$cleaned" --to format2 --output-dir "$out"

count=$(find "$out" -name '*.gxwf.yml' | wc -l | tr -d ' ')
echo "done. $count format2 workflows in $out"
