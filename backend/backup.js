const { Pool } = require('pg');
const { cloudinary } = require('./cloudinary');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function backup() {
  try {
    const tables = ['users', 'clients', 'villas', 'contracts', 'tickets', 'schedule', 'procurement_orders', 'inventory', 'expenses', 'service_visits', 'packages'];
    const backupData = {};

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT * FROM ${table}`);
        backupData[table] = result.rows;
      } catch(e) {
        backupData[table] = [];
      }
    }

    const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join('/tmp', filename);
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

    await cloudinary.uploader.upload(filepath, {
      resource_type: 'raw',
      folder: 'vac-amc-backups',
      public_id: filename
    });

    fs.unlinkSync(filepath);
    console.log(`✅ Backup completed: ${filename}`);
  } catch(e) {
    console.error('Backup failed:', e.message);
  }
}

module.exports = { backup };