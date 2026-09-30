import { analyticsService } from '../analytics/analytics.service.js';
import { budgetsService } from '../budgets/budgets.service.js';
import { financialGoalsRepository } from '../financial-goals/financial-goals.repository.js';
import { debtsRepository } from '../debts/debts.repository.js';

export interface DailyTolerance {
  /** The monthly spend limit (user-set or auto-derived from income) */
  monthlyLimit: number;
  /** Whether this limit was set manually by user or auto-derived */
  limitSource: 'user' | 'auto_15pct' | 'auto_17pct' | 'auto_20pct' | 'no_income';
  /** Amount already spent this month (expenses only) */
  spent: number;
  /** Amount remaining within the limit */
  remaining: number;
  /** Days remaining in this calendar month */
  daysRemaining: number;
  /** Total days in this calendar month */
  daysInMonth: number;
  /** Allowable spend per remaining day: remaining / daysRemaining */
  dailyAllowance: number;
  /** Average spend per elapsed day so far this month */
  dailyAvgActual: number;
  /** Pace status determined purely from numbers */
  paceStatus: 'within_limit' | 'approaching_limit' | 'over_limit';
  /** Percentage of limit already consumed */
  limitUsedPct: number;
  /** Amount spent today (expenses incurred on current local date) */
  todaySpent: number;
  /** Whether today's spending has reached or exceeded today's daily allowance */
  todayLimitReached: boolean;
  /** Whether today's spending is approaching today's daily allowance (>= 80%) */
  todayNearLimit: boolean;
  /** Remaining allowance available for today */
  todayRemainingAllowance: number;
  /** Percentage of today's allowance consumed */
  todayUsedPct: number;
  /** Amount by which today's allowance was exceeded (0 if within limit) */
  todayExcess: number;
}

export interface CategorySignal {
  name: string;
  amount: number;
  percentage: number;
  /** Change vs same category in previous month (+/- pct points) */
  changeVsPrevMonthPct: number | null;
  signal: 'stable' | 'rising' | 'falling';
}

export interface GoalSignal {
  id: string;
  title: string;
  progressPercentage: number;
  /** Days since goal was created / funded — used to estimate pace */
  daysActive: number;
  /** Days until targetDate, if set */
  daysUntilTarget: number | null;
  /** Whether on track: if daysUntilTarget exists and progressPercentage ≥ expectedPct */
  onTrack: boolean;
  /** Expected completion % given elapsed time vs targetDate */
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
  tolerance: DailyTolerance;
  topCategories: CategorySignal[];
  goals: GoalSignal[];
  debt: DebtSignal;
  income: number;
  /** Whether the user has recorded any income this month (required for reliable calcs) */
  hasIncome: boolean;
}

/**
 * Pure-logic financial intelligence service.
 * No AI, no LLMs — all signals are deterministic calculations
 * derived from the user's actual transaction and goal data.
 */
export const intelligenceService = {
  async getSummary(
    userId: string,
    monthKey: string, // YYYY-MM
    timezone: string = 'UTC',
  ): Promise<IntelligenceSummary> {
    const [year, monthNum] = monthKey.split('-').map(Number);

    // ── 1. Date boundaries ───────────────────────────────────────────────────
    const startOfMonth = new Date(Date.UTC(year, monthNum - 1, 1));
    const lastDayNum = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
    const endOfMonth = new Date(Date.UTC(year, monthNum - 1, lastDayNum, 23, 59, 59, 999));

    // Previous month window (for category change comparison)
    const prevMonthNum = monthNum === 1 ? 12 : monthNum - 1;
    const prevYear = monthNum === 1 ? year - 1 : year;
    const prevLastDay = new Date(Date.UTC(prevYear, prevMonthNum, 0)).getUTCDate();
    const prevFromStr = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}-01`;
    const prevToStr = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}-${prevLastDay}`;

    const fromStr = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const toStr = `${year}-${String(monthNum).padStart(2, '0')}-${lastDayNum}`;

    // ── 2. Fetch current month analytics & previous month analytics ──────────
    const [currentAnalytics, prevAnalytics] = await Promise.all([
      analyticsService.getAnalyticsRange(userId, fromStr, toStr, timezone),
      analyticsService.getAnalyticsRange(userId, prevFromStr, prevToStr, timezone),
    ]);

    const income = currentAnalytics.totalIncome;
    const spent = currentAnalytics.totalSpent;
    const hasIncome = income > 0;

    // ── 3. Determine spend limit ─────────────────────────────────────────────
    // Priority: user-set budget > auto-derived from income > fallback
    const storedBudget = await budgetsService.getBudget(userId, monthKey);
    let monthlyLimit: number;
    let limitSource: DailyTolerance['limitSource'];

    if (storedBudget && parseFloat(storedBudget.amount.toString()) > 0) {
      monthlyLimit = parseFloat(storedBudget.amount.toString());
      limitSource = 'user';
    } else if (hasIncome) {
      // Default band: 17% of monthly income (midpoint of 15–20%)
      monthlyLimit = Math.round(income * 0.17);
      limitSource = 'auto_17pct';
    } else {
      // No income recorded — use 0 to indicate "not computable"
      monthlyLimit = 0;
      limitSource = 'no_income';
    }

    // ── 4. Daily tolerance calculations ─────────────────────────────────────
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Days remaining = days from today (inclusive) to end of month
    // If we're past the month, daysRemaining = 0
    let daysRemaining: number;
    let daysElapsed: number;

    if (todayUTC > endOfMonth) {
      // Querying a past month — full month elapsed
      daysRemaining = 0;
      daysElapsed = lastDayNum;
    } else if (todayUTC < startOfMonth) {
      // Querying a future month — none elapsed
      daysRemaining = lastDayNum;
      daysElapsed = 0;
    } else {
      // Current month: elapsed = day of month (today is day N, so N-1 full days + today)
      const todayDay = todayUTC.getUTCDate();
      daysElapsed = todayDay; // inclusive of today
      daysRemaining = lastDayNum - todayDay + 1; // inclusive of today
    }

    const remaining = monthlyLimit > 0 ? Math.max(0, monthlyLimit - spent) : 0;
    const dailyAllowance = daysRemaining > 0 && monthlyLimit > 0
      ? remaining / daysRemaining
      : 0;
    const dailyAvgActual = daysElapsed > 0 ? spent / daysElapsed : 0;
    const limitUsedPct = monthlyLimit > 0 ? Math.min(100, (spent / monthlyLimit) * 100) : 0;

    let paceStatus: DailyTolerance['paceStatus'];
    if (monthlyLimit <= 0) {
      paceStatus = 'within_limit'; // Can't determine without a limit
    } else if (spent > monthlyLimit) {
      paceStatus = 'over_limit';
    } else if (limitUsedPct >= 80) {
      paceStatus = 'approaching_limit';
    } else {
      paceStatus = 'within_limit';
    }

    // ── Today's spend & tolerance calculation ──────────────────────────────
    const todayDateStr = now.toLocaleDateString('en-CA', { timeZone: timezone || 'UTC' });
    const todayEntry = currentAnalytics.dailyData.find((d) => d.fullDateStr === todayDateStr);
    const todaySpent = todayEntry ? todayEntry.amount : 0;

    const todayLimitReached = dailyAllowance > 0 && todaySpent >= dailyAllowance;
    const todayNearLimit = dailyAllowance > 0 && !todayLimitReached && todaySpent >= dailyAllowance * 0.8;
    const todayRemainingAllowance = Math.max(0, dailyAllowance - todaySpent);
    const todayUsedPct = dailyAllowance > 0 ? Number(((todaySpent / dailyAllowance) * 100).toFixed(1)) : 0;
    const todayExcess = todaySpent > dailyAllowance ? Number((todaySpent - dailyAllowance).toFixed(2)) : 0;

    // ── 5. Category signals ──────────────────────────────────────────────────
    // Build previous month category map for comparison
    const prevCategoryMap = new Map<string, number>();
    for (const cat of prevAnalytics.categories) {
      prevCategoryMap.set(cat.name.toLowerCase(), cat.percentage);
    }

    const topCategories: CategorySignal[] = currentAnalytics.categories
      .slice(0, 5)
      .map((cat) => {
        const prevPct = prevCategoryMap.get(cat.name.toLowerCase()) ?? null;
        let changeVsPrevMonthPct: number | null = null;
        let signal: CategorySignal['signal'] = 'stable';

        if (prevPct !== null) {
          changeVsPrevMonthPct = Number((cat.percentage - prevPct).toFixed(1));
          if (changeVsPrevMonthPct > 3) signal = 'rising';
          else if (changeVsPrevMonthPct < -3) signal = 'falling';
        }

        return {
          name: cat.name,
          amount: cat.amount,
          percentage: cat.percentage,
          changeVsPrevMonthPct,
          signal,
        };
      });

    // ── 6. Goal signals ──────────────────────────────────────────────────────
    const rawGoals = await financialGoalsRepository.findAllByUser(userId);
    const goals: GoalSignal[] = rawGoals
      .filter((g) => g.status === 'ACTIVE')
      .map((g) => {
        const target = parseFloat(g.targetAmount.toString());
        const current = parseFloat(g.currentAmount.toString());
        const progressPercentage = target > 0 ? Math.min(100, (current / target) * 100) : 0;

        const createdAt = new Date(g.createdAt);
        const daysActive = Math.max(1, Math.floor((now.getTime() - createdAt.getTime()) / 86400000));

        let daysUntilTarget: number | null = null;
        let expectedProgressPct: number | null = null;
        let onTrack = true; // Default: assume on track if no deadline

        if (g.targetDate) {
          const targetDate = new Date(g.targetDate);
          daysUntilTarget = Math.ceil((targetDate.getTime() - now.getTime()) / 86400000);
          const totalDays = Math.max(1, Math.floor((targetDate.getTime() - createdAt.getTime()) / 86400000));
          const elapsedDays = Math.min(totalDays, daysActive);
          expectedProgressPct = Math.min(100, (elapsedDays / totalDays) * 100);
          // On track if actual progress ≥ 90% of expected progress
          onTrack = progressPercentage >= expectedProgressPct * 0.9;
        }

        return {
          id: g.id,
          title: g.title,
          progressPercentage: Number(progressPercentage.toFixed(1)),
          daysActive,
          daysUntilTarget,
          expectedProgressPct: expectedProgressPct !== null ? Number(expectedProgressPct.toFixed(1)) : null,
          onTrack,
        };
      });

    // ── 7. Debt signals ──────────────────────────────────────────────────────
    const allDebts = await debtsRepository.findByUserId(userId);
    const activeDebts = allDebts.filter((d) => !d.isSettled);
    const unsettledBorrowed = activeDebts
      .filter((d) => d.type === 'borrowed')
      .reduce((acc, d) => acc + parseFloat(d.amount.toString()), 0);
    const unsettledLent = activeDebts
      .filter((d) => d.type === 'lent')
      .reduce((acc, d) => acc + parseFloat(d.amount.toString()), 0);

    return {
      generatedAt: new Date().toISOString(),
      monthKey,
      income,
      hasIncome,
      tolerance: {
        monthlyLimit,
        limitSource,
        spent,
        remaining,
        daysRemaining,
        daysInMonth: lastDayNum,
        dailyAllowance: Number(dailyAllowance.toFixed(2)),
        dailyAvgActual: Number(dailyAvgActual.toFixed(2)),
        paceStatus,
        limitUsedPct: Number(limitUsedPct.toFixed(1)),
        todaySpent: Number(todaySpent.toFixed(2)),
        todayLimitReached,
        todayNearLimit,
        todayRemainingAllowance: Number(todayRemainingAllowance.toFixed(2)),
        todayUsedPct,
        todayExcess,
      },
      topCategories,
      goals,
      debt: {
        total: unsettledBorrowed + unsettledLent,
        unsettledBorrowed: Number(unsettledBorrowed.toFixed(2)),
        unsettledLent: Number(unsettledLent.toFixed(2)),
        count: activeDebts.length,
      },
    };
  },
};
