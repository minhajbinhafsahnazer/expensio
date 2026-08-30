import { drizzle } from 'drizzle-orm/node-postgres';
// @ts-ignore - Vercel skips devDependencies, so @types/pg is missing during build
import pkg from 'pg';
import { env } from '../config/environment.js';
import * as schema from './schema/index.js';

const { Pool } = pkg;

/**
 * PostgreSQL connection pool.
 *
 * Pool is exported so server.ts can call pool.end() on graceful shutdown,
 * ensuring all in-flight queries complete before the process exits.
 *
 * Pool sizing:
 *   max: 10 — sufficient for a single instance; increase with horizontal scale.
 *   idleTimeoutMillis: 30s — release idle connections back promptly.
 *   connectionTimeoutMillis: 5s — fail fast if the DB is unreachable at startup.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Neon (serverless Postgres) requires SSL; local Docker does not.
  ssl: env.DATABASE_URL.includes('neon') || env.DATABASE_URL.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : undefined,
  max:                    10,
  idleTimeoutMillis:      30_000,
  connectionTimeoutMillis: 5_000,
});

// Propagate unexpected pool errors to stderr so they are visible in logs
// without crashing the process (unhandled rejection).
pool.on('error', (err: Error) => {
  process.stderr.write(`[DB POOL] Unexpected client error: ${err.message}\n`);
});

export const db = drizzle(pool, { schema });
