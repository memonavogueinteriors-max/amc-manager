const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:TkdqEhjezTgMVdXclYOSIKWDjwChenqQ@acela.proxy.rlwy.net:13875/railway',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await pool.query(`
    ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS serial_number TEXT;
    ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS ordered_by TEXT;
    ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS invoice_url TEXT;
    ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS invoice_name TEXT;
  `);
  console.log('Migration 3 done!');
  pool.end();
}

migrate().catch(console.error);
