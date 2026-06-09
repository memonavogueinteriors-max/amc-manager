const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:TkdqEhjezTgMVdXclYOSIKWDjwChenqQ@acela.proxy.rlwy.net:13875/railway',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS packages (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      tier TEXT NOT NULL,
      villa_size TEXT NOT NULL,
      annual_price REAL NOT NULL,
      monthly_price REAL NOT NULL,
      ac_units INTEGER,
      services JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS service_visits (
      id SERIAL PRIMARY KEY,
      contract_id INTEGER REFERENCES contracts(id),
      villa_id INTEGER REFERENCES villas(id),
      visit_date TEXT NOT NULL,
      service_type TEXT NOT NULL,
      technician TEXT,
      incharge TEXT,
      comments TEXT,
      client_satisfaction INTEGER DEFAULT 5,
      report_url TEXT,
      report_name TEXT,
      status TEXT DEFAULT 'scheduled',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      paid_by TEXT,
      slip_url TEXT,
      slip_name TEXT,
      project TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS client_tickets (
      id SERIAL PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      villa_id INTEGER REFERENCES villas(id),
      client_name TEXT,
      client_phone TEXT,
      description TEXT,
      photo_url TEXT,
      status TEXT DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS booking_links (
      id SERIAL PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      contract_id INTEGER REFERENCES contracts(id),
      villa_id INTEGER REFERENCES villas(id),
      client_name TEXT,
      available_dates JSONB,
      selected_date TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    INSERT INTO packages (name, tier, villa_size, annual_price, monthly_price, ac_units, services)
    VALUES 
    ('Silver - 2-3 Units', 'Silver', '2-3 units (apt/townhouse/small villa)', 2500, 208, 3, '{"ac_visits":3,"emergency_callouts":2,"response_time":"48hr","duct_cleaning":false,"electrical_visits":1,"plumbing_visits":1}'),
    ('Gold - 2-3 Units', 'Gold', '2-3 units (apt/townhouse/small villa)', 3500, 292, 3, '{"ac_visits":3,"emergency_callouts":3,"response_time":"24hr","duct_cleaning":true,"electrical_visits":1,"plumbing_visits":1}'),
    ('Platinum - 2-3 Units', 'Platinum', '2-3 units (apt/townhouse/small villa)', 5000, 417, 3, '{"ac_visits":3,"emergency_callouts":4,"response_time":"4hr","duct_cleaning":true,"electrical_visits":2,"plumbing_visits":2}'),
    ('Silver - 4 Units', 'Silver', '4 units (3-bedroom villa)', 3500, 292, 4, '{"ac_visits":3,"emergency_callouts":2,"response_time":"48hr","duct_cleaning":false,"electrical_visits":1,"plumbing_visits":1}'),
    ('Gold - 4 Units', 'Gold', '4 units (3-bedroom villa)', 5000, 417, 4, '{"ac_visits":3,"emergency_callouts":3,"response_time":"24hr","duct_cleaning":true,"electrical_visits":1,"plumbing_visits":1}'),
    ('Platinum - 4 Units', 'Platinum', '4 units (3-bedroom villa)', 7000, 583, 4, '{"ac_visits":3,"emergency_callouts":4,"response_time":"4hr","duct_cleaning":true,"electrical_visits":2,"plumbing_visits":2}'),
    ('Silver - 6 Units', 'Silver', '6 units (4-5 bedroom villa)', 4800, 400, 6, '{"ac_visits":3,"emergency_callouts":2,"response_time":"48hr","duct_cleaning":false,"electrical_visits":1,"plumbing_visits":1}'),
    ('Gold - 6 Units', 'Gold', '6 units (4-5 bedroom villa)', 6800, 567, 6, '{"ac_visits":3,"emergency_callouts":3,"response_time":"24hr","duct_cleaning":true,"electrical_visits":1,"plumbing_visits":1}'),
    ('Platinum - 6 Units', 'Platinum', '6 units (4-5 bedroom villa)', 9500, 792, 6, '{"ac_visits":3,"emergency_callouts":4,"response_time":"4hr","duct_cleaning":true,"electrical_visits":2,"plumbing_visits":2}'),
    ('Silver - 8 Units', 'Silver', '8 units (5-7 bedroom villa/estate)', 6000, 500, 8, '{"ac_visits":3,"emergency_callouts":2,"response_time":"48hr","duct_cleaning":false,"electrical_visits":1,"plumbing_visits":1}'),
    ('Gold - 8 Units', 'Gold', '8 units (5-7 bedroom villa/estate)', 8500, 708, 8, '{"ac_visits":3,"emergency_callouts":3,"response_time":"24hr","duct_cleaning":true,"electrical_visits":1,"plumbing_visits":1}'),
    ('Platinum - 8 Units', 'Platinum', '8 units (5-7 bedroom villa/estate)', 12000, 1000, 8, '{"ac_visits":3,"emergency_callouts":4,"response_time":"4hr","duct_cleaning":true,"electrical_visits":2,"plumbing_visits":2}')
    ON CONFLICT DO NOTHING;
  `);

  console.log('Migration 2 done!');
  pool.end();
}

migrate().catch(console.error);