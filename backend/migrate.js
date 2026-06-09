const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:TkdqEhjezTgMVdXclYOSIKWDjwChenqQ@acela.proxy.rlwy.net:13875/railway',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await pool.query(`
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;
    ALTER TABLE villas ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;
  `);
  console.log('Migration done!');
  pool.end();
}

migrate().catch(console.error);