const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:TkdqEhjezTgMVdXclYOSIKWDjwChenqQ@acela.proxy.rlwy.net:13875/railway',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await pool.query(`
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS annual_value REAL DEFAULT 0;
  `);
  console.log('Migration 6 done!');
  pool.end();
}

migrate().catch(console.error);