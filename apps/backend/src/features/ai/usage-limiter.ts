/**
 * ai/usage-limiter.ts
 *
 * Per-user daily request quota for the AI chat endpoint.
 *
 * Design:
 *   - In-memory map of { userId → { count, resetAt } }.
 *   - Quota resets at the start of each UTC calendar day.
 *   - No persistence: counts reset on server restart (acceptable for
 *     single-instance deployments without Redis).
 *
 * Limits (configurable via env):
 *   AI_DAILY_LIMIT  – max messages per user per day  (default: 50)
 */

import { TooManyRequestsError } from '../../common/errors/index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserBucket {
  count:   number;
  resetAt: number; // Unix ms timestamp when this bucket expires
}

// ─── State ────────────────────────────────────────────────────────────────────

const buckets = new Map<string, UserBucket>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Unix ms timestamp for the start of the next UTC day. */
function nextUtcMidnight(): number {
  const now = new Date();
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
}

/** Daily cap: reads AI_DAILY_LIMIT from process.env, falls back to 50. */
function dailyLimit(): number {
  const parsed = Number(process.env['AI_DAILY_LIMIT']);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Checks the user's daily quota and increments the counter.
 * Throws TooManyRequestsError (429) if the cap is hit.
 * Call this before hitting the LLM.
 */
export function consumeAiQuota(userId: string): void {
  const now = Date.now();
  const cap = dailyLimit();

  let bucket = buckets.get(userId);

  // Expired or first-time bucket → fresh slate
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: nextUtcMidnight() };
  }

  if (bucket.count >= cap) {
    throw new TooManyRequestsError(
      `Daily AI limit reached (${cap} messages). Your quota resets at midnight UTC.`,
    );
  }

  bucket.count += 1;
  buckets.set(userId, bucket);
}

/**
 * Returns the user's current quota status without mutating anything.
 * Useful for response headers.
 */
export function getAiQuotaStatus(userId: string): {
  used:      number;
  limit:     number;
  remaining: number;
  resetsAt:  string;
} {
  const now = Date.now();
  const cap = dailyLimit();
  const bucket = buckets.get(userId);

  const used    = (bucket && now < bucket.resetAt) ? bucket.count : 0;
  const resetAt = (bucket && now < bucket.resetAt) ? bucket.resetAt : nextUtcMidnight();

  return {
    used,
    limit:     cap,
    remaining: Math.max(0, cap - used),
    resetsAt:  new Date(resetAt).toISOString(),
  };
}

