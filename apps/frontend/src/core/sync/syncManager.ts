/**
 * core/sync/syncManager.ts
 *
 * A plain module-level singleton (not a React context) that coordinates
 * the logout lifecycle between AuthContext and SyncEngine.
 *
 * Problem it solves:
 *   AuthProvider wraps SyncProvider. If AuthContext tried to consume
 *   SyncContext directly, that would be a circular provider dependency.
 *
 * Solution:
 *   SyncProvider registers its prepareForLogout implementation into this
 *   module on mount. AuthContext calls syncManager.prepareForLogout()
 *   during logout, without needing to import or consume SyncContext.
 *
 * Provider hierarchy:
 *   AuthProvider
 *     └── SyncProvider  ← registers here on mount
 *           └── App
 *
 * Logout sequence:
 *   AuthContext.logout()
 *     → syncManager.prepareForLogout(userId)
 *         → abortController.abort()     ← cancels in-flight HTTP request
 *         → isStopped = true            ← prevents future flush() calls
 *     → queryClient.clear()
 *     → tokenStore.clear()
 *     → POST /auth/logout
 *     → setState({ status: 'unauthenticated' })
 */

export interface SyncManagerInterface {
  /**
   * Called by AuthContext before clearing the access token.
   *
   * Aborts any in-flight sync HTTP request and prevents future flush()
   * calls, ensuring that no queued mutation belonging to the logging-out
   * user can be submitted after the session is cleared.
   *
   * The queue is NOT deleted — unsynced financial data is preserved and
   * will sync automatically when the same user authenticates again.
   */
  prepareForLogout: (userId: string) => Promise<void>;
}

// Default no-op — replaced by SyncProvider on mount.
// If logout is called before SyncProvider mounts (e.g. during tests),
// this is a safe fallback.
const noop = async (_userId: string): Promise<void> => {};

export const syncManager: SyncManagerInterface = {
  prepareForLogout: noop,
};
