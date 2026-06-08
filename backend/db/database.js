const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const db = {
  prepare: (sql) => ({
    run: async (...params) => {
      const result = await pool.query(sql.replace(/\?/g, (_, i) => `$${++i}`), params);
      return { lastInsertRowid: result.rows[0]?.id };
    },
    get: async (...params) => {
      const result = await pool.query(sql.replace(/\?/g, (_, i) => `$${++i}`), params);
      return result.rows[0];
    },
    all: async (...params) => {
      const result = await pool.query(sql.replace(/\?/g, (_, i) => `$${++i}`), params);
      return result.rows;
    }
  }),
  exec: async (sql) => { await pool.query(sql); }
};

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'rm',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS villas (
      id SERIAL PRIMARY KEY,
      villa_number TEXT NOT NULL, block TEXT NOT NULL, client_id INTEGER,
      bedrooms INTEGER, size_sqft INTEGER, notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS contracts (
      id SERIAL PRIMARY KEY,
      contract_number TEXT UNIQUE, villa_id INTEGER, client_id INTEGER,
      package TEXT NOT NULL, monthly_value REAL NOT NULL,
      start_date TEXT NOT NULL, end_date TEXT NOT NULL,
      status TEXT DEFAULT 'active', relationship_manager_id INTEGER, notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      ticket_number TEXT UNIQUE, villa_id INTEGER, contract_id INTEGER,
      title TEXT NOT NULL, description TEXT, priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open', assigned_to INTEGER, resolved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS schedule (
      id SERIAL PRIMARY KEY,
      villa_id INTEGER, ticket_id INTEGER, service_type TEXT NOT NULL,
      technician TEXT, scheduled_date TEXT NOT NULL, duration_hours REAL,
      status TEXT DEFAULT 'scheduled', notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS procurement_orders (
      id SERIAL PRIMARY KEY,
      order_number TEXT UNIQUE, item_name TEXT NOT NULL, quantity INTEGER NOT NULL,
      unit TEXT DEFAULT 'unit', unit_cost REAL, total_cost REAL,
      supplier TEXT, expected_date TEXT, status TEXT DEFAULT 'pending', notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      item_name TEXT UNIQUE NOT NULL, in_stock INTEGER DEFAULT 0,
      min_level INTEGER DEFAULT 5, unit TEXT DEFAULT 'unit', unit_cost REAL,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const result = await pool.query('SELECT COUNT(*) as c FROM users');
  if (parseInt(result.rows[0].c) === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.query('INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4)', ['Admin','admin@amc.com',hash,'admin']);
    await pool.query('INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4)', ['Rania Mahmoud','rania@amc.com',bcrypt.hashSync('pass123',10),'rm']);
    await pool.query('INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4)', ['Tariq Anwar','tariq@amc.com',bcrypt.hashSync('pass123',10),'rm']);
    console.log('✅ Database seeded');
  }

  return db;
}

module.exports = { initDb, getDb: () => db };