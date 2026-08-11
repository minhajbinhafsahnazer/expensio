import type { FastifyRequest, FastifyReply } from 'fastify';
import { analyticsService } from './analytics.service.js';

export const analyticsController = {
  async getAnalytics(
    request: FastifyRequest<{ Querystring: { from: string; to: string; timezone?: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.auth.userId;
    const { from, to, timezone } = request.query;

    if (!from || !to) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid parameters. Expected from and to (YYYY-MM-DD)'
      });
    }

    const tz = timezone || 'UTC';
    const data = await analyticsService.getAnalyticsRange(userId, from, to, tz);

    return reply.status(200).send({
      success: true,
      data,
      message: 'Analytics retrieved successfully',
    });
  }
};
