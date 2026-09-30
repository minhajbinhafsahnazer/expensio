/**
 * ai/ai.routes.ts
 *
 * POST /api/v1/ai/chat
 *
 * Accepts a conversation history (user + assistant messages only).
 * The system prompt is added server-side — never accepted from the client.
 *
 * Limits:
 *   - 20 requests per minute per IP  (fastify/rate-limit)
 *   - 50 messages per user per day   (usage-limiter, configurable via AI_DAILY_LIMIT)
 */

import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { chatService } from './chat.service.js';
import { BadRequestError } from '../../common/errors/index.js';
import { consumeAiQuota, getAiQuotaStatus } from './usage-limiter.js';

const aiRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/v1/ai/chat
   *
   * Request body:
   *   { messages: [{ role: "user" | "assistant", content: string }] }
   *
   * Response:
   *   { message: string }
   *
   * Response headers:
   *   X-AI-Quota-Used      – messages used today
   *   X-AI-Quota-Limit     – daily cap
   *   X-AI-Quota-Remaining – messages left today
   *   X-AI-Quota-Resets-At – ISO 8601 UTC midnight reset time
   */
  fastify.post('/chat', {
    config: {
      // Conservative per-minute rate limit: AI requests are expensive.
      rateLimit: { max: 20, timeWindow: '1 minute' },
    },
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['messages'],
        properties: {
          messages: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            items: {
              type: 'object',
              required: ['role', 'content'],
              properties: {
                role:    { type: 'string', enum: ['user', 'assistant'] },
                content: { type: 'string', minLength: 1, maxLength: 4000 },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    },
    handler: async (request, reply) => {
      const { messages } = request.body as {
        messages: { role: 'user' | 'assistant'; content: string }[];
      };

      // Guard: last message must be from the user
      const last = messages.at(-1);
      if (!last || last.role !== 'user') {
        throw new BadRequestError('The last message must have role "user".');
      }

      // Per-user daily quota check (throws 429 if exhausted)
      consumeAiQuota(request.auth.userId);

      const text = await chatService.chat(messages);

      // Expose quota status in response headers so the frontend can display it
      const quota = getAiQuotaStatus(request.auth.userId);
      reply.header('X-AI-Quota-Used',       String(quota.used));
      reply.header('X-AI-Quota-Limit',      String(quota.limit));
      reply.header('X-AI-Quota-Remaining',  String(quota.remaining));
      reply.header('X-AI-Quota-Resets-At',  quota.resetsAt);

      return reply.status(200).send({
        success: true,
        data:    { message: text },
        message: 'Chat response generated',
      });
    },
  });
};

export default aiRoutes;
