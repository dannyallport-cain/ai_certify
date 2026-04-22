# AI Certify Mobile App - Build & Install Guide

## Prerequisites

Before building and installing the app on your iPhone, ensure you have:

1. **Xcode** installed (latest version recommended)
2. **Node.js** and **npm** installed
3. **Expo CLI** installed globally: `npm install -g @expo/cli`
4. **CocoaPods** installed: `sudo gem install cocoapods`
5. **iOS device** connected via USB with developer mode enabled

## Build & Install Scripts

### Quick Build & Install (Recommended)

To build the app and install it directly on your connected iPhone:

```bash
npm run ios:build-and-install
```

Or run the script directly:

```bash
./build-and-install.sh
```

### Custom Device UDID

If you have multiple devices or want to specify a particular device:

```bash
# Using command line argument
./build-and-install.sh -d YOUR_DEVICE_UDID

# Using environment variable
IOS_DEVICE_UDID=YOUR_DEVICE_UDID ./build-and-install.sh
```

### Find Your Device UDID

To find your iPhone's UDID:

1. Connect your iPhone to your Mac
2. Open Xcode
3. Go to Window → Devices and Simulators
4. Select your device and copy the Identifier (UDID)

## What the Script Does

The `build-and-install.sh` script performs these steps:

1. **Dependency Check**: Verifies Xcode, Node.js, Expo CLI, and CocoaPods are installed
2. **Device Detection**: Automatically detects connected iOS devices or uses specified UDID
3. **Expo Prebuild**: Converts the Expo app to native iOS project
4. **CocoaPods Install**: Installs iOS dependencies
5. **Xcode Build**: Builds the app for your device using xcodebuild
6. **Device Install**: Installs the built app on your connected iPhone

## Troubleshooting

### "No iOS devices found"
- Ensure your iPhone is connected via USB
- Unlock your iPhone and trust the computer
- Enable Developer Mode in Settings → Privacy & Security → Developer Mode

### Build fails
- Clean the project: `rm -rf ios/ node_modules/ && npm install && npm run prebuild`
- Update CocoaPods: `cd ios && pod update`
- Check Xcode version compatibility

### App doesn't appear on device
- Check that the build completed successfully
- Verify the correct device UDID is being used
- Restart your iPhone and try again

## Alternative Build Methods

### Development Build (Expo)
```bash
npm start  # Then press 'i' to open iOS simulator
```

### Production Build (EAS)
```bash
npx eas build --platform ios --profile production
```

### Direct Xcode Build
```bash
npm run ios:device:xcode  # Uses existing build-ios-device.sh
```

## Environment Variables

- `IOS_DEVICE_UDID`: Override the default device UDID
- `NODE_BINARY`: Specify custom Node.js binary path (usually auto-detected)