import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createRequestHandler } from '@remix-run/express';

const app = express();
const PORT = process.env.PORT || 3000;

// Disable x-powered-by header
app.disable('x-powered-by');

// Serve static files from the public directory
app.use(express.static('public', { immutable: true, maxAge: '1y' }));

// Create HTTP server
const server = createServer(app);

// Setup Remix request handler
const viteDevServer =
  process.env.NODE_ENV === 'production'
    ? undefined
    : await import('vite').then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      );

// Handle asset requests in development
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
}

// Load the Remix build
const build = viteDevServer
  ? () => viteDevServer.ssrLoadModule('virtual:remix/server-build')
  : await import('./build/server/index.js');

// Serve Remix app
app.all('*', createRequestHandler({ build }));

// Start server first
server.listen(PORT, async () => {
  console.log(`Dashboard server running on port ${PORT}`);
  console.log(`WebSocket endpoint available at ws://localhost:${PORT}/ws/microphone`);

  // Import and setup WebSocket after server is running
  const { handleMicrophoneConnection, cleanup } = await import('./app/services/microphone-stream.server.js');

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

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down gracefully...');
    cleanup();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
});
