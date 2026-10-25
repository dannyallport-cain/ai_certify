#!/bin/bash

# AI Certify Mobile App Build & Install Script
# Builds the Expo app and installs it on a connected iPhone using Xcode

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ai-certify-field"
WORKSPACE_NAME="AICertifyField"
SCHEME_NAME="AICertifyField"
CONFIGURATION="Release"
BUNDLE_IDENTIFIER="com.aicertify.field"

# Default device UDID (can be overridden with environment variable)
DEFAULT_DEVICE_UDID="00008110-001E54900EEB801E"
# Remember whether the caller supplied a UDID, so detection failures can fall back to it.
USER_SUPPLIED_UDID="${IOS_DEVICE_UDID:-}"
IOS_DEVICE_UDID="${IOS_DEVICE_UDID:-$DEFAULT_DEVICE_UDID}"
DETECTED_DEVICE_NAME=""
DETECTED_DEVICE_OS_VERSION=""
# Xcode signing team (can be overridden with environment variable)
DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-4UMCJ237RQ}"
# Whether to regenerate the native iOS project with Expo prebuild
CLEAN_PREBUILD="${CLEAN_PREBUILD:-false}"
# Whether to stop after resolving the target device, without building anything
DETECT_ONLY=false

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
IOS_DIR="$PROJECT_ROOT/ios"
WORKSPACE="$IOS_DIR/$WORKSPACE_NAME.xcworkspace"
BUILD_DIR="$PROJECT_ROOT/build/ios"
DERIVED_DATA_DIR="$BUILD_DIR/DerivedData"
DEVICECTL_JSON="$BUILD_DIR/devicectl-devices.json"

# Functions
sync_xcode_node_env() {
    local node_binary
    local xcode_env_local

    node_binary="${NODE_BINARY:-$(command -v node)}"
    xcode_env_local="$IOS_DIR/.xcode.env.local"

    log_info "Syncing Xcode Node environment..."
    printf 'export NODE_BINARY=%s\n' "$node_binary" > "$xcode_env_local"
    log_info "Updated $xcode_env_local to use: $node_binary"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_dependencies() {
    log_info "Checking dependencies..."

    # Xcode is required for every build.
    if ! command -v xcodebuild &> /dev/null; then
        log_error "Xcode is not installed or not in PATH"
        exit 1
    fi

    # Node.js is required for the React Native bundle phase.
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed or not in PATH"
        exit 1
    fi

    # Expo is only needed when regenerating the native project, and `npx expo`
    # is used, so a global install is optional.
    if ! command -v expo &> /dev/null; then
        log_info "No global Expo CLI found. 'npx expo' will be used if a prebuild is required."
    fi

    # CocoaPods is only needed when the Pods directory is out of date. If it is
    # missing but Pods are already in sync, the build can proceed.
    if ! command -v pod &> /dev/null; then
        log_warning "CocoaPods is not installed. Pod installation will be skipped if Pods are already in sync."
    fi

    log_success "Dependency check complete"
}

pods_are_in_sync() {
    local podfile_lock="$IOS_DIR/Podfile.lock"
    local manifest_lock="$IOS_DIR/Pods/Manifest.lock"

    [ -f "$podfile_lock" ] && [ -f "$manifest_lock" ] && cmp -s "$podfile_lock" "$manifest_lock"
}

detect_device_via_devicectl() {
    # Prints "<udid>\t<name>\t<osVersion>" for the best paired, booted, physical iPhone.
    # `devicectl` reports a usable phone as "available (paired)" rather than "connected",
    # so its JSON output is parsed instead of its human-readable table.
    mkdir -p "$(dirname "$DEVICECTL_JSON")"

    if ! xcrun devicectl list devices --json-output "$DEVICECTL_JSON" >/dev/null 2>&1; then
        return 0
    fi

    node "$SCRIPT_DIR/scripts/detect-ios-device.mjs" "$DEVICECTL_JSON" 2>/dev/null || true
}

detect_device_via_xctrace() {
    # Fallback for setups without devicectl: xctrace prints "<name> (<os>) (<udid>)".
    local device_line
    local device_name
    local device_os_version
    local device_udid

    device_line=$(xcrun xctrace list devices 2>/dev/null | grep -E "iPhone|iPad" | grep -v "Simulator" | head -1)
    device_line=$(printf '%s' "$device_line" | tr -cd '[:print:]')

    if [ -z "$device_line" ]; then
        return 0
    fi

    device_udid=$(printf '%s' "$device_line" | grep -oE '\([0-9A-Za-z-]{16,}\)' | tail -1 | tr -d '()')

    if [ -z "$device_udid" ]; then
        return 0
    fi

    device_name=$(printf '%s' "$device_line" | sed -E 's/[[:space:]]*\([0-9A-Za-z._ -]+\)[[:space:]]*\([0-9A-Za-z-]{16,}\)[[:space:]]*$//')
    device_os_version=$(printf '%s' "$device_line" | sed -nE 's/^.*\(([0-9]+([.][0-9]+)*)\)[[:space:]]*\([0-9A-Za-z-]{16,}\)[[:space:]]*$/\1/p')

    printf '%s\t%s\t%s\n' "$device_udid" "$device_name" "$device_os_version"
}

detect_connected_device() {
    local detected

    detected=$(detect_device_via_devicectl)

    if [ -z "$detected" ]; then
        detected=$(detect_device_via_xctrace)
    fi

    printf '%s' "$detected"
}

check_device() {
    log_info "Checking for connected iOS devices..."

    local detected

    detected=$(detect_connected_device)

    if [ -n "$detected" ]; then
        IFS=$'\t' read -r DETECTED_UDID DETECTED_DEVICE_NAME DETECTED_DEVICE_OS_VERSION <<< "$detected" || true
    fi

    if [ -n "$DETECTED_DEVICE_NAME" ]; then
        log_info "Detected device: $DETECTED_DEVICE_NAME"
    fi

    if [ -n "$DETECTED_DEVICE_OS_VERSION" ]; then
        log_info "Detected device iOS version: $DETECTED_DEVICE_OS_VERSION"
    fi

    if [ -n "$USER_SUPPLIED_UDID" ]; then
        IOS_DEVICE_UDID="$USER_SUPPLIED_UDID"
        log_info "Using device UDID supplied by caller: $IOS_DEVICE_UDID"
    elif [ -n "$DETECTED_UDID" ]; then
        IOS_DEVICE_UDID="$DETECTED_UDID"
    elif [ -n "$DEFAULT_DEVICE_UDID" ]; then
        log_warning "No connected iOS device was detected, so the configured default UDID will be used: $DEFAULT_DEVICE_UDID"
        log_info "If the build fails, check that the device is connected, unlocked and trusted."
    else
        log_error "No iOS devices found. Please connect your iPhone and ensure it's unlocked."
        log_info "You can also set IOS_DEVICE_UDID environment variable to specify a device UDID."
        exit 1
    fi

    log_success "Using device UDID: $IOS_DEVICE_UDID"
}

check_xcode_ios_platform_support() {
    log_info "Checking Xcode iOS platform support..."

    if ! xcodebuild -showsdks 2>/dev/null | grep -q "iphoneos"; then
        log_error "Xcode does not currently have the iPhoneOS SDK available."
        log_info "Open Xcode > Settings > Components and install the iOS platform support files, then rerun this script."
        exit 1
    fi

    if [ -z "$DETECTED_DEVICE_OS_VERSION" ]; then
        log_warning "Could not determine the connected device iOS version from device detection."
        log_info "Continuing because the exact device support requirement could not be validated ahead of time."
        return
    fi

    DEVICE_SUPPORT_DIR="/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/DeviceSupport"

    if [ ! -d "$DEVICE_SUPPORT_DIR" ]; then
        log_warning "Xcode device support directory was not found at: $DEVICE_SUPPORT_DIR"
        log_info "Continuing to xcodebuild. If the build later fails with 'iOS $DETECTED_DEVICE_OS_VERSION is not installed', install that platform from Xcode > Settings > Components."
        return
    fi

    if ! find "$DEVICE_SUPPORT_DIR" -maxdepth 1 -type d \( -name "$DETECTED_DEVICE_OS_VERSION" -o -name "$DETECTED_DEVICE_OS_VERSION *" \) | grep -q .; then
        log_warning "Xcode does not have an exact DeviceSupport match for iOS $DETECTED_DEVICE_OS_VERSION."
        log_info "Connected device: ${DETECTED_DEVICE_NAME:-Unknown device} ($IOS_DEVICE_UDID)"
        log_info "Continuing to xcodebuild because newer Xcode platform support may still work without an exact DeviceSupport directory match."
        return
    fi

    log_success "Xcode has iOS device support for version $DETECTED_DEVICE_OS_VERSION"
}

prebuild_app() {
    log_info "Prebuilding Expo app..."

    cd "$PROJECT_ROOT"

    # Prebuild with Expo (npx avoids requiring a global install)
    npx expo prebuild --platform ios --clean

    log_success "Expo prebuild completed"
}

install_dependencies() {
  log_info "Checking CocoaPods dependencies..."

  cd "$IOS_DIR"

  sync_xcode_node_env

  if pods_are_in_sync; then
    log_success "Pods are already in sync with Podfile.lock - skipping pod install"
    return
  fi

  if ! command -v pod &> /dev/null; then
    log_error "Pods are out of date and CocoaPods is not installed."
    log_info "Install it with: sudo gem install cocoapods, then rerun this script."
    exit 1
  fi

  log_info "Pods are out of date or missing - running pod install..."
  pod install

  log_success "CocoaPods dependencies installed"
}

built_app_path() {
    printf '%s\n' "$DERIVED_DATA_DIR/Build/Products/$CONFIGURATION-iphoneos/$SCHEME_NAME.app"
}

read_built_bundle_version() {
    local app_plist

    app_plist="$(built_app_path)/Info.plist"

    if [ ! -f "$app_plist" ]; then
        return 0
    fi

    /usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$app_plist" 2>/dev/null || true
}

read_installed_bundle_version() {
    # `devicectl device info apps` prints a table whose final column is the
    # installed CFBundleVersion, e.g. "AI Certify Field  com.aicertify.field  1.0.0  3".
    local listing

    listing=$(xcrun devicectl device info apps --device "$IOS_DEVICE_UDID" --bundle-id "$BUNDLE_IDENTIFIER" 2>/dev/null || true)
    printf '%s\n' "$listing" | awk -v id="$BUNDLE_IDENTIFIER" '$0 ~ id {print $NF}' | tail -1
}

ensure_installed_build_is_current() {
    # The `install` action can report success while the device keeps an older
    # bundle, so the installed build number is compared with the built one and a
    # direct devicectl install is used when they differ.
    local built_version
    local installed_version

    built_version=$(read_built_bundle_version)
    installed_version=$(read_installed_bundle_version)

    if [ -n "$built_version" ] && [ "$built_version" = "$installed_version" ]; then
        log_success "Device reports build $installed_version installed"
        return
    fi

    log_warning "Device reports build '${installed_version:-unknown}' but the built app is build '${built_version:-unknown}'"
    log_info "Installing the freshly built app directly with devicectl..."

    if ! xcrun devicectl device install app --device "$IOS_DEVICE_UDID" "$(built_app_path)" >/dev/null 2>&1; then
        log_warning "Direct install failed - the bundle installed by xcodebuild may be an older build."
        return
    fi

    installed_version=$(read_installed_bundle_version)

    if [ -n "$built_version" ] && [ "$built_version" = "$installed_version" ]; then
        log_success "Device now reports build $installed_version installed"
    else
        log_warning "Device still reports build '${installed_version:-unknown}' after reinstalling"
    fi
}

launch_app_on_device() {
    if xcrun devicectl device process launch --terminate-existing --device "$IOS_DEVICE_UDID" "$BUNDLE_IDENTIFIER" >/dev/null 2>&1; then
        log_success "Launched $BUNDLE_IDENTIFIER on the device"
    else
        log_warning "Could not launch the app automatically - open it from the iPhone home screen."
    fi
}

verify_embedded_bundle() {
    local app_dir
    local bundle_path

    app_dir="$DERIVED_DATA_DIR/Build/Products/$CONFIGURATION-iphoneos/$SCHEME_NAME.app"
    bundle_path="$app_dir/main.jsbundle"

    if [ ! -f "$bundle_path" ]; then
        log_error "Release build completed without embedding main.jsbundle"
        log_info "Expected bundle at: $bundle_path"
        log_info "This usually means the React Native bundle phase failed because Xcode used the wrong Node environment."
        exit 1
    fi

    log_success "Confirmed embedded JS bundle: $bundle_path"
}

build_and_install() {
    log_info "Building and installing app on device..."

    cd "$PROJECT_ROOT"

    # Create build directory
    mkdir -p "$BUILD_DIR"

    # Build and install using xcodebuild
    BUILD_SETTINGS=()

    if [ -n "$DEVELOPMENT_TEAM" ]; then
        BUILD_SETTINGS+=(DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" CODE_SIGN_STYLE=Automatic)
    else
        log_warning "No DEVELOPMENT_TEAM provided. Xcode signing may fail unless the project already has a valid team configured."
    fi

    rm -rf "$DERIVED_DATA_DIR"

    NODE_BINARY="$(command -v node)" xcodebuild \
        -workspace "$WORKSPACE" \
        -scheme "$SCHEME_NAME" \
        -configuration "$CONFIGURATION" \
        -destination "id=$IOS_DEVICE_UDID" \
        -derivedDataPath "$DERIVED_DATA_DIR" \
        -allowProvisioningUpdates \
        "${BUILD_SETTINGS[@]}" \
        build install

    verify_embedded_bundle
    log_success "Build and install completed successfully"

    log_info "The app has been deployed to your device."
    log_info "If you do not see it on your iPhone, open Xcode and verify the signing team for the AICertifyField target."

}

show_usage() {
    echo "AI Certify Mobile App Build & Install Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -d, --device UDID         Specify iOS device UDID (default: auto-detect or $DEFAULT_DEVICE_UDID)"
    echo "  -t, --team TEAM           Specify Xcode development team ID for signing"
    echo "  -p, --prebuild            Regenerate the native iOS project with Expo prebuild"
    echo "  --clean-prebuild          Regenerate the native iOS project with Expo prebuild (same as --prebuild)"
    echo "  -D, --detect-only         Detect the target iPhone and exit without building"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  IOS_DEVICE_UDID           Override default device UDID"
    echo "  DEVELOPMENT_TEAM          Xcode development team ID for signing"
    echo "  CLEAN_PREBUILD=true       Regenerate the native iOS project before building"
    echo ""
    echo "Examples:"
    echo "  $0                         # Build and install using the existing native iOS project"
    echo "  $0 -p                      # Clean prebuild, then build and install"
    echo "  $0 --clean-prebuild        # Same as -p"
    echo "  $0 -d $DEFAULT_DEVICE_UDID  # Build for specific device"
    echo "  $0 -t ABCDE12345           # Use specific Xcode development team"
    echo "  IOS_DEVICE_UDID=$DEFAULT_DEVICE_UDID $0  # Using environment variable"
    echo "  DEVELOPMENT_TEAM=ABCDE12345 $0  # Using environment variable"
    echo "  CLEAN_PREBUILD=true $0     # Regenerate the native iOS project before building"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--device)
            IOS_DEVICE_UDID="$2"
            shift 2
            ;;
        -t|--team)
            DEVELOPMENT_TEAM="$2"
            shift 2
            ;;
        -p|--prebuild|--clean-prebuild)
            CLEAN_PREBUILD=true
            shift 1
            ;;
        -D|--detect-only)
            DETECT_ONLY=true
            shift 1
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo -e "${BLUE}🚀 AI Certify Mobile App Build & Install${NC}"
    echo "======================================"

    check_dependencies
    check_device
    check_xcode_ios_platform_support

    if [ "$DETECT_ONLY" = true ]; then
        log_success "Detection complete - target device is $IOS_DEVICE_UDID"
        log_info "Re-run without --detect-only to build and install."
        exit 0
    fi

    if [ "$CLEAN_PREBUILD" = true ]; then
        prebuild_app
    elif [ ! -d "$IOS_DIR" ] || [ ! -f "$IOS_DIR/Podfile" ]; then
        log_warning "Native iOS project is missing or incomplete, so Expo prebuild is required."
        prebuild_app
    else
        log_info "Using existing native iOS project at $IOS_DIR"
    fi

    install_dependencies
    build_and_install
    ensure_installed_build_is_current
    launch_app_on_device

    echo ""
    log_success "🎉 Process completed successfully!"
    log_info "Your app should now be installed on your iPhone."
}

# Run main function
main "$@"
