#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
IOS_DIR="$ROOT_DIR/ios"
WORKSPACE="$IOS_DIR/AICertifyField.xcworkspace"
SCHEME="AICertifyField"
CONFIGURATION="Release"

# Defaults to the known physical device UDID used in this project workflow.
IOS_DEVICE_UDID="${IOS_DEVICE_UDID:-00008101-0019452434A1001E}"
NODE_BINARY="${NODE_BINARY:-$(command -v node)}"

echo "Installing CocoaPods dependencies..."
cd "$IOS_DIR"
pod install

echo "Using Node binary: $NODE_BINARY"
echo "Building for physical iPhone UDID: $IOS_DEVICE_UDID"
NODE_BINARY="$NODE_BINARY" xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -destination "id=$IOS_DEVICE_UDID" \
  build

echo "Build completed."
