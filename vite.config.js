import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'node:path';
import url from 'node:url';

// Automatically load .env file in Node 20+
try {
  if (process.loadEnvFile) process.loadEnvFile();
} catch (e) {
  // .env may not exist in some environments
}

// Vite dev middleware to execute /api/* handlers locally without Vercel CLI
function apiDevServerPlugin() {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;

        if (!pathname.startsWith('/api')) {
          return next();
        }

        // Parse query into req.query
        req.query = parsedUrl.query;

        // Collect body if POST / PATCH / DELETE
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
          const buffers = [];
          for await (const chunk of req) {
            buffers.push(chunk);
          }
          const rawBody = Buffer.concat(buffers).toString('utf-8');
          try {
            req.body = rawBody ? JSON.parse(rawBody) : {};
          } catch (e) {
            req.body = rawBody;
          }
        }

        // Mock Vercel response helper methods
        res.status = function(code) {
          res.statusCode = code;
          return res;
        };
        res.json = function(data) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return res;
        };

        try {
          let modulePath = null;
          if (pathname === '/api/list') {
            modulePath = 'api/list.js';
          } else if (pathname === '/api/keys/rotate') {
            modulePath = 'api/keys/rotate.js';
          } else if (pathname === '/api/keys/disable-view') {
            modulePath = 'api/keys/disable-view.js';
          } else if (pathname === '/api/history') {
            modulePath = 'api/history.js';
          } else if (pathname === '/api/transcribe') {
            modulePath = 'api/transcribe.js';
          } else if (pathname === '/api/agent') {
            modulePath = 'api/agent.js';
          } else if (pathname === '/api/keepalive') {
            modulePath = 'api/keepalive.js';
          }

          if (modulePath) {
            const absolutePath = path.resolve(process.cwd(), modulePath);
            const fileUrl = url.pathToFileURL(absolutePath).href + `?t=${Date.now()}`;
            const mod = await import(fileUrl);
            if (mod.default) {
              await mod.default(req, res);
              return;
            }
          }
          next();
        } catch (err) {
          console.error(`Error handling ${pathname} in dev server:`, err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [
    preact(),
    apiDevServerPlugin()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
