import { db } from './client.js';
import { transactions } from './schema/transactions.js';
import { ulid } from 'ulid';

const testDescriptions = [
  'shawarma',
  'shawaya',
  'alfaham',
  'thandoori',
  'cake',
  'train ticket',
  'bus',
  'uber',
  'car',
  'bike',
  'honda',
  'car maintenance',
  'bike maintenance',
  'bulb',
  'house maintenance',
  'shoe',
  'ivy',
  'mom debt',
  'chelav',
  'something random'
];

async function seedTestTransactions() {
  console.log('Seeding test transactions...');
  
  // Create a dummy user session if needed, but since we are inserting directly:
  const dummyUserId = 'test_user_id';
  const dummySessionId = 'test_session_id'; // Note: might violate FK if session doesn't exist, but we can bypass FK or just ensure a user/session exists.
  // Actually, wait, transactions has FK to users and expense_sessions.
  // We need to fetch an existing user and session.
  
  const { users } = await import('./schema/users.js');
  const existingUser = await db.select().from(users).limit(1);
  if (!existingUser.length) {
    console.log('No users found. Cannot seed.');
    process.exit(1);
  }
  const userId = existingUser[0].id;
  
  const { expenseSessions } = await import('./schema/expense_sessions.js');
  const { eq } = await import('drizzle-orm');
  let session = await db.select().from(expenseSessions).where(eq(expenseSessions.userId, userId)).limit(1);
  let sessionId = session.length ? session[0].id : null;
  
  if (!sessionId) {
     sessionId = ulid();
     await db.insert(expenseSessions).values({
       id: sessionId,
       userId: userId,
       totalAmount: '0',
       itemCount: 0
     });
  }

  for (const desc of testDescriptions) {
    await db.insert(transactions).values({
      id: ulid(),
      sessionId: sessionId,
      userId: userId,
      amount: '100.00',
      currency: 'INR',
      description: desc,
      category: 'Uncategorized', // This simulates pre-backfill state
      categorySource: 'unknown',
      categoryConfidence: 0,
      spentAt: new Date(),
    });
  }
  console.log('Test transactions seeded successfully!');
  process.exit(0);
}

seedTestTransactions().catch(console.error);
