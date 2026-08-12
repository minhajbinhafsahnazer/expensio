/**
 * auth.routes.ts
 *
 * Fastify plugin that registers all auth routes.
 * Responsibilities: attach middleware, apply rate limits, delegate to controllers.
 * No business logic, no DB access, no response formatting.
 */

import type { FastifyPluginAsync } from 'fastify';
import { validate }      from '../../common/middleware/validate.js';
import { authenticate }  from '../../common/middleware/authenticate.js';
import { RegisterBodySchema, LoginBodySchema } from './auth.schemas.js';
import * as controller   from './auth.controller.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /auth/register
   * Rate limited: 5 requests per 15 minutes per IP.
   * Validate body → controller → service → repository.
   */
  fastify.post('/register', {
    config: {
      rateLimit: { max: 5, timeWindow: '15 minutes' },
    },
    preHandler: [validate(RegisterBodySchema)],
    handler: controller.register,
  });

  /**
   * POST /auth/login
   * Rate limited: 5 requests per 15 minutes per IP.
   * Validate body → controller → service → repository.
   */
  fastify.post('/login', {
    config: {
      rateLimit: { max: 5, timeWindow: '15 minutes' },
    },
    preHandler: [validate(LoginBodySchema)],
    handler: controller.login,
  });

  /**
   * POST /auth/refresh
   * Rate limited: 10 requests per 15 minutes per IP.
   * Reads refresh_token cookie — no body validation needed.
   */
  fastify.post('/refresh', {
    config: {
      rateLimit: { max: 10, timeWindow: '15 minutes' },
    },
    handler: controller.refresh,
  });

  /**
   * POST /auth/logout
   * Requires valid access token (authenticate middleware).
   * Revokes the refresh token from DB, clears the cookie.
   */
  fastify.post('/logout', {
    preHandler: [authenticate],
    handler: controller.logout,
  });

  /**
   * GET /auth/me
   * Requires valid access token.
   * Returns the current user's public profile.
   */
  fastify.get('/me', {
    preHandler: [authenticate],
    handler: controller.getMe,
  });

  /**
   * PATCH /auth/me
   * Requires valid access token.
   * Updates user preferences/settings.
   */
  fastify.patch('/me', {
    preHandler: [authenticate],
    handler: controller.updateMe,
  });
};

export default authRoutes;
