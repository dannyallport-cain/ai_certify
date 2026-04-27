# AI Certify Field — App Store Connection & Submission Guide

This guide explains how to connect the mobile app to Apple App Store Connect and submit an iOS build using the current Expo/EAS setup.

## Current mobile app identifiers

These values must match exactly in Apple Developer / App Store Connect:

- **App name:** `AI Certify Field`
- **Expo slug:** `ai-certify-field`
- **iOS bundle identifier:** `com.aicertify.field`
- **Android package:** `com.aicertify.field`
- **iOS build number:** `1` in `mobile/app.json`
- **Android version code:** `1` in `mobile/app.json`

If you increase the release version, remember to bump:

- `ios.buildNumber`
- `android.versionCode`

## Prerequisites

Before submitting, make sure you have:

- An active **Apple Developer Program** membership
- Access to **App Store Connect**
- An **Expo account**
- **EAS CLI** installed
- A valid Apple team selected for signing
- The App Store Connect app record created for `com.aicertify.field`

## 1) Sign in to Expo

From the repo root or the `mobile/` directory:

```bash
cd mobile
npx expo login
```

If you already use EAS, you can also sign in with:

```bash
npx eas login
```

## 2) Verify the app config

Check that the release config resolves correctly:

```bash
cd mobile
npx expo config --type public --json
```

You should confirm:

- `ios.bundleIdentifier` is `com.aicertify.field`
- `android.package` is `com.aicertify.field`
- `slug` is `ai-certify-field`

## 3) Configure EAS credentials if needed

If this is the first App Store submission, let EAS configure signing:

```bash
cd mobile
npx eas build:configure
```

This helps create or link the iOS signing setup needed for production builds.

## 4) Build the iOS release

The project’s `mobile/eas.json` currently defines these profiles:

- `development`
- `preview`
- `production`

For App Store submission, use the production profile:

```bash
cd mobile
npx eas build --platform ios --profile production
```

Notes:

- `production` has `autoIncrement: true`
- `appVersionSource` is set to `remote`
- This is the correct path for App Store/TestFlight builds

## 5) Submit the build to App Store Connect

After the build finishes successfully, submit the latest iOS build:

```bash
cd mobile
npx eas submit --platform ios --latest
```

This uploads the built IPA to App Store Connect.

## 6) Finish the App Store Connect listing

After the upload, complete the app record in App Store Connect:

- App description
- Keywords
- Support URL
- Privacy Policy URL
- Screenshots for required device sizes
- Age rating
- App privacy details
- Review notes
- Contact information
- Export compliance / encryption declarations

## 7) Use TestFlight before public release

Recommended workflow:

1. Upload the build with EAS
2. Wait for Apple to process it
3. Install via **TestFlight**
4. Test the important flows:
   - camera capture
   - location access
   - any native iOS features
   - app launch and navigation
5. Submit for App Review only after verification

## Field-by-field App Store Connect checklist

### 1) App Store Connect navigation landmarks
These are the sections and buttons you’ll see on the version page for `AI Certify`:

- **AI Certify** — the app record header
- **Distribution** — the current version and release area
- **Analytics** — metrics tab
- **TestFlight** — build testing area
- **Xcode Cloud** — unused unless you’ve configured it
- **iOS App Version 1.0.0** — the version record you will edit
- **Prepare for Submission** — the status you complete before sending to review
- **Save** — stores your edits
- **Add for Review** — submits the version to Apple

### 2) Previews and Screenshots
Fill this section first so the version page looks complete.

- [ ] Open **Previews and Screenshots**
- [ ] Upload iPhone screenshots for the 6.5" / 6.9" family
- [ ] Use the promotional images in `public/screenshots/app-store/`
- [ ] Upload at least 3 screenshots, up to 10
- [ ] Verify the first 3 screenshots are the strongest ones because Apple uses those in install sheets
- [ ] Leave iPad, Apple Watch, App Clip, and iMessage App empty unless you have platform-specific assets

### 3) Product page metadata
These fields appear on the App Store product page and search results.

- [ ] Promotional Text: add a short marketing line, optional
- [ ] Description: add the full app description
- [ ] Keywords: use `inspection, field app, compliance, capture, camera, location`
- [ ] Support URL: provide a real support page URL
- [ ] Marketing URL: provide your website URL if available
- [ ] Version: confirm this is `1.0.0`
- [ ] Copyright: use `© 2026 Daniel Allport`
- [ ] Routing App Coverage File: leave blank
- [ ] App Clip: leave blank
- [ ] iMessage App: leave blank

### 4) Build and review details
Complete these fields after the metadata is in place.

- [ ] Select the uploaded production build
- [ ] Confirm the build number matches the latest EAS build
- [ ] Export compliance / encryption: answer honestly based on the app’s actual usage
- [ ] App Review Information: fill only if Apple needs login access
- [ ] Sign-In Information: provide username and password if review login is required
- [ ] Contact Information: include a real review contact name, phone, and email
- [ ] Notes: mention that camera and location are core app features
- [ ] Attachment: leave blank unless Apple asks for extra material

### 4a) Required blockers before **Add for Review** becomes available
If Apple shows **Unable to Add for Review**, clear these first:

- [ ] Set up **Content Rights Information** in **App Information**
- [ ] Choose a build in the **Build** section
- [ ] Have an **Admin** complete **App Privacy** information
- [ ] Choose a price tier in **Pricing**
- [ ] Enter a **Privacy Policy URL** in **App Privacy**
- [ ] Re-save the version after completing the required sections

### 5) Submission state
Before clicking review, make sure the version is ready.

- [ ] Confirm all required fields are green / complete
- [ ] Click **Save**
- [ ] Click **Add for Review**
- [ ] Choose **Manually release this version** unless you want auto-release after approval

### 6) What to check before final submission
Use this as the last pass over the page.

- [ ] App name is `AI Certify`
- [ ] Primary language is English (U.K.)
- [ ] Bundle ID is `com.aicertify.field`
- [ ] SKU is set to a unique internal value, for example `aicertifyfield-ios`
- [ ] Version is `1.0.0`
- [ ] Screenshots are uploaded
- [ ] Support URL works
- [ ] Privacy policy URL is live
- [ ] TestFlight build installs and launches correctly
- [ ] Review notes explain the app’s camera and location behavior

### 7) If you need to edit the version later
When you ship another update:

- [ ] Increment `ios.buildNumber`
- [ ] Bump the version only when you want a new App Store version
- [ ] Re-upload screenshots only if the UI changed materially
- [ ] Re-check the first 3 screenshots after every refresh

## 8) Release checklist

Before the final App Store submission, verify:

- [ ] `mobile/app.json` identifiers match the App Store record
- [ ] `ios.buildNumber` has been incremented for the new build
- [ ] `android.versionCode` has been incremented if Android is being shipped too
- [ ] App Store screenshots are uploaded
- [ ] Privacy policy URL is live
- [ ] Support contact details are correct
- [ ] TestFlight build works on a real device

## Helpful project files

- `mobile/app.json` — Expo app identity, permissions, and store metadata
- `mobile/eas.json` — build and submit profiles
- `mobile/BUILD_README.md` — local build/install instructions
- `mobile/package.json` — available mobile scripts

## Summary

The submission path for this app is:

1. Confirm identifiers in `mobile/app.json`
2. Build with EAS production
3. Submit with EAS
4. Complete App Store Connect metadata
5. Validate in TestFlight
6. Submit for App Review
