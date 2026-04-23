#!/bin/bash

# Root wrapper for the mobile build-and-install script.
# Allows running the mobile installer from the repo root.

set -e

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
MOBILE_SCRIPT="$SCRIPT_DIR/mobile/build-and-install.sh"

if [ ! -x "$MOBILE_SCRIPT" ]; then
  echo "Error: mobile build script not found or not executable: $MOBILE_SCRIPT"
  exit 1
fi

exec "$MOBILE_SCRIPT" "$@"
