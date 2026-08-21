import { db } from '../../database/client.js';
import { users } from '../../database/schema/users.js';
import { expenseSessions } from '../../database/schema/expense_sessions.js';
import { transactions } from '../../database/schema/transactions.js';
import { userCategoryMappings } from '../../database/schema/user_category_mappings.js';
import { analyticsService } from '../analytics/analytics.service.js';
import { transactionsService } from './transactions.service.js';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';

let pass = 0;
let fail = 0;

function assert(condition: boolean, label: string, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    pass++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    fail++;
  }
}

async function createTestUser(tag: string) {
  const id = ulid();
  await db.insert(users).values({
    id,
    email: `verify-analytics-${tag}-${id}@test.local`,
    passwordHash: 'test-hash',
  });
  return id;
}

async function createTestSession(userId: string) {
  const id = ulid();
  await db.insert(expenseSessions).values({
    id,
    userId,
  });
  return id;
}

async function createTx(userId: string, sessionId: string, desc: string, amount: string, cat: string) {
  const id = ulid();
  await db.insert(transactions).values({
    id,
    userId,
    sessionId,
    description: desc,
    amount,
    currency: 'INR',
    type: 'expense',
    category: cat,
    categorySource: 'rule',
    categoryConfidence: 100,
    spentAt: new Date(),
  });
  return id;
}

async function testAnalyticsIntegrity() {
  console.log('\n[Suite 1] Analytics Integrity');
  
  const userId = await createTestUser('integrity');
  const sessionId = await createTestSession(userId);

  await createTx(userId, sessionId, 'shawarma', '100', 'Food');
  await createTx(userId, sessionId, 'train ticket', '200', 'Transport and Vehicle');
  await createTx(userId, sessionId, 'honda', '300', 'Transport and Vehicle');
  await createTx(userId, sessionId, 'shoe', '500', 'Shopping and Lifestyle');
  await createTx(userId, sessionId, 'ivy', '50', 'Travel'); // Custom category
  await createTx(userId, sessionId, 'chelav', '80', 'Uncategorized');

  // Set date bounds that definitely contain the `new Date()`
  const from = new Date();
  from.setDate(from.getDate() - 2);
  const to = new Date();
  to.setDate(to.getDate() + 2);

  const analytics = await analyticsService.getAnalyticsRange(
    userId,
    from.toISOString().split('T')[0],
    to.toISOString().split('T')[0],
    'UTC'
  );

  let hasMismatch = false;
  for (const cat of analytics.categories) {
    let sum = 0;
    for (const tx of cat.transactions) {
      sum += Number(tx.amount);
    }
    const catAmount = Number(cat.amount);
    if (sum !== catAmount) {
      console.error(`  ❌ FAIL: ${cat.name} amount is ${catAmount}, but transactions sum to ${sum}`);
      hasMismatch = true;
    }

    // Verify transaction membership
    if (cat.name === 'Food') {
      assert(!cat.transactions.some(tx => tx.description === 'train ticket'), 'Food does not contain train ticket');
      assert(cat.transactions.some(tx => tx.description === 'shawarma'), 'Food contains shawarma');
    }
    if (cat.name === 'Transport and Vehicle') {
      assert(cat.transactions.some(tx => tx.description === 'train ticket'), 'Transport and Vehicle contains train ticket');
      assert(cat.transactions.some(tx => tx.description === 'honda'), 'Transport and Vehicle contains honda');
      assert(!cat.transactions.some(tx => tx.description === 'shoe'), 'Transport and Vehicle does not contain shoe');
    }
  }

  assert(!hasMismatch, 'All category transaction sums exactly match category totals');
}

async function runAll() {
  console.log('═══════════════════════════════════════════════');
  console.log('  ANALYTICS VERIFICATION SUITE');
  console.log('═══════════════════════════════════════════════');

  await testAnalyticsIntegrity();

  console.log('\n═══════════════════════════════════════════════');
  console.log(`  RESULTS: ${pass} passed, ${fail} failed`);
  if (fail === 0) {
    console.log('  ✅ ALL TESTS PASSED');
  } else {
    console.log('  ❌ FAILURES DETECTED');
  }
  console.log('═══════════════════════════════════════════════');

  process.exit(fail > 0 ? 1 : 0);
}

runAll().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
