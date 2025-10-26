import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createRequestHandler } from '@remix-run/express';

const app = express();
const PORT = process.env.PORT || 3000;

// Disable x-powered-by header
app.disable('x-powered-by');

// Create HTTP server
const server = createServer(app);

// Setup Vite dev server
const vite = await import('vite').then((vite) =>
  vite.createServer({
    server: {
      middlewareMode: true,
    },
  })
);

app.use(vite.middlewares);

// Load the Remix build
const build = () => vite.ssrLoadModule('virtual:remix/server-build');

// Serve Remix app
app.all('*', createRequestHandler({ build }));

// Import and setup WebSocket
const { handleMicrophoneConnection } = await import('./app/services/microphone-stream.server.js');

// Create WebSocket server for microphone streaming
const wss = new WebSocketServer({
  server,
  path: '/ws/microphone'
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');
  handleMicrophoneConnection(ws);
});

// Start server
server.listen(PORT, () => {
  console.log(`Dev server running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint available at ws://localhost:${PORT}/ws/microphone`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
