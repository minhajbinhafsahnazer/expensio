import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from './client';

export interface BudgetRecord {
  id: string;
  userId: string;
  monthKey: string;
  amount: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetSummary {
  monthKey: string;
  limit: number | null;
  spent: number;
  remaining: number | null;
}

export const BudgetsApi = {
  async setBudget(monthKey: string, amount: number): Promise<BudgetRecord> {
    const res = await client.post<BudgetRecord>('/budgets', { monthKey, amount });
    return res.data;
  },

  async getSummary(month: string, timezone?: string): Promise<BudgetSummary> {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await client.get<BudgetSummary>(`/budgets/summary?month=${month}&timezone=${encodeURIComponent(tz)}`);
    return res.data;
  },
};

export function useBudgetSummary(month: string) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return useQuery({
    queryKey: ['budget-summary', month, tz],
    queryFn: () => BudgetsApi.getSummary(month, tz),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(month),
  });
}

export function useSetBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ monthKey, amount }: { monthKey: string; amount: number }) =>
      BudgetsApi.setBudget(monthKey, amount),
    onSuccess: (_data, { monthKey }) => {
      // Invalidate both budget summary and intelligence summary for the month
      queryClient.invalidateQueries({ queryKey: ['budget-summary', monthKey] });
      queryClient.invalidateQueries({ queryKey: ['intelligence-summary'] });
    },
  });
}
