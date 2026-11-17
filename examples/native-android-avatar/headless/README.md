# Native Android Avatar (headless)

A native Android demo app (Kotlin and Jetpack Compose) that embeds the Kaltura Agent avatar in a WebView in **headless** mode: the SDK renders only the avatar video, and the app draws everything around it. The avatar sits in a small window that can be dragged around the screen and docked off the edge, with mute and end buttons drawn by the app. It also calls native client tools, such as navigating between tabs and proposing a workout plan.

This is the native counterpart of [react-native-avatar/headless](../../react-native-avatar/headless): the same fitness-coach screens, the same page and JSON bridge, the same four client tools, and the same agent (see [native-avatar-agent](../../native-avatar-agent)).

## Prerequisites

- Android Studio, with an Android emulator or a connected device (USB debugging enabled)
- The JDK that `gradle/gradle-daemon-jvm.properties` asks for (currently 25). Android Studio and Gradle can provision it
- `ANDROID_HOME` set to your Android SDK (Android Studio creates `local.properties` for you when you open the project)
- A device or emulator on Android 7.0 (API 24) or later, with a microphone for the voice conversation

## Setup

1. Create a `.env` file from the template (`cp .env.example .env`) and fill in your Kaltura Agent credentials:

   ```sh
   PARTNER_ID=<your partner id>
   WIDGET_ID=<your widget id>
   ```

   Gradle reads the file at build time and turns the values into `BuildConfig.PARTNER_ID` and `BuildConfig.WIDGET_ID`. After changing `.env`, rebuild the app. Without a `.env` file (for example in CI), Gradle falls back to the `-PPARTNER_ID=...` and `-PWIDGET_ID=...` properties, then to environment variables of the same names. If neither is set, the build prints a warning and the app shows a "Set PARTNER_ID and WIDGET_ID" message instead of the avatar.

## Run

Open this folder in Android Studio, pick a device and press Run. Or, from a terminal with an emulator running or a device connected:

```sh
./gradlew installDebug
```

Then start **Avatar** from the launcher. The first time you open the avatar, grant the microphone permission.

## Release build

To build the release variant and install it on the connected device or emulator:

```sh
./gradlew installRelease
```

To only build the APK, run `./gradlew assembleRelease`. It is written to `app/build/outputs/apk/release/app-release.apk`.

Release builds run R8 (shrinking and obfuscation, configured in `app/src/main/keepRules/rules.keep`), so test a release build before you ship it. The `.env` values are baked in at build time, so rebuild after changing them.

In this example the release build is signed with the debug keystore, so it can be installed for testing. That is not suitable for Google Play: create your own keystore and signing configuration (in Android Studio use **Build > Generate Signed App Bundle / APK**, or replace the `signingConfig` in `app/build.gradle.kts`) and build a bundle with `./gradlew bundleRelease`. Never commit a keystore or its passwords.

## How it works

- The app loads [`avatar.html`](app/src/main/assets/avatar.html) into a WebView and fills in your IDs, the current screen and the saved conversation thread. The page loads the avatar SDK and mounts it with `avatar.headless()`.
- The page and the app talk through a JSON bridge: the page calls `AndroidBridge.postMessage(...)`, and the app answers by running `window.onToolResult`, `window.onScreenChanged` or `window.onAgentText` in the page.
- The agent's client tools are `get_training_summary`, `go_to`, `propose_workout_plan` and `get_plan_result`. `propose_workout_plan` answers as soon as the plan sheet opens, so the agent keeps talking. When the member saves or dismisses the sheet, the app sends the agent the text `[app event] plan_decided`, and the agent calls `get_plan_result` to read the decision.
- The conversation thread ID is saved on the device, so the next session resumes the conversation. The end button clears it.

## Troubleshooting

- **The avatar shows "Set PARTNER_ID and WIDGET_ID in .env":** create `.env` as described in [Setup](#setup), then rebuild.
- **The avatar stays on the loader or shows an error:** check that `PARTNER_ID` and `WIDGET_ID` in `.env` are correct, then rebuild the app. WebView console messages and page errors appear in Logcat under the `Avatar` tag.
- **The avatar does not hear you:** allow the microphone permission for the app in the Android settings.
- **Gradle fails with a stale cache:** run `./gradlew clean`, then build again.
- **Gradle cannot find the SDK:** set `ANDROID_HOME`, or open the project once in Android Studio so it writes `local.properties`.
