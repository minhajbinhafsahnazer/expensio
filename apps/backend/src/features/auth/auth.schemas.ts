import { z } from 'zod';

/**
 * auth.schemas.ts
 * Zod schemas for request validation and response shaping.
 * The validate() middleware uses these before the controller is invoked.
 */

// ─── Request Schemas ──────────────────────────────────────────────────────────

export const CurrencyEnum = z.enum([
  "INR",
  "USD",
  "AED",
  "SAR",
  "QAR",
  "EUR",
  "GBP",
  "CAD",
  "AUD"
]);

export const RegisterBodySchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  fullName: z
    .string()
    .trim()
    .min(1, 'Name cannot be blank')
    .max(255, 'Name is too long')
    .optional(),
  currency: CurrencyEnum.optional(),
});

export const LoginBodySchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

// ─── Response Schemas ─────────────────────────────────────────────────────────

/**
 * Shape of the user object returned to clients.
 * password_hash is explicitly excluded.
 */
export const UserPublicSchema = z.object({
  id:                        z.string(),
  email:                     z.string().email(),
  fullName:                  z.string().nullable(),
  phoneNumber:               z.string().nullable().optional(),
  currency:                  z.string(),
  theme:                     z.string(),
  timezone:                  z.string(),
  locale:                    z.string(),
  superiorCategoriesEnabled: z.boolean(),
  isActive:                  z.boolean(),
  lastLoginAt:               z.date().nullable(),
  createdAt:                 z.date(),
  updatedAt:                 z.date(),
});

export const UpdateMeBodySchema = z.object({
  fullName:                  z.string().trim().min(1, 'Name cannot be blank').max(255).optional(),
  phoneNumber:               z.string().trim().max(30, 'Phone number is too long').nullable().optional(),
  currency:                  CurrencyEnum.optional(),
  theme:                     z.string().trim().optional(),
  timezone:                  z.string().trim().optional(),
  locale:                    z.string().trim().optional(),
  superiorCategoriesEnabled: z.boolean().optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type RegisterBodyInput = z.infer<typeof RegisterBodySchema>;
export type LoginBodyInput    = z.infer<typeof LoginBodySchema>;
export type UserPublicOutput  = z.infer<typeof UserPublicSchema>;
