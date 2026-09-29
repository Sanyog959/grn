const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Read .env.local if present
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  console.log('=====================================================');
  console.log('      AURA GRN - Supabase PostgreSQL Database Setup  ');
  console.log('=====================================================\n');

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL is not set in .env.local');
    process.exit(1);
  }

  if (connectionString.includes('[YOUR-PASSWORD]')) {
    console.error('⚠️  Notice: Please replace [YOUR-PASSWORD] in .env.local with your real database password.');
    console.error('   File: .env.local');
    console.error('   Line: DATABASE_URL=postgresql://postgres.tnfkvhitgrsofqojyfdu:<YOUR-ACTUAL-PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres\n');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  const schemaPath = path.join(__dirname, '..', 'supabase-schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Error: supabase-schema.sql not found at', schemaPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('📡 Connecting to Supabase PostgreSQL at aws-0-ap-south-1.pooler.supabase.com...');
  const client = await pool.connect();

  try {
    console.log('🚀 Executing SQL schema and inserting starter seed records...');
    await client.query(sql);

    // Verify row counts
    const [vendorsRes, ordersRes, itemsRes] = await Promise.all([
      client.query('SELECT COUNT(*) FROM public.vendors'),
      client.query('SELECT COUNT(*) FROM public.grn_orders'),
      client.query('SELECT COUNT(*) FROM public.grn_items'),
    ]);

    console.log('\n✅ SUCCESS: Supabase PostgreSQL database tables ready!');
    console.log(`   - vendors:    ${vendorsRes.rows[0].count} records`);
    console.log(`   - grn_orders: ${ordersRes.rows[0].count} records`);
    console.log(`   - grn_items:  ${itemsRes.rows[0].count} records\n`);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
