import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { ulid } from 'ulid';
import { sql } from 'drizzle-orm';
import { env } from './config/environment.js';
import { db } from './database/client.js';
import { AppError } from './common/errors/index.js';
import { logger, logRequest, logRequestError } from './common/lib/logger.js';
import authRoutes from './features/auth/auth.routes.js';
import expenseSessionsRoutes from './features/expense-sessions/expense-sessions.routes.js';
import transactionsRoutes from './features/transactions/transactions.routes.js';
import { analyticsRoutes } from './features/analytics/analytics.routes.js';
import financialGoalsRoutes from './features/financial-goals/financial-goals.routes.js';
import { budgetsRoutes } from './features/budgets/budgets.routes.js';
import debtsRoutes from './features/debts/debts.routes.js';
import { categoriesRoutes } from './features/categories/categories.routes.js';

export async function buildApp() {
  const app = Fastify({
    genReqId: () => ulid(),
    // Disable Fastify's verbose Pino logger — we use our own structured logger below.
    logger: false,
    // REQUIRED FOR RENDER/PROXIES: Trust the X-Forwarded-For header to get real client IPs.
    // Without this, the rate limiter treats all global traffic as coming from a single Render proxy IP,
    // causing immediate 429 Too Many Requests errors.
    trustProxy: true,
  });

  // ─── Request Timing ─────────────────────────────────────────────────────────
  app.addHook('onRequest', async (request) => {
    (request as any)._startMs = Date.now();
  });

  // ─── Security Headers ────────────────────────────────────────────────────────
  // @fastify/helmet sets X-Content-Type-Options, X-Frame-Options, HSTS, etc.
  // contentSecurityPolicy is disabled — it would require tuning the Swagger UI
  // and any future server-rendered content. Add a tuned CSP before going further.
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // ─── CORS ────────────────────────────────────────────────────────────────────
  // Never use `origin: true` — that allows any domain to make credentialed requests.
  // ALLOWED_ORIGIN is required in production and validated by environment.ts.
  await app.register(cors, {
    origin: env.ALLOWED_ORIGIN,
    credentials: true, // Required: refresh token lives in an HttpOnly cookie.
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ─── Cookie & JWT ────────────────────────────────────────────────────────────
  await app.register(cookie, { secret: env.COOKIE_SECRET });
  await app.register(jwt,    { secret: env.JWT_SECRET });

  // ─── Rate Limiting ──────────────────────────────────────────────────────────
  // Global defaults — individual routes can override via config.rateLimit.
  // Uses in-memory store for single-instance deployment.
  // TODO: wire to Redis store when scaling to multiple instances.
  await app.register(rateLimit, {
    global:     true,
    max:        100,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => {
      const err: any = new Error('Too many requests — please slow down');
      err.statusCode = 429;
      err.code = 'TOO_MANY_REQUESTS';
      err.meta = {
        retryAfter: context.after,
        timestamp:  new Date().toISOString(),
      };
      return err;
    },
  });

  // ─── Swagger / OpenAPI ──────────────────────────────────────────────────────
  // Registered unconditionally so schemas are always built.
  await app.register(swagger, {
    openapi: {
      info: {
        title:       'ExpenseFlow API',
        description: 'Production-grade OpenAPI documentation for ExpenseFlow.',
        version:     '1.0.0',
      },
      servers: [{ url: '/api/v1' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type:         'http',
            scheme:       'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  // UI only in development — never expose schema introspection to production.
  if (env.NODE_ENV === 'development') {
    await app.register(swaggerUi, {
      routePrefix: '/api/docs',
      uiConfig: { docExpansion: 'list', deepLinking: false },
    });
  }

  // ─── Response Hooks ──────────────────────────────────────────────────────────

  // Attach request correlation ID to every response for log correlation.
  app.addHook('onSend', async (request, reply) => {
    reply.header('X-Request-Id', request.id);
  });

  // Log every completed request. Skip OPTIONS (CORS preflight noise).
  // Skip /api/v1/health — Render's internal health checker fires every ~5 s.
  // Logging it produces ~720 identical lines/hour with zero diagnostic value.
  // Render's health monitoring reads the HTTP response code, not our logs.
  app.addHook('onResponse', async (request, reply) => {
    if (request.method === 'OPTIONS') return;
    if (request.url === '/api/v1/health') return;
    if (request.url === '/api/v1/ready') return;
    const durationMs = Date.now() - ((request as any)._startMs ?? Date.now());
    logRequest({
      method:     request.method,
      path:       request.url,
      statusCode: reply.statusCode,
      durationMs,
      requestId:  request.id,
      userId:     (request as any).auth?.userId,
    });
  });

  // ─── Global Response Envelope ────────────────────────────────────────────────
  // Wraps responses that don't already have a `success` field.
  app.addHook('preSerialization', async (request, _reply, payload) => {
    if (
      payload &&
      typeof payload === 'object' &&
      'success' in (payload as Record<string, unknown>)
    ) {
      return payload;
    }

    return {
      success: true,
      data:    payload ?? {},
      message: 'Success',
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
        version:   'v1',
      },
    };
  });

  // ─── Global Error Handler ───────────────────────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    const durationMs = Date.now() - ((request as any)._startMs ?? Date.now());

    if (!(error instanceof AppError)) {
      // Unexpected errors: log full stack trace server-side.
      logRequestError({
        method:     request.method,
        path:       request.url,
        statusCode: (error as any).statusCode ?? 500,
        durationMs,
        requestId:  request.id,
        userId:     (request as any).auth?.userId,
        error,
      });
    } else {
      // Expected AppErrors (401, 403, 404, 409): clean one-liner only.
      logger.warning(
        `${request.method.padEnd(6)} ${request.url} → ${error.statusCode} — ${error.message}`
      );
    }

    // Typed AppErrors: return structured error without leaking internals.
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        message: error.message,
        error:   { code: error.code },
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const statusCode = (error as any).statusCode ?? 500;
    const code       = (error as any).code ?? 'INTERNAL_SERVER_ERROR';

    // In production, never expose internal error details to clients.
    const message = statusCode >= 500 && env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message;

    return reply.status(statusCode).send({
      success: false,
      message,
      error:   { code },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
        ...((error as any).meta || {}),
      },
    });
  });

  // ─── Routes ─────────────────────────────────────────────────────────────────
  app.register(async (api) => {
    /**
     * GET /api/v1/health
     * Liveness probe — always fast, no I/O.
     * Returns 200 as long as the process is running.
     */
    api.get('/health', {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    }, async () => ({
      status:      'healthy',
      uptime:      Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      version:     '1.0.0',
      timestamp:   new Date().toISOString(),
    }));

    /**
     * GET /api/v1/ready
     * Ultra-lightweight keep-alive / readiness probe.
     * Hits no databases and performs no I/O.
     */
    api.get('/ready', {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    }, async (_request, reply) => {
      return reply.send({
        status:    'ready',
        timestamp: new Date().toISOString(),
      });
    });

    // Feature routes
    api.register(authRoutes,             { prefix: '/auth' });
    api.register(expenseSessionsRoutes,  { prefix: '/expense-sessions' });
    api.register(transactionsRoutes,     { prefix: '/transactions' });
    api.register(financialGoalsRoutes,   { prefix: '/financial-goals' });
    api.register(analyticsRoutes,        { prefix: '/analytics' });
    api.register(budgetsRoutes,          { prefix: '/budgets' });
    api.register(debtsRoutes,            { prefix: '/debts' });
    api.register(categoriesRoutes,       { prefix: '/categories' });
  }, { prefix: '/api/v1' });

  return app;
}
