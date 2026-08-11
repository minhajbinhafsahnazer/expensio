import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { users } from '../../database/schema/index.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { UnauthorizedError } from '../errors/index.js';

// ─── Type Augmentation ────────────────────────────────────────────────────────

/**
 * Augment FastifyRequest with the `auth` property.
 * Populated by the `authenticate` middleware on every protected route.
 *
 * Deliberately minimal: contains only what came from the verified JWT.
 * Services fetch the full user from DB when they need more data.
 * This keeps JWT authentication separate from database entities.
 */
declare module 'fastify' {
  interface FastifyRequest {
    auth: {
      userId: string;
      email: string;
    };
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Zero-trust authentication middleware.
 *
 * Flow:
 *   1. Extract Bearer token from Authorization header
 *   2. Verify JWT signature + expiry + type claim (must be "access")
 *   3. Fetch user from DB — confirm existence + is_active
 *   4. Decorate request.auth = { userId, email }
 *
 * Any failure throws UnauthorizedError → caught by global error handler → 401.
 * Never reveals whether the token was expired vs forged vs user not found.
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);

  let userId: string;
  let email: string;

  try {
    const payload = verifyAccessToken(token);
    userId = payload.sub;
    email = payload.email;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }

  // Re-validate user against DB on every request (zero-trust)
  const [user] = await db
    .select({
      id:       users.id,
      email:    users.email,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account is disabled');
  }

  request.auth = { userId: user.id, email: user.email };
}
