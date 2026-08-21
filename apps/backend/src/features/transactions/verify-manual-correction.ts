import { ulid } from 'ulid';
import { db } from '../../database/client.js';
import { expenseSessions } from '../../database/schema/expense_sessions.js';
import { users } from '../../database/schema/users.js';
import { transactions } from '../../database/schema/transactions.js';
import { userCategoryMappings } from '../../database/schema/user_category_mappings.js';
import { transactionsService } from './transactions.service.js';
import { TransactionClassifier } from './classification.service.js';
import { eq } from 'drizzle-orm';
import { analyticsService } from '../analytics/analytics.service.js';
import { AppError } from '../../common/errors/index.js';
import { transactionsRepository } from './transactions.repository.js';

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log("=== Manual Correction Verification Suite ===");

  const userAId = ulid();
  const userBId = ulid();

  await db.insert(users).values([
    { id: userAId, email: `usera-${userAId}@test.com`, fullName: 'User A', passwordHash: 'dummy' },
    { id: userBId, email: `userb-${userBId}@test.com`, fullName: 'User B', passwordHash: 'dummy' }
  ]);

  const sessionIdA = ulid();
  await db.insert(expenseSessions).values({
    id: sessionIdA,
    userId: userAId
  });

  // TEST 1: Single-transaction correction
  console.log("Running Test 1: Single-transaction correction");
  const tx1Id = ulid();
  const now = new Date();
  await db.insert(transactions).values({
    id: tx1Id,
    userId: userAId,
    sessionId: sessionIdA,
    amount: '250.00',
    currency: 'INR',
    type: 'expense',
    category: 'Food',
    categorySource: 'rule',
    categoryConfidence: 50,
    description: 'shawarma',
    spentAt: now
  });

  await transactionsService.updateTransaction(tx1Id, userAId, { category: 'Travel' });
  const [updatedTx1] = await db.select().from(transactions).where(eq(transactions.id, tx1Id));
  
  assert(updatedTx1.category === 'Travel', 'Test 1 Failed: Category not updated');
  assert(updatedTx1.categorySource === 'user', 'Test 1 Failed: categorySource not user');
  assert(updatedTx1.categoryConfidence === 100, 'Test 1 Failed: categoryConfidence not 100');

  const analytics = await analyticsService.getAnalyticsRange(
    userAId,
    now.toISOString().split('T')[0],
    now.toISOString().split('T')[0],
    'UTC'
  );
  
  const travelCat = analytics.categories.find(c => c.name === 'Travel');
  const foodCat = analytics.categories.find(c => c.name === 'Food');
  assert(travelCat && travelCat.amount === 250, 'Test 1 Failed: Travel total not increased');
  assert(!foodCat || foodCat.amount === 0, 'Test 1 Failed: Food total not decreased');
  console.log("✅ Test 1 Passed");

  // TEST 2: Verify it does NOT teach the classifier
  console.log("Running Test 2: Verify it does NOT teach the classifier");
  const classification1 = await TransactionClassifier.classify('shawarma', userAId);
  assert(classification1.category !== 'Travel', 'Test 2 Failed: Classifier accidentally learned Travel');
  console.log("✅ Test 2 Passed");

  // TEST 3: Verify explicit mapping still works
  console.log("Running Test 3: Verify explicit mapping still works");
  await transactionsService.createBulkMappings(userAId, [{ normalizedTerm: 'shawarma', category: 'Travel' }]);
  const classification2 = await TransactionClassifier.classify('shawarma', userAId);
  console.log('Test 3 classification result:', classification2);
  assert(classification2.category === 'Travel', 'Test 3 Failed: Classifier did not learn from explicit mapping');
  assert(classification2.categorySource === 'user', 'Test 3 Failed: Source is not user');
  assert(classification2.categoryConfidence === 100, 'Test 3 Failed: Confidence is not 100');
  console.log("✅ Test 3 Passed");

  // TEST 4: Verify an existing manual correction is protected
  console.log("Running Test 4: Verify an existing manual correction is protected");
  const ivy1Id = ulid();
  const ivy2Id = ulid();
  await db.insert(transactions).values([
    {
      id: ivy1Id,
      userId: userAId,
      sessionId: sessionIdA,
      amount: '100.00',
      currency: 'INR',
      type: 'expense',
      category: 'Uncategorized',
      categorySource: 'rule',
      categoryConfidence: 0,
      description: 'ivy',
      spentAt: now
    },
    {
      id: ivy2Id,
      userId: userAId,
      sessionId: sessionIdA,
      amount: '200.00',
      currency: 'INR',
      type: 'expense',
      category: 'Uncategorized',
      categorySource: 'rule',
      categoryConfidence: 0,
      description: 'ivy',
      spentAt: now
    }
  ]);

  // Manually correct ivy2 to Family
  await transactionsService.updateTransaction(ivy2Id, userAId, { category: 'Family' });

  // Explicitly map ivy -> Travel
  await transactionsService.createBulkMappings(userAId, [{ normalizedTerm: 'ivy', category: 'Travel' }]);

  const [ivy1, ivy2] = await Promise.all([
    db.select().from(transactions).where(eq(transactions.id, ivy1Id)).then(r => r[0]),
    db.select().from(transactions).where(eq(transactions.id, ivy2Id)).then(r => r[0])
  ]);

  assert(ivy1.category === 'Travel', 'Test 4 Failed: Eligible transaction not updated by mapping');
  assert(ivy2.category === 'Family', 'Test 4 Failed: Manual correction was overwritten by mapping');
  console.log("✅ Test 4 Passed");

  // TEST 5: Verify security
  console.log("Running Test 5: Verify security");
  // Try editing User A's transaction using User B's ID
  let txUpdated = await transactionsService.updateTransaction(tx1Id, userBId, { category: 'Household' });
  assert(!txUpdated, 'Test 5 Failed: Allowed editing another user transaction at repo level');
  
  // We should also test the controller level to ensure 404 is thrown
  const mockRequest: any = {
    auth: { userId: userBId },
    params: { id: tx1Id },
    body: { category: 'Household' }
  };
  const mockReply: any = {
    status: function(code: number) { this.statusCode = code; return this; },
    send: function(payload: any) { this.payload = payload; return this; }
  };

  const { updateTransaction } = await import('./transactions.controller.js');
  try {
    await updateTransaction(mockRequest, mockReply);
    assert(mockReply.statusCode !== 200, 'Test 5 Failed: Controller returned 200 for another user transaction');
  } catch (e: any) {
    console.error('Test 5 Caught error:', e);
    assert(e.statusCode === 404, 'Test 5 Failed: Controller did not throw 404 AppError');
  }

  console.log("✅ Test 5 Passed");

  console.log("=== All Tests Passed Successfully ===");
  process.exit(0);
}

runTests().catch(console.error);
