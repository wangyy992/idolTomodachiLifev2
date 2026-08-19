import type { VercelRequest, VercelResponse } from '@vercel/node';

// 允许函数跑到 60 秒（Vercel Hobby 上限），否则默认 10 秒会把慢的 DeepSeek 生成掐断成超时
export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, model, temperature, top_p, max_tokens, apiKey } = req.body;

  // 服务端专用密钥（DEEPSEEK_API_KEY 不会进前端包）；兼容旧的 VITE_ 命名
  const key = apiKey || process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY;
  if (!key) {
    return res.status(400).json({ error: 'API Key missing' });
  }

  // 服务端自己的超时（略小于 maxDuration）：DeepSeek 卡住时返回干净的 504，而不是被平台硬杀
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ model, messages, temperature, top_p, max_tokens }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return res.status(504).json({ error: 'DeepSeek 响应超时，请重试。' });
    }
    return res.status(500).json({ error: String(e) });
  } finally {
    clearTimeout(timer);
  }
}
