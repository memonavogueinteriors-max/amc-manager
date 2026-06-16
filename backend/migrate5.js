const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:TkdqEhjezTgMVdXclYOSIKWDjwChenqQ@acela.proxy.rlwy.net:13875/railway',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await pool.query(`DELETE FROM packages;`);

  await pool.query(`
    INSERT INTO packages (name, tier, villa_size, annual_price, monthly_price, ac_units, services) VALUES
    ('Silver — 3 AC Units', 'Silver', '3-Bedroom / Small Villa', 5100, 425, 3, '{"ac_visits":3,"emergency_ac":1,"emergency_plumbing":1,"emergency_electrical":1,"response_time":"4 hours","duct_cleaning":"1x / 3 zones","robotech":"Not included","plumbing":"Basic / visit","electrical":"Not included","parts_discount":0,"priority":"Standard queue","account_manager":false,"asset_report":false,"visit_months":["April","July","October"]}'),
    ('Gold — 3 AC Units', 'Gold', '3-Bedroom / Small Villa', 6550, 546, 3, '{"ac_visits":3,"emergency_ac":2,"emergency_plumbing":2,"emergency_electrical":2,"response_time":"3 hours","duct_cleaning":"1x / 3 zones","robotech":"1x partial","plumbing":"Full / visit","electrical":"Full / visit","parts_discount":10,"priority":"Priority queue","account_manager":false,"asset_report":false,"visit_months":["April","July","October"]}'),
    ('Platinum — 3 AC Units', 'Platinum', '3-Bedroom / Small Villa', 8550, 712, 3, '{"ac_visits":3,"emergency_ac":3,"emergency_plumbing":3,"emergency_electrical":3,"response_time":"2 hours","duct_cleaning":"1x / 3 zones","robotech":"1x full all zones","plumbing":"Full / visit","electrical":"Full / visit","parts_discount":15,"priority":"VIP — first slot","account_manager":true,"asset_report":true,"visit_months":["April","July","October"]}'),
    ('Silver — 4 AC Units', 'Silver', '4-Bedroom Villa', 5750, 479, 4, '{"ac_visits":3,"emergency_ac":1,"emergency_plumbing":1,"emergency_electrical":1,"response_time":"4 hours","duct_cleaning":"1x / 4 zones","robotech":"Not included","plumbing":"Basic / visit","electrical":"Not included","parts_discount":0,"priority":"Standard queue","account_manager":false,"asset_report":false,"visit_months":["April","July","October"]}'),
    ('Gold — 4 AC Units', 'Gold', '4-Bedroom Villa', 7400, 617, 4, '{"ac_visits":3,"emergency_ac":2,"emergency_plumbing":2,"emergency_electrical":2,"response_time":"3 hours","duct_cleaning":"1x / 4 zones","robotech":"1x partial","plumbing":"Full / visit","electrical":"Full / visit","parts_discount":10,"priority":"Priority queue","account_manager":false,"asset_report":false,"visit_months":["April","July","October"]}'),
    ('Platinum — 4 AC Units', 'Platinum', '4-Bedroom Villa', 9750, 812, 4, '{"ac_visits":3,"emergency_ac":3,"emergency_plumbing":3,"emergency_electrical":3,"response_time":"2 hours","duct_cleaning":"1x / 4 zones","robotech":"1x full all zones","plumbing":"Full / visit","electrical":"Full / visit","parts_discount":15,"priority":"VIP — first slot","account_manager":true,"asset_report":true,"visit_months":["April","July","October"]}'),
    ('Silver — 6 AC Units', 'Silver', '5-6 Bedroom Large Villa', 7050, 588, 6, '{"ac_visits":3,"emergency_ac":1,"emergency_plumbing":1,"emergency_electrical":1,"response_time":"4 hours","duct_cleaning":"Not included","robotech":"Not included","plumbing":"Basic / visit","electrical":"Not included","parts_discount":0,"priority":"Standard queue","account_manager":false,"asset_report":false,"visit_months":["April","July","October"]}'),
    ('Gold — 6 AC Units', 'Gold', '5-6 Bedroom Large Villa', 9100, 758, 6, '{"ac_visits":3,"emergency_ac":2,"emergency_plumbing":2,"emergency_electrical":2,"response_time":"3 hours","duct_cleaning":"1x / 6 zones","robotech":"1x partial","plumbing":"Full / visit","electrical":"Full / visit","parts_discount":0,"priority":"Priority queue","account_manager":false,"asset_report":false,"visit_months":["April","July","October"]}'),
    ('Platinum — 6 AC Units', 'Platinum', '5-6 Bedroom Large Villa', 12200, 1017, 6, '{"ac_visits":3,"emergency_ac":3,"emergency_plumbing":3,"emergency_electrical":3,"response_time":"2 hours","duct_cleaning":"1x / 6 zones","robotech":"1x full all zones","plumbing":"Full / visit","electrical":"Full / visit","parts_discount":0,"priority":"VIP — first slot","account_manager":true,"asset_report":true,"visit_months":["April","July","October"]}');
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_reports (
      id SERIAL PRIMARY KEY,
      visit_id INTEGER REFERENCES service_visits(id),
      contract_id INTEGER REFERENCES contracts(id),
      villa_id INTEGER REFERENCES villas(id),
      visit_date TEXT,
      visit_type TEXT,
      technician TEXT,
      manager TEXT,
      checklist JSONB,
      notes TEXT,
      client_signature BOOLEAN DEFAULT false,
      manager_approved BOOLEAN DEFAULT false,
      report_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Migration 5 done!');
  pool.end();
}

migrate().catch(console.error);