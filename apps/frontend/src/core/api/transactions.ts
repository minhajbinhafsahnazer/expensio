import { client } from './client';

export interface TransactionResponse {
  id: string;
  sessionId: string;
  userId: string;
  amount: string;
  currency: string;
  type: string;
  category: string;
  description: string;
  superiorCategory?: string | null;
  note: string | null;
  spentAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export const TransactionsApi = {
  getNeedsReview: async () => {
    const response = await client.get<{ items: { term: string; transactionCount: number; totalAmount: number }[]; total: number }>('/transactions/needs-review');
    return response.data;
  },
  createBulkMappings: async (payload: { mappings: { normalizedTerm: string; category: string; ignored?: boolean }[] }) => {
    const response = await client.post('/transactions/mappings/bulk', payload);
    return response.data;
  },
  getAll: async (month?: string) => {
    const url = month ? `/transactions?month=${month}` : '/transactions';
    const response = await client.get<{ transactions: TransactionResponse[] }>(url);
    return response.data.transactions;
  },
  getMonthlySummary: async () => {
    const response = await client.get<{ summaries: { monthKey: string; total: number; transactionCount: number }[] }>('/transactions/monthly-summary');
    return response.data.summaries;
  },
  update: async (id: string, payload: any) => {
    const response = await client.put<{ transaction: TransactionResponse }>(`/transactions/${id}`, payload);
    return response.data.transaction;
  },
  delete: async (id: string) => {
    const response = await client.delete(`/transactions/${id}`);
    return response.data;
  },
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useNeedsReviewTransactions() {
  return useQuery({
    queryKey: ['transactions', 'needs-review'],
    queryFn: TransactionsApi.getNeedsReview,
  });
}

export function useCreateBulkMappings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: TransactionsApi.createBulkMappings,
    onSuccess: () => {
      // Invalidate all three so banner, analytics, and transaction list all update
      queryClient.invalidateQueries({ queryKey: ['transactions', 'needs-review'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }
  });
}
