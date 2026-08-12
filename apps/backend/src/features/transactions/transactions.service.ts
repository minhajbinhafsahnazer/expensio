import { transactionsRepository } from './transactions.repository.js';

export const transactionsService = {
  async getTransactions(userId: string) {
    return await transactionsRepository.getUserTransactions(userId);
  },
  
  async updateTransaction(id: string, userId: string, payload: any) {
    if (payload.spentAt && typeof payload.spentAt === 'string') {
      payload.spentAt = new Date(payload.spentAt);
    }
    if (payload.superiorCategory !== undefined) {
      if (typeof payload.superiorCategory === 'string' && payload.superiorCategory.trim()) {
        payload.superiorCategory = payload.superiorCategory.trim();
      } else {
        payload.superiorCategory = null;
      }
    }
    return await transactionsRepository.update(id, userId, payload);
  },

  async deleteTransaction(id: string, userId: string) {
    return await transactionsRepository.softDelete(id, userId);
  }
};
