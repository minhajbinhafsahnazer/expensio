/**
 * logger.ts
 *
 * Minimal structured logger for Expencio backend.
 * Mirrors the Perslace Loguru pattern:
 *
 *   22:53:41 | INFO     | GET /api/v1/financial-goals - 200 (91ms)
 *   22:53:41 | ERROR    | POST /api/v1/auth/login - 500 (603ms)
 *
 * - Colorized in development (works in Docker via `docker-compose logs`)
 * - Single-line per request — no nested JSON walls
 * - Full error stack on ERROR/CRITICAL
 */

// ─── ANSI Colors ─────────────────────────────────────────────────────────────
const R = '\x1b[0m';     // Reset
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const BLUE   = '\x1b[34m';
const DIM    = '\x1b[2m';
const BOLD   = '\x1b[1m';
const CYAN   = '\x1b[36m';

type Level = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

function levelColor(level: Level): string {
  switch (level) {
    case 'DEBUG':    return DIM;
    case 'INFO':     return GREEN;
    case 'WARNING':  return YELLOW;
    case 'ERROR':    return RED;
    case 'CRITICAL': return `${BOLD}${RED}`;
    default:         return R;
  }
}

function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':    return GREEN;
    case 'POST':   return BLUE;
    case 'PUT':
    case 'PATCH':  return YELLOW;
    case 'DELETE': return RED;
    default:       return CYAN;
  }
}

function statusColor(status: number): string {
  if (status < 300) return GREEN;
  if (status < 400) return CYAN;
  if (status < 500) return YELLOW;
  return RED;
}

function now(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function format(level: Level, message: string): string {
  const ts  = `${GREEN}${now()}${R}`;
  const lvl = `${levelColor(level)}${level.padEnd(8)}${R}`;
  const msg = `${levelColor(level)}${message}${R}`;
  return `${ts} | ${lvl} | ${msg}`;
}

// ─── Public Logger API ────────────────────────────────────────────────────────

export const logger = {
  debug(msg: string): void {
    process.stdout.write(format('DEBUG', msg) + '\n');
  },

  info(msg: string): void {
    process.stdout.write(format('INFO', msg) + '\n');
  },

  warning(msg: string): void {
    process.stdout.write(format('WARNING', msg) + '\n');
  },

  error(msg: string, err?: unknown): void {
    process.stderr.write(format('ERROR', msg) + '\n');
    if (err instanceof Error && err.stack) {
      process.stderr.write(`${DIM}${err.stack}${R}\n`);
    }
  },

  critical(msg: string, err?: unknown): void {
    process.stderr.write(format('CRITICAL', msg) + '\n');
    if (err instanceof Error && err.stack) {
      process.stderr.write(`${BOLD}${RED}${err.stack}${R}\n`);
    }
  },
};

// ─── HTTP Request Logger ──────────────────────────────────────────────────────
// Called from Fastify onResponse hook.

export function logRequest(opts: {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
  userId?: string;
}): void {
  const { method, path, statusCode, durationMs, requestId, userId } = opts;

  const m    = `${methodColor(method)}${method.padEnd(6)}${R}`;
  const p    = `${CYAN}${path}${R}`;
  const s    = `${statusColor(statusCode)}${statusCode}${R}`;
  const dur  = `${DIM}(${Math.round(durationMs)}ms)${R}`;
  const uid  = userId ? ` ${DIM}[${userId}]${R}` : '';
  const rid  = `${DIM}${requestId}${R}`;

  const line = `${m} ${p} → ${s} ${dur}${uid} ${rid}`;
  process.stdout.write(format('INFO', line) + '\n');
}

// ─── HTTP Error Logger ────────────────────────────────────────────────────────

export function logRequestError(opts: {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
  userId?: string;
  error: unknown;
}): void {
  const { method, path, statusCode, durationMs, requestId, userId, error } = opts;

  const m   = `${methodColor(method)}${method.padEnd(6)}${R}`;
  const p   = `${CYAN}${path}${R}`;
  const s   = `${RED}${statusCode}${R}`;
  const dur = `${DIM}(${Math.round(durationMs)}ms)${R}`;
  const uid = userId ? ` ${DIM}[${userId}]${R}` : '';

  const errMsg = error instanceof Error ? error.message : String(error);
  const line   = `${m} ${p} → ${s} ${dur}${uid} — ${RED}${errMsg}${R}`;

  process.stderr.write(format('ERROR', line) + '\n');

  // Full stack trace below — indented for scannability
  if (error instanceof Error && error.stack) {
    const indented = error.stack
      .split('\n')
      .map(l => `  ${DIM}${l}${R}`)
      .join('\n');
    process.stderr.write(indented + '\n');
  }
}
