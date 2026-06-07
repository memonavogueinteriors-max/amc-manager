const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'amc.db');

let db;

function getDb() { return db; }

async function initDb() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  const save = () => {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  };

  // Wrap db to auto-save and provide better-sqlite3-like API
  const wrap = {
    prepare: (sql) => ({
      run: (...params) => {
        db.run(sql, params);
        save();
        const stmt = db.prepare('SELECT last_insert_rowid() as id');
        stmt.step();
        const row = stmt.getAsObject();
        stmt.free();
        return { lastInsertRowid: row.id };
      },
      get: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      }
    }),
    exec: (sql) => { db.run(sql); save(); },
  };

  // Schema
  wrap.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
      role TEXT DEFAULT 'rm', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS villas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      villa_number TEXT NOT NULL, block TEXT NOT NULL, client_id INTEGER,
      bedrooms INTEGER, size_sqft INTEGER, notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_number TEXT UNIQUE, villa_id INTEGER, client_id INTEGER,
      package TEXT NOT NULL, monthly_value REAL NOT NULL,
      start_date TEXT NOT NULL, end_date TEXT NOT NULL,
      status TEXT DEFAULT 'active', relationship_manager_id INTEGER, notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE, villa_id INTEGER, contract_id INTEGER,
      title TEXT NOT NULL, description TEXT, priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open', assigned_to INTEGER, resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      villa_id INTEGER, ticket_id INTEGER, service_type TEXT NOT NULL,
      technician TEXT, scheduled_date TEXT NOT NULL, duration_hours REAL,
      status TEXT DEFAULT 'scheduled', notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS procurement_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE, item_name TEXT NOT NULL, quantity INTEGER NOT NULL,
      unit TEXT DEFAULT 'unit', unit_cost REAL, total_cost REAL,
      supplier TEXT, expected_date TEXT, status TEXT DEFAULT 'pending', notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT UNIQUE NOT NULL, in_stock INTEGER DEFAULT 0,
      min_level INTEGER DEFAULT 5, unit TEXT DEFAULT 'unit', unit_cost REAL,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const bcrypt = require('bcryptjs');
  const userCount = wrap.prepare('SELECT COUNT(*) as c FROM users').get().c;

  if (Number(userCount) === 0) {
    wrap.prepare('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)').run('Admin','admin@amc.com',bcrypt.hashSync('admin123',10),'admin');
    wrap.prepare('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)').run('Rania Mahmoud','rania@amc.com',bcrypt.hashSync('pass123',10),'rm');
    wrap.prepare('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)').run('Tariq Anwar','tariq@amc.com',bcrypt.hashSync('pass123',10),'rm');

    const clientData = [
      ['Ahmed Al-Rashid','+971 50 111 2233','ahmed@email.com'],
      ['Sara Khalid','+971 55 223 4455','sara@email.com'],
      ['Omar Hassan','+971 56 334 5566','omar@email.com'],
      ['Fatima Al-Ali','+971 52 445 6677','fatima@email.com'],
      ['Khalid Mansour','+971 50 556 7788','khalid@email.com'],
      ['Nadia Ibrahim','+971 54 667 8899','nadia@email.com'],
      ['Yusuf Qasim','+971 58 778 9900','yusuf@email.com'],
      ['Maryam Saleh','+971 50 889 0011','maryam@email.com'],
    ];
    clientData.forEach(c => wrap.prepare('INSERT INTO clients (name,phone,email) VALUES (?,?,?)').run(...c));

    [[1,'Villa 1','A',1],[2,'Villa 3','A',2],[3,'Villa 7','B',3],[4,'Villa 12','B',4],
     [5,'Villa 15','C',5],[6,'Villa 22','C',6],[7,'Villa 28','D',7],[8,'Villa 35','D',8]]
    .forEach(v => wrap.prepare('INSERT INTO villas (id,villa_number,block,client_id) VALUES (?,?,?,?)').run(...v));

    [['AMC-001',1,1,'Premium',1800,'2025-01-01','2026-12-31','active',2],
     ['AMC-002',2,2,'Standard',1200,'2025-03-01','2026-02-28','expiring',2],
     ['AMC-003',3,3,'Elite',2400,'2024-06-01','2027-05-31','active',3],
     ['AMC-004',4,4,'Elite',2400,'2026-01-01','2028-12-31','active',3],
     ['AMC-005',5,5,'Standard',1200,'2025-02-01','2026-01-31','expiring',2],
     ['AMC-006',6,6,'Premium',1800,'2025-04-01','2028-03-31','active',3],
     ['AMC-007',7,7,'Standard',1200,'2025-05-01','2026-04-30','pending',2],
     ['AMC-008',8,8,'Premium',1800,'2024-07-01','2027-06-30','active',3]]
    .forEach(c => wrap.prepare('INSERT INTO contracts (contract_number,villa_id,client_id,package,monthly_value,start_date,end_date,status,relationship_manager_id) VALUES (?,?,?,?,?,?,?,?,?)').run(...c));

    [['T-101',7,3,'AC unit not cooling','urgent','open',2],
     ['T-099',4,1,'Water leak in bathroom','urgent','in_progress',3],
     ['T-098',1,2,'Electrical trip','medium','in_progress',2],
     ['T-096',8,2,'Gate motor repair','low','scheduled',2],
     ['T-095',5,1,'Paint touch-up needed','low','open',null]]
    .forEach(t => wrap.prepare('INSERT INTO tickets (ticket_number,villa_id,contract_id,title,priority,status,assigned_to) VALUES (?,?,?,?,?,?,?)').run(...t));

    [[4,null,'Quarterly Inspection','Ali Hassan','2026-06-08',3],
     [1,null,'AC Maintenance','Kareem Said','2026-06-09',2],
     [5,null,'Plumbing Check','Omar Faris','2026-06-10',1.5],
     [6,null,'Electrical Audit','Ali Hassan','2026-06-12',4],
     [8,null,'Annual Inspection','Kareem Said','2026-06-15',5]]
    .forEach(s => wrap.prepare('INSERT INTO schedule (villa_id,ticket_id,service_type,technician,scheduled_date,duration_hours) VALUES (?,?,?,?,?,?)').run(...s));

    [['AC Filters',12,20,'unit',70],['Plumbing Kits',35,10,'kit',45],
     ['Electrical Parts',8,15,'unit',30],['Paint Supplies',22,5,'can',25],['Water Pumps',5,3,'unit',380]]
    .forEach(i => wrap.prepare('INSERT INTO inventory (item_name,in_stock,min_level,unit,unit_cost) VALUES (?,?,?,?,?)').run(...i));

    [['PO-221','AC Filters',40,'unit',70,2800,'Al-Faris Supplies','2026-06-10','in_transit'],
     ['PO-222','Plumbing Fittings Kit',20,'kit',75,1500,'Gulf Tech','2026-06-12','delivered'],
     ['PO-223','Electrical Breakers',15,'unit',213,3200,'Emirates Parts','2026-06-15','pending'],
     ['PO-224','Paint & Finishing',10,'can',90,900,'Dubai Paints','2026-06-09','delivered']]
    .forEach(o => wrap.prepare('INSERT INTO procurement_orders (order_number,item_name,quantity,unit,unit_cost,total_cost,supplier,expected_date,status) VALUES (?,?,?,?,?,?,?,?,?)').run(...o));

    console.log('✅ Database seeded');
  }

  return wrap;
}

module.exports = { initDb, getDb };
