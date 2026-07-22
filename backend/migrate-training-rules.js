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
      CREATE TABLE IF NOT EXISTS training_rules (
        id SERIAL PRIMARY KEY,

        title TEXT NOT NULL,
        department TEXT NOT NULL,

        original_problem TEXT DEFAULT '',
        lesson_learned TEXT DEFAULT '',

        official_rule TEXT NOT NULL,
        steps_to_follow TEXT DEFAULT '',
        prohibited_actions TEXT DEFAULT '',

        responsible_department TEXT DEFAULT '',
        approved_by TEXT DEFAULT '',
        effective_date DATE,

        black_box_entry_id INTEGER UNIQUE,

        status TEXT NOT NULL DEFAULT 'Draft',

        created_by INTEGER,
        created_by_name TEXT DEFAULT '',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS training_rule_acknowledgements (
        id SERIAL PRIMARY KEY,
        rule_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        user_name TEXT DEFAULT '',
        acknowledged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(rule_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_training_rules_department
        ON training_rules(department);

      CREATE INDEX IF NOT EXISTS idx_training_rules_status
        ON training_rules(status);

      CREATE INDEX IF NOT EXISTS idx_training_rules_created_at
        ON training_rules(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_rule_acknowledgements_rule
        ON training_rule_acknowledgements(rule_id);
    `);

    console.log('Training Rule Book tables created successfully.');
  } catch (error) {
    console.error('Training Rule Book migration failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();