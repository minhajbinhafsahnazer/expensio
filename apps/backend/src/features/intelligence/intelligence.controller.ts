import type { FastifyRequest, FastifyReply } from 'fastify';
import { intelligenceService } from './intelligence.service.js';

export const intelligenceController = {
  /**
   * GET /api/v1/intelligence/summary?month=YYYY-MM&timezone=...
   *
   * Returns a fully computed financial intelligence summary for the requested month.
   * All calculations are deterministic, rule-based logic — no AI or LLM involved.
   */
  async getSummary(
    request: FastifyRequest<{
      Querystring: { month?: string; timezone?: string };
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.auth.userId;

    // Default to current month in YYYY-MM format (UTC)
    const now = new Date();
    const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const monthKey = request.query.month || defaultMonth;
    const timezone = request.query.timezone || 'UTC';

    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid month format. Expected YYYY-MM',
      });
    }

    const summary = await intelligenceService.getSummary(userId, monthKey, timezone);

    return reply.status(200).send({
      success: true,
      data: summary,
      message: 'Intelligence summary computed successfully',
    });
  },
};
