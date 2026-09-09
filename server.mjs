import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleChat } from './server/chat.mjs';
const ROOT = fileURLToPath(new URL('.', import.meta.url));
const DIST = resolve(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 8080;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.gif':'image/gif',
  '.webp':'image/webp', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.ico':'image/x-icon' };
export function safeStaticPath(url) {
  let pathname;
  try { pathname = decodeURIComponent((url || '/').split('?')[0]); } catch { return null; }
  const file = resolve(DIST, '.' + pathname);
  const rel = relative(DIST, file);
  return rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel) ? null : file;
}
async function serveStatic(req, res) {
  let file = safeStaticPath(req.url);
  if (!file) { res.writeHead(400); res.end('Invalid path'); return; }
  try {
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
  } catch {
    if (extname(file)) { res.writeHead(404); res.end('Not found'); return; }
    file = resolve(DIST, 'index.html');
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}
export function createAppServer() {
  return createServer((req, res) => {
    const pathname = (req.url || '/').split('?')[0];
    const task = pathname === '/api/chat' ? handleChat(req, res, process.env.DEEPSEEK_API_KEY || '') : serveStatic(req, res);
    Promise.resolve(task).catch(() => { if (!res.headersSent) res.writeHead(500); if (!res.destroyed) res.end('Request failed'); });
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createAppServer().listen(PORT, '0.0.0.0', () => console.log('Game listening on http://localhost:' + PORT));
}
