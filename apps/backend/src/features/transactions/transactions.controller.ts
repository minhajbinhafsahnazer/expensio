import type { FastifyRequest, FastifyReply } from 'fastify';
import { transactionsService } from './transactions.service.js';

export async function getTransactions(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = request.auth.userId;

  const result = await transactionsService.getTransactions(userId);

  return reply.status(200).send({
    success: true,
    message: 'Transactions fetched successfully',
    data: { transactions: result },
  });
}

export async function updateTransaction(
  request: FastifyRequest<{ Params: { id: string }; Body: any }>,
  reply: FastifyReply
) {
  const userId = request.auth.userId;
  const { id } = request.params;
  const data = request.body;

  const result = await transactionsService.updateTransaction(id, userId, data);

  return reply.status(200).send({
    success: true,
    message: 'Transaction updated successfully',
    data: { transaction: result },
  });
}

export async function deleteTransaction(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = request.auth.userId;
  const { id } = request.params;

  await transactionsService.deleteTransaction(id, userId);

  return reply.status(200).send({
    success: true,
    message: 'Transaction deleted successfully',
  });
}
