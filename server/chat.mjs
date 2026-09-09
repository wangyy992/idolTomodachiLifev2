const windows = new Map();
export function validateChat(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const { messages, model, apiKey } = raw;
  if (typeof model !== 'string' || !/^deepseek-[a-z0-9-]{1,60}$/.test(model)) return null;
  if (apiKey !== undefined && (typeof apiKey !== 'string' || apiKey.length > 256)) return null;
  if (!Array.isArray(messages) || !messages.length || messages.length > 32) return null;
  let length = 0;
  for (const m of messages) {
    if (!m || !['system','user','assistant'].includes(m.role) || typeof m.content !== 'string') return null;
    length += m.content.length;
  }
  if (length > 100000) return null;
  const n = (v, fallback, min, max) => typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
  return { model, messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature: n(raw.temperature, .75, 0, 2), top_p: n(raw.top_p, .95, 0, 1),
    max_tokens: Math.floor(n(raw.max_tokens, 4096, 1, 4096)) };
}
export function takeQuota(id, now = Date.now(), limit = 20) {
  for (const [key, value] of windows) if (now - value.start >= 3600000) windows.delete(key);
  const value = windows.get(id) || { start: now, count: 0 };
  if (value.count >= limit) return false;
  windows.set(id, { ...value, count: value.count + 1 }); return true;
}
export async function proxyChat(body, { serverKey = '', clientId = 'unknown', signal = undefined, fetchImpl = fetch } = {}) {
  const payload = validateChat(body);
  if (!payload) return { status: 400, data: { error: 'Invalid chat request' } };
  const ownKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  const key = ownKey || serverKey;
  if (!key) return { status: 503, data: { error: 'API Key missing' } };
  if (!ownKey && (!takeQuota('client:' + clientId) || !takeQuota('server-total', Date.now(), 200))) {
    return { status: 429, data: { error: 'Shared quota exceeded' } };
  }
  const timeout = AbortSignal.timeout(55000);
  try {
    const response = await fetchImpl('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify(payload), signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    const data = await response.json();
    return { status: response.status, data: response.ok ? data : { error: 'Upstream request failed' } };
  } catch (error) {
    return { status: error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 504 : 502, data: { error: 'Chat service unavailable' } };
  }
}
export async function readJSON(req) {
  const parts = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 500000) throw new Error('Request body too large');
    parts.push(chunk);
  }
  return JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
}
export async function handleChat(req, res, serverKey = '') {
  const send = (code, value) => {
    if (res.destroyed) return;
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(value));
  };
  if (req.method !== 'POST') return send(405, { error: 'Method not allowed' });
  const controller = new AbortController();
  const cancel = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', cancel);
  try {
    let body;
    try { body = req.body === undefined ? await readJSON(req) : req.body; }
    catch { return send(400, { error: 'Invalid request body' }); }
    const result = await proxyChat(body, { serverKey, clientId: req.socket.remoteAddress || 'unknown', signal: controller.signal });
    send(result.status, result.data);
  } finally { res.off('close', cancel); }
}
