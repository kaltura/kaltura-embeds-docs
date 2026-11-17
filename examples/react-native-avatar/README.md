# Avatar in a native app WebView

A native iOS, Android or React Native app hosts a Kaltura conversational avatar in a WebView. The WebView loads a small page (`avatar/`) that mounts the avatar and talks to native code over a JSON bridge. Native code supplies the agent's widget ID (and a saved thread ID to continue a conversation), the microphone, the app's context and the native actions. The page initializes the agent session itself.

This example has two parts:

```
react-native-avatar/
├── avatar/          ← the page the native WebView loads. Copy this to your HTTPS host.
├── index.html       ← a browser simulator of the native app (phone + log)
├── host/            ← the simulator's "native" code: same logic a Swift / Kotlin app runs
├── agent/           ← client tools, prompts and persona to configure on your agent
├── server.mjs       ← zero-dependency static server; serves .env values as /config.json
└── .env.example
```

Full guide, with iOS, Android and React Native code: [Avatar in Native Apps](https://docs.kaltura.com/docs/conversational-agents/conversational-agents/integrations/native-apps).

## Two embeds

The app picks the embed for each session (the `embed` field of the `start` message). Switch between them in the simulator panel.

| | Headless | Contained |
| --- | --- | --- |
| Use it when | The avatar **works with your app's content**: reads app data, opens native screens, pre-fills native forms | The avatar **also creates the content**: answers with Dynamic UI (cards, charts, lists, video) |
| The WebView shows | Only the avatar video | Avatar video, captions, Dynamic UI answers and built-in controls |
| Layout | Small floating, draggable card over the app | Full screen (or a large sheet) |
| Controls | Native: mute, end, resume | Built into the embed; native adds a close button |

Client tools and dynamic variables work the same with both. Dynamic UI answers appear only for agents that have Dynamic UI turned on.

## Run it

Requires Node 20.6+ and an avatar agent of your own. No IDs are stored in the repo.

```bash
cd examples/react-native-avatar
cp .env.example .env     # set WIDGET_ID and PARTNER_ID
npm start                # http://localhost:4311
```

| Variable | Required | Description |
| --- | --- | --- |
| `WIDGET_ID` | yes | Widget (agent) ID of the avatar |
| `PARTNER_ID` | yes | Kaltura partner ID that owns the widget (number) |
| `PORT` | no | Default `4311` |
| `KALTURA_API_URL` | no | Default `https://www.kaltura.com/api_v3`; change for other regions |
| `AVATAR_API_URL` | no | Default `https://api.avatar.us.kaltura.ai`; change for other regions |

Open it in a desktop browser and allow the microphone. The **Fake agent** buttons in the simulator panel call the same native handlers an agent would, so you can try the screens without configuring the agent.

## Agent setup

Client tools are optional, and there's no required set: these four are the example's own, for its fictional fitness-coach app. To run the scenario as written, the agent needs them in its configuration, and prompts that tell it when to use them:

- [`agent/client-tools.json`](agent/client-tools.json): the four client tools, `get_training_summary`, `go_to`, `propose_workout_plan` and `get_plan_result`. Names and argument names must match exactly (case-sensitive). Turn on **Wait for response** for all of them except `propose_workout_plan`, which returns as soon as the sheet opens so the agent can keep talking; the app then sends the text `[app event] plan_decided` and the agent calls `get_plan_result`.
- [`agent/prompt-knowledge.md`](agent/prompt-knowledge.md): persona, the flow and the facts the agent may use.
- [`agent/prompt-app-tools.md`](agent/prompt-app-tools.md): when and how to use each tool, reading the `{{currentScreen}}`, `{{progressPeriod}}`, `{{memberName}}` and `{{goal}}` dynamic variables the app sends.
- [`agent/persona.md`](agent/persona.md): the agent's name, goal, target audience, restricted topics and opening phrase.
- [`agent/flow.md`](agent/flow.md): the full scenario: screens, tool contracts, mock data and the conversation script.

To apply them, follow [`agent/README.md`](agent/README.md). It creates a new agent for you through the Kaltura APIs with your partner ID and admin secret (kept in `.env`, never pasted into chat), and has a prompt you can give to an AI assistant plus step-by-step instructions written for AI agents.

Note: the app code in this folder (`host/`, `avatar/`) does not implement these tools yet; it still has the handlers of an earlier scenario. The fitness screens and handlers are the next step.

## The scenario

A member of a (fictional) training app says "I work hard but I'm not getting anywhere":

1. **Numbers.** The agent calls `get_training_summary` (`period: last_week`). The app returns what it has: workouts done and planned, active minutes, average intensity, rest days, and the longest run of hard days. The agent says them.
2. **Navigate.** The agent says "Let me show you" and calls `go_to` (`destination: progress`, `period: last_week`). The app opens its native Progress screen on that tab, and the agent explains the cause: hard days back to back with no rest.
3. **Fill the app's own form.** The agent calls `propose_workout_plan` (for example `mon,wed,fri`, `18:00`, `moderate`). The app opens a bottom sheet pre-filled; the member can edit it and tap **Save** or **Dismiss**, and the app answers with the saved values or `{ saved: false }`.

## Bridge contract

All messages are JSON objects with a `type`.

**native → page**: `window.avatarBridge.receive(message)`

| type | fields | effect |
| --- | --- | --- |
| `start` | `widgetId`, `partnerId`, `embed`, `dynamicVariables`, `threadId?`, `kickOffPhrase?` | Create the workspace (once), mount `embed` (required: `headless` or `contained`), initialize the agent session (new, or continuing `threadId`) and connect |
| `end` | — | Disconnect and unmount; frees the microphone |
| `mute` / `unmute` | — | Mute or unmute the user's microphone |
| `updateVariables` | `variables` | Replace the agent's dynamic variables. Always send the full set |
| `toolResult` | `id`, `result` | Answer a `toolCall` |

**page → native**: `postToNative()` in `avatar/avatar.js` picks the channel per platform (`webkit.messageHandlers.avatarBridge`, `window.AvatarBridge`, `window.ReactNativeWebView`, or `postMessage` to the parent frame in the simulator)

| type | fields |
| --- | --- |
| `ready` | — the page loaded; don't send before this |
| `status` | `status`: `connecting` \| `connected` \| `disconnected` \| `error` |
| `audio` | `muted`, `isSpeaking` |
| `thread` | `threadId`: save it to resume the conversation |
| `toolInvoked` | `name`, `args` (informational) |
| `toolCall` | `id`, `name`, `args`: run it and reply with `toolResult` |
| `disconnected` | `reason` |
| `error` / `jsError` | `message` |

## How the simulator maps to a real app

| Simulator (`host/host.js`) | iOS | Android |
| --- | --- | --- |
| `<iframe>` | `WKWebView` | `android.webkit.WebView` |
| `sendToWebView()` | `evaluateJavaScript` | `evaluateJavascript` |
| `window` `message` listener | `WKScriptMessageHandler` | `@JavascriptInterface` |
| `localStorage` (thread ID) | `UserDefaults` | `SharedPreferences` |
| `appInit()` | `URLSession` at launch | OkHttp / Ktor at launch |
| Drag (pointer events) | `UIPanGestureRecognizer` | `OnTouchListener` / `detectDragGestures` |
| "Send app to background" | `didEnterBackgroundNotification` → `end` | `ProcessLifecycleOwner` `onStop` → `end` |

## Notes

- **Sessions.** The page starts an anonymous agent session from the widget ID; the app only decides whether it's new or continues a saved thread. That fits public information, or an agent that verifies the user during the conversation (for example with a one-time password). When the app already knows the user, pass a short-lived token of your own as a dynamic variable for the agent to use in that session. Never ship admin or App Token secrets in the app.
- **HTTPS.** Microphone access needs a secure context. Serve `avatar/` over HTTPS (or `localhost`). Over plain `http://` on a LAN IP, `avatar/webview.html` polyfills `crypto.randomUUID` so the runtime loads, but the microphone still won't work.
- **Keep the WebView laid out.** Hide it with opacity, not `display: none` or a zero size, or the OS may not grant the microphone and WebRTC may not start.
- **Tool arguments are untrusted.** They come from a language model: validate them and map them onto fixed lists, as `handleToolCall()` in `host/host.js` does.
