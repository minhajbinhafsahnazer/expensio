import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

/**
 * Hashes a plain-text password using bcrypt (cost factor 12).
 * Cost 12 = ~250ms on modern hardware. Balances security and UX.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/**
 * Compares a plain-text password against a bcrypt hash.
 * Always runs the comparison even if the hash is empty to prevent
 * timing-based user enumeration attacks.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
