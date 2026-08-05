#!/bin/sh
set -e

root=$(git rev-parse --show-toplevel)
target="$(git rev-parse --git-dir)/hooks/pre-commit"

mkdir -p "$(dirname "$target")"
cp "$root/.githooks/pre-commit" "$target"
chmod +x "$target"
git config --unset-all core.hooksPath 2>/dev/null || true

echo "Installed the main-branch guard into $target"
echo "Commits on main and master will now be refused."
