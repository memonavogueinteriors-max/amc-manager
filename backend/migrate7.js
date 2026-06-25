const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS unique_staff_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage',
      ADD COLUMN IF NOT EXISTS commission_value REAL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS google_calendar_email TEXT;

    ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER,
      ADD COLUMN IF NOT EXISTS created_by_staff_id TEXT,
      ADD COLUMN IF NOT EXISTS created_by_name TEXT,
      ADD COLUMN IF NOT EXISTS created_by_role TEXT,
      ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;

    ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER,
      ADD COLUMN IF NOT EXISTS created_by_staff_id TEXT,
      ADD COLUMN IF NOT EXISTS created_by_name TEXT,
      ADD COLUMN IF NOT EXISTS created_by_role TEXT;

    ALTER TABLE schedule
      ADD COLUMN IF NOT EXISTS assigned_user_id INTEGER,
      ADD COLUMN IF NOT EXISTS assigned_staff_id TEXT,
      ADD COLUMN IF NOT EXISTS purpose TEXT,
      ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
      ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER DEFAULT 1440;
  `);

  console.log('Migration 7 done: sales tracking, staff IDs, client ownership, calendar fields added.');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  pool.end();
});
