import { z } from 'zod';

export const CreateFinancialGoalSchema = z.object({
  title: z.string().min(1).max(255),
  targetAmount: z.number().min(0),
  currentAmount: z.number().min(0).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  targetDate: z.string().datetime().optional(),
  color: z.string().max(50).optional(),
}).superRefine((data, ctx) => {
  if (data.currentAmount !== undefined && data.currentAmount > data.targetAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'currentAmount cannot exceed targetAmount',
      path: ['currentAmount'],
    });
  }
});
export type CreateFinancialGoalPayload = z.infer<typeof CreateFinancialGoalSchema>;

export const UpdateFinancialGoalSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  targetAmount: z.number().min(0).optional(),
  currentAmount: z.number().min(0).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  targetDate: z.string().datetime().optional(),
  color: z.string().max(50).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  displayOrder: z.number().int().optional(),
}).superRefine((data, ctx) => {
  // Note: Since this is partial update, we only validate if both are provided.
  // Real DB-level validation handles mixed partials, or we'd need to fetch the DB record first.
  if (data.currentAmount !== undefined && data.targetAmount !== undefined && data.currentAmount > data.targetAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'currentAmount cannot exceed targetAmount',
      path: ['currentAmount'],
    });
  }
});
export type UpdateFinancialGoalPayload = z.infer<typeof UpdateFinancialGoalSchema>;

export const GoalProgressSchema = z.object({
  amount: z.number().positive(),
});
export type GoalProgressPayload = z.infer<typeof GoalProgressSchema>;
