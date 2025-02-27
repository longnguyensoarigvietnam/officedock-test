import express, { Request, Response } from 'express';
import next from 'next';
import httpProxy from 'http-proxy';
import { IncomingMessage } from 'http';
import { Socket } from 'net';

const port: number = parseInt(process.env.PORT ?? '3000', 10);
const isDev: boolean = process.env.NODE_ENV !== 'production';
const app = next({ dev: isDev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // Set external WebSocket server URL (replace with actual URL)
  const WEBSOCKET_TARGET = (
    `${process.env.API_INTERNAL_URL}`
  ).replace('http', 'ws');

  // Create an http-proxy instance with WebSocket support enabled
  const proxy = httpProxy.createProxyServer({
    target: WEBSOCKET_TARGET,
    ws: true,
    changeOrigin: true,
    secure: !isDev,
  });

  // Delegate all HTTP requests to Next.js
  server.all('*', (req: Request, res: Response) => {
    return handle(req, res);
  });

  // Start the Express server, listening on 0.0.0.0
  const httpServer = server.listen(port, '0.0.0.0', (err) => {
    if (err) throw err;
  });

  // Proxy WebSocket upgrade requests for paths starting with "/system"
  httpServer.on(
    'upgrade',
    (req: IncomingMessage, socket: Socket, head: Buffer) => {
      if (req.url?.startsWith('/system')) {
        proxy.ws(req, socket, head);
      }
    },
  );
});
