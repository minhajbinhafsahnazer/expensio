/**
 * core/api/client.ts
 *
 * HTTP client with:
 * - In-memory access token (never persisted)
 * - Single-flight refresh: simultaneous 401s share one refresh request
 * - Refresh interceptor loop guard (/auth/refresh never retried)
 * - credentials: 'include' for HttpOnly refresh cookie
 */

const API_BASE = '/api/v1'; // Proxied by Vite → http://localhost:4000

// ─── In-Memory Token Store ────────────────────────────────────────────────────
// Deliberately a module-level variable, NOT localStorage/sessionStorage.

let _accessToken: string | null = null;

export const tokenStore = {
  get: (): string | null => _accessToken,
  set: (token: string) => { _accessToken = token; },
  clear: () => { _accessToken = null; },
};

// ─── Single-Flight Refresh ────────────────────────────────────────────────────
// All simultaneous 401s attach to the same promise rather than each firing
// their own /auth/refresh request.

let _refreshPromise: Promise<boolean> | null = null;

export class NetworkError extends Error {
  constructor(message: string = 'Network error') {
    super(message);
    this.name = 'NetworkError';
  }
}

async function doRefresh(): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // HttpOnly refresh cookie lives here
    });
  } catch {
    throw new NetworkError('Network error during refresh');
  }
  
  if (res.status === 401 || res.status === 403) return false;
  if (!res.ok) throw new NetworkError(`Server error during refresh: ${res.status}`);

  try {
    const data = await res.json();
    const token = data?.data?.accessToken;
    if (!token) return false;
    tokenStore.set(token);
    return true;
  } catch {
    return false;
  }
}

function getRefreshPromise(): Promise<boolean> {
  if (!_refreshPromise) {
    _refreshPromise = doRefresh().finally(() => {
      _refreshPromise = null;
    });
  }
  return _refreshPromise;
}

// ─── Core Fetch ───────────────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<ApiResponse<T>> {
  const token = tokenStore.get();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: endpoint.startsWith('/auth/') ? 'include' : 'same-origin',
      // Forwards AbortSignal from the caller (e.g. SyncEngine on logout)
      signal: options.signal,
    });
  } catch (err) {
    // AbortError is not a network failure — surface it as-is so callers
    // can distinguish a cancelled request from a real network error.
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new NetworkError('Network error');
  }

  // Handle 401: attempt a single-flight refresh then retry ONCE
  if (response.status === 401 && !_isRetry && !endpoint.includes('/auth/refresh')) {
    // If the token changed while this request was in flight, another request
    // already successfully refreshed it. Retry immediately.
    if (tokenStore.get() !== token) {
      return apiFetch<T>(endpoint, options, true);
    }
    
    // We intentionally let NetworkError bubble up if doRefresh fails due to backend being down
    const refreshed = await getRefreshPromise();
    if (refreshed) {
      return apiFetch<T>(endpoint, options, true);
    }
    // Refresh definitively failed (e.g. 401) — clear token and surface error to caller
    tokenStore.clear();
    throw new ApiError(401, 'Session expired');
  }

  if (!response.ok) {
    if (response.status >= 500) {
      throw new NetworkError(`Server error: ${response.status}`);
    }
    let message = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      message = body?.message ?? message;
    } catch { /* ignore */ }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return { success: true, data: null as T, message: '' };
  return response.json();
}

// ─── ApiError Class ───────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Public Client API ────────────────────────────────────────────────────────

export const client = {
  refreshSession: async () => {
    return await getRefreshPromise();
  },

  get: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
