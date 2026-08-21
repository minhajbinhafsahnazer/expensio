import { db } from './src/database/client.js';
import { users } from './src/database/schema/users.js';
import jwt from 'jsonwebtoken';
import { env } from './src/config/environment.js';

async function test() {
  const allUsers = await db.select().from(users).limit(1);
  const userId = allUsers[0].id;

  const token = jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '1h' });

  const res = await fetch(`http://127.0.0.1:4000/api/v1/analytics?from=2024-01-01&to=2026-12-31`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

test().catch(console.error);
