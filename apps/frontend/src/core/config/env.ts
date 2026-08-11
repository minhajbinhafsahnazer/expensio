import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url().default('http://localhost:4000/api/v1'),
  MODE: z.enum(['development', 'production', 'test']).default('development'),
});

// Using import.meta.env natively provided by Vite
const _env = envSchema.safeParse({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  MODE: import.meta.env.MODE,
});

if (!_env.success) {
  console.error('❌ Invalid frontend environment variables:', _env.error.format());
  throw new Error('Invalid frontend environment variables');
}

export const env = _env.data;
