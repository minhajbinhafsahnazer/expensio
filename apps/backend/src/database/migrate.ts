import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pkg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pkg;

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('neon') ? { rejectUnauthorized: false } : undefined,
  });

  const db = drizzle(pool);

  console.log('🚀 Running migrations...');

  await migrate(db, {
    migrationsFolder: join(__dirname, 'migrations'),
  });

  console.log('✅ Migrations complete!');
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

