require('dotenv').config();
const { Pool } = require('pg');

const isLocalDatabase =
  process.env.DATABASE_URL?.includes('localhost') ||
  process.env.DATABASE_URL?.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isLocalDatabase
    ? {}
    : { ssl: { rejectUnauthorized: false } })
});

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS implementation_actions (
        id SERIAL PRIMARY KEY,

        title TEXT NOT NULL,
        source_type TEXT NOT NULL DEFAULT 'Black Box',
        black_box_entry_id INTEGER,
        training_rule_id INTEGER,

        department TEXT DEFAULT '',
        action_required TEXT NOT NULL,
        responsible_person TEXT DEFAULT '',
        due_date DATE,

        status TEXT NOT NULL DEFAULT 'Not Started',

        evidence TEXT DEFAULT '',
        manager_verification TEXT DEFAULT '',
        completion_date DATE,

        created_by INTEGER,
        created_by_name TEXT DEFAULT '',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_implementation_status
        ON implementation_actions(status);

      CREATE INDEX IF NOT EXISTS idx_implementation_department
        ON implementation_actions(department);

      CREATE INDEX IF NOT EXISTS idx_implementation_due_date
        ON implementation_actions(due_date);

      CREATE INDEX IF NOT EXISTS idx_implementation_black_box
        ON implementation_actions(black_box_entry_id);

      CREATE INDEX IF NOT EXISTS idx_implementation_training_rule
        ON implementation_actions(training_rule_id);
    `);

    console.log('Implementation Tracker table created successfully.');
  } catch (error) {
    console.error('Implementation Tracker migration failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();