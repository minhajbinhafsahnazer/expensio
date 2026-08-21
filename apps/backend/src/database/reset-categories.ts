import { db } from './client.js';
import { transactions } from './schema/transactions.js';

async function reset() {
  await db.update(transactions).set({
    category: 'Uncategorized',
    categorySource: 'unknown',
    categoryConfidence: 0
  });
  console.log('Reset complete');
  process.exit(0);
}

reset().catch(console.error);
