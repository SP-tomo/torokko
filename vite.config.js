import { resolve } from 'path';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  base: '/torokko/',
  server: {
    host: true,
  },
  plugins: [
    basicSsl(),
    {
      name: 'controller-relay',
      configureServer(server) {
        const clients = new Set();

        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/ctrl/stream') {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.flushHeaders();
            clients.add(res);
            req.on('close', () => clients.delete(res));
            return;
          }
          if (req.url === '/api/ctrl/input' && req.method === 'POST') {
            let body = '';
            req.on('data', d => body += d);
            req.on('end', () => {
              try {
                const { cmd } = JSON.parse(body);
                if (cmd === 'left' || cmd === 'right') {
                  clients.forEach(c => c.write(`data: ${cmd}\n\n`));
                }
                res.end('ok');
              } catch {
                res.statusCode = 400;
                res.end('bad request');
              }
            });
            return;
          }
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        editor: resolve(__dirname, 'editor.html'),
        controller: resolve(__dirname, 'controller.html'),
      },
    },
  },
});
