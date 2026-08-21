import { db } from '../../database/client.js';
import { transactions } from '../../database/schema/transactions.js';
import { TransactionClassifier } from './classification.service.js';
import { eq } from 'drizzle-orm';

async function backfillTransactions() {
  console.log('Starting transaction classification backfill...');

  // Fetch transactions that are 'Uncategorized' (which they should be after the migration)
  // or all transactions if you prefer to re-run
  const allTransactions = await db
    .select()
    .from(transactions)
    .where(eq(transactions.category, 'Uncategorized'));

  console.log(`Found ${allTransactions.length} transactions to classify.`);

  let classifiedCount = 0;

  for (const tx of allTransactions) {
    if (!tx.description) continue;

    const result = await TransactionClassifier.classify(tx.description, tx.userId);

    // Only update if it found a meaningful category
    if (result.category !== 'Uncategorized') {
      await db
        .update(transactions)
        .set({
          category: result.category,
          categorySource: result.categorySource,
          categoryConfidence: result.categoryConfidence,
        })
        .where(eq(transactions.id, tx.id));
      
      classifiedCount++;
    }
  }

  console.log(`Backfill complete. Classified ${classifiedCount} transactions.`);
}

backfillTransactions()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error during backfill:', err);
    process.exit(1);
  });
