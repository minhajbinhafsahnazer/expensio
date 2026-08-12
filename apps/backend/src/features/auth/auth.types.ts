/**
 * auth.types.ts
 * TypeScript types for the auth feature.
 * Zod schemas live in auth.schemas.ts — types here are plain TS interfaces.
 */

/** Validated body for POST /auth/register */
export interface RegisterBody {
  email: string;
  password: string;
  fullName?: string | undefined;
}

/** Validated body for POST /auth/login */
export interface LoginBody {
  email: string;
  password: string;
}

/** Safe user object returned to clients — never includes password_hash */
export interface UserPublic {
  id: string;
  email: string;
  fullName: string | null;
  currency: string;
  theme: string;
  timezone: string;
  locale: string;
  superiorCategoriesEnabled: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateMeBody {
  fullName?: string | undefined;
  currency?: string | undefined;
  theme?: string | undefined;
  timezone?: string | undefined;
  locale?: string | undefined;
  superiorCategoriesEnabled?: boolean | undefined;
}

/** Pair of tokens returned on login */
export interface TokenPair {
  accessToken: string;
  refreshToken: string; // Raw JWT — sent to client only, never stored
}

/** Context injected from HTTP layer into service calls */
export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}
