import { db } from './src/database/client.js';
import { users } from './src/database/schema/users.js';
import { analyticsService } from './src/features/analytics/analytics.service.js';

async function test() {
  const allUsers = await db.select().from(users).limit(1);
  if (allUsers.length === 0) {
    console.log("No users found");
    return;
  }
  
  const userId = allUsers[0].id;
  const res = await analyticsService.getAnalyticsRange(userId, '2024-01-01', '2026-12-31', 'UTC');
  
  console.log("Total Categories:", res.categories.length);
  res.categories.forEach(c => {
    console.log(`Cat: ${c.name}, Amount: ${c.amount}, Txs Length: ${c.transactions?.length}`);
  });
  process.exit(0);
}

test().catch(console.error);
