import { z } from 'zod';

/**
 * environment.ts
 *
 * Validated, typed environment configuration.
 *
 * Production behaviour:
 *   - JWT_SECRET, COOKIE_SECRET, DATABASE_URL, ALLOWED_ORIGIN have NO defaults.
 *     The process will exit(1) at startup if any are missing.
 *   - PORT accepts a platform-injected value (Render, Railway, etc.) and
 *     falls back to 4000 only for local development.
 *
 * Development behaviour:
 *   - All secrets fall back to safe, well-known dev values when NODE_ENV !== 'production'.
 *   - ALLOWED_ORIGIN defaults to the Vite dev server.
 */

// ─── Per-environment secret helpers ──────────────────────────────────────────

/**
 * Returns a Zod schema that:
 *   - In production: requires the value (no default), fails fast if missing.
 *   - In development/test: uses the provided devDefault.
 */
function requiredInProd(devDefault: string) {
  if (process.env.NODE_ENV === 'production') {
    return z.string({ required_error: 'Required in production — set this environment variable.' });
  }
  return z.string().default(devDefault);
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Platform-injected in production (Render, Railway, Fly.io all set PORT).
  // Falls back to 4000 in local development.
  PORT: z.coerce.number().default(4000),

  // ─── Secrets — required in production, safe defaults in development ────────
  DATABASE_URL: requiredInProd(
    'postgresql://postgres:postgres@db:5432/expenseflow'
  ),

  JWT_SECRET: requiredInProd(
    // Dev default: 64 random hex chars generated once. Safe only for development.
    '051f2e36d4ef8ffed36dbc40393fa23e589d87c41266b6411789f78777dc17d7'
  ),

  COOKIE_SECRET: requiredInProd(
    '3d009502bda419bd6e7016a2914cefccb135ca5f2b267b288350c6a5081952b9'
  ),

  // CORS allowed origin — required in production, Vite dev server in development.
  ALLOWED_ORIGIN: requiredInProd('http://localhost:5173'),
});

// ─── Parse & fail fast ────────────────────────────────────────────────────────

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  // Format each missing/invalid variable clearly for the operator.
  const issues = _env.error.issues
    .map(i => `  ${i.path.join('.')}: ${i.message}`)
    .join('\n');

  console.error(
    `\n❌  Invalid environment configuration — cannot start.\n\n${issues}\n\n` +
    `  Check apps/backend/.env.example for required variables.\n`
  );
  process.exit(1);
}

export const env = _env.data;
