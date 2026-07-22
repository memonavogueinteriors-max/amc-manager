require('dotenv').config();

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const name = String(process.env.OWNER_NAME || '').trim();
const email = String(process.env.OWNER_EMAIL || '')
  .trim()
  .toLowerCase();
const password = String(process.env.OWNER_PASSWORD || '');
const databaseUrl = process.env.DATABASE_URL;

if (!name || !email || !password) {
  console.error(
    'OWNER_NAME, OWNER_EMAIL and OWNER_PASSWORD are required.'
  );
  process.exit(1);
}

if (password.length < 10) {
  console.error(
    'OWNER_PASSWORD must contain at least 10 characters.'
  );
  process.exit(1);
}

if (!databaseUrl) {
  console.error('DATABASE_URL is missing.');
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1/i.test(databaseUrl);

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function ensureOwner() {
  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const existing = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    let result;

    if (existing.rows[0]) {
      result = await pool.query(
        `
        UPDATE users
        SET name = $1,
            email = $2,
            password = $3,
            role = 'owner'
        WHERE id = $4
        RETURNING id, name, email, role
        `,
        [
          name,
          email,
          passwordHash,
          existing.rows[0].id
        ]
      );
    } else {
      result = await pool.query(
        `
        INSERT INTO users (
          name,
          email,
          password,
          role
        )
        VALUES ($1, $2, $3, 'owner')
        RETURNING id, name, email, role
        `,
        [name, email, passwordHash]
      );
    }

    console.log('PERMANENT_OWNER_READY');
    console.table(result.rows);
  } catch (error) {
    console.error('OWNER_SETUP_FAILED:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

ensureOwner();
