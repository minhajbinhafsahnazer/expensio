import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ZodSchema } from 'zod';

/**
 * Generic Zod validation middleware factory.
 *
 * Usage in route definitions:
 *   preHandler: [validate(RegisterBodySchema)]
 *
 * On success: replaces request.body with the parsed (and coerced) Zod output.
 * On failure: short-circuits with 400 + field-level error map.
 *
 * Keeps validation out of controllers — controllers receive already-valid data.
 */
export function validate(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!fields[path]) {
          // Keep the first error per field
          fields[path] = issue.message;
        }
      }

      void reply.status(400).send({
        success: false,
        message: 'Validation failed',
        error: { code: 'VALIDATION_ERROR', fields },
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Replace body with parsed data (Zod transforms + defaults applied)
    (request as FastifyRequest & { body: unknown }).body = result.data;
  };
}
