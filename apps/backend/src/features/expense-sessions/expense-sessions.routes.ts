import type { FastifyPluginAsync } from 'fastify';
import { validate } from '../../common/middleware/validate.js';
import { authenticate } from '../../common/middleware/authenticate.js';
import { ExpenseSessionCreateSchema } from './expense-sessions.schemas.js';
import * as controller from './expense-sessions.controller.js';

const expenseSessionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', {
    config: {
      rateLimit: { max: 20, timeWindow: '1 minute' },
    },
    preHandler: [authenticate, validate(ExpenseSessionCreateSchema)],
    handler: controller.createSession,
  });
};

export default expenseSessionsRoutes;
