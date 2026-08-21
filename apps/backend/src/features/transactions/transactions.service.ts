import { transactionsRepository } from './transactions.repository.js';
import { db } from '../../database/client.js';
import { transactions } from '../../database/schema/transactions.js';
import { userCategoryMappings } from '../../database/schema/user_category_mappings.js';
import { eq, and, ne, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';

export const transactionsService = {
  async getTransactions(userId: string) {
    return await transactionsRepository.getUserTransactions(userId);
  },
  
  async updateTransaction(id: string, userId: string, payload: any) {
    if (payload.spentAt && typeof payload.spentAt === 'string') {
      payload.spentAt = new Date(payload.spentAt);
    }
    if (payload.superiorCategory !== undefined) {
      if (typeof payload.superiorCategory === 'string' && payload.superiorCategory.trim()) {
        payload.superiorCategory = payload.superiorCategory.trim();
      } else {
        payload.superiorCategory = null;
      }
    }
    if (payload.category !== undefined) {
      payload.categorySource = 'user';
      payload.categoryConfidence = 100;
    }
    
    return await transactionsRepository.update(id, userId, payload);
  },

  async deleteTransaction(id: string, userId: string) {
    return await transactionsRepository.softDelete(id, userId);
  },

  async getNeedsReviewTransactions(userId: string) {
    // Normalisation must match TransactionClassifier.normalize() exactly:
    // LOWER(TRIM()) + collapse internal whitespace runs to single space.
    // We use regexp_replace here so the SQL and TS sides stay in sync.
    const normalizeExpr = sql`LOWER(TRIM(REGEXP_REPLACE(${transactions.description}, '\\s+', ' ', 'g')))`;

    const results = await db
      .select({
        term: sql<string>`${normalizeExpr}`,
        transactionCount: sql<number>`CAST(COUNT(*) AS INT)`,
        totalAmount: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.category, 'Uncategorized'),
          ne(transactions.categorySource, 'user'),
          isNull(transactions.deletedAt),
          // Exclude empty/null descriptions — nothing to teach
          sql`${transactions.description} IS NOT NULL AND TRIM(${transactions.description}) != ''`
        )
      )
      .groupBy(normalizeExpr)
      .orderBy(sql`SUM(CAST(${transactions.amount} AS DECIMAL)) DESC`);
    
    return results;
  },

  async createBulkMappings(userId: string, mappings: { normalizedTerm: string; category: string; ignored?: boolean }[]) {
    if (mappings.length === 0) return { count: 0 };
    
    await db.transaction(async (tx) => {
      for (const mapping of mappings) {
        // 1. Save mapping
        await tx.insert(userCategoryMappings)
          .values({
            id: ulid(),
            userId,
            normalizedTerm: mapping.normalizedTerm,
            category: mapping.category,
            ignored: mapping.ignored ?? false
          })
          .onConflictDoUpdate({
            target: [userCategoryMappings.userId, userCategoryMappings.normalizedTerm],
            set: {
              category: mapping.category,
              ignored: mapping.ignored ?? false,
              updatedAt: new Date()
            }
          });
        
        // 2. Retroactive update ONLY on Uncategorized — must NOT touch user-classified rows.
        // Normalization matches TransactionClassifier.normalize() and getNeedsReviewTransactions().
        await tx.update(transactions)
          .set({
            category: mapping.ignored ? 'Uncategorized' : mapping.category,
            categorySource: 'user',
            categoryConfidence: 100,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(transactions.userId, userId),
              sql`LOWER(TRIM(REGEXP_REPLACE(${transactions.description}, '\\s+', ' ', 'g'))) = ${mapping.normalizedTerm}`,
              eq(transactions.category, 'Uncategorized'),
              // Explicitly exclude any row already marked as user-classified (safety guard)
              ne(transactions.categorySource, 'user'),
              isNull(transactions.deletedAt)
            )
          );
      }
    });

    return { success: true, count: mappings.length };
  }
};

