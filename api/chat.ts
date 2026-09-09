import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleChat } from '../server/chat.mjs';
export const config = { maxDuration: 60 };
export default function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  return handleChat(req, res, process.env.DEEPSEEK_API_KEY || '');
}
