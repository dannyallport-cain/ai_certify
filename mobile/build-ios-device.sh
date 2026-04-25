#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
IOS_DIR="$ROOT_DIR/ios"
WORKSPACE="$IOS_DIR/AICertifyField.xcworkspace"
SCHEME="AICertifyField"
CONFIGURATION="Release"
DERIVED_DATA_DIR="$ROOT_DIR/build/ios-device/DerivedData"

# Defaults to the known physical device UDID used in this project workflow.
IOS_DEVICE_UDID="${IOS_DEVICE_UDID:-00008101-0019452434A1001E}"
NODE_BINARY="${NODE_BINARY:-$(command -v node)}"

sync_xcode_node_env() {
  XCODE_ENV_LOCAL="$IOS_DIR/.xcode.env.local"

  echo "Syncing Xcode Node environment..."
  printf 'export NODE_BINARY=%s\n' "$NODE_BINARY" > "$XCODE_ENV_LOCAL"
  echo "Updated $XCODE_ENV_LOCAL to use: $NODE_BINARY"
}

check_xcode_ios_platform_support() {
  echo "Checking Xcode iOS platform support..."

  if ! xcodebuild -showsdks 2>/dev/null | grep -q "iphoneos"; then
    echo "Error: Xcode does not currently have the iPhoneOS SDK available."
    echo "Open Xcode > Settings > Components and install the iOS platform support files, then rerun this script."
    exit 1
  fi

  DEVICE_LINE=$(xcrun xctrace list devices 2>/dev/null | grep "$IOS_DEVICE_UDID" | grep -E "iPhone|iPad" | grep -v "Simulator" | head -1 || true)
  DEVICE_LINE=$(printf '%s' "$DEVICE_LINE" | tr -cd '[:print:]\n')
  DEVICE_OS_VERSION=$(printf '%s' "$DEVICE_LINE" | sed -nE 's/^.*\(([0-9]+([.][0-9]+)*)\)[[:space:]]*\([0-9A-Za-z-]{16,}\)[[:space:]]*$/\1/p')

  if [ -z "$DEVICE_OS_VERSION" ]; then
    echo "Warning: Could not determine the connected device iOS version from xctrace output."
    echo "Continuing because the exact device support requirement could not be validated ahead of time."
    return
  fi

  DEVICE_SUPPORT_DIR="/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/DeviceSupport"

  if [ ! -d "$DEVICE_SUPPORT_DIR" ]; then
    echo "Warning: Xcode device support directory was not found at: $DEVICE_SUPPORT_DIR"
    echo "If the build later fails with 'iOS $DEVICE_OS_VERSION is not installed', install that platform from Xcode > Settings > Components."
    return
  fi

  if ! find "$DEVICE_SUPPORT_DIR" -maxdepth 1 -type d \( -name "$DEVICE_OS_VERSION" -o -name "$DEVICE_OS_VERSION *" \) | grep -q .; then
    echo "Error: Xcode is missing device support for iOS $DEVICE_OS_VERSION."
    echo "Install the required iOS platform/device support from Xcode > Settings > Components, then rerun this script."
    exit 1
  fi

  echo "Xcode has iOS device support for version $DEVICE_OS_VERSION"
}

verify_embedded_bundle() {
  APP_DIR="$DERIVED_DATA_DIR/Build/Products/$CONFIGURATION-iphoneos/$SCHEME.app"
  BUNDLE_PATH="$APP_DIR/main.jsbundle"

  if [ ! -f "$BUNDLE_PATH" ]; then
    echo "Error: Release build completed without embedding main.jsbundle."
    echo "Expected bundle at: $BUNDLE_PATH"
    echo "This usually means the React Native bundle phase failed because Xcode used the wrong Node environment."
    exit 1
  fi

  echo "Confirmed embedded JS bundle: $BUNDLE_PATH"
}

check_xcode_ios_platform_support

echo "Installing CocoaPods dependencies..."
cd "$IOS_DIR"
sync_xcode_node_env
pod install

echo "Using Node binary: $NODE_BINARY"
echo "Building for physical iPhone UDID: $IOS_DEVICE_UDID"
rm -rf "$DERIVED_DATA_DIR"
NODE_BINARY="$NODE_BINARY" xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -destination "id=$IOS_DEVICE_UDID" \
  -derivedDataPath "$DERIVED_DATA_DIR" \
  -allowProvisioningUpdates \
  build

verify_embedded_bundle
echo "Build completed."
