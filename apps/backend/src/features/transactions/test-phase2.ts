import { db } from '../../database/client.js';
import { users } from '../../database/schema/users.js';
import { userCategoryMappings } from '../../database/schema/user_category_mappings.js';
import { transactions } from '../../database/schema/transactions.js';
import { transactionsService } from './transactions.service.js';
import { TransactionClassifier } from './classification.service.js';
import { ulid } from 'ulid';
import { eq, sql } from 'drizzle-orm';

async function runTest() {
  console.log('--- STARTING PHASE 2 VERIFICATION ---');

  // 1. Create User A and User B
  const userA = ulid();
  const userB = ulid();
  
  await db.insert(users).values([
    { id: userA, email: `user-a-${Date.now()}@test.com`, passwordHash: 'dummy', name: 'User A', authProvider: 'email' },
    { id: userB, email: `user-b-${Date.now()}@test.com`, passwordHash: 'dummy', name: 'User B', authProvider: 'email' }
  ]);
  
  // 2. Global Rule Test (User A enters 'train ticket' -> should be Transport from global)
  console.log('\n[Test 1] Global Rule Behavior');
  const res1 = await TransactionClassifier.classify('train ticket', userA);
  console.log(`User A enters "train ticket" => Category: ${res1.category} (Source: ${res1.categorySource}, Conf: ${res1.categoryConfidence})`);

  // 3. User A Maps 'train ticket' to 'Travel' (Overriding global 'Transport')
  console.log('\n[Test 2] User Override Behavior');
  await transactionsService.createBulkMappings(userA, [
    { normalizedTerm: 'train ticket', category: 'Travel', ignored: false }
  ]);
  console.log(`User A teaches Expensio: "train ticket" -> Travel`);
  
  const res2 = await TransactionClassifier.classify('train ticket', userA);
  console.log(`User A enters new "train ticket" => Category: ${res2.category} (Source: ${res2.categorySource}, Conf: ${res2.categoryConfidence})`);
  
  // 4. Isolation Test (User B enters 'train ticket')
  console.log('\n[Test 3] User Isolation Behavior');
  const res3 = await TransactionClassifier.classify('train ticket', userB);
  console.log(`User B enters new "train ticket" => Category: ${res3.category} (Source: ${res3.categorySource}, Conf: ${res3.categoryConfidence})`);

  // 5. Ignore Test
  console.log('\n[Test 4] Ignore Behavior');
  const ignoreTerm = 'randomword';
  const res4_before = await TransactionClassifier.classify(ignoreTerm, userA);
  console.log(`User A enters "${ignoreTerm}" => Category: ${res4_before.category} (Source: ${res4_before.categorySource})`);
  
  console.log(`User A clicks [ Ignore ] for "${ignoreTerm}"`);
  await transactionsService.createBulkMappings(userA, [
    { normalizedTerm: ignoreTerm, category: 'Uncategorized', ignored: true }
  ]);
  
  const res4_after = await TransactionClassifier.classify(ignoreTerm, userA);
  console.log(`User A enters new "${ignoreTerm}" => Category: ${res4_after.category} (Source: ${res4_after.categorySource}, Conf: ${res4_after.categoryConfidence})`);
  
  // Also verify it doesn't show up in Needs Review
  // We need an actual transaction to test needs review query
  await db.insert(transactions).values({
    id: ulid(),
    userId: userA,
    amount: '50',
    currency: 'INR',
    type: 'expense',
    description: ignoreTerm,
    category: res4_after.category,
    categorySource: res4_after.categorySource,
    categoryConfidence: res4_after.categoryConfidence,
    spentAt: new Date()
  });
  
  const needsReview = await transactionsService.getNeedsReviewTransactions(userA);
  const found = needsReview.find(n => n.term === ignoreTerm);
  console.log(`Needs Review Queue for "${ignoreTerm}": ${found ? 'FOUND' : 'NOT FOUND (HIDDEN)'}`);

  console.log('\n--- VERIFICATION COMPLETE ---');
  process.exit(0);
}

runTest().catch(console.error);
