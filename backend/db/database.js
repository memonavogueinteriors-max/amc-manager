const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pool;

function getDb() {
  return pool;
}

async function initDb() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

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
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS villas (
      id SERIAL PRIMARY KEY,
      villa_number TEXT NOT NULL,
      block TEXT NOT NULL,
      client_id INTEGER,
      bedrooms INTEGER,
      size_sqft INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id SERIAL PRIMARY KEY,
      contract_number TEXT UNIQUE,
      villa_id INTEGER,
      client_id INTEGER,
      package TEXT NOT NULL,
      monthly_value REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      relationship_manager_id INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      ticket_number TEXT UNIQUE,
      villa_id INTEGER,
      contract_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      assigned_to INTEGER,
      resolved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS schedule (
      id SERIAL PRIMARY KEY,
      villa_id INTEGER,
      ticket_id INTEGER,
      service_type TEXT NOT NULL,
      technician TEXT,
      scheduled_date TEXT NOT NULL,
      duration_hours REAL,
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS procurement_orders (
      id SERIAL PRIMARY KEY,
      order_number TEXT UNIQUE,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit TEXT DEFAULT 'unit',
      unit_cost REAL,
      total_cost REAL,
      supplier TEXT,
      expected_date TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      item_name TEXT UNIQUE NOT NULL,
      in_stock INTEGER DEFAULT 0,
      min_level INTEGER DEFAULT 5,
      unit TEXT DEFAULT 'unit',
      unit_cost REAL,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS file_number TEXT,
      ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'Villa',
      ADD COLUMN IF NOT EXISTS sales_person_id INTEGER,
      ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS visits_total INTEGER DEFAULT 3,
      ADD COLUMN IF NOT EXISTS emergency_callouts_total INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS emergency_callouts_used INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS next_service_date TEXT,
      ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS original_price NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS final_price NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discount_reason TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS discount_approved_by TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS discount_approved_date DATE;
  `);

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS sales_target NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS unique_staff_id TEXT,
      ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage',
      ADD COLUMN IF NOT EXISTS commission_value NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS google_calendar_email TEXT DEFAULT '';
  `);

  await pool.query(`
    ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS commissions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      contract_id INTEGER,
      amount NUMERIC DEFAULT 0,
      type TEXT DEFAULT 'contract_signup',
      status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_visits (
      id SERIAL PRIMARY KEY,
      contract_id INTEGER,
      visit_date TEXT,
      status TEXT DEFAULT 'scheduled',
      technician TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_reports (
      id SERIAL PRIMARY KEY,
      visit_id INTEGER,
      contract_id INTEGER,
      villa_id INTEGER,
      visit_date TEXT,
      visit_type TEXT,
      technician TEXT,
      manager TEXT,
      checklist JSONB DEFAULT '{}',
      notes TEXT,
      manager_approved BOOLEAN DEFAULT false,
      client_signature BOOLEAN DEFAULT false,
      report_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const result = await pool.query('SELECT COUNT(*) as c FROM users');

  if (parseInt(result.rows[0].c) === 0) {
    await pool.query(
      'INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4)',
      ['Admin', 'admin@amc.com', bcrypt.hashSync('admin123', 10), 'admin']
    );

    await pool.query(
      'INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4)',
      ['Rania Mahmoud', 'rania@amc.com', bcrypt.hashSync('pass123', 10), 'rm']
    );

    await pool.query(
      'INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4)',
      ['Tariq Anwar', 'tariq@amc.com', bcrypt.hashSync('pass123', 10), 'rm']
    );

    const clients = [
      ['Ahmed Al-Rashid', '+971 50 111 2233', 'ahmed@email.com'],
      ['Sara Khalid', '+971 55 223 4455', 'sara@email.com'],
      ['Omar Hassan', '+971 56 334 5566', 'omar@email.com'],
      ['Fatima Al-Ali', '+971 52 445 6677', 'fatima@email.com'],
      ['Khalid Mansour', '+971 50 556 7788', 'khalid@email.com'],
      ['Nadia Ibrahim', '+971 54 667 8899', 'nadia@email.com'],
      ['Yusuf Qasim', '+971 58 778 9900', 'yusuf@email.com'],
      ['Maryam Saleh', '+971 50 889 0011', 'maryam@email.com']
    ];

    for (const c of clients) {
      await pool.query(
        'INSERT INTO clients (name,phone,email) VALUES ($1,$2,$3)',
        c
      );
    }

    const villas = [
      ['Villa 1', 'A', 1],
      ['Villa 3', 'A', 2],
      ['Villa 7', 'B', 3],
      ['Villa 12', 'B', 4],
      ['Villa 15', 'C', 5],
      ['Villa 22', 'C', 6],
      ['Villa 28', 'D', 7],
      ['Villa 35', 'D', 8]
    ];

    for (const v of villas) {
      await pool.query(
        'INSERT INTO villas (villa_number,block,client_id) VALUES ($1,$2,$3)',
        v
      );
    }

    const villaRows = await pool.query('SELECT id FROM villas ORDER BY id');
    const vids = villaRows.rows.map(r => r.id);

    const contracts = [
      [vids[0], 1, 'Premium', 1800, '2025-01-01', '2026-12-31', 'active'],
      [vids[1], 2, 'Standard', 1200, '2025-03-01', '2026-02-28', 'expiring'],
      [vids[2], 3, 'Elite', 2400, '2024-06-01', '2027-05-31', 'active'],
      [vids[3], 4, 'Elite', 2400, '2026-01-01', '2028-12-31', 'active'],
      [vids[4], 5, 'Standard', 1200, '2025-02-01', '2026-01-31', 'expiring'],
      [vids[5], 6, 'Premium', 1800, '2025-04-01', '2028-03-31', 'active'],
      [vids[6], 7, 'Standard', 1200, '2025-05-01', '2026-04-30', 'pending'],
      [vids[7], 8, 'Premium', 1800, '2024-07-01', '2027-06-30', 'active']
    ];

    for (let i = 0; i < contracts.length; i++) {
      const c = contracts[i];

      await pool.query(
        'INSERT INTO contracts (contract_number,villa_id,client_id,package,monthly_value,start_date,end_date,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [`AMC-00${i + 1}`, ...c]
      );
    }

    const tickets = [
      [vids[6], 'AC unit not cooling', 'urgent', 'open'],
      [vids[3], 'Water leak in bathroom', 'urgent', 'in_progress'],
      [vids[0], 'Electrical trip', 'medium', 'in_progress'],
      [vids[7], 'Gate motor repair', 'low', 'scheduled'],
      [vids[4], 'Paint touch-up needed', 'low', 'open']
    ];

    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];

      await pool.query(
        'INSERT INTO tickets (ticket_number,villa_id,title,priority,status) VALUES ($1,$2,$3,$4,$5)',
        [`T-${100 + i}`, ...t]
      );
    }

    const schedules = [
      [vids[3], 'Quarterly Inspection', 'Ali Hassan', '2026-06-08', 3],
      [vids[0], 'AC Maintenance', 'Kareem Said', '2026-06-09', 2],
      [vids[4], 'Plumbing Check', 'Omar Faris', '2026-06-10', 1.5],
      [vids[5], 'Electrical Audit', 'Ali Hassan', '2026-06-12', 4],
      [vids[7], 'Annual Inspection', 'Kareem Said', '2026-06-15', 5]
    ];

    for (const s of schedules) {
      await pool.query(
        'INSERT INTO schedule (villa_id,service_type,technician,scheduled_date,duration_hours) VALUES ($1,$2,$3,$4,$5)',
        s
      );
    }

    const inventory = [
      ['AC Filters', 12, 20, 'unit', 70],
      ['Plumbing Kits', 35, 10, 'kit', 45],
      ['Electrical Parts', 8, 15, 'unit', 30],
      ['Paint Supplies', 22, 5, 'can', 25],
      ['Water Pumps', 5, 3, 'unit', 380]
    ];

    for (const i of inventory) {
      await pool.query(
        'INSERT INTO inventory (item_name,in_stock,min_level,unit,unit_cost) VALUES ($1,$2,$3,$4,$5)',
        i
      );
    }

    const orders = [
      ['PO-221', 'AC Filters', 40, 'unit', 70, 2800, 'Al-Faris Supplies', '2026-06-10', 'in_transit'],
      ['PO-222', 'Plumbing Fittings Kit', 20, 'kit', 75, 1500, 'Gulf Tech', '2026-06-12', 'delivered'],
      ['PO-223', 'Electrical Breakers', 15, 'unit', 213, 3200, 'Emirates Parts', '2026-06-15', 'pending'],
      ['PO-224', 'Paint & Finishing', 10, 'can', 90, 900, 'Dubai Paints', '2026-06-09', 'delivered']
    ];

    for (const o of orders) {
      await pool.query(
        'INSERT INTO procurement_orders (order_number,item_name,quantity,unit,unit_cost,total_cost,supplier,expected_date,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        o
      );
    }

    console.log('✅ Database seeded with sample data');
  }

  return pool;
}

module.exports = { initDb, getDb };