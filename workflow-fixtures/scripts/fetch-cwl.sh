#!/usr/bin/env bash
# Fetch (or update) CWL fixture repositories into ./cwl/ at SHAs pinned in fixtures.yaml.
#
# Usage:
#   scripts/fetch-cwl.sh                                      # fetch all
#   scripts/fetch-cwl.sh common-workflow-language/user_guide  # fetch one
#   VERIFY=1 scripts/fetch-cwl.sh                             # also verify HEAD matches pinned SHA
#
# Deps: git, node.

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
dest_root="$root/cwl"
mkdir -p "$dest_root"

parse() {
  node "$root/scripts/read-fixture-manifest.mjs" cwl
}

want="${1:-}"

parse | while IFS=$'\t' read -r name repo sha tag; do
  [ -n "$want" ] && [ "$want" != "$name" ] && continue
  dir="$dest_root/${name//\//__}"
  if [ ! -d "$dir/.git" ]; then
    echo ">> cloning $name @ $tag ($sha)"
    git clone --quiet "$repo" "$dir"
  fi
  echo ">> checking out $name @ $sha"
  git -C "$dir" fetch --quiet --tags origin
  git -C "$dir" -c advice.detachedHead=false checkout --quiet "$sha"
  if [ "${VERIFY:-0}" = "1" ]; then
    head=$(git -C "$dir" rev-parse HEAD)
    if [ "$head" != "$sha" ]; then
      echo "!! HEAD $head != pinned $sha for $name" >&2
      exit 1
    fi
  fi
done

echo "done."
