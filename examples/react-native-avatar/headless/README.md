# React Native Avatar (headless)

A React Native 0.88 demo app that embeds the Kaltura Agent avatar in a WebView. The avatar can be dragged around the screen and docked off the edge. It also calls native client tools, such as navigating between tabs and proposing a workout plan.

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
