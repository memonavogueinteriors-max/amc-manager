const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres:TkdqEhjezTgMVdXclYOSIKWDjwChenqQ@acela.proxy.rlwy.net:13875/railway',
  ssl: { rejectUnauthorized: false }
});

pool.query(
  'UPDATE users SET email=$1, password=$2 WHERE role=$3',
  ['swaati@amcmanager.com', bcrypt.hashSync('swaati@2026', 10), 'admin']
).then(() => {
  console.log('Done! Login updated successfully');
  pool.end();
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});