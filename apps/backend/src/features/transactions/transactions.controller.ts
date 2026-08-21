import type { FastifyRequest, FastifyReply } from 'fastify';
import { transactionsService } from './transactions.service.js';
import { NotFoundError } from '../../common/errors/index.js';

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

  if (!result) {
    throw new NotFoundError('Transaction not found');
  }

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
export async function getNeedsReviewTransactions(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = request.auth.userId;
  const result = await transactionsService.getNeedsReviewTransactions(userId);

  return reply.status(200).send({
    success: true,
    data: { items: result, total: result.length },
  });
}

export async function createBulkMappings(
  request: FastifyRequest<{ Body: { mappings: { normalizedTerm: string; category: string; ignored?: boolean }[] } }>,
  reply: FastifyReply
) {
  const userId = request.auth.userId;
  const { mappings } = request.body;

  if (!mappings || !Array.isArray(mappings)) {
    return reply.status(400).send({ success: false, message: 'Invalid mappings format' });
  }

  const result = await transactionsService.createBulkMappings(userId, mappings);

  return reply.status(200).send({
    success: true,
    message: 'Mappings updated successfully',
    data: result,
  });
}
