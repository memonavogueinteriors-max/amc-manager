const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_bookings (
      id SERIAL PRIMARY KEY,

      booking_no VARCHAR(30) UNIQUE NOT NULL,

      customer_name VARCHAR(150) NOT NULL,
      mobile VARCHAR(30) NOT NULL,
      whatsapp VARCHAR(30),
      address TEXT,
      google_map TEXT,

      service_type VARCHAR(100) NOT NULL,

      booking_date DATE NOT NULL,
      booking_time TIME,

      assigned_technician INTEGER REFERENCES users(id),

      status VARCHAR(30) DEFAULT 'New',

      price NUMERIC(10,2) DEFAULT 0,
      notes TEXT,

      created_by INTEGER REFERENCES users(id),

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Service Bookings table created successfully.');

  await pool.end();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});