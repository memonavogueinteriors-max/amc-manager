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
      CREATE TABLE IF NOT EXISTS black_box_entries (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        department TEXT NOT NULL,
        employee_name TEXT DEFAULT '',
        related_reference TEXT DEFAULT '',
        problem TEXT NOT NULL,
        root_cause TEXT DEFAULT '',
        lesson_learned TEXT NOT NULL,
        correct_solution TEXT DEFAULT '',
        prevention_steps TEXT DEFAULT '',
        action_required TEXT DEFAULT '',
        responsible_person TEXT DEFAULT '',
        due_date DATE,
        status TEXT NOT NULL DEFAULT 'New',
        manager_review TEXT DEFAULT '',
        company_rule BOOLEAN DEFAULT false,
        created_by INTEGER,
        created_by_name TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_black_box_department
      ON black_box_entries(department);

      CREATE INDEX IF NOT EXISTS idx_black_box_status
      ON black_box_entries(status);

      CREATE INDEX IF NOT EXISTS idx_black_box_created_at
      ON black_box_entries(created_at DESC);
    `);

    console.log('Black Box Thinking table created successfully.');
  } catch (error) {
    console.error('Black Box migration failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();