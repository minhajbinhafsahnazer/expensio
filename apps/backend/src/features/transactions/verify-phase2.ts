/**
 * Phase 2 Hard Verification Suite
 *
 * Tests:
 *  1. Ignore persistence (backend + needs-review exclusion)
 *  2. User mapping precedence over global rules
 *  3. User isolation (across all operations)
 *  4. Retroactive update atomicity
 *  5. Existing user decisions are protected
 *  6. Ignore vs Mapping semantics
 *  7. Normalization consistency
 *  8. Review aggregation correctness
 *  9. New transaction classification end-to-end
 * 10. Idempotency (upsert, no duplicates)
 * 11. Full dataset lifecycle
 *
 * Run: npx dotenv -e .env -- tsx src/features/transactions/verify-phase2.ts
 */

import { db } from '../../database/client.js';
import { users } from '../../database/schema/users.js';
import { userCategoryMappings } from '../../database/schema/user_category_mappings.js';
import { transactions } from '../../database/schema/transactions.js';
import { expenseSessions } from '../../database/schema/expense_sessions.js';
import { transactionsService } from './transactions.service.js';
import { TransactionClassifier } from './classification.service.js';
import { eq, and, isNull } from 'drizzle-orm';
import { ulid } from 'ulid';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    email: `verify-${tag}-${id}@test.local`,
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

async function createTx(
  userId: string,
  sessionId: string,
  description: string,
  amount: string,
  category = 'Uncategorized',
  categorySource = 'unknown',
  categoryConfidence = 0,
) {
  const id = ulid();
  await db.insert(transactions).values({
    id,
    userId,
    sessionId,
    description,
    amount,
    currency: 'INR',
    type: 'expense',
    category,
    categorySource,
    categoryConfidence,
    spentAt: new Date(),
  });
  return id;
}

async function getTx(id: string) {
  const [tx] = await db.select().from(transactions).where(eq(transactions.id, id));
  return tx;
}

async function getMappings(userId: string, term: string) {
  return db.select().from(userCategoryMappings).where(
    and(
      eq(userCategoryMappings.userId, userId),
      eq(userCategoryMappings.normalizedTerm, term),
    ),
  );
}

// ─── Test Suites ─────────────────────────────────────────────────────────────

async function testIgnorePersistence() {
  console.log('\n[Suite 1] Ignore Persistence');

  const userId = await createTestUser('ignore');
  const sessionId = await createTestSession(userId);

  // Create two transactions with the same unknown description
  const tx1 = await createTx(userId, sessionId, 'randomxyz', '100');
  const tx2 = await createTx(userId, sessionId, 'randomxyz', '200');

  // Verify they appear in needs-review
  const before = await transactionsService.getNeedsReviewTransactions(userId);
  const beforeItem = before.find(i => i.term === 'randomxyz');
  assert(!!beforeItem, '1.1 Term appears in needs-review before ignore');
  assert(beforeItem?.transactionCount === 2, '1.2 Correct transaction count');

  // Ignore the term
  await transactionsService.createBulkMappings(userId, [
    { normalizedTerm: 'randomxyz', category: 'Uncategorized', ignored: true },
  ]);

  // Verify mapping is persisted in DB
  const mapping = await getMappings(userId, 'randomxyz');
  assert(mapping.length === 1, '1.3 Mapping row exists in DB after ignore');
  assert(mapping[0].ignored === true, '1.4 ignored=true persisted in DB');
  assert(mapping[0].category === 'Uncategorized', '1.5 category=Uncategorized for ignored term');

  // Verify it no longer appears in needs-review
  const after = await transactionsService.getNeedsReviewTransactions(userId);
  const afterItem = after.find(i => i.term === 'randomxyz');
  assert(!afterItem, '1.6 Term excluded from needs-review after ignore');

  // Verify transactions have categorySource=user (so they won't reappear)
  const t1 = await getTx(tx1);
  const t2 = await getTx(tx2);
  assert(t1.categorySource === 'user', '1.7 tx1 categorySource=user after ignore');
  assert(t2.categorySource === 'user', '1.8 tx2 categorySource=user after ignore');

  // Create a new transaction with the same term
  const tx3 = await createTx(userId, sessionId, 'randomxyz', '50');
  // After classification (simulating what happens on backend receive)
  const classified = await TransactionClassifier.classify('randomxyz', userId);
  assert(classified.category === 'Uncategorized', '1.9 New tx classifies as Uncategorized');
  assert(classified.categorySource === 'user', '1.10 New tx has source=user (ignored)');
  assert(classified.categoryConfidence === 100, '1.11 Ignored classification has confidence=100');

  // Verify new tx won't reappear in needs-review (it'll be inserted with source=user)
  await db.update(transactions).set({
    category: classified.category,
    categorySource: classified.categorySource,
    categoryConfidence: classified.categoryConfidence,
  }).where(eq(transactions.id, tx3));
  const afterNew = await transactionsService.getNeedsReviewTransactions(userId);
  const afterNewItem = afterNew.find(i => i.term === 'randomxyz');
  assert(!afterNewItem, '1.12 New ignored tx does not reappear in needs-review');
}

async function testUserMappingPrecedence() {
  console.log('\n[Suite 2] User Mapping Precedence Over Global Rules');

  const userId = await createTestUser('precedence');
  const sessionId = await createTestSession(userId);

  // 'maintenance' → Household via global rule (phrase match)
  const globalResult = await TransactionClassifier.classify('maintenance', userId);
  assert(globalResult.category === 'Household', '2.1 Global rule: maintenance→Household');
  assert(globalResult.categorySource === 'rule', '2.2 Source is rule before user mapping');

  // User teaches: maintenance → Vehicle
  await transactionsService.createBulkMappings(userId, [
    { normalizedTerm: 'maintenance', category: 'Vehicle', ignored: false },
  ]);

  // New classification must use user mapping
  const userResult = await TransactionClassifier.classify('maintenance', userId);
  assert(userResult.category === 'Vehicle', '2.3 User mapping overrides global: maintenance→Vehicle');
  assert(userResult.categorySource === 'user', '2.4 Source is user after mapping');
  assert(userResult.categoryConfidence === 100, '2.5 Confidence is 100 for user mapping');

  // 'car maintenance' (longer phrase) should still use global rule
  const carMaintResult = await TransactionClassifier.classify('car maintenance', userId);
  assert(carMaintResult.category === 'Transport and Vehicle', '2.6 "car maintenance" still resolves to Transport and Vehicle');
}

async function testUserIsolation() {
  console.log('\n[Suite 3] User Isolation');

  const userA = await createTestUser('isolation-A');
  const userB = await createTestUser('isolation-B');
  const sessionA = await createTestSession(userA);
  const sessionB = await createTestSession(userB);

  // User A teaches ivy → Travel
  await transactionsService.createBulkMappings(userA, [
    { normalizedTerm: 'ivy', category: 'Travel', ignored: false },
  ]);

  // User A: ivy → Travel
  const resA = await TransactionClassifier.classify('ivy', userA);
  assert(resA.category === 'Travel', '3.1 User A: ivy→Travel');
  assert(resA.categorySource === 'user', '3.2 User A: source=user');

  // User B: ivy → Uncategorized (no mapping for B)
  const resB = await TransactionClassifier.classify('ivy', userB);
  assert(resB.category === 'Uncategorized', '3.3 User B: ivy→Uncategorized');
  assert(resB.categorySource === 'unknown', '3.4 User B: source=unknown');

  // needs-review isolation: only A's unmapped transactions appear for A
  await createTx(userA, sessionA, 'chelav', '100');
  await createTx(userB, sessionB, 'chelav', '200');

  const reviewA = await transactionsService.getNeedsReviewTransactions(userA);
  const reviewB = await transactionsService.getNeedsReviewTransactions(userB);
  assert(reviewA.every(i => i.term !== 'ivy'), '3.5 User A review does not include already-mapped ivy');
  assert(reviewA.some(i => i.term === 'chelav'), '3.6 User A review includes chelav');
  assert(reviewB.some(i => i.term === 'chelav'), '3.7 User B review includes their chelav');
  assert(reviewA.every(i => i.term !== 'chelav' || i.transactionCount === 1), '3.8 User A only sees their own chelav');
  assert(reviewB.every(i => i.term !== 'chelav' || i.transactionCount === 1), '3.9 User B only sees their own chelav');

  // Retroactive isolation: mapping for A does NOT touch B's transactions
  const txB = await createTx(userB, sessionB, 'ivy', '300');
  await transactionsService.createBulkMappings(userA, [
    { normalizedTerm: 'ivy', category: 'Travel', ignored: false }, // re-apply (idempotent)
  ]);
  const txBAfter = await getTx(txB);
  assert(txBAfter.category === 'Uncategorized', '3.10 User B ivy tx not touched by User A mapping');
  assert(txBAfter.categorySource === 'unknown', '3.11 User B ivy tx source still unknown');
}

async function testRetroactiveUpdateAtomicity() {
  console.log('\n[Suite 4] Retroactive Update Atomicity & Protection');

  const userId = await createTestUser('retro');
  const sessionId = await createTestSession(userId);

  // Create 3 ivy transactions: all Uncategorized
  const tx1 = await createTx(userId, sessionId, 'ivy', '500');
  const tx2 = await createTx(userId, sessionId, 'ivy', '800');
  const tx3 = await createTx(userId, sessionId, 'ivy', '300');

  // Also create one already user-classified ivy (must be protected)
  const txProtected = await createTx(userId, sessionId, 'ivy', '999', 'Family', 'user', 100);

  // Apply mapping: ivy → Travel
  await transactionsService.createBulkMappings(userId, [
    { normalizedTerm: 'ivy', category: 'Travel', ignored: false },
  ]);

  // All 3 Uncategorized ivys must be updated
  const t1 = await getTx(tx1);
  const t2 = await getTx(tx2);
  const t3 = await getTx(tx3);
  assert(t1.category === 'Travel', '4.1 tx1 retroactively set to Travel');
  assert(t2.category === 'Travel', '4.2 tx2 retroactively set to Travel');
  assert(t3.category === 'Travel', '4.3 tx3 retroactively set to Travel');
  assert(t1.categorySource === 'user', '4.4 tx1 source=user');
  assert(t1.categoryConfidence === 100, '4.5 tx1 confidence=100');

  // Protected transaction must NOT be changed
  const tProtected = await getTx(txProtected);
  assert(tProtected.category === 'Family', '4.6 Pre-existing user-classified tx NOT overwritten (protected)');
  assert(tProtected.categorySource === 'user', '4.7 Protected tx source unchanged');
  assert(tProtected.categoryConfidence === 100, '4.8 Protected tx confidence unchanged');
}

async function testIgnoreVsMapping() {
  console.log('\n[Suite 5] Ignore vs Mapping Semantics Are Distinct');

  const userId = await createTestUser('semantics');
  const sessionId = await createTestSession(userId);

  // Teach: ivy → Travel (normal mapping)
  await transactionsService.createBulkMappings(userId, [
    { normalizedTerm: 'ivy', category: 'Travel', ignored: false },
    { normalizedTerm: 'junk', category: 'Uncategorized', ignored: true },
  ]);

  const ivyMapping = await getMappings(userId, 'ivy');
  const junkMapping = await getMappings(userId, 'junk');

  assert(ivyMapping[0].ignored === false, '5.1 Mapped term has ignored=false');
  assert(junkMapping[0].ignored === true, '5.2 Ignored term has ignored=true');
  assert(ivyMapping[0].category === 'Travel', '5.3 Mapped term has correct category');
  assert(junkMapping[0].category === 'Uncategorized', '5.4 Ignored term has category=Uncategorized');

  // Future classification must behave distinctly
  const ivyResult = await TransactionClassifier.classify('ivy', userId);
  const junkResult = await TransactionClassifier.classify('junk', userId);

  assert(ivyResult.category === 'Travel', '5.5 ivy classifies to Travel');
  assert(ivyResult.categorySource === 'user', '5.6 ivy source=user');
  assert(junkResult.category === 'Uncategorized', '5.7 junk classifies to Uncategorized');
  assert(junkResult.categorySource === 'user', '5.8 junk source=user (not unknown)');
  assert(junkResult.categoryConfidence === 100, '5.9 junk confidence=100 (deliberate decision)');
}

async function testNormalization() {
  console.log('\n[Suite 6] Normalization Consistency');

  const userId = await createTestUser('normalize');

  // User teaches lowercase normalized term
  await transactionsService.createBulkMappings(userId, [
    { normalizedTerm: 'shawarma', category: 'Food', ignored: false },
  ]);

  // All forms must resolve identically
  const forms = ['Shawarma', 'SHAWARMA', '  shawarma  ', 'shawarma'];
  for (const form of forms) {
    const res = await TransactionClassifier.classify(form, userId);
    assert(res.category === 'Food', `6.${forms.indexOf(form) + 1} "${form}" → Food`);
  }

  // Multi-space normalization
  await transactionsService.createBulkMappings(userId, [
    { normalizedTerm: 'train ticket', category: 'Travel', ignored: false },
  ]);
  const multiSpace = await TransactionClassifier.classify('train  ticket', userId);
  assert(multiSpace.category === 'Travel', '6.5 Multi-space "train  ticket" normalizes correctly');
}

async function testReviewAggregation() {
  console.log('\n[Suite 7] Review API Aggregation');

  const userId = await createTestUser('aggregation');
  const sessionId = await createTestSession(userId);

  await createTx(userId, sessionId, 'ivy', '500');
  await createTx(userId, sessionId, 'ivy', '800');
  await createTx(userId, sessionId, 'ivy', '300');
  await createTx(userId, sessionId, 'chelav', '200');
  await createTx(userId, sessionId, 'chelav', '150');

  // Create one already-categorized (should not appear)
  await createTx(userId, sessionId, 'shawarma', '100', 'Food', 'rule', 100);
  // Create one user-ignored (should not appear)
  await transactionsService.createBulkMappings(userId, [
    { normalizedTerm: 'junkword', category: 'Uncategorized', ignored: true },
  ]);
  await createTx(userId, sessionId, 'junkword', '50', 'Uncategorized', 'user', 100);

  const review = await transactionsService.getNeedsReviewTransactions(userId);

  const ivyItem = review.find(i => i.term === 'ivy');
  const chelavItem = review.find(i => i.term === 'chelav');
  const shawarmaItem = review.find(i => i.term === 'shawarma');
  const junkItem = review.find(i => i.term === 'junkword');

  assert(!!ivyItem, '7.1 ivy appears in review');
  assert(ivyItem?.transactionCount === 3, '7.2 ivy has correct count (3)');
  assert(Math.round(ivyItem?.totalAmount ?? 0) === 1600, '7.3 ivy total amount = 1600');
  assert(!!chelavItem, '7.4 chelav appears in review');
  assert(chelavItem?.transactionCount === 2, '7.5 chelav has correct count (2)');
  assert(!shawarmaItem, '7.6 Categorized shawarma NOT in review');
  assert(!junkItem, '7.7 Ignored junkword NOT in review');

  // Aggregation must be sorted by total amount DESC (ivy 1600 > chelav 350)
  assert(
    review.findIndex(i => i.term === 'ivy') < review.findIndex(i => i.term === 'chelav'),
    '7.8 Review sorted by total amount DESC',
  );
}

async function testIdempotency() {
  console.log('\n[Suite 8] Idempotency');

  const userId = await createTestUser('idempotent');
  const sessionId = await createTestSession(userId);
  await createTx(userId, sessionId, 'ivy', '100');

  // Apply mapping twice — must not create duplicate rows or corrupt data
  await transactionsService.createBulkMappings(userId, [
    { normalizedTerm: 'ivy', category: 'Travel', ignored: false },
  ]);
  await transactionsService.createBulkMappings(userId, [
    { normalizedTerm: 'ivy', category: 'Travel', ignored: false },
  ]);

  const mappings = await getMappings(userId, 'ivy');
  assert(mappings.length === 1, '8.1 No duplicate mapping rows after repeated upsert');
  assert(mappings[0].category === 'Travel', '8.2 Mapping value is correct after re-run');

  // Needs-review must be empty (not re-appear)
  const review = await transactionsService.getNeedsReviewTransactions(userId);
  assert(!review.find(i => i.term === 'ivy'), '8.3 ivy not in review after idempotent mapping');
}

async function testFullDatasetLifecycle() {
  console.log('\n[Suite 9] Full Dataset Lifecycle');

  const userId = await createTestUser('lifecycle');
  const sessionId = await createTestSession(userId);

  const testDataset = [
    { desc: 'shawarma', amount: '120' },
    { desc: 'shawaya', amount: '100' },
    { desc: 'alfaham', amount: '200' },
    { desc: 'thandoori', amount: '150' },
    { desc: 'cake', amount: '80' },
    { desc: 'train ticket', amount: '50' },
    { desc: 'bus', amount: '30' },
    { desc: 'uber', amount: '120' },
    { desc: 'car', amount: '0' },
    { desc: 'bike', amount: '0' },
    { desc: 'honda', amount: '500' },
    { desc: 'car maintenance', amount: '1000' },
    { desc: 'bike maintenance', amount: '600' },
    { desc: 'bulb', amount: '80' },
    { desc: 'house maintenance', amount: '2000' },
    { desc: 'shoe', amount: '1200' },
    // Unknown
    { desc: 'ivy', amount: '500' },
    { desc: 'mom debt', amount: '2000' },
    { desc: 'chelav', amount: '300' },
    { desc: 'randomword', amount: '50' },
  ];

  // Phase 1: classify all
  const classResults: Record<string, string> = {};
  for (const item of testDataset) {
    const res = await TransactionClassifier.classify(item.desc, userId);
    classResults[item.desc] = res.category;
  }

  const expected: Record<string, string> = {
    shawarma: 'Food', shawaya: 'Food', alfaham: 'Food',
    thandoori: 'Food', cake: 'Food',
    'train ticket': 'Transport and Vehicle', bus: 'Transport and Vehicle', uber: 'Transport and Vehicle',
    car: 'Transport and Vehicle', bike: 'Transport and Vehicle', honda: 'Transport and Vehicle',
    'car maintenance': 'Transport and Vehicle', 'bike maintenance': 'Transport and Vehicle',
    bulb: 'Household', 'house maintenance': 'Household',
    shoe: 'Shopping and Lifestyle',
    ivy: 'Uncategorized', 'mom debt': 'Uncategorized',
    chelav: 'Uncategorized', randomword: 'Uncategorized',
  };

  let globalCorrect = 0;
  for (const [desc, cat] of Object.entries(expected)) {
    const ok = classResults[desc] === cat;
    if (ok) globalCorrect++;
    assert(ok, `9.${Object.keys(expected).indexOf(desc) + 1} "${desc}" → ${cat} (got: ${classResults[desc]})`);
  }

  // Phase 2: Teach
  await transactionsService.createBulkMappings(userId, [
    { normalizedTerm: 'ivy', category: 'Travel', ignored: false },
    { normalizedTerm: 'mom debt', category: 'Family', ignored: false },
    { normalizedTerm: 'chelav', category: 'Other', ignored: false },
    { normalizedTerm: 'randomword', category: 'Uncategorized', ignored: true },
  ]);

  const postTeach = {
    ivy: await TransactionClassifier.classify('ivy', userId),
    'mom debt': await TransactionClassifier.classify('mom debt', userId),
    chelav: await TransactionClassifier.classify('chelav', userId),
    randomword: await TransactionClassifier.classify('randomword', userId),
  };

  assert(postTeach['ivy'].category === 'Travel', '9.21 ivy → Travel after teaching');
  assert(postTeach['mom debt'].category === 'Family', '9.22 mom debt → Family after teaching');
  assert(postTeach['chelav'].category === 'Other', '9.23 chelav → Other after teaching');
  assert(postTeach['randomword'].category === 'Uncategorized', '9.24 randomword → Uncategorized (ignored)');
  assert(postTeach['randomword'].categorySource === 'user', '9.25 randomword source=user (ignored decision)');
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runAll() {
  console.log('═══════════════════════════════════════════════');
  console.log('  PHASE 2 HARD VERIFICATION SUITE');
  console.log('═══════════════════════════════════════════════');

  await testIgnorePersistence();
  await testUserMappingPrecedence();
  await testUserIsolation();
  await testRetroactiveUpdateAtomicity();
  await testIgnoreVsMapping();
  await testNormalization();
  await testReviewAggregation();
  await testIdempotency();
  await testFullDatasetLifecycle();

  console.log('\n═══════════════════════════════════════════════');
  console.log(`  RESULTS: ${pass} passed, ${fail} failed`);
  if (fail === 0) {
    console.log('  ✅ ALL TESTS PASSED — Phase 2 production-ready');
  } else {
    console.log('  ❌ FAILURES DETECTED — review above');
  }
  console.log('═══════════════════════════════════════════════');

  process.exit(fail > 0 ? 1 : 0);
}

runAll().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
