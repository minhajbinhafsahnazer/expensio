import { useQuery } from '@tanstack/react-query';
import { client } from './client';

// ─── Response Types (mirror intelligence.service.ts) ────────────────────────

export interface DailyTolerance {
  monthlyLimit: number;
  limitSource: 'user' | 'auto_15pct' | 'auto_17pct' | 'auto_20pct' | 'no_income';
  spent: number;
  remaining: number;
  daysRemaining: number;
  daysInMonth: number;
  dailyAllowance: number;
  dailyAvgActual: number;
  paceStatus: 'within_limit' | 'approaching_limit' | 'over_limit';
  limitUsedPct: number;
  /** Amount spent today */
  todaySpent: number;
  /** Today's spending has reached or exceeded the daily allowance */
  todayLimitReached: boolean;
  /** Today's spending is approaching (>= 80%) the daily allowance */
  todayNearLimit: boolean;
  /** Remaining allowance available for today */
  todayRemainingAllowance: number;
  /** Percentage of today's allowance consumed */
  todayUsedPct: number;
  /** Amount by which today's allowance was exceeded (0 if within) */
  todayExcess: number;
}

export interface CategorySignal {
  name: string;
  amount: number;
  percentage: number;
  changeVsPrevMonthPct: number | null;
  signal: 'stable' | 'rising' | 'falling';
}

export interface GoalSignal {
  id: string;
  title: string;
  progressPercentage: number;
  daysActive: number;
  daysUntilTarget: number | null;
  onTrack: boolean;
  expectedProgressPct: number | null;
}

export interface DebtSignal {
  total: number;
  unsettledBorrowed: number;
  unsettledLent: number;
  count: number;
}

export interface IntelligenceSummary {
  generatedAt: string;
  monthKey: string;
  income: number;
  hasIncome: boolean;
  tolerance: DailyTolerance;
  topCategories: CategorySignal[];
  goals: GoalSignal[];
  debt: DebtSignal;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const IntelligenceApi = {
  async getSummary(month: string, timezone?: string): Promise<IntelligenceSummary> {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await client.get<IntelligenceSummary>(
      `/intelligence/summary?month=${month}&timezone=${encodeURIComponent(tz)}`,
    );
    return res.data;
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useIntelligenceSummary(month: string) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return useQuery({
    queryKey: ['intelligence-summary', month, tz],
    queryFn: () => IntelligenceApi.getSummary(month, tz),
    staleTime: 1000 * 60 * 2, // refresh every 2 minutes
    enabled: Boolean(month),
  });
}
