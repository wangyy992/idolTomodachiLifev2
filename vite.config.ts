import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { handleChat } from './server/chat.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), {
      name: 'local-chat-api',
      configureServer(server) {
        server.middlewares.use('/api/chat', (req, res, next) => {
          if ((req.url || '/').split('?')[0] !== '/') return next();
          void handleChat(req, res, env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || '').catch(() => {
            if (!res.headersSent) res.writeHead(500);
            if (!res.destroyed) res.end('Request failed');
          });
        });
      },
    }],
    build: { rollupOptions: { output: { manualChunks: {
      react: ['react', 'react-dom'], motion: ['motion/react'], icons: ['lucide-react'], markdown: ['react-markdown'],
    } } } },
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  };
});
