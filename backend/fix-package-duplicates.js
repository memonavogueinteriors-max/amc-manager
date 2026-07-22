const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function cleanup() {
  try {
    const malformedCharacter = String.fromCharCode(226);

    const result = await pool.query(
      `
        DELETE FROM packages malformed
        WHERE malformed.ac_units IN (4, 6, 8)
          AND malformed.name LIKE '%' || $1 || '%'
          AND EXISTS (
            SELECT 1
            FROM packages correct
            WHERE correct.id <> malformed.id
              AND correct.tier = malformed.tier
              AND correct.ac_units = malformed.ac_units
              AND correct.name NOT LIKE '%' || $1 || '%'
          )
        RETURNING
          malformed.id,
          malformed.name,
          malformed.tier,
          malformed.ac_units
      `,
      [malformedCharacter]
    );

    console.log(
      'Malformed duplicate packages removed:',
      result.rowCount
    );

    result.rows.forEach((row) => {
      console.log(
        `Removed: ${row.tier} - ${row.ac_units} AC`
      );
    });

    const remaining = await pool.query(`
      SELECT
        name,
        tier,
        ac_units
      FROM packages
      WHERE ac_units IN (4, 6, 8)
      ORDER BY ac_units, tier
    `);

    console.log(
      'Correct packages remaining:',
      remaining.rowCount
    );
  } catch (error) {
    console.error('Package cleanup failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

cleanup();
