# Kaltura Embeds Docs: Examples

Runnable examples for building with Kaltura embeds: conversational avatars, chat and Dynamic UI, in web pages and native apps.

Each example is self-contained: its own folder, its own README with the exact setup and run commands. Bring your own Kaltura IDs through a local `.env` file; nothing account-specific is committed.

Documentation: [docs.kaltura.com](https://docs.kaltura.com/docs/conversational-agents/conversational-agents)

## Examples

| Example | What it shows | Docs |
| --- | --- | --- |
| [react-native-avatar/headless](examples/react-native-avatar/headless) | A React Native (iOS and Android) fitness-coach app with the avatar hosted in a WebView in headless mode: the SDK renders only the avatar video, shown in a draggable, dockable window over the app's own screens, with mute and end buttons that the app draws in the page. A JSON bridge between the page and native code, client tools that switch tabs and open a workout-plan sheet, and resuming a conversation. | [Avatar in Native Apps](https://docs.kaltura.com/docs/conversational-agents/conversational-agents/integrations/native-apps) |
| [react-native-avatar/contained](examples/react-native-avatar/contained) | The same app in contained mode: the SDK renders the whole stage, controls included, and the app opens it full screen inside the safe area and closes it when the session disconnects. Same bridge, client tools and conversation resume as the headless variant. | [Avatar in Native Apps](https://docs.kaltura.com/docs/conversational-agents/conversational-agents/integrations/native-apps) |
| [native-android-avatar/headless](examples/native-android-avatar/headless) | The same fitness-coach app as a native Android app (Kotlin and Jetpack Compose), with the avatar in a WebView in headless mode: a draggable, dockable window with mute and end buttons drawn in the page, the same page and JSON bridge, the same four client tools, and conversation resume. | [Avatar in Native Apps](https://docs.kaltura.com/docs/conversational-agents/conversational-agents/integrations/native-apps) |
| [native-android-avatar/contained](examples/native-android-avatar/contained) | The same native Android app in contained mode: the SDK renders the whole stage, controls included, and the app opens it full screen inside the safe area and closes it when the session disconnects. Same bridge, client tools and conversation resume as the headless variant. | [Avatar in Native Apps](https://docs.kaltura.com/docs/conversational-agents/conversational-agents/integrations/native-apps) |
| [native-ios-avatar/headless](examples/native-ios-avatar/headless) | The same fitness-coach app as a native iOS app (Swift and SwiftUI), with the avatar in a WKWebView in headless mode: a draggable, dockable window with mute and end buttons drawn in the page, the same page and JSON bridge, the same four client tools, and conversation resume. | [Avatar in Native Apps](https://docs.kaltura.com/docs/conversational-agents/conversational-agents/integrations/native-apps) |
| [native-ios-avatar/contained](examples/native-ios-avatar/contained) | The same native iOS app in contained mode: the SDK renders the whole stage, controls included, and the app opens it full screen inside the safe area and closes it when the session disconnects. Same bridge, client tools and conversation resume as the headless variant. | [Avatar in Native Apps](https://docs.kaltura.com/docs/conversational-agents/conversational-agents/integrations/native-apps) |
| [native-avatar-agent](examples/native-avatar-agent) | The agent behind the avatar examples: four client tools, prompts, persona and the scenario flow, plus instructions for an AI assistant to create the agent on your partner. Set this up first, then put the new agent's ID in the app's `.env`. | [Avatar in Native Apps](https://docs.kaltura.com/docs/conversational-agents/conversational-agents/integrations/native-apps) |

## Running an example

1. Create the agent the example talks to (for the avatar examples, follow [native-avatar-agent](examples/native-avatar-agent)). The React Native, native Android and native iOS apps all use the same agent.
2. Copy the example's `.env.example` to `.env` and fill in your IDs.
3. Follow the example's own README: prerequisites and run commands differ per example (for instance, the React Native app needs Node 22.11 or later, Yarn 4 and an iOS or Android toolchain, the native Android app needs Android Studio, and the native iOS app needs Xcode 16 or later).

```bash
cd examples/<name>/<variant>
cp .env.example .env    # fill in your IDs
```

## Adding an example

1. Create `examples/<kebab-case-name>/`. If the example comes in variants, such as headless and contained, give each variant its own subfolder.
2. Keep it runnable on its own, and document every prerequisite and command in its README. Add no dependencies unless the example is about them.
3. Read every account-specific value (widget ID, partner ID, hosts) from `.env`, and commit a `.env.example` that lists them with comments. Never commit `.env`, a KS, or a secret.
4. Use fictional brands, people and data in scenarios.
5. Write a `README.md` with these sections: what it shows, run it, configuration, how it works, and a link to the matching docs page.
6. Add a row to the table above.

## Layout

```
kaltura-embeds-docs/
├── README.md
└── examples/
    ├── native-android-avatar/
    │   ├── headless/            native Android app (Kotlin, Compose), headless avatar
    │   └── contained/           native Android app (Kotlin, Compose), contained avatar
    ├── native-avatar-agent/     agent setup shared by the avatar examples
    ├── native-ios-avatar/
    │   ├── headless/            native iOS app (Swift, SwiftUI), headless avatar
    │   └── contained/           native iOS app (Swift, SwiftUI), contained avatar
    └── react-native-avatar/
        ├── headless/            React Native app, headless avatar
        └── contained/           React Native app, contained avatar
```
