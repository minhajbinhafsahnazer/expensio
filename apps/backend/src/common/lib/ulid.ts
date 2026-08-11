import { ulid } from 'ulid';

/**
 * Generates a ULID (Universally Unique Lexicographically Sortable Identifier).
 * 26-character, URL-safe, monotonically sortable — used as all primary keys.
 */
export function generateId(): string {
  return ulid();
}
