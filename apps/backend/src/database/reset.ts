/**
 * reset.ts
 * Drops all existing tables and recreates the full schema from scratch.
 * Run ONCE during initial development only — destructive!
 */
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

async function reset() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('🔗 Connected to Neon DB');

  // Drop all tables in reverse dependency order
  const drops = `
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS transactions CASCADE;
    DROP TABLE IF EXISTS expense_sessions CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS drizzle_migrations CASCADE;
  `;
  await client.query(drops);
  console.log('🗑️  Dropped all existing tables');

  // Create fresh schema
  const schema = `
    -- ─────────────────────────────────────────────────────────────────────────
    -- users
    -- ─────────────────────────────────────────────────────────────────────────
    CREATE TABLE users (
      id            TEXT PRIMARY KEY,
      email         VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name     VARCHAR(255),
      currency      VARCHAR(3)   NOT NULL DEFAULT 'INR',
      theme         VARCHAR(10)  NOT NULL DEFAULT 'system',
      timezone      VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
      locale        VARCHAR(10)  NOT NULL DEFAULT 'en-IN',
      is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
      last_login_at TIMESTAMPTZ,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX users_email_idx ON users (email);

    -- ─────────────────────────────────────────────────────────────────────────
    -- expense_sessions
    -- ─────────────────────────────────────────────────────────────────────────
    CREATE TABLE expense_sessions (
      id           TEXT PRIMARY KEY,
      user_id      TEXT        NOT NULL REFERENCES users(id),
      total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      item_count   INTEGER     NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX expense_sessions_user_id_idx ON expense_sessions (user_id);

    -- ─────────────────────────────────────────────────────────────────────────
    -- transactions
    -- ─────────────────────────────────────────────────────────────────────────
    CREATE TABLE transactions (
      id         TEXT PRIMARY KEY,
      session_id TEXT         NOT NULL REFERENCES expense_sessions(id),
      user_id    TEXT         NOT NULL REFERENCES users(id),
      amount     NUMERIC(12,2) NOT NULL,
      currency   VARCHAR(3)   NOT NULL,
      category   TEXT         NOT NULL,
      note       TEXT,
      spent_at   TIMESTAMPTZ  NOT NULL,
      status     VARCHAR(20)  NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE INDEX transactions_user_id_idx       ON transactions (user_id);
    CREATE INDEX transactions_spent_at_idx      ON transactions (spent_at DESC);
    CREATE INDEX transactions_user_spent_at_idx ON transactions (user_id, spent_at);

    -- ─────────────────────────────────────────────────────────────────────────
    -- audit_logs
    -- ─────────────────────────────────────────────────────────────────────────
    CREATE TABLE audit_logs (
      id         TEXT PRIMARY KEY,
      user_id    TEXT        NOT NULL REFERENCES users(id),
      action     VARCHAR(50) NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX audit_logs_user_id_idx ON audit_logs (user_id);
  `;

  await client.query(schema);
  console.log('✅ Schema created successfully!');
  console.log('');
  console.log('   Tables created:');
  console.log('   ✓ users');
  console.log('   ✓ expense_sessions');
  console.log('   ✓ transactions');
  console.log('   ✓ audit_logs');
  console.log('');
  console.log('   Indexes created:');
  console.log('   ✓ users_email_idx');
  console.log('   ✓ expense_sessions_user_id_idx');
  console.log('   ✓ transactions_user_id_idx');
  console.log('   ✓ transactions_spent_at_idx');
  console.log('   ✓ transactions_user_spent_at_idx');
  console.log('   ✓ audit_logs_user_id_idx');

  await client.end();
}

reset().catch((err) => {
  console.error('❌ Reset failed:', err.message);
  process.exit(1);
});
