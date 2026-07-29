#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <feature-slug>" >&2
  exit 2
}

[[ $# -eq 1 ]] || usage
slug="$1"

if [[ ! "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Invalid feature slug: '$slug'. Use lowercase kebab-case." >&2
  exit 2
fi

if ! command -v git >/dev/null 2>&1 || ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "NO_GIT"
  exit 0
fi

# Use all currently known local and remote-tracking refs. Remote refs may be
# refreshed by the calling agent before invoking this script.
max=0
while IFS= read -r ref; do
  [[ -n "$ref" ]] || continue
  if [[ "$ref" =~ (^|/)spec-([0-9]+)- ]]; then
    n=$((10#${BASH_REMATCH[2]}))
    (( n > max )) && max=$n
  fi
done < <(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes)

next=$((max + 1))
while :; do
  printf -v seq '%03d' "$next"
  branch="spec-${seq}-${slug}"

  if ! git show-ref --verify --quiet "refs/heads/$branch" \
     && ! git for-each-ref --format='%(refname:short)' refs/remotes | grep -Eq "^[^/]+/${branch}$"; then
    break
  fi
  next=$((next + 1))
done

git switch -c "$branch"
printf '%s\n' "$branch"
