import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { categoriesController } from './categories.controller.js';

export const categoriesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    config: {
      rateLimit: { max: 100, timeWindow: '1 minute' },
    },
    preHandler: [authenticate],
    handler: categoriesController.getCategories,
  });

  fastify.post('/', {
    config: {
      rateLimit: { max: 50, timeWindow: '1 minute' },
    },
    preHandler: [authenticate],
    handler: categoriesController.createCategory,
  });
};
