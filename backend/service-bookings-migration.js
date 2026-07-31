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
      email VARCHAR(150),
      address TEXT,
      google_map TEXT,
      google_maps_link TEXT,

      service_type VARCHAR(100) NOT NULL,

      booking_date DATE NOT NULL,
      booking_time TIME,
      preferred_time TEXT,

      assigned_technician TEXT,

      status VARCHAR(30) DEFAULT 'New Lead',

      price NUMERIC(10,2) DEFAULT 0,
      discount NUMERIC(10,2) DEFAULT 0,
      final_amount NUMERIC(10,2) DEFAULT 0,
      payment_method VARCHAR(80),
      notes TEXT,

      created_by INTEGER REFERENCES users(id),

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE service_bookings
      ADD COLUMN IF NOT EXISTS email VARCHAR(150),
      ADD COLUMN IF NOT EXISTS google_maps_link TEXT,
      ADD COLUMN IF NOT EXISTS preferred_time TEXT,
      ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS final_amount NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(80),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);

  console.log('✅ Service Bookings table created successfully.');

  await pool.end();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
