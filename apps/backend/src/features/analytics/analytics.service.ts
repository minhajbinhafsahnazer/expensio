import { eq, and, isNull, gte, lt } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { transactions } from '../../database/schema/transactions.js';

export const analyticsService = {
  async getAnalyticsRange(userId: string, fromDateStr: string, toDateStr: string, timezone: string) {
    // Parse dates (allows ISO strings or falls back to YYYY-MM-DD)
    const startDate = fromDateStr.includes('T') ? new Date(fromDateStr) : new Date(`${fromDateStr}T00:00:00Z`);
    const endDate = toDateStr.includes('T') ? new Date(toDateStr) : new Date(`${toDateStr}T23:59:59.999Z`);
    
    // Calculate the duration of the period to dynamically calculate the previous period
    const durationMs = endDate.getTime() - startDate.getTime() + 1;
    const prevStartDate = new Date(startDate.getTime() - durationMs);
    const prevEndDate = new Date(endDate.getTime() - durationMs);

    // Fetch transactions for the requested range
    const currentPeriodTxs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
          gte(transactions.spentAt, startDate),
          lt(transactions.spentAt, new Date(endDate.getTime() + 1)) // strictly less than the ms after end
        )
      );

    // Fetch transactions for previous period (for comparison)
    const prevPeriodTxs = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
          gte(transactions.spentAt, prevStartDate),
          lt(transactions.spentAt, new Date(prevEndDate.getTime() + 1))
        )
      );

    let totalSpent = 0;
    let totalIncome = 0;
    const categoriesMap: Record<string, number> = {};
    const dailyMap: Record<string, number> = {}; // key: YYYY-MM-DD

    // Pre-fill dailyMap with 0 for every day in the range
    const displayDaysCount = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    for (let i = 0; i < displayDaysCount; i++) {
      // Add 12 hours to safely land in the middle of the local day when iterating
      const currentDay = new Date(startDate.getTime() + i * (1000 * 60 * 60 * 24) + (1000 * 60 * 60 * 12));
      const dayStr = currentDay.toLocaleDateString('en-CA', { timeZone: timezone || 'UTC' });
      dailyMap[dayStr] = 0;
    }

    currentPeriodTxs.forEach((tx) => {
      const amount = parseFloat(tx.amount.toString());
      if (tx.type === 'income') {
        totalIncome += amount;
      } else {
        totalSpent += amount;
        
        // Category breakdown
        categoriesMap[tx.category] = (categoriesMap[tx.category] || 0) + amount;

        // Daily breakdown - align with the pre-filled keys
        const dayStr = tx.spentAt.toLocaleDateString('en-CA', { timeZone: timezone || 'UTC' });
        if (dailyMap[dayStr] !== undefined) {
            dailyMap[dayStr] += amount;
        } else {
            // If the timezone difference causes it to fall slightly out of bounds, record it anyway
            dailyMap[dayStr] = amount;
        }
      }
    });

    const categories = Object.entries(categoriesMap).map(([name, amount], index) => {
      const colors = ["#0284c7", "#2563eb", "#9333ea", "#059669", "#f59e0b", "#dc2626", "#4b5563"];
      return {
        name,
        amount,
        color: colors[index % colors.length],
        percentage: totalSpent > 0 ? Number(((amount / totalSpent) * 100).toFixed(1)) : 0
      };
    }).sort((a, b) => b.amount - a.amount);

    let peakDayStr = '';
    let peakAmount = 0;
    
    // Convert dailyMap to array and find peak
    const dailyData = Object.entries(dailyMap).map(([dateStr, amount]) => {
      if (amount > peakAmount) {
        peakAmount = amount;
        peakDayStr = dateStr;
      }
      
      const d = new Date(`${dateStr}T00:00:00Z`);
      return {
        day: d.getUTCDate(), // For backward compatibility with some UI components
        fullDateStr: dateStr,
        dateStr: d.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
        amount
      };
    }).sort((a, b) => new Date(a.fullDateStr).getTime() - new Date(b.fullDateStr).getTime());

    // Mark the peak day
    const finalDailyData = dailyData.map(d => ({ ...d, isPeak: d.fullDateStr === peakDayStr }));

    // Calculate prev period total spent
    let prevTotalSpent = 0;
    prevPeriodTxs.forEach((tx) => {
      if (tx.type === 'expense') {
        prevTotalSpent += parseFloat(tx.amount.toString());
      }
    });

    let percentageChange = 0;
    if (prevTotalSpent > 0) {
      percentageChange = Number((((totalSpent - prevTotalSpent) / prevTotalSpent) * 100).toFixed(2));
    } else if (totalSpent > 0) {
      percentageChange = 100;
    }

    const netCashFlow = totalIncome - totalSpent;
    const dailyAverage = displayDaysCount > 0 ? totalSpent / displayDaysCount : 0;

    return {
      period: { from: fromDateStr, to: toDateStr },
      daysCount: displayDaysCount,
      totalIncome,
      totalSpent,
      netCashFlow,
      dailyAverage: Number(dailyAverage.toFixed(2)),
      previousPeriodSpent: prevTotalSpent,
      percentageChange,
      peakDay: { 
        date: peakDayStr ? new Date(`${peakDayStr}T00:00:00Z`).toLocaleString('en-US', { month: 'short', day: 'numeric' }) : '-', 
        amount: peakAmount 
      },
      dailyData: finalDailyData,
      categories
    };
  }
};
