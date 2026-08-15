import type { FastifyRequest, FastifyReply } from 'fastify';
import { debtsService } from './debts.service';
import { z } from 'zod';

const createDebtSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(['lent', 'borrowed']),
  note: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  isSettled: z.boolean().optional(),
  hasReminder: z.boolean().optional(),
});

const updateDebtSchema = createDebtSchema.partial();

export async function getDebts(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).auth.userId;
  const debts = await debtsService.getDebts(userId);
  return reply.send({ success: true, data: debts });
}

export async function createDebt(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).auth.userId;
  const ip = request.ip;
  const ua = request.headers['user-agent'];

  const parsed = createDebtSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ success: false, error: 'Invalid input', details: parsed.error.issues });
  }

  const payload = {
    ...parsed.data,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    note: parsed.data.note ?? null,
  };

  const debt = await debtsService.createDebt(userId, payload as any, ip, ua);
  return reply.status(201).send({ success: true, data: debt });
}

export async function updateDebt(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const userId = (request as any).auth.userId;
  const { id } = request.params;
  const ip = request.ip;
  const ua = request.headers['user-agent'];

  const parsed = updateDebtSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ success: false, error: 'Invalid input', details: parsed.error.issues });
  }

  const payload: any = { ...parsed.data };
  if (payload.dueDate !== undefined) {
    payload.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
  }
  if (payload.note === undefined && 'note' in payload) {
    payload.note = null;
  }

  try {
    const updated = await debtsService.updateDebt(id, userId, payload, ip, ua);
    return reply.send({ success: true, data: updated });
  } catch (error: any) {
    if (error.message.includes('not found or unauthorized')) {
      return reply.status(404).send({ success: false, error: 'Debt not found' });
    }
    throw error;
  }
}

export async function deleteDebt(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const userId = (request as any).auth.userId;
  const { id } = request.params;
  const ip = request.ip;
  const ua = request.headers['user-agent'];

  try {
    await debtsService.deleteDebt(id, userId, ip, ua);
    return reply.send({ success: true });
  } catch (error: any) {
    if (error.message.includes('not found or unauthorized')) {
      return reply.status(404).send({ success: false, error: 'Debt not found' });
    }
    throw error;
  }
}
