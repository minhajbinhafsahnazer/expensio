import type { FastifyRequest, FastifyReply } from 'fastify';
import { categoriesService } from './categories.service.js';

export const categoriesController = {
  async getCategories(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.auth.userId;
    const categories = await categoriesService.getCustomCategories(userId);

    return reply.status(200).send({
      success: true,
      data: categories,
      message: 'Categories retrieved successfully',
    });
  },

  async createCategory(
    request: FastifyRequest<{ Body: { name: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.auth.userId;
    const { name } = request.body;

    if (!name || typeof name !== 'string') {
      return reply.status(400).send({
        success: false,
        message: 'Category name is required',
      });
    }

    const newCategory = await categoriesService.createCustomCategory(userId, name);

    return reply.status(201).send({
      success: true,
      data: newCategory,
      message: 'Category created successfully',
    });
  }
};
