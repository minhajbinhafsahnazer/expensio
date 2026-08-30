import { buildApp } from '../src/app';
import type { IncomingMessage, ServerResponse } from 'http';

// Cache the Fastify instance so it is reused across warm serverless invocations.
// This prevents rebuilding the application (plugins, routes) on every request.
let app: Awaited<ReturnType<typeof buildApp>> | undefined;

export default async function (req: IncomingMessage, res: ServerResponse) {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }
  
  // Forward the Vercel request and response objects to Fastify's native Node.js HTTP server.
  app.server.emit('request', req, res);
}
