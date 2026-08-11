import { buildApp }       from './app.js';
import { env }             from './config/environment.js';
import { logger }          from './common/lib/logger.js';
import { pool }            from './database/client.js';
import { startCleanupJob } from './common/lib/cleanup.js';

async function start() {
  const app = await buildApp();

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────
  // Handle SIGTERM (Kubernetes, Docker stop, Render) and SIGINT (Ctrl-C).
  // Order: stop accepting new requests → drain in-flight requests → close DB pool.
  async function shutdown(signal: string) {
    logger.info(`Received ${signal} — shutting down gracefully…`);
    try {
      // Stop accepting new connections and wait for in-flight requests to finish.
      // Fastify's close() has a default timeout; in-flight requests beyond that
      // will be force-closed.
      await app.close();
      logger.info('HTTP server closed');

      // Return all pooled DB connections to PostgreSQL cleanly.
      await pool.end();
      logger.info('Database pool closed');

      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.critical('Error during shutdown', err instanceof Error ? err : new Error(String(err)));
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT',  () => { void shutdown('SIGINT'); });

  // ─── Unhandled Rejection Guard ──────────────────────────────────────────────
  // Log the error and exit so the container/process manager can restart cleanly.
  // Silent unhandled rejections hide bugs in production.
  process.on('unhandledRejection', (reason) => {
    logger.critical(
      'Unhandled promise rejection — exiting',
      reason instanceof Error ? reason : new Error(String(reason)),
    );
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.critical('Uncaught exception — exiting', err);
    process.exit(1);
  });

  // ─── Start ──────────────────────────────────────────────────────────────────
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);

    // Start the background cleanup job (expired refresh token pruning).
    // Runs every 24h — lightweight, no external dependencies.
    startCleanupJob();
  } catch (err) {
    logger.critical(
      'Failed to start server',
      err instanceof Error ? err : new Error(String(err)),
    );
    process.exit(1);
  }
}

void start();
