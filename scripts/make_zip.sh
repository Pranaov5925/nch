#!/usr/bin/env bash
# Packages the NCH dashboard project into a clean, downloadable ZIP.
# Excludes runtime/sandbox artifacts (node_modules, .next, logs, system dirs).
set -euo pipefail

ROOT="/home/z/my-project"
STAGE="$ROOT/.zipstage"
APP="nch-complaint-dashboard"
OUT="$ROOT/download/$APP.zip"

rm -rf "$STAGE"
mkdir -p "$STAGE/$APP"

# App source
cp -r "$ROOT/src"    "$STAGE/$APP/src"
cp -r "$ROOT/prisma" "$STAGE/$APP/prisma"
cp -r "$ROOT/public" "$STAGE/$APP/public"
cp -r "$ROOT/db"     "$STAGE/$APP/db"
# Build/start helpers + e2e test — package.json's build/start/test:e2e
# scripts reference these, so they MUST ship with the ZIP.
cp -r "$ROOT/scripts" "$STAGE/$APP/scripts"

# Config & metadata
cp "$ROOT/package.json" "$ROOT/bun.lock" "$ROOT/tsconfig.json" \
   "$ROOT/next.config.ts" "$ROOT/postcss.config.mjs" "$ROOT/tailwind.config.ts" \
   "$ROOT/eslint.config.mjs" "$ROOT/components.json" "$ROOT/next-env.d.ts" \
   "$ROOT/README.md" "$ROOT/.gitignore" "$ROOT/.env.example" "$STAGE/$APP/"

# Zip with a single top-level folder
mkdir -p "$ROOT/download"
rm -f "$OUT"
cd "$STAGE"
zip -rq "$OUT" "$APP"
cd "$ROOT"
rm -rf "$STAGE"

echo "── ZIP created ─────────────────────────────"
du -h "$OUT"
unzip -l "$OUT" | tail -1
