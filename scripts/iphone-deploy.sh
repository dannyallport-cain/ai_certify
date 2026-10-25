#!/bin/bash
#
# iphone-deploy - rebuild the AI Certify Field app and install it on the
# connected iPhone.
#
# Works from anywhere in the repo (or outside it), because the repo root is
# resolved from this file's own location rather than the current directory.
#
#   scripts/iphone-deploy.sh                # clean-ish rebuild + install + launch
#   scripts/iphone-deploy.sh --detect-only  # just show which iPhone will be used
#   scripts/iphone-deploy.sh -d <UDID>      # target a specific device
#   scripts/iphone-deploy.sh --clean-prebuild
#
# Every argument is forwarded to mobile/build-and-install.sh.
#
# Environment:
#   IPHONE_DEPLOY_QUIET=1   Hide the verbose Xcode output, print a summary only
#   IOS_DEVICE_UDID         Device UDID override (also accepted by the child script)
#   DEVELOPMENT_TEAM        Xcode signing team override

set -euo pipefail

# --- locate the repo, following symlinks so the script can be linked anywhere --
SCRIPT_PATH="${BASH_SOURCE[0]}"

while [ -L "$SCRIPT_PATH" ]; do
    LINK_DIR="$(cd -P "$(dirname "$SCRIPT_PATH")" && pwd)"
    SCRIPT_PATH="$(readlink "$SCRIPT_PATH")"

    case "$SCRIPT_PATH" in
        /*) ;;
        *) SCRIPT_PATH="$LINK_DIR/$SCRIPT_PATH" ;;
    esac
done

REPO_ROOT="$(cd -P "$(dirname "$SCRIPT_PATH")/.." && pwd)"
MOBILE_DIR="$REPO_ROOT/mobile"
BUILD_SCRIPT="$MOBILE_DIR/build-and-install.sh"
LOG_DIR="$MOBILE_DIR/build"
LOG_FILE="$LOG_DIR/iphone-deploy.log"

if [ ! -d "$MOBILE_DIR" ]; then
    echo "✗ Could not find the mobile app directory at: $MOBILE_DIR" >&2
    exit 1
fi

if [ ! -f "$BUILD_SCRIPT" ]; then
    echo "✗ Could not find the build script at: $BUILD_SCRIPT" >&2
    exit 1
fi

if [ ! -x "$BUILD_SCRIPT" ]; then
    chmod +x "$BUILD_SCRIPT"
fi

mkdir -p "$LOG_DIR"

echo "→ Deploying AI Certify Field from $MOBILE_DIR"
echo "  Log: $LOG_FILE"

# Detect-only runs resolve the target device without building anything, so their
# success message should not claim an install happened.
DETECT_ONLY=0

for ARG in "$@"; do
    case "$ARG" in
        -D|--detect-only) DETECT_ONLY=1 ;;
    esac
done

STATUS=0

if [ "${IPHONE_DEPLOY_QUIET:-0}" = "1" ]; then
    "$BUILD_SCRIPT" "$@" > "$LOG_FILE" 2>&1 || STATUS=$?
else
    "$BUILD_SCRIPT" "$@" 2>&1 | tee "$LOG_FILE" || STATUS=$?
fi

if [ "$STATUS" -ne 0 ]; then
    echo ""
    echo "✗ Deploy failed (exit $STATUS). Most relevant lines:"
    grep -nE "error:|BUILD FAILED|The following build commands failed|❌|Provisioning|CodeSign" "$LOG_FILE" | tail -20 || true
    echo ""
    echo "  Full log: $LOG_FILE"
    exit "$STATUS"
fi

echo ""

if [ "$DETECT_ONLY" = "1" ]; then
    echo "✓ Device check complete. Log: $LOG_FILE"
else
    echo "✓ Deployed to iPhone. Log: $LOG_FILE"
fi
