// 可移植自托管服务：一个进程同时干两件事——
//   1) 托管前端静态页（dist/，先 npm run build 生成）
//   2) 代理 /api/chat 到 DeepSeek（服务端持有密钥，前端拿不到）
// 零第三方依赖，只用 Node 内置模块；任意云主机 / VPS 上 `node server.mjs` 即可跑。
// 用法：
//   npm run build            # 生成 dist/
//   DEEPSEEK_API_KEY=sk-xxx PORT=8080 node server.mjs
// 需要 Node 18+（自带全局 fetch）。

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 8080;
const KEY = process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.map': 'application/json',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 5_000_000) req.destroy(); });
    req.on('end', () => resolve(d));
    req.on('error', reject);
  });
}

const sendJSON = (res, code, obj) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
};

// ── /api/chat：转发到 DeepSeek ─────────────────────────────
async function handleChat(req, res) {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse((await readBody(req)) || '{}'); }
  catch { return sendJSON(res, 400, { error: 'Bad JSON' }); }

  const { messages, model, temperature, top_p, max_tokens, apiKey } = body;
  const key = apiKey || KEY; // 玩家自填密钥优先，否则用服务端环境变量
  if (!key) return sendJSON(res, 400, { error: 'API Key missing' });

  // 服务端自己的超时（略小于常见网关上限），卡住时返回干净的 504
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);
  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model, messages, temperature, top_p, max_tokens }),
      signal: controller.signal,
    });
    const data = await r.json();
    return sendJSON(res, r.ok ? 200 : r.status, data);
  } catch (e) {
    const aborted = e && e.name === 'AbortError';
    return sendJSON(res, aborted ? 504 : 502, {
      error: aborted ? 'DeepSeek 响应超时，请重试' : '代理请求失败，请稍后重试',
    });
  } finally {
    clearTimeout(timer);
  }
}

// ── 静态页：serve dist/，找不到的路由回退到 index.html（SPA）──
async function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = normalize(join(DIST, urlPath === '/' ? '/index.html' : urlPath));
  // 防目录穿越
  if (!filePath.startsWith(DIST)) { res.writeHead(403); res.end('Forbidden'); return; }
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(DIST, 'index.html'); // 前端路由回退
  }
  try {
    const buf = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}

createServer((req, res) => {
  if ((req.url || '').startsWith('/api/chat')) return handleChat(req, res);
  return serveStatic(req, res);
}).listen(PORT, '0.0.0.0', () => {
  console.log(`▶ idol-tomodachi-life 运行中：http://0.0.0.0:${PORT}`);
  if (!KEY) console.warn('⚠ 未检测到 DEEPSEEK_API_KEY 环境变量（玩家若不自填密钥将无法对话）');
});
