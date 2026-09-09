export interface RequestProgress { phase: 'generating' | 'retrying'; attempt: number; }
export interface RequestOptions { signal?: AbortSignal; onProgress?: (progress: RequestProgress) => void; }
let sessionKey = '';
export const setSessionApiKey = (key: string) => { sessionKey = key.trim(); };
export const getSessionApiKey = () => sessionKey;

export function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('已取消', 'AbortError')); return; }
    const onAbort = () => { clearTimeout(timer); reject(new DOMException('已取消', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function requestChat(payload: string, options: RequestOptions = {}): Promise<string> {
  const delays = [800, 2000]; // bounded retries; users can cancel at any point
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    options.signal?.throwIfAborted();
    options.onProgress?.({ phase: attempt ? 'retrying' : 'generating', attempt: attempt + 1 });
    if (attempt) await abortableDelay(delays[attempt - 1], options.signal);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    options.signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, signal: controller.signal,
      });
      if (!response.ok) {
        const messages: Record<number, string> = {
          400: '请检查 AI 设置和请求内容。', 401: 'API Key 无效，请在 AI 设置中更新。',
          402: 'DeepSeek 余额不足。', 429: '请求额度暂时用完，请稍后再试。',
          503: '服务暂未配置，请在 AI 设置中填写自己的 Key。',
        };
        const error = new Error(messages[response.status] || `连接服务失败（${response.status}）`) as Error & { status: number };
        error.status = response.status; throw error;
      }
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) throw new Error('没有收到有效回复，请重试。');
      return text;
    } catch (error: any) {
      if (options.signal?.aborted) throw new DOMException('已取消', 'AbortError');
      const retryable = error?.name === 'AbortError' || error instanceof TypeError || error?.status >= 500;
      if (!retryable || attempt === delays.length) {
        if (error?.name === 'AbortError') throw new Error('回应等待超时，可以重试。');
        if (error instanceof TypeError) throw new Error('连接中断，请检查网络后重试。');
        throw error;
      }
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
    }
  }
  throw new Error('连接失败，请重试。');
}
