/**
 * common/lib/cleanup.ts
 *
 * Lightweight background cleanup scheduler.
 * Uses a plain setInterval — no cron library needed.
 *
 * Currently runs:
 *   - deleteExpiredRefreshTokens() every 24 hours.
 *
 * Called once by server.ts after the HTTP server is listening.
 * If a cleanup operation fails, the error is logged but the process
 * is NOT terminated — cleanup failure is non-fatal.
 */

import { deleteExpiredRefreshTokens } from '../../features/auth/auth.repository.js';
import { logger } from './logger.js';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

async function runCleanup(): Promise<void> {
  try {
    const deleted = await deleteExpiredRefreshTokens();
    if (deleted > 0) {
      logger.info(`[cleanup] Pruned ${deleted} expired/revoked refresh token(s)`);
    } else {
      logger.debug('[cleanup] No stale refresh tokens to prune');
    }
  } catch (err) {
    // Log but do not crash the process — cleanup is best-effort.
    logger.error('[cleanup] Failed to prune refresh tokens', err instanceof Error ? err : undefined);
  }
}

/**
 * Start the background cleanup job.
 * Runs immediately on startup, then every 24 hours.
 */
export function startCleanupJob(): void {
  // Run once immediately so we clean up on every deploy/restart,
  // then schedule the repeating interval.
  void runCleanup();
  setInterval(() => { void runCleanup(); }, TWENTY_FOUR_HOURS_MS);
  logger.info('[cleanup] Scheduled: refresh token pruning every 24h');
}
