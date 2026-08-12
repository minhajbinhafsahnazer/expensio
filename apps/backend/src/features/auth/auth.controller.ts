/**
 * auth.controller.ts
 *
 * HTTP layer for authentication.
 * Responsibilities:
 *   - Extract data from the request (body, cookies, headers)
 *   - Call the service
 *   - Set/clear cookies
 *   - Return the standard API response envelope
 *
 * No business logic here. No DB access.
 * Errors from the service propagate to the global error handler.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { successResponse } from '../../common/utils/response.js';
import * as authService from './auth.service.js';
import type { RegisterBody, LoginBody } from './auth.types.js';

// ─── Cookie Config ────────────────────────────────────────────────────────────

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function setRefreshCookie(reply: FastifyReply, rawToken: string) {
  void reply.setCookie(REFRESH_COOKIE_NAME, rawToken, {
    httpOnly: true,
    // secure: true is enforced in production (requires HTTPS at the reverse proxy).
    secure:   process.env.NODE_ENV === 'production',
    // strict: frontend and API share the same origin in dev (Vite proxy) and
    // production (same domain). 'strict' prevents the cookie from being sent
    // on any cross-site navigation, which is the correct behaviour for a
    // finance app with no email deep-link flows that require 'lax'.
    sameSite: 'strict',
    path:     '/',
    maxAge:   REFRESH_COOKIE_MAX_AGE,
  });
}

function clearRefreshCookie(reply: FastifyReply) {
  void reply.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
  });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/** POST /auth/register */
export async function register(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply,
) {
  const meta = {
    ip:        request.ip ?? null,
    userAgent: request.headers['user-agent'] ?? null,
  };

  const user = await authService.register(request.body, meta);

  return reply.status(201).send(
    successResponse({ user }, 'Account created successfully', request.id),
  );
}

/** POST /auth/login */
export async function login(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply,
) {
  const meta = {
    ip:        request.ip ?? null,
    userAgent: request.headers['user-agent'] ?? null,
  };

  const { tokens, user } = await authService.login(request.body, meta);

  setRefreshCookie(reply, tokens.refreshToken);

  return reply.send(
    successResponse(
      { accessToken: tokens.accessToken, user },
      'Login successful',
      request.id,
    ),
  );
}

/** POST /auth/refresh */
export async function refresh(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const rawRefreshToken = request.cookies?.[REFRESH_COOKIE_NAME];

  if (!rawRefreshToken) {
    return reply.status(401).send({
      success:  false,
      message:  'Refresh token missing',
      error:    { code: 'UNAUTHORIZED' },
      meta:     { requestId: request.id, timestamp: new Date().toISOString() },
    });
  }

  try {
    const { accessToken, rawRefreshToken: newRawRefresh } =
      await authService.refresh(rawRefreshToken);

    setRefreshCookie(reply, newRawRefresh);

    return reply.send(
      successResponse({ accessToken }, 'Token refreshed', request.id),
    );
  } catch (error) {
    if ((error as any).statusCode === 401 || (error as any).code === 'UNAUTHORIZED') {
      clearRefreshCookie(reply);
    }
    throw error;
  }
}

/** POST /auth/logout */
export async function logout(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const rawRefreshToken = request.cookies?.[REFRESH_COOKIE_NAME] ?? '';
  const meta = {
    ip:        request.ip ?? null,
    userAgent: request.headers['user-agent'] ?? null,
  };

  await authService.logout(rawRefreshToken, request.auth.userId, meta);

  clearRefreshCookie(reply);

  return reply.send(
    successResponse({}, 'Logged out successfully', request.id),
  );
}

/** GET /auth/me */
export async function getMe(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = await authService.getMe(request.auth.userId);

  return reply.send(
    successResponse({ user }, 'User profile fetched', request.id),
  );
}

/** PATCH /auth/me */
export async function updateMe(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply,
) {
  const user = await authService.updateMe(request.auth.userId, request.body as any);

  return reply.send(
    successResponse({ user }, 'User profile updated successfully', request.id),
  );
}
