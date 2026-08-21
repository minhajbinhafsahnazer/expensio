import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from './client';

export interface Category {
  id: string;
  name: string;
  normalizedName: string;
}

export const CategoriesApi = {
  async getCategories(): Promise<Category[]> {
    const response = await client.get<Category[]>('/categories');
    return response.data;
  },

  async createCategory(name: string): Promise<Category> {
    const response = await client.post<Category>('/categories', { name });
    return response.data;
  }
};

export function useCustomCategories() {
  return useQuery({
    queryKey: ['custom-categories'],
    queryFn: () => CategoriesApi.getCategories(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useCreateCustomCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => CategoriesApi.createCategory(name),
    onSuccess: () => {
      // Invalidate so the list updates
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
    },
  });
}
