# React Native Avatar (contained)

A React Native 0.88 demo app that embeds the Kaltura Agent avatar in a WebView in **contained** mode: the SDK renders the whole stage, controls included, and the app only hosts it. Tapping the draggable AI button opens the avatar full screen inside the safe area, and it closes itself when the session disconnects. It also calls native client tools, such as navigating between tabs and proposing a workout plan.

## Headless and contained

This repo has the same app in two variants. Pick the one that matches how you want to present the avatar.

| | [Headless](../headless) | Contained (this app) |
| --- | --- | --- |
| SDK call | `avatar.headless()` | `avatar.contained()` |
| What the SDK renders | The avatar video only | The whole stage, controls included |
| Avatar window | A small window, draggable and dockable at the screen edge | Full screen inside the safe area |
| Mute and end | Buttons the app draws in the page | Controls of the SDK stage |
| Session ends when | The member taps the app's end button | The SDK reports the `disconnecting` status |

Everything else is shared: the fitness-coach screens, the JSON bridge, the four client tools, and resuming the conversation thread. Both variants use the same agent (see [native-avatar-agent](../../native-avatar-agent)) and the same `.env` values, and both use the app ID `com.reactnativeavatar` (Android) and the same bundle ID prefix (iOS), so installing one replaces the other on the same device or simulator.

## Prerequisites

- Node.js `>= 22.11`
- Yarn 4 (pinned via `packageManager` in `package.json`). Enable it with Corepack: `corepack enable`
- Ruby and Bundler (iOS only, for CocoaPods)
- Xcode with an iOS Simulator (iOS only)
- Android Studio with an Android emulator or a connected device, and `JAVA_HOME` / `ANDROID_HOME` set (Android only)

See the React Native [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide if any of these are missing.

## Setup

1. Install JavaScript dependencies:

   ```sh
   yarn install
   ```

2. Create a `.env` file from the template (`cp .env.example .env`) and fill in your Kaltura Agent credentials:

   ```sh
   PARTNER_ID=<your partner id>
   WIDGET_ID=<your widget id>
   ```

   The values are read by [`react-native-config`](https://github.com/lugg/react-native-config) at build time. After changing `.env`, rebuild the native app, because a Metro reload is not enough.

3. iOS only: install CocoaPods dependencies. Run this on first clone and after updating native dependencies:

   ```sh
   bundle install
   cd ios && bundle exec pod install && cd ..
   ```

## Run

Start Metro in one terminal:

```sh
yarn start
```

Then build and launch the app from a second terminal.

### iOS

```sh
yarn ios
```

To pick a specific simulator:

```sh
yarn ios --simulator "iPhone 16"
```

You can also open `ios/ReactNativeAvatar.xcworkspace` in Xcode and press Run.

### Android

Start an emulator (or connect a device with USB debugging enabled), then:

```sh
yarn android
```

If you run on a physical device and Metro is unreachable, forward the port:

```sh
adb reverse tcp:8081 tcp:8081
```

You can also open the `android` folder in Android Studio and press Run.

## Release build

A release build bundles the JavaScript into the app, so it runs without Metro. The `.env` values are baked in at build time, so rebuild after changing them.

### Android

```sh
yarn android --mode release
```

This builds the release variant and installs it on the connected device or emulator. To only build the APK:

```sh
cd android && ./gradlew assembleRelease
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. In this example the release build is signed with the debug keystore and ProGuard is off, which is fine for testing but not for Google Play. For a store build, create your own keystore and signing configuration (see [Publishing to Google Play Store](https://reactnative.dev/docs/signed-apk-android)) and build a bundle with `./gradlew bundleRelease`. Never commit a keystore or its passwords.

### iOS

```sh
yarn ios --mode Release
```

For a physical device or the App Store, open `ios/ReactNativeAvatar.xcworkspace` in Xcode, choose your development team under **Signing & Capabilities**, and use **Product > Archive**.

## How it works

The avatar code is in [`src/components/avatar`](src/components/avatar):

- [`avatar-html.ts`](src/components/avatar/avatar-html.ts) renders the page for each session, with your IDs, the dynamic variables and the saved conversation thread written into it as JSON values. The page loads the avatar SDK and mounts it with `avatar.contained()`.
- [`use-avatar.ts`](src/components/avatar/use-avatar.ts) loads the page into the WebView with an `https` base URL and handles its messages. The page posts them with `window.ReactNativeWebView.postMessage(...)`, and the app answers by running `window.onToolResult`, `window.onScreenChanged` or `window.onAgentText` in the page. When the page reports the `disconnecting` status, the app closes the full-screen avatar.
- [`use-call-tool.ts`](src/components/avatar/use-call-tool.ts) and [`native-tools.ts`](src/components/avatar/native-tools.ts) run the agent's client tools: `get_training_summary`, `go_to`, `propose_workout_plan` and `get_plan_result`. `propose_workout_plan` answers as soon as the plan sheet opens, so the agent keeps talking. When the member saves or dismisses the sheet, the app sends the agent the text `[app event] plan_decided`, and the agent calls `get_plan_result` to read the decision.
- [`dynamic-variables.ts`](src/components/avatar/dynamic-variables.ts) and [`use-track-screen-change.ts`](src/components/avatar/use-track-screen-change.ts) send the member's name, goal, current screen and Progress tab to the agent, again whenever they change.
- The conversation thread ID is saved on the device (MMKV), so the next session resumes the conversation.

The full guide, with the bridge contract, client tools, permissions and lifecycle, is [Avatar in Native Apps](https://docs.kaltura.com/docs/conversational-agents/conversational-agents/integrations/native-apps).

## Other scripts

```sh
yarn lint   # eslint
yarn test   # jest
```

## Troubleshooting

- **The avatar stays on the loader or shows an error:** check that `PARTNER_ID` and `WIDGET_ID` in `.env` are correct, then rebuild the app (`yarn ios` / `yarn android`).
- **iOS build fails after pulling changes:** re-run `cd ios && bundle exec pod install`.
- **Android build fails with a stale cache:** run `cd android && ./gradlew clean`, then `yarn android`.
- **Metro serves old code:** restart it with `yarn start --reset-cache`.
- **`yarn install` complains about the Yarn version or `command not found`:** run `corepack enable` so the pinned Yarn 4 version is used.

More help is in the React Native [Troubleshooting](https://reactnative.dev/docs/troubleshooting) guide.
