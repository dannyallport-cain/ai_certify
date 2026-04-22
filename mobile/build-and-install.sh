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

# Default device UDID (can be overridden with environment variable)
DEFAULT_DEVICE_UDID="00008101-0019452434A1001E"
IOS_DEVICE_UDID="${IOS_DEVICE_UDID:-$DEFAULT_DEVICE_UDID}"

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
IOS_DIR="$PROJECT_ROOT/ios"
WORKSPACE="$IOS_DIR/$WORKSPACE_NAME.xcworkspace"
BUILD_DIR="$PROJECT_ROOT/build/ios"
DERIVED_DATA_DIR="$BUILD_DIR/DerivedData"

# Functions
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

    # Check if Xcode is installed
    if ! command -v xcodebuild &> /dev/null; then
        log_error "Xcode is not installed or not in PATH"
        exit 1
    fi

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed or not in PATH"
        exit 1
    fi

    # Check if Expo CLI is installed
    if ! command -v expo &> /dev/null; then
        log_error "Expo CLI is not installed. Run: npm install -g @expo/cli"
        exit 1
    fi

    # Check if CocoaPods is installed
    if ! command -v pod &> /dev/null; then
        log_error "CocoaPods is not installed. Run: sudo gem install cocoapods"
        exit 1
    fi

    log_success "All dependencies are installed"
}

check_device() {
    log_info "Checking for connected iOS devices..."

    # Get list of connected devices
    DEVICES=$(xcrun xctrace list devices 2>/dev/null | grep -E "iPhone|iPad" | grep -v "Simulator" | head -1)

    if [ -z "$DEVICES" ]; then
        log_error "No iOS devices found. Please connect your iPhone and ensure it's unlocked."
        log_info "You can also set IOS_DEVICE_UDID environment variable to specify a device UDID."
        exit 1
    fi

    # Extract UDID from the device list
    DETECTED_UDID=$(echo "$DEVICES" | grep -oE '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}')

    if [ -n "$DETECTED_UDID" ] && [ "$IOS_DEVICE_UDID" = "$DEFAULT_DEVICE_UDID" ]; then
        log_info "Using detected device UDID: $DETECTED_UDID"
        IOS_DEVICE_UDID="$DETECTED_UDID"
    fi

    log_success "Using device UDID: $IOS_DEVICE_UDID"
}

prebuild_app() {
    log_info "Prebuilding Expo app..."

    cd "$PROJECT_ROOT"

    # Clean previous builds
    if [ -d "$IOS_DIR" ]; then
        log_info "Cleaning previous iOS build..."
        rm -rf "$IOS_DIR"
    fi

    # Prebuild with Expo
    npx expo prebuild --platform ios --clean

    log_success "Expo prebuild completed"
}

install_dependencies() {
    log_info "Installing CocoaPods dependencies..."

    cd "$IOS_DIR"

    # Install pods
    pod install

    log_success "CocoaPods dependencies installed"
}

build_and_install() {
    log_info "Building and installing app on device..."

    cd "$PROJECT_ROOT"

    # Create build directory
    mkdir -p "$BUILD_DIR"

    # Build and install using xcodebuild
    NODE_BINARY="$(command -v node)" xcodebuild \
        -workspace "$WORKSPACE" \
        -scheme "$SCHEME_NAME" \
        -configuration "$CONFIGURATION" \
        -destination "id=$IOS_DEVICE_UDID" \
        -derivedDataPath "$DERIVED_DATA_DIR" \
        build

    log_success "Build completed successfully"

    # Check if the app was installed
    if xcrun simctl listapps "$IOS_DEVICE_UDID" 2>/dev/null | grep -q "$PROJECT_NAME"; then
        log_success "App installed successfully on device!"
        log_info "You should see the app on your iPhone now."
    else
        log_warning "Build completed, but couldn't verify app installation."
        log_info "Check your iPhone for the installed app."
    fi
}

show_usage() {
    echo "AI Certify Mobile App Build & Install Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -d, --device UDID    Specify iOS device UDID (default: auto-detect or $DEFAULT_DEVICE_UDID)"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  IOS_DEVICE_UDID      Override default device UDID"
    echo ""
    echo "Examples:"
    echo "  $0                    # Build and install using auto-detected device"
    echo "  $0 -d 00008101-0019452434A1001E  # Build for specific device"
    echo "  IOS_DEVICE_UDID=00008101-0019452434A1001E $0  # Using environment variable"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--device)
            IOS_DEVICE_UDID="$2"
            shift 2
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
    prebuild_app
    install_dependencies
    build_and_install

    echo ""
    log_success "🎉 Process completed successfully!"
    log_info "Your app should now be installed on your iPhone."
}

# Run main function
main "$@"