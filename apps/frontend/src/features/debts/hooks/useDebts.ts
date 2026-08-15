import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../../../core/api/client';

export interface DebtItem {
  id: string;
  name: string;
  amount: string | number; // String on fetch, number on create/update
  type: 'lent' | 'borrowed';
  dueDate: string | null;
  note: string | null;
  isSettled: boolean;
  hasReminder: boolean;
  createdAt: string;
}

export function useDebts() {
  return useQuery({
    queryKey: ['debts'],
    queryFn: async () => {
      try {
        const res = await client.get<DebtItem[]>('/debts');
        return res.data;
      } catch (err) {
        console.error("[useDebts] Failed to fetch debts:", err);
        throw err;
      }
    },
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<DebtItem>) => {
      const res = await client.post<DebtItem>('/debts', data);
      return res.data;
    },
    onMutate: async (newDebt) => {
      await queryClient.cancelQueries({ queryKey: ['debts'] });
      const previousDebts = queryClient.getQueryData<DebtItem[]>(['debts']);
      
      queryClient.setQueryData<DebtItem[]>(['debts'], (old) => {
        const optimisticDebt: DebtItem = {
          id: `temp-${Date.now()}`,
          name: newDebt.name || '',
          amount: newDebt.amount || 0,
          type: newDebt.type || 'lent',
          dueDate: newDebt.dueDate || null,
          note: newDebt.note || null,
          isSettled: newDebt.isSettled || false,
          hasReminder: newDebt.hasReminder || false,
          createdAt: new Date().toISOString(),
        };
        return [optimisticDebt, ...(old || [])];
      });
      
      return { previousDebts };
    },
    onError: (_err, _newDebt, context) => {
      if (context?.previousDebts) {
        queryClient.setQueryData(['debts'], context.previousDebts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
}

export function useUpdateDebt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DebtItem> & { id: string }) => {
      const res = await client.patch<DebtItem>(`/debts/${id}`, data);
      return res.data;
    },
    onMutate: async (updatedDebt) => {
      await queryClient.cancelQueries({ queryKey: ['debts'] });
      const previousDebts = queryClient.getQueryData<DebtItem[]>(['debts']);
      
      queryClient.setQueryData<DebtItem[]>(['debts'], (old) => {
        if (!old) return [];
        return old.map(debt => 
          debt.id === updatedDebt.id ? { ...debt, ...updatedDebt } : debt
        );
      });
      
      return { previousDebts };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousDebts) {
        queryClient.setQueryData(['debts'], context.previousDebts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await client.delete(`/debts/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['debts'] });
      const previousDebts = queryClient.getQueryData<DebtItem[]>(['debts']);
      
      queryClient.setQueryData<DebtItem[]>(['debts'], (old) => {
        if (!old) return [];
        return old.filter(debt => debt.id !== id);
      });
      
      return { previousDebts };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousDebts) {
        queryClient.setQueryData(['debts'], context.previousDebts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
}
