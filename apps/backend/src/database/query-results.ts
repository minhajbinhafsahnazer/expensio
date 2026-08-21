import { db } from './client.js';
import { transactions } from './schema/transactions.js';

async function queryResults() {
  const allTxs = await db.select().from(transactions);
  
  // Group by description to show unique mappings
  const uniqueMappings = new Map<string, any>();
  
  for (const tx of allTxs) {
    if (tx.description) {
      uniqueMappings.set(tx.description, {
        description: tx.description,
        category: tx.category,
        categorySource: tx.categorySource,
        confidence: tx.categoryConfidence
      });
    }
  }

  const results = Array.from(uniqueMappings.values());
  console.table(results);
  
  // Calculate percentages
  const total = results.length;
  const categorized = results.filter(r => r.category !== 'Uncategorized').length;
  const uncategorized = total - categorized;
  
  console.log(`\nTotal unique descriptions: ${total}`);
  console.log(`Categorized: ${categorized} (${((categorized/total)*100).toFixed(1)}%)`);
  console.log(`Uncategorized: ${uncategorized} (${((uncategorized/total)*100).toFixed(1)}%)`);
  
  process.exit(0);
}

queryResults().catch(console.error);
