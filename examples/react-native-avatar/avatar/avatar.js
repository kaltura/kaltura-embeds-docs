// =============================================================================
// The page a native app loads inside its WebView. Copy this folder to your own
// HTTPS host. It mounts the avatar (headless or contained, chosen per session by
// the app) and talks to native code over a small JSON bridge.
//
//   native -> page : window.avatarBridge.receive(message)   (evaluateJavaScript)
//   page -> native : postToNative(message)                  (script message handler)
//
// The full message contract is in ../README.md.
// =============================================================================

const LOADER_URL = 'https://unisphere.nvp1.ovp.kaltura.com/v1/loader/index.esm.js';

// ---- page -> native: pick the channel the host provides ---------------------
function postToNative(message) {
  const json = JSON.stringify(message);
  if (window.webkit?.messageHandlers?.avatarBridge) {
    window.webkit.messageHandlers.avatarBridge.postMessage(message); // iOS WKWebView
  } else if (window.AvatarBridge) {
    window.AvatarBridge.postMessage(json); // Android addJavascriptInterface
  } else if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(json); // React Native / Expo
  } else {
    window.parent.postMessage({ avatarBridge: true, message }, '*'); // browser iframe (the simulator)
  }
}

// ---- avatar lifecycle --------------------------------------------------------
let avatar = null;   // apis.genieAvatar, created once per page load
let mounted = null;  // { remove } of the current mount
const pendingToolCalls = new Map();

async function getAvatar({ ks, widgetId, partnerId }) {
  if (avatar) return avatar;

  const { embeds } = await import(LOADER_URL);
  const { apis } = await embeds.workspace({
    apis: [{
      name: 'genieAvatar',
      settings: {
        openingPhrase: 'start the session',
        captions: { enable: true }, // shown by contained; headless renders no UI
        theme: { type: 'light' },   // contained only
      },
    }],
    // Use the KS from the app when there is one; otherwise fall back to the widget ID.
    session: ks ? { ks, partnerId } : { widgetId, partnerId },
  });
  avatar = apis.genieAvatar;

  avatar.connectionStatus.onChanges((status) => postToNative({ type: 'status', status }), { replayLastValue: true });
  avatar.audioState.onChanges(({ muted, isSpeaking }) => postToNative({ type: 'audio', muted, isSpeaking }), { replayLastValue: true });
  avatar.disconnectData.onChanges((data) => {
    if (data) postToNative({ type: 'disconnected', reason: data.reason });
  });

  // agent -> app: forward each client tool call to native code and return its result to the agent.
  // The names must match the client tools configured on the agent (case-sensitive): see ../agent/client-tools.json.
  const forward = (name) => (args) => {
    postToNative({ type: 'toolInvoked', name, args });
    return callNative(name, args ?? {});
  };
  avatar.registerClientTools({
    get_energy_summary: forward('get_energy_summary'),
    go_to: forward('go_to'),
    propose_charging_schedule: forward('propose_charging_schedule'),
  });

  return avatar;
}

function callNative(name, args) {
  // No crypto.randomUUID dependency, so this also works in insecure WebViews.
  const id = `call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return new Promise((resolve) => {
    pendingToolCalls.set(id, resolve);
    postToNative({ type: 'toolCall', id, name, args });
    // Keep this under the tool's timeout on the agent (120 s for propose_charging_schedule,
    // because the user has to tap Save).
    setTimeout(() => {
      if (pendingToolCalls.delete(id)) resolve({ ok: false, error: 'native did not answer' });
    }, 110000);
  });
}

async function start({ ks, widgetId, partnerId, embed, dynamicVariables, threadId, kickOffPhrase }) {
  try {
    const mount = { headless: mountHeadless, contained: mountContained }[embed];
    if (!mount) throw new Error(`embed must be "headless" or "contained", got ${JSON.stringify(embed)}`);
    const api = await getAvatar({ ks, widgetId, partnerId });
    mounted?.remove();

    const root = document.getElementById('avatar-root');
    root.className = embed;
    mounted = mount(api, {
      dynamicVariables,                                              // app -> agent: initial context
      context: threadId ? { type: 'thread', threadId } : undefined,  // new session, or continue a thread
      kickOffPhrase,
      onThreadIdChange: (id) => postToNative({ type: 'thread', threadId: id }),
    });
  } catch (error) {
    postToNative({ type: 'error', message: String(error?.message || error) });
  }
}

// ---- embeds ------------------------------------------------------------------
// The avatar works with the app's content: video only, every control is native.
function mountHeadless(api, connect) {
  return api.headless({
    elementId: 'avatar-root',
    autoConnect: true, // your app's button starts the session
    connect,
  });
}

// The avatar also creates the content: stage, captions, controls and Dynamic UI inside the WebView.
function mountContained(api, connect) {
  return api.contained({
    elementId: 'avatar-root',
    autoConnect: true,            // your app's button starts the session, not the embed's own button
    stageMode: 'contained',       // keep the stage inside the WebView
    forceOrientation: 'portrait', // stack the avatar above its answers on a phone
    connect,
  });
}

function end() {
  avatar?.disconnect();
  mounted?.remove();
  mounted = null;
}

// ---- native -> page ----------------------------------------------------------
window.avatarBridge = {
  receive(message) {
    switch (message.type) {
      case 'start':
        return start(message);
      case 'end':
        return end();
      case 'mute':
        return avatar?.mute();
      case 'unmute':
        return avatar?.unmute();
      case 'updateVariables':
        return avatar?.updateDynamicVariables(message.variables);
      case 'toolResult': {
        const resolve = pendingToolCalls.get(message.id);
        pendingToolCalls.delete(message.id);
        return resolve?.(message.result ?? { ok: true });
      }
    }
  },
};

// Report anything that goes wrong inside the WebView to the native log.
window.addEventListener('error', (e) => postToNative({ type: 'jsError', message: e.message }));
window.addEventListener('unhandledrejection', (e) =>
  postToNative({ type: 'jsError', message: String(e.reason?.message || e.reason) }));

postToNative({ type: 'ready' });
