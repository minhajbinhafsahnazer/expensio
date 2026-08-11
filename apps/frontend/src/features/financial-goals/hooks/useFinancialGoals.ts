import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FinancialGoalsApi, type CreateGoalPayload, type UpdateGoalPayload, type GoalProgressPayload, type FinancialGoal } from '../api/financial-goals.api';
import { queryKeys } from '../../../core/api/queryKeys';

export function useFinancialGoals() {
  return useQuery({
    queryKey: queryKeys.financialGoals.all(),
    queryFn: FinancialGoalsApi.getAll,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGoalPayload) => FinancialGoalsApi.create(data),
    onMutate: async (newGoalData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.financialGoals.all() });
      const previousGoals = queryClient.getQueryData<FinancialGoal[]>(queryKeys.financialGoals.all());
      
      const optimisticGoal: FinancialGoal = {
        id: `temp-${Date.now()}`,
        userId: 'temp-user',
        title: newGoalData.title,
        targetAmount: newGoalData.targetAmount.toString(),
        currentAmount: (newGoalData.currentAmount || 0).toString(),
        priority: newGoalData.priority || 'medium',
        targetDate: newGoalData.targetDate || null,
        color: newGoalData.color || 'blue',
        status: 'ACTIVE',
        displayOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        remainingAmount: newGoalData.targetAmount - (newGoalData.currentAmount || 0),
        progressPercentage: newGoalData.targetAmount > 0 
          ? ((newGoalData.currentAmount || 0) / newGoalData.targetAmount) * 100 
          : 0,
      };

      queryClient.setQueryData<FinancialGoal[]>(queryKeys.financialGoals.all(), (old) => {
        return old ? [...old, optimisticGoal] : [optimisticGoal];
      });

      return { previousGoals };
    },
    onError: (_err, _newGoalData, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.financialGoals.all(), context.previousGoals);
      }
    },
    onSuccess: (serverGoal) => {
      queryClient.setQueryData<FinancialGoal[]>(queryKeys.financialGoals.all(), (old) => {
        if (!old) return [serverGoal];
        // Replace the temporary optimistic goal with the real one from the server
        return old.map(goal => goal.id.startsWith('temp-') ? serverGoal : goal);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financialGoals.all() });
    }
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoalPayload }) => FinancialGoalsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.financialGoals.all() });
      const previousGoals = queryClient.getQueryData<FinancialGoal[]>(queryKeys.financialGoals.all());
      
      queryClient.setQueryData<FinancialGoal[]>(queryKeys.financialGoals.all(), (old) => {
        if (!old) return [];
        return old.map(goal => {
          if (goal.id !== id) return goal;
          
          const newTargetAmount = data.targetAmount !== undefined ? data.targetAmount : parseFloat(goal.targetAmount);
          const currentAmount = parseFloat(goal.currentAmount);
          const remainingAmount = Math.max(0, newTargetAmount - currentAmount);
          const progressPercentage = newTargetAmount > 0 ? (currentAmount / newTargetAmount) * 100 : 0;

          return {
            ...goal,
            title: data.title ?? goal.title,
            targetAmount: newTargetAmount.toString(),
            priority: data.priority !== undefined ? data.priority : goal.priority,
            targetDate: data.targetDate !== undefined ? data.targetDate : goal.targetDate,
            color: data.color ?? goal.color,
            status: data.status ?? goal.status,
            displayOrder: data.displayOrder ?? goal.displayOrder,
            remainingAmount,
            progressPercentage
          };
        });
      });

      return { previousGoals };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.financialGoals.all(), context.previousGoals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financialGoals.all() });
    }
  });
}

export function useAddGoalProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GoalProgressPayload }) => FinancialGoalsApi.addProgress(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.financialGoals.all() });
      const previousGoals = queryClient.getQueryData<FinancialGoal[]>(queryKeys.financialGoals.all());
      
      queryClient.setQueryData<FinancialGoal[]>(queryKeys.financialGoals.all(), (old) => {
        if (!old) return [];
        return old.map(goal => {
          if (goal.id !== id) return goal;
          
          const targetAmount = parseFloat(goal.targetAmount);
          const newCurrentAmount = parseFloat(goal.currentAmount) + data.amount;
          const remainingAmount = Math.max(0, targetAmount - newCurrentAmount);
          const progressPercentage = targetAmount > 0 ? (newCurrentAmount / targetAmount) * 100 : 0;

          return {
            ...goal,
            currentAmount: newCurrentAmount.toString(),
            remainingAmount,
            progressPercentage,
            status: newCurrentAmount >= targetAmount ? 'COMPLETED' : 'ACTIVE'
          };
        });
      });

      return { previousGoals };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.financialGoals.all(), context.previousGoals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financialGoals.all() });
    }
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => FinancialGoalsApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.financialGoals.all() });
      const previousGoals = queryClient.getQueryData<FinancialGoal[]>(queryKeys.financialGoals.all());
      
      queryClient.setQueryData<FinancialGoal[]>(queryKeys.financialGoals.all(), (old) => {
        if (!old) return [];
        return old.filter(goal => goal.id !== id);
      });

      return { previousGoals };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.financialGoals.all(), context.previousGoals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financialGoals.all() });
    }
  });
}
