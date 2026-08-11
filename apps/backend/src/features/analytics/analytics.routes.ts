import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { analyticsController } from './analytics.controller.js';

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    config: { rateLimit: { max: 100, timeWindow: '1 minute' } },
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        required: ['from', 'to'],
        properties: {
          from: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}(T.*)?$' },
          to: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}(T.*)?$' },
          timezone: { type: 'string' }
        }
      }
    },
    handler: analyticsController.getAnalytics,
  });
};
