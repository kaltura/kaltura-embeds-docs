// Zero-dependency static server for the demo.
// Reads session params from environment variables (see .env.example) and exposes
// them to the browser as /config.json, so no IDs live in the repo.
//
//   cp .env.example .env   # fill in your values
//   npm start
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  WIDGET_ID,
  PARTNER_ID,
  PORT = '4311',
  KALTURA_API_URL = 'https://www.kaltura.com/api_v3',
  AVATAR_API_URL = 'https://api.avatar.us.kaltura.ai',
} = process.env;

if (!WIDGET_ID || !/^\d+$/.test(PARTNER_ID ?? '')) {
  console.error('Missing or invalid config. Set WIDGET_ID and a numeric PARTNER_ID in .env (see .env.example).');
  process.exit(1);
}

const config = {
  widgetId: WIDGET_ID,
  partnerId: Number(PARTNER_ID),
  kalturaApiUrl: KALTURA_API_URL,
  avatarApiUrl: AVATAR_API_URL,
};

const root = fileURLToPath(new URL('.', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/config.json') {
    res.writeHead(200, { 'Content-Type': types['.json'], 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(config));
  }

  // Resolve inside the demo folder; never serve dotfiles (.env!) or the server itself.
  let file = normalize(join(root, decodeURIComponent(pathname)));
  const relative = file.slice(root.length);
  const hidden = relative.split(sep).some((part) => part.startsWith('.')) || relative === 'server.mjs';
  if (!file.startsWith(root) || hidden) {
    res.writeHead(404);
    return res.end('Not found');
  }

  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(Number(PORT), () => console.log(`Avatar WebView demo: http://localhost:${PORT}`));
