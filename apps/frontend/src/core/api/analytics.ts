import { useQuery } from '@tanstack/react-query';
import { client } from './client';

export interface DailySpendingPoint {
  day: number;
  dateStr: string;
  fullDateStr: string;
  amount: number;
  isPeak?: boolean;
}

export interface AnalyticsData {
  period: { from: string; to: string };
  daysCount: number;
  totalSpent: number;
  totalIncome: number;
  netCashFlow: number;
  dailyAverage: number;
  previousPeriodSpent: number;
  percentageChange: number;
  peakDay: { date: string; amount: number };
  dailyData: DailySpendingPoint[];
  categories: { 
    name: string; 
    amount: number; 
    color: string; 
    percentage: number;
    transactions: { id: string; description: string; amount: number; spentAt: string }[];
  }[];
}

export const AnalyticsApi = {
  async getAnalytics(from: string, to: string, timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): Promise<AnalyticsData> {
    const data = await client.get<AnalyticsData>(`/analytics?from=${from}&to=${to}&timezone=${encodeURIComponent(timezone)}`);
    return data.data;
  },
};

export function useAnalytics(from: string, to: string, timezone?: string) {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return useQuery({
    queryKey: ['analytics', from, to, tz],
    queryFn: () => AnalyticsApi.getAnalytics(from, to, tz),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: Boolean(from && to),
  });
}
