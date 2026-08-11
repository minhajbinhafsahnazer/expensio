import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate';
import { budgetsController } from './budgets.controller';

export const budgetsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['monthKey', 'amount'],
        properties: {
          monthKey: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
          amount: { type: 'number' }
        }
      }
    },
    handler: budgetsController.setBudget,
  });

  fastify.get('/summary', {
    config: { rateLimit: { max: 100, timeWindow: '1 minute' } },
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        required: ['month'],
        properties: {
          month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
          timezone: { type: 'string' }
        }
      }
    },
    handler: budgetsController.getBudgetSummary,
  });
};
