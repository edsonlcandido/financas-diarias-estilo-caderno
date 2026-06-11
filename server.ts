import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const distPath = path.join(__dirname, 'dist');

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(
  express.static(distPath, {
    maxAge: '1y',
    index: 'index.html',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const server = app.listen(PORT, HOST, () => {
  process.stdout.write(`Server listening on http://${HOST}:${PORT}\n`);
});

const shutdown = (signal: string) => {
  process.stdout.write(`Received ${signal}, shutting down...\n`);
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
