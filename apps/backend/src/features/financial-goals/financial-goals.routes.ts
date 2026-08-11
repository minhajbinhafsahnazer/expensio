import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/middleware/validate.js';
import * as controller from './financial-goals.controller.js';
import { 
  CreateFinancialGoalSchema, 
  UpdateFinancialGoalSchema, 
  GoalProgressSchema 
} from './financial-goals.schemas.js';

const financialGoalsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    handler: controller.getGoals,
  });

  fastify.post('/', {
    preHandler: [validate(CreateFinancialGoalSchema)],
    handler: controller.createGoal,
  });

  fastify.patch('/:id', {
    preHandler: [validate(UpdateFinancialGoalSchema)],
    handler: controller.updateGoal,
  });

  fastify.post('/:id/progress', {
    preHandler: [validate(GoalProgressSchema)],
    handler: controller.addProgress,
  });

  fastify.delete('/:id', {
    handler: controller.deleteGoal,
  });
};

export default financialGoalsRoutes;
