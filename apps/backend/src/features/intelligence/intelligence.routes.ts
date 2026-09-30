import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { intelligenceController } from './intelligence.controller.js';

export const intelligenceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/summary', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
          timezone: { type: 'string' },
        },
      },
    },
    handler: intelligenceController.getSummary,
  });
};
