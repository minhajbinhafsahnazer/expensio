import { client } from './client';

export interface TransactionResponse {
  id: string;
  sessionId: string;
  userId: string;
  amount: string;
  currency: string;
  type: string;
  category: string;
  superiorCategory?: string | null;
  note: string | null;
  spentAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export const TransactionsApi = {
  getAll: async () => {
    const response = await client.get<{ transactions: TransactionResponse[] }>('/transactions');
    return response.data.transactions;
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
