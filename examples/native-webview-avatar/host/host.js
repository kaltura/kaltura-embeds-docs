// =============================================================================
// Native side (simulated). Everything here maps 1:1 to what the real iOS /
// Android app does — see ../README.md for Swift / Kotlin equivalents:
//
//   appInit()        -> URLSession / OkHttp calls at app launch
//   WebView iframe   -> WKWebView / android.webkit.WebView (floating, draggable)
//   sendToWebView()  -> webView.evaluateJavaScript("window.avatarBridge.receive(...)")
//   window 'message' -> WKScriptMessageHandler / @JavascriptInterface
//   localStorage     -> UserDefaults / SharedPreferences
// =============================================================================

// widgetId / partnerId / API urls come from the server's .env via /config.json — nothing is hardcoded.
// (In a real app this is your build config or backend.)
const configPromise = fetch('./config.json').then((r) => {
  if (!r.ok) throw new Error('config.json not available — start the demo with `npm start` (see README)');
  return r.json();
});
const THREAD_KEY = 'avatarDemo.threadId';

const $ = (id) => document.getElementById(id);
const phone = $('phone');
const floatEl = $('float');
const webview = $('webview');

let state = 'idle'; // idle | connecting | live | paused
let embed = 'headless'; // embed of the current session: headless | contained (picked in the simulator panel)
let muted = false;
let view = 'energy';
let period = 'last_month'; // period shown on the Energy screen

// ---- 1. App init: mint a KS + fetch static avatar media ---------------------
async function appInit() {
  const post = (url, body, headers = {}) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: body && JSON.stringify(body) }).then((r) => r.json());

  const { widgetId, kalturaApiUrl, avatarApiUrl } = await configPromise;
  const { ks } = await post(`${kalturaApiUrl}/service/session/action/startWidgetSession`, { widgetId, format: 1 });
  const init = await post(`${avatarApiUrl}/v1/application/appInit`, undefined, { Authorization: `KS ${ks}` });
  const avatar = init.avatars?.[0];
  return { ks, previewImageUrl: avatar?.previewImageUrl, loadingVideoUrl: avatar?.loadingVideoUrl };
}

const initPromise = appInit()
  .then((init) => {
    if (init.previewImageUrl) $('preview').src = init.previewImageUrl;
    if (init.loadingVideoUrl) {
      $('loading-video').src = init.loadingVideoUrl;
      $('loading-img').src = init.loadingVideoUrl;
    }
    log('sys', 'appInit ok (ks + preview image + loading media)');
    return init;
  })
  .catch((e) => {
    log('sys', `appInit failed (${e}); WebView falls back to widgetId`);
    return null;
  });

// `loadingVideoUrl` may be a video or a static image — try both, use whichever loads.
const loadingOk = { video: false, image: false };
$('loading-video').addEventListener('canplay', () => ((loadingOk.video = true), renderLoading()));
$('loading-img').addEventListener('load', () => ((loadingOk.image = true), renderLoading()));

function renderLoading() {
  const connecting = state === 'connecting';
  const video = $('loading-video');
  video.hidden = !(connecting && loadingOk.video);
  $('loading-img').hidden = !(connecting && loadingOk.image && !loadingOk.video);
  if (connecting && loadingOk.video) video.play().catch(() => {});
  else video.pause();
}

// ---- 2. Bridge ---------------------------------------------------------------
let markReady;
const webReady = new Promise((r) => (markReady = r));
webview.src = './avatar/webview.html'; // pre-warm the WebView at launch

function sendToWebView(message) {
  log('out', message);
  webview.contentWindow.avatarBridge?.receive(message); // = evaluateJavaScript
}

window.addEventListener('message', (e) => {
  if (e.source !== webview.contentWindow || !e.data?.avatarBridge) return;
  handleWebMessage(e.data.message);
});

function handleWebMessage(msg) {
  log('in', msg);
  switch (msg.type) {
    case 'ready':
      return markReady();
    case 'status':
      if (msg.status === 'connecting') setState('connecting');
      else if (msg.status === 'connected') setState('live');
      else if (['disconnected', 'error'].includes(msg.status) && ['connecting', 'live'].includes(state)) afterSessionEnded();
      return;
    case 'audio':
      muted = msg.muted;
      $('badge').textContent = msg.isSpeaking ? '🔊 speaking' : state === 'live' ? '● live' : '';
      return renderControls();
    case 'thread': // session id: persist so the user can resume later
      localStorage.setItem(THREAD_KEY, msg.threadId);
      return renderMeta();
    case 'toolCall': // agent -> host
      return handleToolCall(msg);
    case 'toolInvoked': // already logged above; nothing else to do
      return;
    case 'jsError':
      return toast(`WebView JS error: ${msg.message}`);
    case 'disconnected':
      if (msg.reason !== 'UserRequested') toast(`Session ended: ${msg.reason}`);
      return;
    case 'error':
      toast(`Avatar error: ${msg.message}`);
      return afterSessionEnded();
  }
}

// ---- 3. Agent -> native: client tools ---------------------------------------
// Three tools, configured on the agent (see ../agent/client-tools.json):
//   get_energy_summary          the agent reads numbers the app already has and says them
//   go_to                       the agent opens a native screen from a fixed list
//   propose_charging_schedule   the agent pre-fills a native form; the answer comes when the user taps Save

// Data the app already has (a real app reads this from its own backend).
const ENERGY = {
  last_month: { producedKwh: 912, exportedPct: 56, eveningUsageChangePct: 38 },
  this_month: { producedKwh: 406, exportedPct: 52, eveningUsageChangePct: 31 },
};
// Fixed destination list the agent may pick from. `match` makes parsing forgiving ("EV charger" -> ev_charger).
const SCREENS = {
  energy: { view: 'energy', match: 'energy' },
  ev_charger: { view: 'charger', match: 'charger' },
  schedule: { view: 'schedule', match: 'schedule' },
};
const norm = (v) => String(v ?? '').toLowerCase().trim().replace(/[\s-]+/g, '_');
const reply = (id, result) => sendToWebView({ type: 'toolResult', id, result });
const fail = (id, error) => reply(id, { ok: false, error });

let pendingSchedule = null; // tool call id while the user is looking at a proposed schedule

function handleToolCall({ id, name, args = {} }) {
  switch (name) {
    case 'get_energy_summary': {
      const period = norm(args.period) || 'last_month';
      if (!ENERGY[period]) return fail(id, `unknown period "${period}"; use ${Object.keys(ENERGY).join(' or ')}`);
      return reply(id, { ok: true, period, ...ENERGY[period] });
    }
    case 'go_to': {
      const dest = norm(args.destination);
      const key = Object.keys(SCREENS).find((k) => dest.includes(SCREENS[k].match));
      if (!key) return fail(id, `unknown destination "${dest}"; use ${Object.keys(SCREENS).join(', ')}`);
      if (key === 'energy' && args.period) {
        const period = norm(args.period);
        if (!ENERGY[period]) return fail(id, `unknown period "${period}"; use ${Object.keys(ENERGY).join(' or ')}`);
        setPeriod(period);
      }
      showView(SCREENS[key].view);
      toast(`Assistant opened → ${key}`);
      return reply(id, { ok: true, destination: key });
    }
    case 'propose_charging_schedule': {
      const days = norm(args.days);
      if (!['weekdays', 'weekends', 'daily'].includes(days)) return fail(id, `unknown days "${days}"; use weekdays, weekends or daily`);
      const [start, end] = [String(args.start ?? ''), String(args.end ?? '')];
      if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return fail(id, 'start and end must be HH:MM, e.g. 23:00');
      resolveSchedule(false); // a newer proposal replaces an unanswered one
      $('f-days').value = days;
      $('f-start').value = start;
      $('f-end').value = end;
      $('f-pv').checked = String(args.excess_pv ?? true) !== 'false';
      pendingSchedule = id;
      showView('schedule');
      toast('Assistant suggested a schedule');
      return; // no reply yet: it is sent when the user taps Save (or leaves the screen)
    }
    default:
      return fail(id, `unknown tool: ${name}`);
  }
}

// Answers the pending propose_charging_schedule call. saved=false when the user left without saving.
function resolveSchedule(saved, schedule) {
  if (pendingSchedule === null) return;
  const id = pendingSchedule;
  pendingSchedule = null;
  $('prefill-note').hidden = true;
  reply(id, saved ? { ok: true, saved: true, ...schedule } : { ok: true, saved: false });
}

$('schedule-form').onsubmit = (e) => {
  e.preventDefault();
  const schedule = { days: $('f-days').value, start: $('f-start').value, end: $('f-end').value, excess_pv: $('f-pv').checked };
  const dayLabel = $('f-days').selectedOptions[0].textContent;
  $('c-schedule').textContent = `${dayLabel} ${schedule.start}–${schedule.end}${schedule.excess_pv ? ' · Excess PV' : ''}`;
  resolveSchedule(true, schedule);
  toast('Schedule saved');
};

// ---- 4. Native -> agent: screen context -------------------------------------
// Sent as dynamic variables at start and on every screen or period change; the agent prompt reads
// {{currentScreen}} and {{energyPeriod}}. updateDynamicVariables replaces the whole set, so always send both.
function screenContext() {
  return { currentScreen: $(`page-${view}`).dataset.title, energyPeriod: period };
}
function sendContext() {
  if (state === 'live') sendToWebView({ type: 'updateVariables', variables: screenContext() });
}

// ---- 5. Screens + menu --------------------------------------------------------
function showView(next) {
  if (next !== 'schedule') resolveSchedule(false); // left the proposed schedule without saving
  view = next;
  document.querySelectorAll('.page').forEach((p) => (p.hidden = p.id !== `page-${next}`));
  $('title').textContent = $(`page-${next}`).dataset.title;
  $('prefill-note').hidden = pendingSchedule === null;
  $('menu').hidden = true;
  sendContext();
}

function setPeriod(next) {
  period = next;
  const d = ENERGY[period];
  $('e-produced').textContent = `${d.producedKwh} kWh`;
  $('e-exported').textContent = `${d.exportedPct}%`;
  $('e-evening').textContent = `+${d.eveningUsageChangePct}%`;
  document.querySelectorAll('#period-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.period === period));
  sendContext();
}

$('menu-btn').onclick = () => ($('menu').hidden = !$('menu').hidden);
$('menu').onclick = (e) => e.target.dataset.view && showView(e.target.dataset.view);
$('page-charger').onclick = (e) => e.target.dataset.view && showView(e.target.dataset.view);
$('period-tabs').onclick = (e) => e.target.dataset.period && setPeriod(e.target.dataset.period);

// ---- 6. Session control -------------------------------------------------------
async function startSession(resume) {
  muted = false;
  embed = document.querySelector('input[name="embed"]:checked')?.value ?? 'headless';
  setState('connecting');
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('WebView did not report ready within 8s')), 8000));
  let init, config;
  try {
    config = await configPromise;
    [init] = await Promise.race([Promise.all([initPromise, webReady]), timeout]);
  } catch (e) {
    toast(e.message);
    return afterSessionEnded();
  }
  const threadId = resume ? localStorage.getItem(THREAD_KEY) : null;
  if (!resume) localStorage.removeItem(THREAD_KEY);
  sendToWebView({
    type: 'start',
    embed, // headless: the avatar works with the app's content. contained: it also creates the content.
    ks: init?.ks,
    widgetId: config.widgetId,
    partnerId: config.partnerId,
    dynamicVariables: screenContext(),
    threadId,
    kickOffPhrase: resume ? 'continue where we left off' : undefined,
  });
}

function endSession() {
  resolveSchedule(false);
  sendToWebView({ type: 'end' });
  afterSessionEnded();
}

function afterSessionEnded() {
  setState(localStorage.getItem(THREAD_KEY) ? 'paused' : 'idle');
}

function toggleMute() {
  muted = !muted;
  sendToWebView({ type: muted ? 'mute' : 'unmute' });
  renderControls();
}

// ---- 7. App lifecycle: background / foreground --------------------------------
function goBackground() {
  $('home').hidden = false;
  if (['connecting', 'live'].includes(state)) endSession(); // free mic + connection; thread id is kept
}
function comeForeground() {
  $('home').hidden = true;
}
$('bg-btn').onclick = goBackground;
$('open-app').onclick = comeForeground;

// ---- 8. Floating container: render + drag ------------------------------------------
function setState(next) {
  state = next;
  floatEl.hidden = next === 'idle';
  $('fab').hidden = next !== 'idle';
  // Contained fills the screen while a session runs; paused or idle falls back to the floating card.
  const inSession = next === 'connecting' || next === 'live';
  const contained = inSession && embed === 'contained';
  floatEl.classList.toggle('contained', contained);
  $('embed-choice').disabled = inSession;
  // Headless: the preview image is the base layer and the loading media overlays it while connecting.
  // Contained: the embed draws its own loading state, so the WebView shows right away.
  // The WebView stays laid out (opacity, not display:none) so the OS grants mic access and WebRTC starts.
  renderLoading();
  webview.style.opacity = next === 'live' || contained ? '1' : '0';
  $('badge').textContent = { connecting: 'connecting…', live: '● live', paused: 'paused' }[next] ?? '';
  renderControls();
  renderMeta();
  if (next !== 'idle' && !floatEl.dataset.placed) placeFloat(); // after controls render so height is final
}

function renderControls() {
  const c = $('controls');
  c.innerHTML = '';
  const add = (cls, label, title, fn) => {
    const b = Object.assign(document.createElement('button'), { className: `round ${cls}`, textContent: label, title, onclick: fn });
    c.append(b);
  };
  if ((state === 'connecting' || state === 'live') && embed === 'contained') {
    add('danger', '✕', 'Close', endSession); // the embed has its own mute and end; native only closes the view
  } else if (state === 'connecting' || state === 'live') {
    add(muted ? 'active' : '', muted ? '🔇' : '🎙', muted ? 'Unmute' : 'Mute', toggleMute);
    add('danger', '✕', 'End call', endSession);
  } else if (state === 'paused') {
    add('primary', '▶', 'Resume conversation', () => startSession(true));
    add('', '✕', 'Dismiss', () => {
      localStorage.removeItem(THREAD_KEY);
      setState('idle');
    });
  }
}

function renderMeta() {
  $('state-val').textContent = state;
  $('thread-val').textContent = localStorage.getItem(THREAD_KEY) || '—';
}

function placeFloat() {
  floatEl.dataset.placed = '1';
  floatEl.style.left = `${phone.clientWidth - floatEl.offsetWidth - 12}px`;
  floatEl.style.top = `${phone.clientHeight - floatEl.offsetHeight - 24}px`;
}

$('drag').addEventListener('pointerdown', (e) => {
  const start = { x: e.clientX, y: e.clientY, left: floatEl.offsetLeft, top: floatEl.offsetTop };
  floatEl.classList.add('dragging');
  e.target.setPointerCapture(e.pointerId);
  const move = (ev) => {
    const maxLeft = phone.clientWidth - floatEl.offsetWidth - 8;
    const maxTop = phone.clientHeight - floatEl.offsetHeight - 8;
    floatEl.style.left = `${Math.min(maxLeft, Math.max(8, start.left + ev.clientX - start.x))}px`;
    floatEl.style.top = `${Math.min(maxTop, Math.max(100, start.top + ev.clientY - start.y))}px`;
  };
  const up = () => {
    e.target.removeEventListener('pointermove', move);
    e.target.removeEventListener('pointerup', up);
    floatEl.classList.remove('dragging');
    const snapRight = floatEl.offsetLeft + floatEl.offsetWidth / 2 > phone.clientWidth / 2; // snap to nearest edge
    floatEl.style.left = `${snapRight ? phone.clientWidth - floatEl.offsetWidth - 12 : 12}px`;
  };
  e.target.addEventListener('pointermove', move);
  e.target.addEventListener('pointerup', up);
});

$('fab').onclick = () => startSession(false);

// ---- 9. Simulator helpers ------------------------------------------------------
// Drives the same native handler an agent call would, without any Studio setup.
const FAKE_CALLS = {
  get_energy_summary: { period: 'last_month' },
  go_to: { destination: 'energy', period: 'last_month' },
  propose_charging_schedule: { days: 'weekdays', start: '23:00', end: '06:00', excess_pv: true },
};
document.querySelectorAll('[data-fake]').forEach((b) => {
  b.onclick = () => handleWebMessage({ type: 'toolCall', id: `sim-${Date.now()}`, name: b.dataset.fake, args: FAKE_CALLS[b.dataset.fake] });
});
$('clear-btn').onclick = () => {
  localStorage.removeItem(THREAD_KEY);
  if (state === 'paused') setState('idle');
  renderMeta();
};

let toastTimer;
function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').hidden = true), 2500);
}

function log(kind, data) {
  const labels = { out: 'native → web', in: 'web → native', sys: 'native' };
  const text = typeof data === 'string' ? data : JSON.stringify(data).replace(/("ks":")[^"]+/, '$1…');
  const line = document.createElement('div');
  line.className = kind;
  line.textContent = `${new Date().toLocaleTimeString()} ${labels[kind]}  ${text.slice(0, 400)}`;
  $('log').append(line);
  $('log').scrollTop = $('log').scrollHeight;
}

setPeriod(period);

// App launched with a saved thread (e.g. process was killed) -> offer resume.
if (localStorage.getItem(THREAD_KEY)) setState('paused');
else setState('idle');
