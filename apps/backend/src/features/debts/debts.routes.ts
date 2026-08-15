import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate';
import * as controller from './debts.controller';

const debtsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    config: { rateLimit: { max: 100, timeWindow: '1 minute' } },
    preHandler: [authenticate],
    handler: controller.getDebts,
  });

  fastify.post('/', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: [authenticate],
    handler: controller.createDebt,
  });

  fastify.patch('/:id', {
    config: { rateLimit: { max: 100, timeWindow: '1 minute' } },
    preHandler: [authenticate],
    handler: controller.updateDebt,
  });

  fastify.delete('/:id', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: [authenticate],
    handler: controller.deleteDebt,
  });
};

export default debtsRoutes;
