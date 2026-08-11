import type { FastifyRequest, FastifyReply } from 'fastify';
import { expenseSessionsService } from './expense-sessions.service.js';
import type { ExpenseSessionCreateInput } from './expense-sessions.schemas.js';

export async function createSession(
  request: FastifyRequest<{ Body: ExpenseSessionCreateInput }>,
  reply: FastifyReply
) {
  const userId = request.auth.userId;
  const ipAddress = request.ip;
  const userAgent = request.headers['user-agent'];

  const result = await expenseSessionsService.createSession(
    userId,
    request.body,
    ipAddress,
    userAgent
  );

  return reply.status(201).send({
    success: true,
    message: 'Expense session and transactions created successfully',
    data: result,
  });
}
