import { ulid } from 'ulid';
import { NotFoundError } from '../../common/errors/index.js';
import { financialGoalsRepository } from './financial-goals.repository.js';
import type { 
  CreateFinancialGoalPayload, 
  UpdateFinancialGoalPayload, 
  GoalProgressPayload 
} from './financial-goals.schemas.js';

function computeFields(goal: any) {
  const target = parseFloat(goal.targetAmount);
  const current = parseFloat(goal.currentAmount);
  const remainingAmount = Math.max(0, target - current);
  const progressPercentage = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  
  return {
    ...goal,
    remainingAmount,
    progressPercentage
  };
}

export const financialGoalsService = {
  async getGoals(userId: string) {
    const goals = await financialGoalsRepository.findAllByUser(userId);
    return goals.map(computeFields);
  },

  async createGoal(userId: string, data: CreateFinancialGoalPayload) {
    const newGoal = await financialGoalsRepository.create({
      id: ulid(),
      userId,
      title: data.title,
      targetAmount: data.targetAmount.toString(),
      currentAmount: data.currentAmount !== undefined ? data.currentAmount.toString() : '0',
      priority: data.priority || 'medium',
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      color: data.color || 'blue',
      status: 'ACTIVE'
    });
    return computeFields(newGoal);
  },

  async updateGoal(userId: string, id: string, data: UpdateFinancialGoalPayload) {
    const existing = await financialGoalsRepository.findById(id, userId);
    if (!existing) throw new NotFoundError('Goal not found');

    const updateData: any = { ...data };
    if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount.toString();
    if (data.targetDate !== undefined) updateData.targetDate = new Date(data.targetDate);

    const updated = await financialGoalsRepository.update(id, userId, updateData);
    return computeFields(updated);
  },

  async addProgress(userId: string, id: string, data: GoalProgressPayload) {
    const existing = await financialGoalsRepository.findById(id, userId);
    if (!existing) throw new NotFoundError('Goal not found');

    const newAmount = parseFloat(existing.currentAmount) + data.amount;
    let status = existing.status;
    
    if (newAmount >= parseFloat(existing.targetAmount)) {
      status = 'COMPLETED';
    }

    const updated = await financialGoalsRepository.update(id, userId, { 
      currentAmount: newAmount.toString(),
      status
    });
    return computeFields(updated);
  },

  async deleteGoal(userId: string, id: string) {
    const existing = await financialGoalsRepository.findById(id, userId);
    if (!existing) throw new NotFoundError('Goal not found');
    await financialGoalsRepository.softDelete(id, userId);
  }
};
