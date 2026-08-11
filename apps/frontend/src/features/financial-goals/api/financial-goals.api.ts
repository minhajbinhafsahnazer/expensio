import { client } from '../../../core/api/client';

export interface FinancialGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: string;
  currentAmount: string;
  priority: 'low' | 'medium' | 'high';
  targetDate: string | null;
  color: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  remainingAmount: number;
  progressPercentage: number;
}

export type CreateGoalPayload = {
  title: string;
  targetAmount: number;
  currentAmount?: number;
  priority?: 'low' | 'medium' | 'high';
  targetDate?: string;
  color?: string;
};

export type UpdateGoalPayload = Partial<CreateGoalPayload> & {
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  displayOrder?: number;
};

export type GoalProgressPayload = {
  amount: number;
};

export const FinancialGoalsApi = {
  getAll: async () => {
    const response = await client.get<{ goals: FinancialGoal[] }>('/financial-goals');
    return response.data.goals;
  },

  create: async (data: CreateGoalPayload) => {
    const response = await client.post<{ goal: FinancialGoal }>('/financial-goals', data);
    return response.data.goal;
  },

  update: async (id: string, data: UpdateGoalPayload) => {
    const response = await client.patch<{ goal: FinancialGoal }>(`/financial-goals/${id}`, data);
    return response.data.goal;
  },

  addProgress: async (id: string, data: GoalProgressPayload) => {
    const response = await client.post<{ goal: FinancialGoal }>(`/financial-goals/${id}/progress`, data);
    return response.data.goal;
  },

  delete: async (id: string) => {
    await client.delete(`/financial-goals/${id}`);
  }
};

