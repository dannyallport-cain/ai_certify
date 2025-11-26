#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
DEST_DIR="$ROOT_DIR/backups/env/$TIMESTAMP"

mkdir -p "$DEST_DIR"

files=(".env" ".env.example")

for file in "${files[@]}"; do
  SRC="$ROOT_DIR/$file"
  if [ -f "$SRC" ]; then
    cp "$SRC" "$DEST_DIR/$(basename "$file")"
  else
    echo "Warning: $file not found, skipping." >&2
  fi
done

echo "Environment files backed up to $DEST_DIR"
