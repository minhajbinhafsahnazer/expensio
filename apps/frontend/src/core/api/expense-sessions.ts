import { client } from './client';

export interface TransactionCreatePayload {
  clientGeneratedId: string;
  amount: number;
  currency?: string;
  category: string;
  note?: string;
  spentAt: string; // ISO string
  status?: 'pending' | 'synced';
  type?: 'expense' | 'income' | string;
}

export interface ExpenseSessionCreatePayload {
  transactions: TransactionCreatePayload[];
}

export interface ExpenseSessionResponse {
  session: {
    id: string;
    userId: string;
    totalAmount: string;
    itemCount: number;
    createdAt: string;
    updatedAt: string;
  };
  transactions: Array<{
    id: string;
    sessionId: string;
    userId: string;
    amount: string;
    currency: string;
    category: string;
    note: string | null;
    spentAt: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export const ExpenseSessionsApi = {
  create: async (payload: ExpenseSessionCreatePayload) => {
    const response = await client.post<ExpenseSessionResponse>(
      '/expense-sessions',
      payload
    );
    return response.data;
  },
};
