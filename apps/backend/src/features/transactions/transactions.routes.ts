import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import * as controller from './transactions.controller.js';

const transactionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    config: {
      rateLimit: { max: 100, timeWindow: '1 minute' },
    },
    preHandler: [authenticate],
    handler: controller.getTransactions,
  });

  fastify.get('/needs-review', {
    config: {
      rateLimit: { max: 100, timeWindow: '1 minute' },
    },
    preHandler: [authenticate],
    handler: controller.getNeedsReviewTransactions,
  });

  fastify.post('/mappings/bulk', {
    config: {
      rateLimit: { max: 20, timeWindow: '1 minute' },
    },
    preHandler: [authenticate],
    handler: controller.createBulkMappings,
  });

  fastify.put('/:id', {
    config: {
      rateLimit: { max: 100, timeWindow: '1 minute' },
    },
    preHandler: [authenticate],
    handler: controller.updateTransaction,
  });

  fastify.delete('/:id', {
    config: {
      rateLimit: { max: 100, timeWindow: '1 minute' },
    },
    preHandler: [authenticate],
    handler: controller.deleteTransaction,
  });
};

export default transactionsRoutes;
