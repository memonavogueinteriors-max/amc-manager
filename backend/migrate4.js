const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:TkdqEhjezTgMVdXclYOSIKWDjwChenqQ@acela.proxy.rlwy.net:13875/railway',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'sales';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS sales_target REAL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'Villa';
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS file_number TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS visits_used INTEGER DEFAULT 0;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS visits_total INTEGER DEFAULT 3;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS emergency_callouts_used INTEGER DEFAULT 0;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS emergency_callouts_total INTEGER DEFAULT 2;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS next_service_date TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS last_service_date TEXT;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS sales_person_id INTEGER REFERENCES users(id);
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT false;
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS commission_amount REAL DEFAULT 0;

    CREATE TABLE IF NOT EXISTS commissions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      contract_id INTEGER REFERENCES contracts(id),
      amount REAL NOT NULL,
      type TEXT DEFAULT 'contract_signup',
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales_targets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      target_amount REAL DEFAULT 0,
      achieved_amount REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    UPDATE users SET role = 'owner' WHERE email = 'swaati@amcmanager.com';
  `);

  console.log('Migration 4 done!');
  pool.end();
}

migrate().catch(console.error);