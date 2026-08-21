import { db } from '../../database/client.js';
import { users } from '../../database/schema/users.js';
import { userCategories } from '../../database/schema/user_categories.js';
import { categoriesService } from '../categories/categories.service.js';
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
    email: `verify-cat-${tag}-${id}@test.local`,
    passwordHash: 'test-hash',
  });
  return id;
}

async function testCustomCategories() {
  console.log('\n[Suite 1] Custom Category Creation & Trimming & Normalization');
  
  const userId = await createTestUser('creation');

  // Creation & Trimming
  const cat1 = await categoriesService.createCustomCategory(userId, '  Travel  ');
  assert(cat1.name === 'Travel', '1.1 Name is trimmed properly');
  assert(cat1.normalizedName === 'travel', '1.2 Normalized name is correct');
  assert(cat1.userId === userId, '1.3 Correct userId');

  // Duplicate Prevention
  let errorCaught = false;
  try {
    await categoriesService.createCustomCategory(userId, 'TRAVEL');
  } catch (e: any) {
    errorCaught = true;
  }
  assert(errorCaught, '1.4 Duplicate category (case insensitive) is rejected');

  const allCats = await categoriesService.getCustomCategories(userId);
  assert(allCats.length === 1, '1.5 Only one category exists despite duplicate attempt');

  // User Isolation
  console.log('\n[Suite 2] User Isolation');
  const userB = await createTestUser('isolation');
  const catsB = await categoriesService.getCustomCategories(userB);
  assert(catsB.length === 0, '2.1 User B does not see User A categories');
}

async function runAll() {
  console.log('═══════════════════════════════════════════════');
  console.log('  CUSTOM CATEGORIES VERIFICATION SUITE');
  console.log('═══════════════════════════════════════════════');

  await testCustomCategories();

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
