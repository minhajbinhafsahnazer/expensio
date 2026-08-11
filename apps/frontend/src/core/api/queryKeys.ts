export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  transactions: {
    all: () => ["transactions"] as const,
    list: (filters?: object) => ["transactions", filters] as const,
    detail: (id: string) => ["transactions", id] as const,
  },
  expenseSessions: {
    all: () => ["expense-sessions"] as const,
  },
  financialGoals: {
    all: () => ["financial-goals"] as const,
  }
};
