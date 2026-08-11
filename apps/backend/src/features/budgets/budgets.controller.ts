import type { FastifyRequest, FastifyReply } from 'fastify';
import { budgetsService } from './budgets.service';
import { analyticsService } from '../analytics/analytics.service';

export const budgetsController = {
  async setBudget(
    request: FastifyRequest<{ Body: { monthKey: string; amount: number } }>,
    reply: FastifyReply
  ) {
    const userId = request.auth.userId;
    const { monthKey, amount } = request.body;

    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid month format. Expected YYYY-MM'
      });
    }

    if (typeof amount !== 'number' || amount < 0) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid amount. Must be a positive number.'
      });
    }

    const budget = await budgetsService.setBudget(userId, monthKey, amount);
    
    return reply.status(200).send({
      success: true,
      data: budget,
      message: 'Budget set successfully',
    });
  },

  async getBudgetSummary(
    request: FastifyRequest<{ Querystring: { month: string; timezone?: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.auth.userId;
    const { month, timezone } = request.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid month format. Expected YYYY-MM'
      });
    }

    const tz = timezone || 'UTC';
    
    // Fetch budget limit
    const budget = await budgetsService.getBudget(userId, month);
    const monthlyLimit = budget ? parseFloat(budget.amount.toString()) : null;

    // Fetch analytics to get total spent
    const year = parseInt(month.split('-')[0], 10);
    const monthNum = parseInt(month.split('-')[1], 10);
    
    // Calculate start and end of month in YYYY-MM-DD
    const fromStr = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const toStr = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay}`;
    
    const analytics = await analyticsService.getAnalyticsRange(userId, fromStr, toStr, tz);
    const spent = analytics.totalSpent;
    
    let remaining = null;
    if (monthlyLimit !== null) {
      remaining = monthlyLimit - spent;
    }

    return reply.status(200).send({
      success: true,
      data: {
        monthKey: month,
        limit: monthlyLimit,
        spent: spent,
        remaining: remaining
      },
      message: 'Budget summary retrieved successfully',
    });
  }
};
