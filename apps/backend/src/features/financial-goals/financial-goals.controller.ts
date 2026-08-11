import type { FastifyRequest, FastifyReply } from 'fastify';
import { financialGoalsService } from './financial-goals.service.js';
import type { 
  CreateFinancialGoalPayload, 
  UpdateFinancialGoalPayload, 
  GoalProgressPayload 
} from './financial-goals.schemas.js';

export async function getGoals(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.auth.userId;
  const goals = await financialGoalsService.getGoals(userId);
  return reply.status(200).send({
    success: true,
    message: 'Goals fetched successfully',
    data: { goals },
  });
}

export async function createGoal(
  request: FastifyRequest<{ Body: CreateFinancialGoalPayload }>, 
  reply: FastifyReply
) {
  const userId = request.auth.userId;
  const goal = await financialGoalsService.createGoal(userId, request.body);
  return reply.status(201).send({
    success: true,
    message: 'Goal created successfully',
    data: { goal },
  });
}

export async function updateGoal(
  request: FastifyRequest<{ Params: { id: string }, Body: UpdateFinancialGoalPayload }>, 
  reply: FastifyReply
) {
  const userId = request.auth.userId;
  const goal = await financialGoalsService.updateGoal(userId, request.params.id, request.body);
  return reply.status(200).send({
    success: true,
    message: 'Goal updated successfully',
    data: { goal },
  });
}

export async function addProgress(
  request: FastifyRequest<{ Params: { id: string }, Body: GoalProgressPayload }>, 
  reply: FastifyReply
) {
  const userId = request.auth.userId;
  const goal = await financialGoalsService.addProgress(userId, request.params.id, request.body);
  return reply.status(200).send({
    success: true,
    message: 'Progress added successfully',
    data: { goal },
  });
}

export async function deleteGoal(
  request: FastifyRequest<{ Params: { id: string } }>, 
  reply: FastifyReply
) {
  const userId = request.auth.userId;
  await financialGoalsService.deleteGoal(userId, request.params.id);
  return reply.status(200).send({
    success: true,
    message: 'Goal deleted successfully'
  });
}
