# Native iOS Avatar (headless)

A native iOS demo app (Swift and SwiftUI) that embeds the Kaltura Agent avatar in a WKWebView in **headless** mode: the SDK renders only the avatar video, and the app draws everything around it. The avatar sits in a small window that can be dragged around the screen and docked off the edge, with mute and end buttons drawn by the app. It also calls native client tools, such as navigating between tabs and proposing a workout plan.

This is the native counterpart of [react-native-avatar/headless](../../react-native-avatar/headless): the same fitness-coach screens, the same page and JSON bridge, the same four client tools, and the same agent (see [native-avatar-agent](../../native-avatar-agent)).

## Prerequisites

- Xcode 16 or later (the project uses a synchronized folder, so every file under `Avatar/` is part of the app automatically)
- An iOS 17 or later Simulator, or an iPhone, with a microphone for the voice conversation
- For a physical iPhone: an Apple developer team to sign with

The app is iPhone only and portrait only.

## Setup

1. Create a `.env` file from the template (`cp .env.example .env`) and fill in your Kaltura Agent credentials:

   ```sh
   PARTNER_ID=<your partner id>
   WIDGET_ID=<your widget id>
   ```

   Use plain `KEY=value` lines: no quotes and no comments, because Xcode reads the file as a build settings file (`Config.xcconfig` includes it). The values end up in the app's `Info.plist` at build time, so rebuild after changing them. If Xcode keeps the old values, choose **Product > Clean Build Folder** first. Without a `.env` file (for example in CI), pass them on the command line: `xcodebuild ... PARTNER_ID=123 WIDGET_ID=abc`. If neither is set, the app shows a "Set PARTNER_ID and WIDGET_ID" message instead of the avatar.

## Run

Open `Avatar.xcodeproj` in Xcode, choose a Simulator and press Run. The first time you open the avatar, allow microphone access.

To run on a physical iPhone, select the **Avatar** target, open **Signing & Capabilities**, choose your team, and pick your device. The bundle identifier is `com.kaltura.avatar`; change it if it is already taken for your team.

From a terminal you can build for the Simulator with:

```sh
xcodebuild -project Avatar.xcodeproj -scheme Avatar \
  -destination 'platform=iOS Simulator,name=iPhone 17' build
```

## Release build

In Xcode, choose **Product > Scheme > Edit Scheme**, select **Run**, set **Build Configuration** to **Release**, and run. From a terminal:

```sh
xcodebuild -project Avatar.xcodeproj -scheme Avatar -configuration Release \
  -destination 'platform=iOS Simulator,name=iPhone 17' build
```

Release builds are optimized and do not forward the page's console to Xcode or enable Safari's Web Inspector for the web view, so test one before you ship. The `.env` values are baked in at build time, so rebuild after changing them.

For a physical device or the App Store, set your team under **Signing & Capabilities**, choose **Any iOS Device** and use **Product > Archive**. Never commit certificates, provisioning profiles or their passwords.

## How it works

- The app loads [`avatar.html`](Avatar/Resources/avatar.html) into a WKWebView and fills in your IDs, the current screen and the saved conversation thread. The page loads the avatar SDK and mounts it with `avatar.headless()`.
- The page and the app talk through a JSON bridge: the page calls `window.webkit.messageHandlers.avatar.postMessage(...)`, and the app answers by running `window.onToolResult`, `window.onScreenChanged` or `window.onAgentText` in the page.
- The agent's client tools are `get_training_summary`, `go_to`, `propose_workout_plan` and `get_plan_result`. `propose_workout_plan` answers as soon as the plan sheet opens, so the agent keeps talking. When the member saves or dismisses the sheet, the app sends the agent the text `[app event] plan_decided`, and the agent calls `get_plan_result` to read the decision.
- The conversation thread ID is saved on the device, so the next session resumes the conversation. The end button clears it.

## Troubleshooting

- **The avatar shows "Set PARTNER_ID and WIDGET_ID in .env":** create `.env` as described in [Setup](#setup), clean the build folder and rebuild.
- **The avatar stays on the loader or shows an error:** check that `PARTNER_ID` and `WIDGET_ID` in `.env` are correct, then rebuild the app. In debug builds the page's console messages and errors appear in the Xcode console with an `Avatar |` prefix, and you can inspect the web view in Safari's **Develop** menu.
- **The avatar does not hear you:** allow microphone access for the app in the iOS settings.
- **Signing fails on a device:** select your team under **Signing & Capabilities**.
- **Xcode shows stale code or settings:** choose **Product > Clean Build Folder**.
